import type { BoardUpdateMessage } from '../types';

chrome.runtime.onMessage.addListener((msg: BoardUpdateMessage, sender: chrome.runtime.MessageSender) => {
  if (msg.type === 'BOARD_UPDATE') {
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
