import type { PieceColor, PieceType, PieceName, ChessMove, PieceCell, BoardArray } from '../types';
import { MUTATION_DEBOUNCE_MS } from '../utils/constants';

// ── Lookup Tables ──

const PIECE_NAMES: Record<string, PieceName> = {
  p: 'Pawn', r: 'Rook', n: 'Knight', b: 'Bishop', q: 'Queen', k: 'King',
};

const FILE_LETTERS: Record<number, string> = {
  1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h',
};

const PIECE_SYMBOLS: Record<string, string> = {
  wp: '\u265F', wr: '\u265C', wn: '\u265E', wb: '\u265D', wq: '\u265B', wk: '\u265A',
  bp: '\u265F', br: '\u265C', bn: '\u265E', bb: '\u265D', bq: '\u265B', bk: '\u265A',
};

// ── Types ──

interface BoardPiece {
  color: PieceColor;
  type: PieceType;
  name: PieceName;
}

type RawBoard = Record<string, BoardPiece>;

interface Departure { sq: string; piece: BoardPiece }
interface Arrival { sq: string; piece: BoardPiece }

interface CastlingRights { K: boolean; Q: boolean; k: boolean; q: boolean }

interface PositionSnapshot {
  key: string;
  turn: 'w' | 'b';
  castling: CastlingRights;
  halfMoveClock: number;
  moveNum: number;
  epTarget: string;
}

// ── State ──

let moveHistory: ChessMove[] = [];
let prevBoard: RawBoard = {};
let moveNum = 1;
let halfMoveClock = 0;
let isActive = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let castling: CastlingRights = { K: true, Q: true, k: true, q: true };
let positionSnapshots: PositionSnapshot[] = [];
let lastBroadcastKey = '';

// ── Board Key (for snapshot lookup) ──

function boardKey(b: RawBoard): string {
  const parts: string[] = [];
  for (let rank = 1; rank <= 8; rank++) {
    for (let file = 1; file <= 8; file++) {
      const p = b[`${file}${rank}`];
      if (p) parts.push(`${file}${rank}${p.color[0]}${p.type}`);
    }
  }
  return parts.join('');
}

// ── DOM Parsing ──

function sqToAlg(sq: string): string {
  return FILE_LETTERS[parseInt(sq[0])] + sq[1];
}

function parsePiece(classList: DOMTokenList): BoardPiece | null {
  for (const cls of classList) {
    if (cls.length === 2 && (cls[0] === 'w' || cls[0] === 'b')) {
      const type = cls[1] as PieceType;
      if (PIECE_NAMES[type]) {
        return { color: cls[0] === 'w' ? 'white' : 'black', type, name: PIECE_NAMES[type] };
      }
    }
  }
  return null;
}

function getSquareId(classList: DOMTokenList): string | null {
  for (const cls of classList) {
    if (cls.startsWith('square-') && cls.length === 9) {
      return cls.slice(7);
    }
  }
  return null;
}

function readBoard(): RawBoard {
  const board: RawBoard = {};
  const pieces = document.querySelectorAll('wc-chess-board .piece');
  for (let i = 0; i < pieces.length; i++) {
    const el = pieces[i];
    const sq = getSquareId(el.classList);
    const p = parsePiece(el.classList);
    if (sq && p) board[sq] = p;
  }
  return board;
}

// ── Turn Detection ──

// Simple & reliable: check chess.com's highlighted squares to see who moved last
function detectTurnFromBoard(b: RawBoard): 'w' | 'b' {
  const highlights = document.querySelectorAll('wc-chess-board .highlight');
  for (let i = 0; i < highlights.length; i++) {
    const sq = getSquareId(highlights[i].classList);
    if (sq && b[sq]) {
      // Piece on highlighted square = the piece that just moved → other color's turn
      return b[sq].color === 'white' ? 'b' : 'w';
    }
  }
  // No highlights = starting position
  return 'w';
}

function getActiveTurn(): 'w' | 'b' {
  if (moveHistory.length > 0) {
    return moveHistory[moveHistory.length - 1].color === 'white' ? 'b' : 'w';
  }
  return detectTurnFromBoard(readBoard());
}

// ── Castling Inference from Board ──

