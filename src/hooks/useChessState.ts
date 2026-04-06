import { useState, useEffect, useRef, useCallback } from 'react';
import type { BoardArray, ChessMove, PieceColor, ContentMessage, GetStateResponse } from '../types';
import { POLL_INTERVAL_MS } from '../utils/constants';

function sendToChessTab(
  msg: ContentMessage,
  chessTabRef: React.MutableRefObject<number | null>,
  cb: (r: GetStateResponse | null) => void,
) {
  const tryTab = (id: number, fallback?: () => void) => {
    chrome.tabs.sendMessage(id, msg, (r?: GetStateResponse) => {
      if (chrome.runtime.lastError || !r) {
        fallback ? fallback() : cb(null);
      } else {
        cb(r);
      }
    });
  };

  const tryActive = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (!tabs[0]?.id) { cb(null); return; }
      tryTab(tabs[0].id, () => cb(null));
    });
  };

  if (chessTabRef.current) {
    tryTab(chessTabRef.current, tryActive);
  } else {
    chrome.storage.local.get(['chessTabId'], (d: { [key: string]: any }) => {
      if (d.chessTabId) {
        chessTabRef.current = d.chessTabId;
        tryTab(d.chessTabId, tryActive);
      } else {
        tryActive();
      }
    });
  }
}

export function useChessState() {
  const [board, setBoard] = useState<BoardArray>([]);
  const [moves, setMoves] = useState<ChessMove[]>([]);
  const [fen, setFen] = useState('');
  const [active, setActive] = useState(false);
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null);
  const chessTabRef = useRef<number | null>(null);

  const fetchState = useCallback(() => {
    sendToChessTab({ type: 'GET_STATE' }, chessTabRef, (r) => {
      if (!r) {
        chrome.storage.local.get(
          ['lastBoard', 'lastMoves', 'lastFen', 'lastPlayerColor'],
          (d: { [key: string]: any }) => {
            if (d.lastBoard) {
              setActive(true);
              setBoard(d.lastBoard);
              setMoves(d.lastMoves ?? []);
              if (d.lastFen) setFen(d.lastFen);
              if (d.lastPlayerColor) setPlayerColor(d.lastPlayerColor);
            } else {
              setActive(false);
            }
          },
        );
        return;
      }
      setActive(r.active);
      setBoard(r.board ?? []);
      setMoves(r.moves ?? []);
      if (r.fen) setFen(r.fen);
      if (r.playerColor) setPlayerColor(r.playerColor);
    });
  }, []);

  useEffect(() => {
    fetchState();
    const iv = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchState]);

  const resetGame = useCallback(() => {
    sendToChessTab({ type: 'RESET' }, chessTabRef, () => {
      setMoves([]);
      setFen('');
      fetchState();
    });
  }, [fetchState]);

  const isMyTurn = useCallback((): boolean => {
    if (!fen || !playerColor) return false;
    const turn = fen.split(' ')[1];
    return (playerColor === 'white' && turn === 'w') || (playerColor === 'black' && turn === 'b');
  }, [fen, playerColor]);

  return { board, moves, fen, active, playerColor, resetGame, isMyTurn };
}
