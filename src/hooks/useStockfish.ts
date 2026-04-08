import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnalysisState, StockfishEngine } from '../types';
import { EMPTY_ANALYSIS } from '../types';
import { createStockfish } from '../services/stockfish';
import { ENGINE_DEPTH } from '../utils/constants';

export function useStockfish(fen: string) {
  const [analysis, setAnalysis] = useState<AnalysisState>(EMPTY_ANALYSIS);
  const [analyzing, setAnalyzing] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef<StockfishEngine | null>(null);
  const lastFenRef = useRef('');

  // Initialize engine once, with auto-restart on crash
  useEffect(() => {
    const engine = createStockfish(
      () => {
        engine.setOption('MultiPV', '1');
        setEngineReady(true);
      },
      () => {
        // Engine crashed — mark not ready, will become ready again after auto-restart
        setEngineReady(false);
        lastFenRef.current = ''; // force re-analysis when engine comes back
      },
    );
    engineRef.current = engine;
    return () => { engine.destroy(); };
  }, []);

  // Run analysis whenever FEN changes OR engine becomes ready
  useEffect(() => {
    if (!analyzing || !fen) return;
    if (fen === lastFenRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;
    lastFenRef.current = fen;
    setAnalysis(EMPTY_ANALYSIS);
    engine.analyze(fen, ENGINE_DEPTH, (d) => {
      setAnalysis(prev => ({ ...prev, ...d }));
    });
  }, [fen, analyzing, engineReady]);

  const toggleAnalysis = useCallback(() => {
    setAnalyzing(prev => {
      if (prev) {
        engineRef.current?.stop();
        return false;
      }
      // Re-analyze current position when resuming
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