function inferCastlingFromBoard(b: RawBoard): CastlingRights {
  const c: CastlingRights = { K: false, Q: false, k: false, q: false };
  const wk = b['51'];
  if (wk?.type === 'k' && wk.color === 'white') {
    if (b['81']?.type === 'r' && b['81'].color === 'white') c.K = true;
    if (b['11']?.type === 'r' && b['11'].color === 'white') c.Q = true;
  }
  const bk = b['58'];
  if (bk?.type === 'k' && bk.color === 'black') {
    if (b['88']?.type === 'r' && b['88'].color === 'black') c.k = true;
    if (b['18']?.type === 'r' && b['18'].color === 'black') c.q = true;
  }
  return c;
}

// ── Castling Rights Update ──

function updateCastlingRights(from: string, piece: BoardPiece): void {
  if (piece.type === 'k') {
    if (piece.color === 'white') { castling.K = false; castling.Q = false; }
    else { castling.k = false; castling.q = false; }
  }
  if (piece.type === 'r') {
    if (piece.color === 'white') {
      if (from === 'h1') castling.K = false;
      if (from === 'a1') castling.Q = false;
    } else {
      if (from === 'h8') castling.k = false;
      if (from === 'a8') castling.q = false;
    }
  }
}

function updateCastlingOnCapture(sq: string): void {
  if (sq === 'h1') castling.K = false;
  if (sq === 'a1') castling.Q = false;
  if (sq === 'h8') castling.k = false;
  if (sq === 'a8') castling.q = false;
}

// ── En Passant Target ──

function computeEpTarget(): string {
  if (moveHistory.length === 0) return '-';
  const last = moveHistory[moveHistory.length - 1];
  if (last.piece === 'Pawn') {
    const fromRank = parseInt(last.from[1]);
    const toRank = parseInt(last.to[1]);
    if (Math.abs(toRank - fromRank) === 2) {
      return `${last.to[0]}${(fromRank + toRank) / 2}`;
    }
  }
  return '-';
}

// ── FEN Generation (parameterized — no global reads) ──

function buildFEN(
  boardState: RawBoard,
  turn: 'w' | 'b',
  cast: CastlingRights,
  ep: string,
  hmc: number,
  fullMove: number,
): string {
  let fen = '';
  for (let rank = 8; rank >= 1; rank--) {
    let empty = 0;
    for (let file = 1; file <= 8; file++) {
      const p = boardState[`${file}${rank}`];
      if (p) {
        if (empty > 0) { fen += empty; empty = 0; }
        fen += p.color === 'white' ? p.type.toUpperCase() : p.type.toLowerCase();
      } else {
        empty++;
      }
    }
    if (empty > 0) fen += empty;
    if (rank > 1) fen += '/';
  }

  let c = '';
  if (cast.K) c += 'K';
  if (cast.Q) c += 'Q';
  if (cast.k) c += 'k';
  if (cast.q) c += 'q';

  return `${fen} ${turn} ${c || '-'} ${ep} ${hmc} ${fullMove}`;
}

function currentFEN(boardState: RawBoard): string {
  return buildFEN(
    boardState,
    getActiveTurn(),
    castling,
    computeEpTarget(),
    halfMoveClock,
    Math.max(1, Math.ceil(moveNum / 2)),
  );
}

// ── Board to Array ──

function boardToArray(boardState: RawBoard): BoardArray {
  const result: BoardArray = [];
  for (let rank = 8; rank >= 1; rank--) {
    const row: (PieceCell | null)[] = [];
    for (let file = 1; file <= 8; file++) {
      const p = boardState[`${file}${rank}`];
      row.push(p ? {
        color: p.color,
        type: p.type,
        symbol: PIECE_SYMBOLS[`${p.color === 'white' ? 'w' : 'b'}${p.type}`],
      } : null);
    }
    result.push(row);
  }
  return result;
}

// ── Player Color Detection ──

function detectPlayerColor(): PieceColor | null {
  const board = document.querySelector('wc-chess-board');
  if (!board) return null;
  return board.classList.contains('flipped') ? 'black' : 'white';
}

// ── Snapshot Management ──

function recordSnapshot(b: RawBoard): void {
  positionSnapshots.push({
    key: boardKey(b),
    turn: getActiveTurn(),
    castling: { ...castling },
    halfMoveClock,
    moveNum,
    epTarget: computeEpTarget(),
  });
}

