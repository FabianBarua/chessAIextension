import type { PieceColor, PieceType, PieceName, ChessMove, PieceCell, BoardArray } from '../types';
import { MUTATION_DEBOUNCE_MS, BOARD_WAIT_RETRIES, BOARD_WAIT_INTERVAL_MS } from '../utils/constants';

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

// ── State ──

let moveHistory: ChessMove[] = [];
let prevBoard: RawBoard = {};
let moveNum = 1;
let halfMoveClock = 0;
let isActive = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let castling: CastlingRights = { K: true, Q: true, k: true, q: true };

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

function getActiveTurn(): 'w' | 'b' {
  if (moveHistory.length === 0) return 'w';
  return moveHistory[moveHistory.length - 1].color === 'white' ? 'b' : 'w';
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

// ── FEN Generation ──

function boardToFEN(boardState: RawBoard): string {
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

  fen += ` ${getActiveTurn()}`;

  let c = '';
  if (castling.K) c += 'K';
  if (castling.Q) c += 'Q';
  if (castling.k) c += 'k';
  if (castling.q) c += 'q';
  fen += ` ${c || '-'}`;

  let ep = '-';
  if (moveHistory.length > 0) {
    const last = moveHistory[moveHistory.length - 1];
    if (last.piece === 'Pawn') {
      const fromRank = parseInt(last.from[1]);
      const toRank = parseInt(last.to[1]);
      if (Math.abs(toRank - fromRank) === 2) {
        ep = `${last.to[0]}${(fromRank + toRank) / 2}`;
      }
    }
  }
  fen += ` ${ep}`;

  const fullMove = Math.max(1, Math.ceil(moveNum / 2));
  fen += ` ${halfMoveClock} ${fullMove}`;

  return fen;
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

// ── State Broadcasting ──

function sendUpdate(): void {
  try {
    const current = readBoard();
    chrome.runtime.sendMessage({
      type: 'BOARD_UPDATE',
      board: boardToArray(current),
      moves: moveHistory,
      moveNum,
      fen: boardToFEN(current),
      playerColor: detectPlayerColor(),
    });
  } catch {
    // extension context invalidated or popup closed
  }
}

// ── Move Detection ──

function detectMoves(): void {
  const newBoard = readBoard();
  const allSq = new Set([...Object.keys(prevBoard), ...Object.keys(newBoard)]);
  const dep: Departure[] = [];
  const arr: Arrival[] = [];

  for (const sq of allSq) {
    const was = prevBoard[sq];
    const now = newBoard[sq];
    if (was && !now) dep.push({ sq, piece: was });
    else if (!was && now) arr.push({ sq, piece: now });
    else if (was && now && (was.color !== now.color || was.type !== now.type)) {
      dep.push({ sq, piece: was });
      arr.push({ sq, piece: now });
    }
  }

  if (!dep.length && !arr.length) return;

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
      sendUpdate();
      return;
    }
  }

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

    // Update castling rights
    if (d) updateCastlingRights(from, d.piece);
    if (cap) updateCastlingOnCapture(sqToAlg(cap.sq));

    // Update half-move clock
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

    // En passant: pawn moves diagonally but no capture on destination
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
  }

  prevBoard = newBoard;
  sendUpdate();
}

// ── Board Initialization ──

function resetState(): void {
  moveHistory = [];
  moveNum = 1;
  halfMoveClock = 0;
  castling = { K: true, Q: true, k: true, q: true };
  prevBoard = readBoard();
}

function isStartingPosition(board: RawBoard): boolean {
  const keys = Object.keys(board);
  if (keys.length !== 32) return false;
  // Check white and black back ranks
  const wk = board['51'];
  const bk = board['58'];
  return !!(wk?.type === 'k' && wk.color === 'white' && bk?.type === 'k' && bk.color === 'black');
}

function detectNewGame(): void {
  const current = readBoard();
  const pieceCount = Object.keys(current).length;
  const prevCount = Object.keys(prevBoard).length;

  // If board suddenly has 32 pieces from a non-32 state, or it's starting position
  // after we had moves, it's a new game
  if (moveHistory.length > 0 && pieceCount === 32 && prevCount !== 32 && isStartingPosition(current)) {
    resetState();
    sendUpdate();
  }
}

let boardObserver: MutationObserver | null = null;

function observeBoard(boardEl: Element): void {
  boardObserver?.disconnect();

  boardObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      detectNewGame();
      detectMoves();
    }, MUTATION_DEBOUNCE_MS);
  });

  boardObserver.observe(boardEl, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}

function waitForBoard(cb: (el: Element) => void): void {
  let retries = 0;
  (function check() {
    const el = document.querySelector('wc-chess-board');
    if (el && el.querySelectorAll('.piece').length > 0) return cb(el);
    if (++retries > BOARD_WAIT_RETRIES) return;
    setTimeout(check, BOARD_WAIT_INTERVAL_MS);
  })();
}

// ── Message Handler ──

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    const b = readBoard();
    sendResponse({
      active: isActive,
      board: boardToArray(b),
      moves: moveHistory,
      moveNum,
      fen: boardToFEN(b),
      playerColor: detectPlayerColor(),
      hasBoard: !!document.querySelector('wc-chess-board'),
    });
    return true;
  }
  if (msg.type === 'RESET') {
    resetState();
    sendUpdate();
    sendResponse({ ok: true });
    return true;
  }
});

// ── Bootstrap ──

waitForBoard((boardEl) => {
  resetState();
  isActive = true;
  observeBoard(boardEl);
  sendUpdate();

  // Watch for board element being replaced (SPA navigation, rematch, etc.)
  const bodyObserver = new MutationObserver(() => {
    const newBoardEl = document.querySelector('wc-chess-board');
    if (newBoardEl && newBoardEl !== boardEl && newBoardEl.querySelectorAll('.piece').length > 0) {
      boardEl = newBoardEl;
      resetState();
      observeBoard(newBoardEl);
      sendUpdate();
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
});
