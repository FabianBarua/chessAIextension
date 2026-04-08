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

// Human mode: [depth, multiPV, topN candidates to pick from]
export const HUMAN_LEVELS: Record<number, { depth: number; multiPV: number; topN: number; label: string }> = {
  1: { depth: 5,  multiPV: 5, topN: 5, label: 'Beginner' },
  2: { depth: 8,  multiPV: 4, topN: 4, label: 'Casual' },
  3: { depth: 10, multiPV: 3, topN: 3, label: 'Club' },
  4: { depth: 14, multiPV: 2, topN: 2, label: 'Advanced' },
  5: { depth: 16, multiPV: 2, topN: 1, label: 'Expert' },
};

export const ENGINE_DEPTH = 18;
export const BOARD_SIZE = 8;
export const POLL_INTERVAL_MS = 1000;
export const MUTATION_DEBOUNCE_MS = 250;
export const BOARD_WAIT_RETRIES = 60;
export const BOARD_WAIT_INTERVAL_MS = 500;
