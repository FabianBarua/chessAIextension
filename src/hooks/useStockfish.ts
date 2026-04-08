import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnalysisState, StockfishEngine, Settings } from '../types';
import { EMPTY_ANALYSIS } from '../types';
import { createStockfish } from '../services/stockfish';
import { ENGINE_DEPTH, HUMAN_LEVELS } from '../utils/constants';

interface PVLine {
  pv: string[];
  score: AnalysisState['score'];
  depth: number;
  nodes?: number;
  nps?: number;
}

type HumanLevel = typeof HUMAN_LEVELS[number];

// ── Score helpers ──

function scoreToCP(score: AnalysisState['score']): number {
  if (!score) return 0;
  return score.type === 'mate' ? score.value * 10000 : score.value;
}

function lineToAnalysis(line: PVLine): AnalysisState {
  return {
    depth: line.depth,
    score: line.score,
    pv: line.pv,
    bestMove: line.pv[0] ?? null,
    ponder: line.pv[1] ?? null,
    nodes: line.nodes,
    nps: line.nps,
  };
}

// ── Anti-pattern tracker ──
// Tracks whether we're picking top-1 too often and adjusts bias

interface PickHistory {
  total: number;
  top1Count: number;
}

function shouldAvoidTop1(history: PickHistory, target: number): boolean {
  if (history.total < 4) return false; // not enough data yet
  const currentRatio = history.top1Count / history.total;
  // If ratio is significantly above target, bias away from top-1
  return currentRatio > target + 0.12;
}

// ── Human-like move selection ──

function pickHumanMove(
  lines: PVLine[],
  level: HumanLevel,
  history: PickHistory,
): AnalysisState {
  if (lines.length === 0) return EMPTY_ANALYSIS;
  if (lines.length === 1) return lineToAnalysis(lines[0]);

  // Sort by score (best first for the side to move)
  const sorted = [...lines].sort((a, b) => scoreToCP(b.score) - scoreToCP(a.score));
  const bestCP = scoreToCP(sorted[0].score);

  // ── Blunder injection ──
  // Small random chance of picking from the weaker half
  if (sorted.length > 2 && Math.random() < level.blunderRate) {
    const bottom = sorted.slice(Math.ceil(sorted.length / 2));
    const pick = bottom[Math.floor(Math.random() * bottom.length)];
    history.total++;
    return lineToAnalysis(pick);
  }

  // ── Per-move variance (inconsistency modeling) ──
  // Shift temperature randomly: sometimes focused, sometimes sloppy
  const varianceFactor = 1 + (Math.random() * 2 - 1) * level.variance;
  let effectiveTemp = level.temperature * Math.max(0.05, varianceFactor);

  // ── Anti-pattern: if picking top-1 too often, inflate temperature ──
  if (shouldAvoidTop1(history, level.targetTop1Ratio)) {
    effectiveTemp *= 1.8;
  }

  // ── Filter within acceptable cp loss ──
  const acceptable = sorted.filter(line => {
    const cpLoss = bestCP - scoreToCP(line.score);
    return cpLoss <= level.maxCpLoss;
  });
  const candidates = acceptable.length > 1 ? acceptable : sorted.slice(0, 2);

  // ── Softmax weighting by centipawn difference ──
  // w(i) = exp(-cpLoss / (temperature * 100))
  // This means:
  //   - A -5cp move is weighted ~0.95x of the best at temp=1.0
  //   - A -100cp move is weighted ~0.37x of the best at temp=1.0
  //   - At temp=0.15 (expert), even -20cp is weighted ~0.26x (so top-1 dominates but not 100%)
  const weights = candidates.map(line => {
    const cpLoss = bestCP - scoreToCP(line.score);
    return Math.exp(-cpLoss / (effectiveTemp * 100));
  });

  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let chosen = candidates[0];
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { chosen = candidates[i]; break; }
  }

  // Update anti-pattern tracker
  history.total++;
  if (chosen === sorted[0]) history.top1Count++;

  return lineToAnalysis(chosen);
}

