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

function pickHumanMove(lines: PVLine[], topN: number): AnalysisState {
  if (lines.length === 0) return EMPTY_ANALYSIS;

  // Sort by score (best first for the side to move)
  const sorted = [...lines].sort((a, b) => {
    const sa = a.score ? (a.score.type === 'mate' ? a.score.value * 10000 : a.score.value) : 0;
    const sb = b.score ? (b.score.type === 'mate' ? b.score.value * 10000 : b.score.value) : 0;
    return sb - sa;
  });

  const candidates = sorted.slice(0, Math.min(topN, sorted.length));

  // Weighted random: best candidate has highest weight
  const weights = candidates.map((_, i) => Math.pow(candidates.length - i, 2));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let chosen = candidates[0];
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { chosen = candidates[i]; break; }
  }

  return {
    depth: chosen.depth,
    score: chosen.score,
    pv: chosen.pv,
    bestMove: chosen.pv[0] ?? null,
    ponder: chosen.pv[1] ?? null,
    nodes: chosen.nodes,
    nps: chosen.nps,
  };
}

export function useStockfish(fen: string, settings: Settings) {
  const [analysis, setAnalysis] = useState<AnalysisState>(EMPTY_ANALYSIS);
  const [analyzing, setAnalyzing] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef<StockfishEngine | null>(null);
  const lastFenRef = useRef('');
  const lastSettingsRef = useRef({ humanMode: settings.humanMode, humanLevel: settings.humanLevel });

  // Initialize engine once, with auto-restart on crash
  useEffect(() => {
    const engine = createStockfish(
      () => {
        setEngineReady(true);
      },
      () => {
        setEngineReady(false);
        lastFenRef.current = '';
      },
    );
    engineRef.current = engine;
    return () => { engine.destroy(); };
  }, []);

  // Run analysis whenever FEN changes, engine becomes ready, or human settings change
  useEffect(() => {
    if (!analyzing || !fen) return;

    const settingsChanged =
      lastSettingsRef.current.humanMode !== settings.humanMode ||
      lastSettingsRef.current.humanLevel !== settings.humanLevel;
    lastSettingsRef.current = { humanMode: settings.humanMode, humanLevel: settings.humanLevel };

    if (fen === lastFenRef.current && !settingsChanged) return;

    const engine = engineRef.current;
    if (!engine) return;
    lastFenRef.current = fen;
    setAnalysis(EMPTY_ANALYSIS);

    if (settings.humanMode) {
      const lvl = HUMAN_LEVELS[settings.humanLevel] ?? HUMAN_LEVELS[3];
      const pvLines: PVLine[] = [];

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
          // Pick a human-like move from collected PV lines
          const result = pickHumanMove(pvLines, lvl.topN);
          setAnalysis(result);
          // Restore MultiPV to 1 for next potential non-human analysis
          engine.setOption('MultiPV', '1');
        }
      });
    } else {
      engine.setOption('MultiPV', '1');
      engine.analyze(fen, ENGINE_DEPTH, (d) => {
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
  }, []);

  return { analysis, analyzing, engineReady, toggleAnalysis, resetAnalysis };
}
