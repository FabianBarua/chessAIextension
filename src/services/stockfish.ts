import type { AnalysisState, StockfishEngine } from '../types';
import { EMPTY_ANALYSIS } from '../types';

export function createStockfish(onReady?: () => void): StockfishEngine {
  const worker = new Worker('stockfish-18-lite-single.js');
  type AnalysisCb = (data: AnalysisState & { type: string }) => void;
  let callback: AnalysisCb | null = null;
  let ready = false;
  let current: AnalysisState = { ...EMPTY_ANALYSIS };
  let destroyed = false;
  let pendingFen: { fen: string; depth: number; cb: AnalysisCb } | null = null;

  const post = (cmd: string) => { if (!destroyed) worker.postMessage(cmd); };

  worker.onmessage = (e: MessageEvent) => {
    const line = typeof e.data === 'string' ? e.data : '';
    if (!line) return;

    if (line === 'uciok') { post('isready'); return; }

    if (line === 'readyok') {
      ready = true;
      onReady?.();
      // Flush pending analysis that arrived before engine was ready
      if (pendingFen) {
        const { fen, depth, cb } = pendingFen;
        pendingFen = null;
        callback = cb;
        current = { ...EMPTY_ANALYSIS };
        post('stop');
        post(`position fen ${fen}`);
        post(`go depth ${depth}`);
      }
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
      callback?.({ type: 'bestmove', ...current });
    }
  };

  post('uci');

  return {
    analyze(fen, depth, cb) {
      if (destroyed) return;
      if (!ready) {
        // Queue it — will be flushed on readyok
        pendingFen = { fen, depth, cb };
        return;
      }
      callback = cb;
      current = { ...EMPTY_ANALYSIS };
      post('stop');
      post(`position fen ${fen}`);
      post(`go depth ${depth}`);
    },
    stop() { post('stop'); pendingFen = null; },
    setOption(name, value) { post(`setoption name ${name} value ${value}`); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      callback = null;
      pendingFen = null;
      post('quit');
      worker.terminate();
    },
    isReady() { return ready && !destroyed; },
  };
}