function lookupSnapshot(key: string): PositionSnapshot | null {
  for (let i = positionSnapshots.length - 1; i >= 0; i--) {
    if (positionSnapshots[i].key === key) return positionSnapshots[i];
  }
  return null;
}

// ── State Broadcasting ──

function broadcast(b: RawBoard, fen: string): void {
  const key = boardKey(b);
  // Skip if nothing changed since last broadcast
  if (key === lastBroadcastKey && fen === lastBroadcastFen) return;
  lastBroadcastKey = key;
  lastBroadcastFen = fen;

  console.log('[Content:broadcast] fen:', fen.substring(0, 40), 'pieces:', Object.keys(b).length, 'moves:', moveHistory.length);
  try {
    chrome.runtime.sendMessage({
      type: 'BOARD_UPDATE',
      board: boardToArray(b),
      moves: moveHistory,
      moveNum,
      fen,
      playerColor: detectPlayerColor(),
    });
  } catch (e) {
    console.warn('[Content:broadcast] sendMessage failed:', e);
  }
}

let lastBroadcastFen = '';

// ── Board Diff ──

function diffBoard(a: RawBoard, b: RawBoard): { dep: Departure[]; arr: Arrival[] } {
  const allSq = new Set([...Object.keys(a), ...Object.keys(b)]);
  const dep: Departure[] = [];
  const arr: Arrival[] = [];

  for (const sq of allSq) {
    const was = a[sq];
    const now = b[sq];
    if (was && !now) dep.push({ sq, piece: was });
    else if (!was && now) arr.push({ sq, piece: now });
    else if (was && now && (was.color !== now.color || was.type !== now.type)) {
      dep.push({ sq, piece: was });
      arr.push({ sq, piece: now });
    }
  }

  return { dep, arr };
}

// ── Move Detection (returns true if a move was recognized) ──

function detectMoves(newBoard: RawBoard): boolean {
  const { dep, arr } = diffBoard(prevBoard, newBoard);

  if (!dep.length && !arr.length) return false;

  // Too many changes for a single move → navigation / takeback
  if (dep.length + arr.length > 5) return false;

  // Castling: king + rook of same color both depart and arrive
  if (dep.length === 2 && arr.length === 2) {
    const kd = dep.find(d => d.piece.type === 'k');
    const rd = dep.find(d => d.piece.type === 'r');
    const ka = arr.find(a => a.piece.type === 'k');
    const ra = arr.find(a => a.piece.type === 'r');

    if (kd && rd && ka && ra && kd.piece.color === rd.piece.color) {
      const fromAlg = sqToAlg(kd.sq);
      const toAlg = sqToAlg(ka.sq);
      const kf = parseInt(ka.sq[0]);

      updateCastlingRights(fromAlg, kd.piece);
      halfMoveClock++;

      moveHistory.push({
        num: moveNum,
        color: kd.piece.color,
        piece: 'King',
        from: fromAlg,
        to: toAlg,
        notation: kf > 4 ? 'O-O' : 'O-O-O',
        type: 'castling',
        symbol: PIECE_SYMBOLS[`${kd.piece.color === 'white' ? 'w' : 'b'}k`],
      });
      moveNum++;
      prevBoard = newBoard;
      recordSnapshot(newBoard);
      return true;
    }
  }

  let pushed = false;

  // Regular / capture / promotion / en passant
  for (const a of arr) {
    const d = dep.find(x => x.piece.color === a.piece.color && (x.piece.type === a.piece.type || (x.piece.type === 'p' && a.piece.type !== 'p')));
    const cap = dep.find(x => x.piece.color !== a.piece.color);
    const from = d ? sqToAlg(d.sq) : '??';
    const to = sqToAlg(a.sq);
    const p = a.piece;
    const sym = PIECE_SYMBOLS[`${p.color === 'white' ? 'w' : 'b'}${p.type}`];
    const isPromo = d && d.piece.type === 'p' && a.piece.type !== 'p';
    const isPawnMove = d?.piece.type === 'p' || a.piece.type === 'p';

    if (d) updateCastlingRights(from, d.piece);
    if (cap) updateCastlingOnCapture(sqToAlg(cap.sq));

    if (isPawnMove || cap) {
      halfMoveClock = 0;
    } else {
      halfMoveClock++;
    }

    const move: ChessMove = {
      num: moveNum,
      color: p.color,
      piece: d?.piece.name ?? p.name,
      from,
      to,
      symbol: sym,
      type: 'move',
      notation: '',
    };

    if (cap) {
      move.type = 'capture';
      move.captured = { piece: cap.piece.name, color: cap.piece.color };
      const srcType = d?.piece.type ?? p.type;
      move.notation = `${srcType === 'p' ? from[0] : (d?.piece.name ?? p.name)[0]}x${to}`;
    } else {
      const srcType = d?.piece.type ?? p.type;
      move.notation = `${srcType === 'p' ? '' : (d?.piece.name ?? p.name)[0]}${to}`;
    }

    if (isPromo) {
      move.type = 'promotion';
      move.promotedTo = a.piece.name;
      move.notation += `=${a.piece.name[0]}`;
    }

    if (d?.piece.type === 'p' && !cap && dep.length === 2) {
      const ep = dep.find(x => x.piece.color !== p.color);
      if (ep) {
        move.type = 'en_passant';
        move.captured = { piece: 'Pawn', color: ep.piece.color };
        move.notation = `${from[0]}x${to} e.p.`;
        halfMoveClock = 0;
      }
    }

    moveHistory.push(move);
    moveNum++;
    pushed = true;
  }

  if (pushed) {
    prevBoard = newBoard;
    recordSnapshot(newBoard);
  }

  return pushed;
}

