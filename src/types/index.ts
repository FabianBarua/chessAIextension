// ── Piece & Board Types ──

export type PieceColor = 'white' | 'black';
export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceName = 'Pawn' | 'Rook' | 'Knight' | 'Bishop' | 'Queen' | 'King';
export type MoveType = 'move' | 'capture' | 'castling' | 'en_passant' | 'promotion';
export type ActiveColor = 'w' | 'b';

export interface PieceCell {
  color: PieceColor;
  type: PieceType;
  symbol: string;
}

export interface BoardSquare {
  color: PieceColor;
  type: PieceType;
  name: PieceName;
}

export type BoardArray = (PieceCell | null)[][];

export interface ChessMove {
  num: number;
  color: PieceColor;
  piece: string;
  from: string;
  to: string;
  notation: string;
  type: MoveType;
  symbol: string;
  captured?: { piece: string; color: PieceColor };
  promotedTo?: string;
}

// ── Analysis Types ──

export interface EngineScore {
  type: 'cp' | 'mate';
  value: number;
}

export interface AnalysisState {
  depth: number;
  score: EngineScore | null;
  pv: string[];
  bestMove: string | null;
  ponder?: string | null;
  nodes?: number;
  nps?: number;
}

export interface Verdict {
  text: string;
  cls: 'winning' | 'equal' | 'difficult' | 'losing';
}

// ── Settings Types ──

export type PieceStyleKey = 'images' | 'solid' | 'classic' | 'outlined';
export type BoardThemeKey = 'green' | 'blue' | 'brown' | 'purple' | 'gray';

export interface PieceStyleMap {
  label: string;
  isImg?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface BoardTheme {
  label: string;
  lt: string;
  dk: string;
}

export interface Settings {
  pieceStyle: PieceStyleKey;
  boardTheme: BoardThemeKey;
}

// ── Messaging Types ──

export type TabId = number;

export interface BoardUpdateMessage {
  type: 'BOARD_UPDATE';
  board: BoardArray;
  moves: ChessMove[];
  moveNum: number;
  fen: string;
  playerColor: PieceColor | null;
}

export interface GetStateMessage {
  type: 'GET_STATE';
}

export interface ResetMessage {
  type: 'RESET';
}

export type ContentMessage = GetStateMessage | ResetMessage;

export interface GetStateResponse {
  active: boolean;
  board: BoardArray;
  moves: ChessMove[];
  moveNum: number;
  fen: string;
  playerColor: PieceColor | null;
  hasBoard: boolean;
}

// ── Stockfish Service Types ──

export interface StockfishEngine {
  analyze: (fen: string, depth: number, callback: (data: AnalysisState & { type: string }) => void) => void;
  stop: () => void;
  setOption: (name: string, value: string) => void;
  destroy: () => void;
  isReady: () => boolean;
}

// ── Component Props ──

export interface SquareData {
  cell: PieceCell | null;
  srcR: number;
  srcF: number;
}

export interface MovePair {
  n: number;
  w: ChessMove | null;
  b: ChessMove | null;
}
