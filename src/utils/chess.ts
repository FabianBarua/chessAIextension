import type { PieceCell, EngineScore, Verdict, PieceStyleKey } from '../types';
import { FILES, PIECE_STYLES } from './constants';

/** Get the Unicode symbol for a piece in the given style */
export function getPieceSymbol(cell: PieceCell, style: PieceStyleKey): string {
  const key = (cell.color === 'white' ? 'w' : 'b') + cell.type;
  const map = PIECE_STYLES[style] ?? PIECE_STYLES.classic;
  return (map[key] as string) ?? cell.symbol;
}

/** Get the local image path for a piece */
export function getPieceImgSrc(cell: PieceCell): string {
  return `pieces/${cell.color === 'white' ? 'w' : 'b'}${cell.type}.png`;
}

/** Check if the piece style uses images */
export function isImgStyle(style: PieceStyleKey): boolean {
  return !!PIECE_STYLES[style]?.isImg;
}

/** Convert UCI move string to readable algebraic format */
export function uciToAlgebraic(uci: string | null): string {
  if (!uci || uci.length < 4) return uci ?? '';
  const promo = uci[4] ? `=${uci[4].toUpperCase()}` : '';
  return `${uci[0]}${uci[1]} \u2192 ${uci[2]}${uci[3]}${promo}`;
}

/** Format engine score for display */
export function formatScore(score: EngineScore | null): string {
  if (!score) return '0.0';
  if (score.type === 'mate') {
    return `${score.value > 0 ? '+' : ''}M${Math.abs(score.value)}`;
  }
  return `${score.value >= 0 ? '+' : ''}${(score.value / 100).toFixed(1)}`;
}

/** Convert centipawn score to win probability using Lichess sigmoid */
export function cpToWinProb(score: EngineScore | null): number {
  if (!score) return 50;
  if (score.type === 'mate') return score.value > 0 ? 99 : 1;
  return Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score.value)) - 1));
}

/** Get verdict text and CSS class from win probability */
export function getVerdict(myWin: number, score: EngineScore | null, playerColor: string | null): Verdict {
  if (score?.type === 'mate') {
    const isMine = (playerColor === 'white' && score.value > 0) || (playerColor === 'black' && score.value < 0);
    return isMine
      ? { text: `Mate in ${Math.abs(score.value)}`, cls: 'winning' }
      : { text: 'Getting mated', cls: 'losing' };
  }
  if (myWin > 60) return { text: 'Winning', cls: 'winning' };
  if (myWin > 45) return { text: 'Equal', cls: 'equal' };
  if (myWin > 25) return { text: 'Difficult', cls: 'difficult' };
  return { text: 'Losing', cls: 'losing' };
}

/** Parse a UCI move string into file/rank grid coordinates */
export function parseUciSquare(file: string, rank: string, flipped: boolean) {
  let f = FILES.indexOf(file);
  let r = 8 - parseInt(rank);
  if (flipped) { f = 7 - f; r = 7 - r; }
  return { f, r };
}