// ── Navigation Handler (takeback / arrow keys / clicking moves) ──

function handleNavigation(current: RawBoard): string {
  const key = boardKey(current);
  const snap = lookupSnapshot(key);

  if (snap) {
    return buildFEN(
      current,
      snap.turn,
      snap.castling,
      snap.epTarget,
      snap.halfMoveClock,
      Math.max(1, Math.ceil(snap.moveNum / 2)),
    );
  }

  // Position not in history — detect turn from highlighted squares
  const turn = detectTurnFromBoard(current);
  return buildFEN(
    current,
    turn,
    inferCastlingFromBoard(current),
    '-',
    0,
    Math.max(1, Math.ceil(moveNum / 2)),
  );
}

// ── Board Initialization ──

function resetState(): void {
  moveHistory = [];
  moveNum = 1;
  halfMoveClock = 0;
  prevBoard = readBoard();
  lastBroadcastKey = '';
  lastBroadcastFen = '';

  // Detect turn from highlighted squares on the board
  const turn = detectTurnFromBoard(prevBoard);
  castling = isStartingPosition(prevBoard)
    ? { K: true, Q: true, k: true, q: true }
    : inferCastlingFromBoard(prevBoard);

  positionSnapshots = [{
    key: boardKey(prevBoard),
    turn,
    castling: { ...castling },
    halfMoveClock: 0,
    moveNum: 1,
    epTarget: '-',
  }];
}

function isStartingPosition(board: RawBoard): boolean {
  const keys = Object.keys(board);
  if (keys.length !== 32) return false;
  const wk = board['51'];
  const bk = board['58'];
  if (!wk || wk.type !== 'k' || wk.color !== 'white') return false;
  if (!bk || bk.type !== 'k' || bk.color !== 'black') return false;
  for (let f = 1; f <= 8; f++) {
    const wp = board[`${f}2`];
    const bp = board[`${f}7`];
    if (!wp || wp.type !== 'p' || wp.color !== 'white') return false;
    if (!bp || bp.type !== 'p' || bp.color !== 'black') return false;
  }
  return true;
}

// ── Main Board Change Handler ──

