import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { BoardArray, ChessMove, PieceColor, ActiveColor, ContentMessage, GetStateResponse } from '../types';
import { POLL_INTERVAL_MS } from '../utils/constants';

function sendToTab(
  msg: ContentMessage,
  tabRef: React.MutableRefObject<number | null>,
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs[0]?.id;
      if (!id) { cb(null); return; }
      tryTab(id);
    });
  };

  if (tabRef.current) {
    tryTab(tabRef.current, tryActive);
  } else {
    chrome.storage.local.get(['chessTabId'], (d: { [key: string]: any }) => {
      if (d.chessTabId) {
        tabRef.current = d.chessTabId;
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
  const tabRef = useRef<number | null>(null);

  const activeColor = useMemo<ActiveColor | null>(() => {
    if (!fen) return null;
    const turn = fen.split(' ')[1];
    return turn === 'w' || turn === 'b' ? turn : null;
  }, [fen]);

  const applyState = useCallback((r: GetStateResponse) => {
    setActive(r.active);
    setBoard(r.board ?? []);
    setMoves(r.moves ?? []);
    if (r.fen) setFen(r.fen);
    if (r.playerColor) setPlayerColor(r.playerColor);
  }, []);

  const fetchState = useCallback(() => {
    sendToTab({ type: 'GET_STATE' }, tabRef, (r) => {
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
      applyState(r);
    });
  }, [applyState]);

  // Listen for real-time BOARD_UPDATE from storage changes (pushed by background)
  useEffect(() => {
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return;
      if (changes.lastFen?.newValue) setFen(changes.lastFen.newValue as string);
      if (changes.lastBoard?.newValue) { setBoard(changes.lastBoard.newValue as BoardArray); setActive(true); }
      if (changes.lastMoves?.newValue) setMoves(changes.lastMoves.newValue as ChessMove[]);
      if (changes.lastPlayerColor?.newValue) setPlayerColor(changes.lastPlayerColor.newValue as PieceColor);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // Initial fetch + slower fallback poll
  useEffect(() => {
    fetchState();
    const iv = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchState]);

  const resetGame = useCallback(() => {
    sendToTab({ type: 'RESET' }, tabRef, () => {
      setMoves([]);
      setFen('');
      fetchState();
    });
  }, [fetchState]);

  return { board, moves, fen, active, playerColor, activeColor, resetGame };
}
