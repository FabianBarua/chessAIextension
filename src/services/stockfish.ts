import type { AnalysisState, StockfishEngine } from '../types';

export function createStockfish(onReady?: () => void): StockfishEngine {
  const worker = new Worker('stockfish-18-lite-single.js');
  let analysisCallback: ((data: AnalysisState & { type: string }) => void) | null = null;
  let ready = false;
  let current: AnalysisState = { depth: 0, score: null, pv: [], bestMove: null };

  worker.onmessage = (e: MessageEvent) => {
    const line = typeof e.data === 'string' ? e.data : '';

    if (line === 'uciok') worker.postMessage('isready');

    if (line === 'readyok') {
      ready = true;
      onReady?.();
    }

    if (line.startsWith('info') && line.includes(' pv ')) {
      const depth = line.match(/depth (\d+)/);
      const score = line.match(/score (cp|mate) (-?\d+)/);
      const pv = line.match(/ pv (.+)$/);

      if (depth) current.depth = parseInt(depth[1]);
      if (score) current.score = { type: score[1] as 'cp' | 'mate', value: parseInt(score[2]) };
      if (pv) current.pv = pv[1].trim().split(' ');

      analysisCallback?.({ type: 'info', ...current });
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      current.bestMove = parts[1];
      current.ponder = parts[3] ?? null;
      analysisCallback?.({ type: 'bestmove', ...current });
    }
  };

  worker.postMessage('uci');

  return {
    analyze(fen, depth = 18, callback) {
      analysisCallback = callback;
      current = { depth: 0, score: null, pv: [], bestMove: null };
      worker.postMessage('stop');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    },
    stop() { worker.postMessage('stop'); },
    setOption(name, value) { worker.postMessage(`setoption name ${name} value ${value}`); },
    destroy() { worker.postMessage('quit'); worker.terminate(); },
    isReady() { return ready; },
  };
}
