import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnalysisState, StockfishEngine } from '../types';
import { createStockfish } from '../services/stockfish';
import { ENGINE_DEPTH } from '../utils/constants';

const EMPTY_ANALYSIS: AnalysisState = { depth: 0, score: null, pv: [], bestMove: null };

export function useStockfish(fen: string, shouldAnalyze: boolean) {
  const [analysis, setAnalysis] = useState<AnalysisState>(EMPTY_ANALYSIS);
  const [analyzing, setAnalyzing] = useState(true);
  const sfRef = useRef<StockfishEngine | null>(null);
  const lastFenRef = useRef('');

  // Initialize engine
  useEffect(() => {
    sfRef.current = createStockfish(() => {
      sfRef.current?.setOption('MultiPV', '1');
    });
    return () => { sfRef.current?.destroy(); };
  }, []);

  // Analyze when FEN changes
  useEffect(() => {
    if (!analyzing || !fen || fen === lastFenRef.current || !sfRef.current?.isReady() || !shouldAnalyze) {
      return;
    }
    lastFenRef.current = fen;
    setAnalysis(EMPTY_ANALYSIS);
    sfRef.current.analyze(fen, ENGINE_DEPTH, (d) => {
      setAnalysis(prev => ({ ...prev, ...d }));
    });
  }, [fen, analyzing, shouldAnalyze]);

  const toggleAnalysis = useCallback(() => {
    if (analyzing) {
      sfRef.current?.stop();
      setAnalyzing(false);
    } else {
      setAnalyzing(true);
      if (fen && sfRef.current?.isReady() && shouldAnalyze) {
        lastFenRef.current = fen;
        sfRef.current.analyze(fen, ENGINE_DEPTH, (d) => {
          setAnalysis(prev => ({ ...prev, ...d }));
        });
      }
    }
  }, [analyzing, fen, shouldAnalyze]);

  const resetAnalysis = useCallback(() => {
    setAnalysis(EMPTY_ANALYSIS);
    lastFenRef.current = '';
  }, []);

  return { analysis, analyzing, toggleAnalysis, resetAnalysis };
}
