import type { BoardUpdateMessage } from '../types';

let lastFen = '';

chrome.runtime.onMessage.addListener((msg: BoardUpdateMessage, sender: chrome.runtime.MessageSender) => {
  if (msg.type === 'BOARD_UPDATE') {
    // Skip duplicate writes when board hasn't changed
    if (msg.fen && msg.fen === lastFen) return;
    lastFen = msg.fen ?? '';

    chrome.storage.local.set({
      lastBoard: msg.board,
      lastMoves: msg.moves,
      lastMoveNum: msg.moveNum,
      lastFen: msg.fen ?? null,
      lastPlayerColor: msg.playerColor ?? null,
      chessTabId: sender.tab?.id ?? null,
      lastUpdate: Date.now(),
    });
  }
});
