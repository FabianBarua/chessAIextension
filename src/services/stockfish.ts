import type { AnalysisState, StockfishEngine } from '../types';
import { EMPTY_ANALYSIS } from '../types';

type AnalysisCb = (data: AnalysisState & { type: string }) => void;

export function createStockfish(
  onReady?: () => void,
  onCrash?: () => void,
): StockfishEngine {
  let worker: Worker;
  let callback: AnalysisCb | null = null;
  let ready = false;
  let current: AnalysisState = { ...EMPTY_ANALYSIS };
  let destroyed = false;
  let searching = false; // true while engine is between "go" and "bestmove"
  let pendingAnalysis: { fen: string; depth: number; cb: AnalysisCb } | null = null;

  function post(cmd: string) {
    if (!destroyed) {
      try { worker.postMessage(cmd); }
      catch { handleCrash(); }
    }
  }

  function handleCrash() {
    if (destroyed) return;
    ready = false;
    searching = false;
    callback = null;
    const hadPending = pendingAnalysis;
    try { worker.terminate(); } catch { /* already dead */ }
    onCrash?.();

    // Auto-restart the worker
    initWorker();

    // If there was a pending analysis, it will be flushed on readyok
    if (hadPending) pendingAnalysis = hadPending;
  }

  function flushPending() {
    if (!pendingAnalysis || searching) return;
    const { fen, depth, cb } = pendingAnalysis;
    pendingAnalysis = null;
    startSearch(fen, depth, cb);
  }

  function startSearch(fen: string, depth: number, cb: AnalysisCb) {
    callback = cb;
    current = { ...EMPTY_ANALYSIS };
    searching = true;
    post(`position fen ${fen}`);
    post(`go depth ${depth}`);
  }

  function handleMessage(e: MessageEvent) {
    const line = typeof e.data === 'string' ? e.data : '';
    if (!line) return;

    if (line === 'uciok') { post('isready'); return; }

    if (line === 'readyok') {
      ready = true;
      onReady?.();
      flushPending();
      return;
    }

    if (line.startsWith('info') && line.includes(' pv ')) {
      const dM = line.match(/depth (\d+)/);
      const sM = line.match(/score (cp|mate) (-?\d+)/);
      const pvM = line.match(/ pv (.+)$/);
      const nodesM = line.match(/nodes (\d+)/);
      const npsM = line.match(/nps (\d+)/);

      if (dM) current.depth = parseInt(dM[1]);
      if (sM) current.score = { type: sM[1] as 'cp' | 'mate', value: parseInt(sM[2]) };
      if (pvM) current.pv = pvM[1].trim().split(' ');
      if (nodesM) current.nodes = parseInt(nodesM[1]);
      if (npsM) current.nps = parseInt(npsM[1]);

      callback?.({ type: 'info', ...current });
      return;
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      current.bestMove = parts[1] ?? null;
      current.ponder = parts[3] ?? null;
      searching = false;

      callback?.({ type: 'bestmove', ...current });

      // If a new analysis was queued while we were searching, flush it now
      flushPending();
    }
  }

  function initWorker() {
    ready = false;
    searching = false;
    worker = new Worker('stockfish-18-lite-single.js');
    worker.onmessage = handleMessage;
    worker.onerror = () => handleCrash();
    post('uci');
  }

  initWorker();

  return {
    analyze(fen, depth, cb) {
      if (destroyed) return;

      // Always queue the latest request
      pendingAnalysis = { fen, depth, cb };

      if (!ready) return; // will flush on readyok

      if (searching) {
        // Tell engine to stop — when bestmove arrives, flushPending fires
        post('stop');
      } else {
        // Engine idle, flush immediately
        flushPending();
      }
    },

    stop() {
      pendingAnalysis = null;
      if (searching) post('stop');
    },

    setOption(name, value) { post(`setoption name ${name} value ${value}`); },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      callback = null;
      pendingAnalysis = null;
      searching = false;
      try {
        post('quit');
        worker.terminate();
      } catch { /* already dead */ }
    },

    isReady() { return ready && !destroyed; },
  };
}