function handleBoardChange(): void {
  const current = readBoard();
  const key = boardKey(current);

  // No actual change — skip
  if (key === lastBroadcastKey) return;

  // New game detection: starting position after we already had moves
  if (isStartingPosition(current) && moveHistory.length > 0) {
    resetState();
    broadcast(prevBoard, currentFEN(prevBoard));
    return;
  }

  // Drastic board change: more than half the squares differ → new game
  if (moveHistory.length > 4) {
    const allSq = new Set([...Object.keys(prevBoard), ...Object.keys(current)]);
    let diffs = 0;
    for (const sq of allSq) {
      const pa = prevBoard[sq];
      const pb = current[sq];
      if (!pa && !pb) continue;
      if (!pa || !pb || pa.color !== pb.color || pa.type !== pb.type) diffs++;
    }
    if (diffs > 16) {
      resetState();
      broadcast(prevBoard, currentFEN(prevBoard));
      return;
    }
  }

  // Try to detect a move
  const moveDetected = detectMoves(current);

  if (moveDetected) {
    // Move detection already updated prevBoard and recorded snapshot
    broadcast(current, currentFEN(current));
  } else {
    // Navigation (takeback, arrow keys, clicking a move in the list)
    // Look up position in snapshots for correct FEN metadata
    const fen = handleNavigation(current);
    prevBoard = current; // update prevBoard so next diff is correct
    broadcast(current, fen);
  }
}

let boardObserver: MutationObserver | null = null;

function observeBoard(boardEl: Element): void {
  boardObserver?.disconnect();

  boardObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleBoardChange, MUTATION_DEBOUNCE_MS);
  });

  boardObserver.observe(boardEl, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}

function waitForBoard(cb: (el: Element) => void): void {
  const immediate = document.querySelector('wc-chess-board');
  if (immediate && immediate.querySelectorAll('.piece').length > 0) {
    cb(immediate);
    return;
  }

  const obs = new MutationObserver(() => {
    const el = document.querySelector('wc-chess-board');
    if (el && el.querySelectorAll('.piece').length > 0) {
      obs.disconnect();
      cb(el);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// ── Message Handler ──

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    const b = readBoard();
    const key = boardKey(b);
    const snap = lookupSnapshot(key);
    const turn = snap?.turn ?? detectTurnFromBoard(b);
    const fen = snap
      ? buildFEN(b, snap.turn, snap.castling, snap.epTarget, snap.halfMoveClock, Math.max(1, Math.ceil(snap.moveNum / 2)))
      : buildFEN(b, turn, inferCastlingFromBoard(b), '-', 0, 1);

    sendResponse({
      active: isActive,
      board: boardToArray(b),
      moves: moveHistory,
      moveNum,
      fen,
      playerColor: detectPlayerColor(),
      hasBoard: !!document.querySelector('wc-chess-board'),
    });
    return true;
  }
  if (msg.type === 'RESET') {
    resetState();
    broadcast(prevBoard, currentFEN(prevBoard));
    sendResponse({ ok: true });
    return true;
  }
});

// ── Bootstrap ──

waitForBoard((boardEl) => {
  resetState();
  isActive = true;
  observeBoard(boardEl);

  // Broadcast immediately with what we have
  const snap0 = positionSnapshots[0];
  const initFEN = snap0
    ? buildFEN(prevBoard, snap0.turn, snap0.castling, snap0.epTarget, snap0.halfMoveClock, 1)
    : currentFEN(prevBoard);
  broadcast(prevBoard, initFEN);

  // Re-broadcast after a short delay — chess.com may not have rendered
  // highlights yet on initial load, so turn detection can improve
  setTimeout(() => {
    const b = readBoard();
    const turn = detectTurnFromBoard(b);
    const cast = isStartingPosition(b) ? { K: true, Q: true, k: true, q: true } as CastlingRights : inferCastlingFromBoard(b);
    const fen = buildFEN(b, turn, cast, '-', 0, 1);
    // Update snapshot with corrected turn
    if (positionSnapshots[0]) positionSnapshots[0].turn = turn;
    broadcast(b, fen);
  }, 800);

  const watchTarget = boardEl.parentElement ?? document.body;
  const bodyObserver = new MutationObserver(() => {
    const newBoardEl = document.querySelector('wc-chess-board');
    if (!newBoardEl || newBoardEl.querySelectorAll('.piece').length === 0) return;
    if (newBoardEl !== boardEl) {
      boardEl = newBoardEl;
      resetState();
      observeBoard(newBoardEl);
      broadcast(prevBoard, currentFEN(prevBoard));
      const newParent = newBoardEl.parentElement ?? document.body;
      if (newParent !== watchTarget) {
        bodyObserver.disconnect();
        bodyObserver.observe(newParent, { childList: true, subtree: true });
      }
    }
  });

  bodyObserver.observe(watchTarget, { childList: true, subtree: true });
});
