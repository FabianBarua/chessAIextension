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

// ── State ──

interface BoardPiece {
  color: PieceColor;
  type: PieceType;
  name: PieceName;
}

type RawBoard = Record<string, BoardPiece>;

interface Departure { sq: string; piece: BoardPiece; }
interface Arrival { sq: string; piece: BoardPiece; }

let moveHistory: ChessMove[] = [];
let prevBoard: RawBoard = {};
let moveNum = 1;
let isActive = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── DOM Parsing ──

function parseSquare(sq: string): string {
  return FILE_LETTERS[parseInt(sq[0])] + sq[1];
}

function parsePiece(classList: DOMTokenList): BoardPiece | null {
  for (const cls of classList) {
    if (cls.length === 2 && (cls[0] === 'w' || cls[0] === 'b')) {
      const type = cls[1] as PieceType;
      return {
        color: cls[0] === 'w' ? 'white' : 'black',
        type,
        name: PIECE_NAMES[type] ?? (type as unknown as PieceName),
      };
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
  document.querySelectorAll('wc-chess-board .piece').forEach((el) => {
    const sq = getSquareId(el.classList);
    const p = parsePiece(el.classList);
    if (sq && p) board[sq] = p;
  });
  return board;
}

// ── Turn Detection ──

function getActiveTurn(): 'w' | 'b' {
  if (moveHistory.length === 0) return 'w';
  return moveHistory[moveHistory.length - 1].color === 'white' ? 'b' : 'w';
}

// ── FEN Generation ──

function boardToFEN(boardState: RawBoard): string {
  let fen = '';

  // Piece placement
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

  // Active color
  fen += ` ${getActiveTurn()}`;

  // Castling rights (inferred from piece positions)
  let castling = '';
  const wk = boardState['51'], bk = boardState['58'];
  if (wk?.type === 'k' && wk.color === 'white') {
    if (boardState['81']?.type === 'r' && boardState['81'].color === 'white') castling += 'K';
    if (boardState['11']?.type === 'r' && boardState['11'].color === 'white') castling += 'Q';
  }
  if (bk?.type === 'k' && bk.color === 'black') {
    if (boardState['88']?.type === 'r' && boardState['88'].color === 'black') castling += 'k';
    if (boardState['18']?.type === 'r' && boardState['18'].color === 'black') castling += 'q';
  }
  fen += ` ${castling || '-'}`;

  // En passant
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
  fen += ` 0 ${Math.max(1, Math.ceil(moveNum / 2))}`;

  return fen;
}

// ── Board to Array (for popup rendering) ──

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
    const currentBoard = readBoard();
    chrome.runtime.sendMessage({
      type: 'BOARD_UPDATE',
      board: boardToArray(currentBoard),
      moves: moveHistory,
      moveNum,
      fen: boardToFEN(currentBoard),
      playerColor: detectPlayerColor(),
    });
  } catch {
    // popup closed
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

  // Castling detection
  if (dep.length === 2 && arr.length === 2) {
    const kd = dep.find(d => d.piece.type === 'k');
    const rd = dep.find(d => d.piece.type === 'r');
    const ka = arr.find(a => a.piece.type === 'k');
    const ra = arr.find(a => a.piece.type === 'r');

    if (kd && rd && ka && ra && kd.piece.color === rd.piece.color) {
      const kf = parseInt(ka.sq[0]);
      moveHistory.push({
        num: moveNum,
        color: kd.piece.color,
        piece: 'King',
        from: parseSquare(kd.sq),
        to: parseSquare(ka.sq),
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

  // Regular moves
  for (const a of arr) {
    const d = dep.find(x => x.piece.color === a.piece.color && x.piece.type === a.piece.type);
    const cap = dep.find(x => x.piece.color !== a.piece.color);
    const from = d ? parseSquare(d.sq) : '??';
    const to = parseSquare(a.sq);
    const p = a.piece;
    const sym = PIECE_SYMBOLS[`${p.color === 'white' ? 'w' : 'b'}${p.type}`];
    const promo = d && d.piece.type === 'p' && a.piece.type !== 'p';

    const move: ChessMove = {
      num: moveNum,
      color: p.color,
      piece: p.name,
      from,
      to,
      symbol: sym,
      type: 'move',
      notation: '',
    };

    if (cap) {
      move.type = 'capture';
      move.captured = { piece: cap.piece.name, color: cap.piece.color };
      move.notation = `${p.type === 'p' ? from[0] : p.name[0]}x${to}`;
    } else {
      move.notation = `${p.type === 'p' ? '' : p.name[0]}${to}`;
    }

    if (promo) {
      move.type = 'promotion';
      move.promotedTo = a.piece.name;
      move.notation += `=${a.piece.name[0]}`;
    }

    // En passant
    if (d?.piece.type === 'p' && !cap && dep.length === 2) {
      const ep = dep.find(x => x.piece.color !== p.color);
      if (ep) {
        move.type = 'en_passant';
        move.captured = { piece: 'Pawn', color: ep.piece.color };
        move.notation = `${from[0]}x${to} e.p.`;
      }
    }

    moveHistory.push(move);
    moveNum++;
  }

  prevBoard = newBoard;
  sendUpdate();
}

// ── Board Initialization ──

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
    moveHistory = [];
    moveNum = 1;
    prevBoard = readBoard();
    sendUpdate();
    sendResponse({ ok: true });
    return true;
  }
});

// ── Bootstrap ──

waitForBoard((board) => {
  prevBoard = readBoard();
  moveNum = 1;
  moveHistory = [];
  isActive = true;

  new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(detectMoves, MUTATION_DEBOUNCE_MS);
  }).observe(board, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  sendUpdate();
});
