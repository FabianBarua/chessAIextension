import type { PieceStyleKey, PieceStyleMap, BoardThemeKey, BoardTheme, Settings } from '../types';

export const FILES: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const PIECE_STYLES: Record<PieceStyleKey, PieceStyleMap> = {
  images:   { label: 'Images', isImg: true },
  solid:    { label: 'Solid',   wp: '\u265F', wr: '\u265C', wn: '\u265E', wb: '\u265D', wq: '\u265B', wk: '\u265A', bp: '\u265F', br: '\u265C', bn: '\u265E', bb: '\u265D', bq: '\u265B', bk: '\u265A' },
  classic:  { label: 'Classic', wp: '\u2659', wr: '\u2656', wn: '\u2658', wb: '\u2657', wq: '\u2655', wk: '\u2654', bp: '\u265F', br: '\u265C', bn: '\u265E', bb: '\u265D', bq: '\u265B', bk: '\u265A' },
  outlined: { label: 'Outlined',wp: '\u2659', wr: '\u2656', wn: '\u2658', wb: '\u2657', wq: '\u2655', wk: '\u2654', bp: '\u2659', br: '\u2656', bn: '\u2658', bb: '\u2657', bq: '\u2655', bk: '\u2654' },
};

export const BOARD_THEMES: Record<BoardThemeKey, BoardTheme> = {
  green:  { label: 'Green',  lt: '#eeeed2', dk: '#769656' },
  blue:   { label: 'Blue',   lt: '#dee3e6', dk: '#8ca2ad' },
  brown:  { label: 'Brown',  lt: '#f0d9b5', dk: '#b58863' },
  purple: { label: 'Purple', lt: '#e8dff5', dk: '#9370b8' },
  gray:   { label: 'Gray',   lt: '#e0e0e0', dk: '#888888' },
};

export const DEFAULT_SETTINGS: Settings = {
  pieceStyle: 'images',
  boardTheme: 'green',
  humanMode: false,
  humanLevel: 3,
};

// Human mode levels with behavioral modeling parameters
export const HUMAN_LEVELS: Record<number, {
  depth: number;
  multiPV: number;
  label: string;
  /** Softmax temperature: higher = more likely to pick suboptimal moves */
  temperature: number;
  /** Probability (0-1) of a random blunder on any given move */
  blunderRate: number;
  /** Max centipawn loss for "normal" (non-blunder) move selection */
  maxCpLoss: number;
  /** Per-move variance on temperature (0-1): models human inconsistency */
  variance: number;
  /** Target % of moves that should be top-1 engine move (anti-pattern) */
  targetTop1Ratio: number;
}> = {
  1: { depth: 6,  multiPV: 6, label: 'Beginner',  temperature: 1.8,  blunderRate: 0.12, maxCpLoss: 300, variance: 0.6, targetTop1Ratio: 0.25 },
  2: { depth: 9,  multiPV: 5, label: 'Casual',     temperature: 1.2,  blunderRate: 0.06, maxCpLoss: 180, variance: 0.4, targetTop1Ratio: 0.40 },
  3: { depth: 12, multiPV: 4, label: 'Club',        temperature: 0.7,  blunderRate: 0.03, maxCpLoss: 100, variance: 0.3, targetTop1Ratio: 0.55 },
  4: { depth: 15, multiPV: 3, label: 'Advanced',    temperature: 0.35, blunderRate: 0.01, maxCpLoss: 50,  variance: 0.2, targetTop1Ratio: 0.70 },
  5: { depth: 18, multiPV: 3, label: 'Expert',      temperature: 0.15, blunderRate: 0.005,maxCpLoss: 25,  variance: 0.1, targetTop1Ratio: 0.82 },
};

export const ENGINE_DEPTH = 18;
export const BOARD_SIZE = 8;
export const POLL_INTERVAL_MS = 1000;
export const MUTATION_DEBOUNCE_MS = 250;
export const BOARD_WAIT_RETRIES = 60;
export const BOARD_WAIT_INTERVAL_MS = 500;