export function useStockfish(fen: string, settings: Settings) {
  const [analysis, setAnalysis] = useState<AnalysisState>(EMPTY_ANALYSIS);
  const [analyzing, setAnalyzing] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef<StockfishEngine | null>(null);
  const lastFenRef = useRef('');  // stores position+turn only
  const lastSettingsRef = useRef({ humanMode: settings.humanMode, humanLevel: settings.humanLevel });
  const pickHistoryRef = useRef<PickHistory>({ total: 0, top1Count: 0 });

  // Initialize engine once, with auto-restart on crash
  useEffect(() => {
    console.log('[useStockfish] Creating engine...');
    const engine = createStockfish(
      () => {
        console.log('[useStockfish] Engine READY');
        setEngineReady(true);
      },
      () => {
        console.error('[useStockfish] Engine CRASHED');
        setEngineReady(false);
        lastFenRef.current = '';
      },
    );
    engineRef.current = engine;
    return () => { engine.destroy(); };
  }, []);

  // Run analysis whenever FEN changes, engine becomes ready, or human settings change
  useEffect(() => {
    console.log('[useStockfish:effect] analyzing:', analyzing, 'fen:', fen?.substring(0, 30), 'engineReady:', engineReady, 'humanMode:', settings.humanMode, 'humanLevel:', settings.humanLevel);
    if (!analyzing || !fen) {
      console.log('[useStockfish:effect] SKIP — analyzing:', analyzing, 'fen:', !!fen);
      return;
    }

    // Skip empty/invalid boards (e.g. navigating away from chess.com)
    const position = fen.split(' ')[0];
    if (!position || position === '8/8/8/8/8/8/8/8' || !position.includes('K') || !position.includes('k')) {
      console.log('[useStockfish:effect] SKIP — empty or invalid board');
      return;
    }

    const settingsChanged =
      lastSettingsRef.current.humanMode !== settings.humanMode ||
      lastSettingsRef.current.humanLevel !== settings.humanLevel;
    lastSettingsRef.current = { humanMode: settings.humanMode, humanLevel: settings.humanLevel };

    // Reset anti-pattern tracker when settings change (new "game persona")
    if (settingsChanged) {
      pickHistoryRef.current = { total: 0, top1Count: 0 };
    }

    // Compare only position + turn (ignore halfmove, fullmove, castling, ep metadata)
    // This prevents re-analysis when polls return different metadata for the same board
    const fenKey = fen.split(' ').slice(0, 2).join(' ');

    if (fenKey === lastFenRef.current && !settingsChanged) {
      console.log('[useStockfish:effect] SKIP — same fen, no settings change');
      return;
    }

    const engine = engineRef.current;
    if (!engine) {
      console.log('[useStockfish:effect] SKIP — no engine ref');
      return;
    }
    console.log('[useStockfish:effect] Starting analysis for:', fen.substring(0, 40), 'humanMode:', settings.humanMode);
    lastFenRef.current = fenKey;
    setAnalysis(EMPTY_ANALYSIS);

    if (settings.humanMode) {
      const lvl = HUMAN_LEVELS[settings.humanLevel] ?? HUMAN_LEVELS[3];
      const pvLines: PVLine[] = [];

      console.log('[useStockfish] Human mode — depth:', lvl.depth, 'multiPV:', lvl.multiPV, 'temp:', lvl.temperature);
      engine.setOption('MultiPV', String(lvl.multiPV));
      engine.analyze(fen, lvl.depth, (d) => {
        // Collect PV lines from multi-PV info
        if (d.type === 'info' && d.pv.length > 0) {
          // Each info line with a PV replaces the line at that depth
          const existing = pvLines.findIndex(l => l.pv[0] === d.pv[0]);
          const line: PVLine = { pv: d.pv, score: d.score, depth: d.depth, nodes: d.nodes, nps: d.nps };
          if (existing >= 0) pvLines[existing] = line;
          else pvLines.push(line);

          // Show progress
          setAnalysis(prev => ({
            ...prev,
            depth: d.depth,
            score: d.score,
            pv: d.pv,
            nodes: d.nodes,
            nps: d.nps,
          }));
        }

        if (d.type === 'bestmove') {
          console.log('[useStockfish:human] bestmove received, pvLines collected:', pvLines.length, pvLines.map(l => l.pv[0]));
          const result = pickHumanMove(pvLines, lvl, pickHistoryRef.current);
          console.log('[useStockfish:human] picked:', result.bestMove, 'score:', JSON.stringify(result.score));
          setAnalysis(result);
          // NOTE: Do NOT reset MultiPV here — if a new analysis is pending (flushPending),
          // this would race and override the new analysis's MultiPV setting.
          // MultiPV is always set at the START of each analysis path instead.
        }
      });
    } else {
      console.log('[useStockfish] Normal mode — depth:', ENGINE_DEPTH);
      engine.setOption('MultiPV', '1');
      engine.analyze(fen, ENGINE_DEPTH, (d) => {
        if (d.type === 'bestmove') {
          console.log('[useStockfish:normal] bestmove:', d.bestMove, 'score:', JSON.stringify(d.score), 'pv:', d.pv?.slice(0, 3));
        }
        setAnalysis(prev => ({ ...prev, ...d }));
      });
    }
  }, [fen, analyzing, engineReady, settings.humanMode, settings.humanLevel]);

  const toggleAnalysis = useCallback(() => {
    setAnalyzing(prev => {
      if (prev) {
        engineRef.current?.stop();
        return false;
      }
      lastFenRef.current = '';
      return true;
    });
  }, []);

  const resetAnalysis = useCallback(() => {
    engineRef.current?.stop();
    setAnalysis(EMPTY_ANALYSIS);
    lastFenRef.current = '';
    pickHistoryRef.current = { total: 0, top1Count: 0 };
  }, []);

  return { analysis, analyzing, engineReady, toggleAnalysis, resetAnalysis };
}
