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
        // Invalidate cached tab on failure so next call re-discovers
        if (tabRef.current === id) tabRef.current = null;
        fallback ? fallback() : cb(null);
      } else {
        // Cache working tab
        tabRef.current = id;
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

  // Try stored tab first → then active tab
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
  const lastUpdateRef = useRef(0); // dedup storage vs poll races
  const lastAppliedFenRef = useRef('');

  const activeColor = useMemo<ActiveColor | null>(() => {
    if (!fen) return null;
    const turn = fen.split(' ')[1];
    return turn === 'w' || turn === 'b' ? turn : null;
  }, [fen]);

  const applyState = useCallback((r: GetStateResponse, ts?: number) => {
    // Skip stale updates (storage listener + poll can race)
    if (ts && ts < lastUpdateRef.current) {
      console.log('[ChessState] SKIP stale update, ts:', ts, 'last:', lastUpdateRef.current);
      return;
    }
    if (ts) lastUpdateRef.current = ts;

    // Deduplicate: skip if FEN and active status haven't changed
    const newFen = r.fen ?? '';
    const newActive = r.active;
    setActive(prev => prev === newActive ? prev : newActive);

    if (newFen !== lastAppliedFenRef.current) {
      lastAppliedFenRef.current = newFen;
      console.log('[ChessState] applyState — active:', r.active, 'fen:', newFen.substring(0, 30), 'board rows:', r.board?.length, 'playerColor:', r.playerColor);
      setFen(newFen);
      setBoard(r.board ?? []);
      setMoves(r.moves ?? []);
      setPlayerColor(r.playerColor ?? null);
    }
  }, []);

  const fetchState = useCallback(() => {
    sendToTab({ type: 'GET_STATE' }, tabRef, (r) => {
      if (!r) {
        // Fallback to storage
        chrome.storage.local.get(
          ['lastBoard', 'lastMoves', 'lastFen', 'lastPlayerColor', 'lastUpdate'],
          (d: { [key: string]: any }) => {
            if (d.lastBoard) {
              applyState({
                active: true,
                board: d.lastBoard,
                moves: d.lastMoves ?? [],
                fen: d.lastFen ?? '',
                playerColor: d.lastPlayerColor ?? null,
                hasBoard: true,
                moveNum: 0,
              }, d.lastUpdate ?? Date.now());
            } else {
              setActive(false);
            }
          },
        );
        return;
      }
      applyState(r, Date.now());
    });
  }, [applyState]);

  // Listen for real-time BOARD_UPDATE from storage changes (pushed by background)
  useEffect(() => {
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return;
      // Only react when lastUpdate changes (background writes it atomically with data)
      if (!changes.lastUpdate) return;
      const ts = (changes.lastUpdate.newValue as number) ?? Date.now();
      if (ts <= lastUpdateRef.current) return;
      lastUpdateRef.current = ts;

      // Batch all changes from this write
      if ('lastFen' in changes) setFen((changes.lastFen.newValue as string) ?? '');
      if ('lastBoard' in changes) { setBoard((changes.lastBoard.newValue as BoardArray) ?? []); setActive(true); }
      if ('lastMoves' in changes) setMoves((changes.lastMoves.newValue as ChessMove[]) ?? []);
      if ('lastPlayerColor' in changes) setPlayerColor((changes.lastPlayerColor.newValue as PieceColor) ?? null);

      // Update tabRef from storage if available
      if (changes.chessTabId?.newValue) tabRef.current = changes.chessTabId.newValue as number;
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // Initial fetch + slow fallback poll (storage.onChanged handles real-time)
  useEffect(() => {
    fetchState();
    const iv = setInterval(fetchState, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchState]);

  const resetGame = useCallback(() => {
    sendToTab({ type: 'RESET' }, tabRef, () => {
      setMoves([]);
      setFen('');
      setPlayerColor(null);
      fetchState();
    });
  }, [fetchState]);

  return { board, moves, fen, active, playerColor, activeColor, resetGame };
}
