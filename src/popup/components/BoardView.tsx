import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { BoardArray, AnalysisState, PieceColor, ActiveColor, Settings, SquareData } from '../../types';
import { FILES, BOARD_THEMES, BOARD_SIZE } from '../../utils/constants';
import { isImgStyle, getPieceImgSrc, getPieceSymbol } from '../../utils/chess';
import { ArrowOverlay } from './ArrowOverlay';
import { InlineStats } from './InlineStats';

interface BoardViewProps {
  board: BoardArray;
  bestMove: string | null;
  flipped: boolean;
  analysis: AnalysisState;
  playerColor: PieceColor | null;
  activeColor: ActiveColor | null;
  settings: Settings;
}

const Square = React.memo<{
  cell: SquareData['cell'];
  srcR: number;
  srcF: number;
  dr: number;
  df: number;
  isFrom: boolean;
  isTo: boolean;
  lightBg: string;
  darkBg: string;
  useImg: boolean;
  pieceStyle: Settings['pieceStyle'];
  flipped: boolean;
  boardSize: number;
}>(({ cell, srcR, srcF, dr, df, isFrom, isTo, lightBg, darkBg, useImg, pieceStyle, flipped, boardSize }) => {
  const light = (srcR + srcF) % 2 === 0;
  const cls = `sq${isFrom ? ' hl-from' : ''}${isTo ? ' hl-to' : ''}`;
  const bg = isFrom || isTo ? undefined : light ? lightBg : darkBg;
  const fl = flipped ? FILES[7 - df] : FILES[df];
  const rl = flipped ? dr + 1 : 8 - dr;

  return (
    <div className={cls} style={bg ? { background: bg } : undefined}>
      {cell && (useImg
        ? <img className="pc-img" src={getPieceImgSrc(cell)} alt="" draggable={false} />
        : <span className={`pc ${cell.color}`}>{getPieceSymbol(cell, pieceStyle)}</span>
      )}
      {dr === 7 && <span className="fl">{fl}</span>}
      {df === 0 && <span className="rl">{rl}</span>}
    </div>
  );
});

export const BoardView = React.memo<BoardViewProps>(({ board, bestMove, flipped, analysis, playerColor, activeColor, settings }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [sqSize, setSqSize] = useState(0);
  const theme = BOARD_THEMES[settings.boardTheme] ?? BOARD_THEMES.green;

  const hasBoard = !!(board && board.length > 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) { console.log('[BoardView] ref is null, hasBoard:', hasBoard); return; }
    const measure = () => {
      const w = el.offsetWidth;
      const sq = Math.floor(w / BOARD_SIZE);
      console.log('[BoardView:measure] offsetWidth:', w, 'sqSize:', sq);
      setSqSize(sq);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasBoard]);

  const hlSquares = useMemo(() => {
    if (!bestMove || bestMove.length < 4) return { from: null, to: null };
    return {
      from: { f: FILES.indexOf(bestMove[0]), r: 8 - parseInt(bestMove[1]) },
      to: { f: FILES.indexOf(bestMove[2]), r: 8 - parseInt(bestMove[3]) },
    };
  }, [bestMove]);

  const rows = useMemo(() => {
    const result: SquareData[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const row: SquareData[] = [];
      for (let f = 0; f < BOARD_SIZE; f++) {
        const srcR = flipped ? 7 - r : r;
        const srcF = flipped ? 7 - f : f;
        row.push({ cell: board[srcR]?.[srcF] ?? null, srcR, srcF });
      }
      result.push(row);
    }
    return result;
  }, [board, flipped]);

  if (!board || board.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        No board detected
      </div>
    );
  }

  const useImg = isImgStyle(settings.pieceStyle);

  return (
    <div className="flex flex-col gap-0 pt-1">
      <div className="w-full max-w-[400px] mx-auto" ref={ref}>
        <div className="grid grid-cols-8 grid-rows-8 aspect-square w-full border-2 border-border rounded-lg overflow-hidden relative shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          {rows.map((row, dr) =>
            row.map((sq, df) => (
              <Square
                key={dr * BOARD_SIZE + df}
                cell={sq.cell}
                srcR={sq.srcR}
                srcF={sq.srcF}
                dr={dr}
                df={df}
                isFrom={hlSquares.from?.f === sq.srcF && hlSquares.from?.r === sq.srcR}
                isTo={hlSquares.to?.f === sq.srcF && hlSquares.to?.r === sq.srcR}
                lightBg={theme.lt}
                darkBg={theme.dk}
                useImg={useImg}
                pieceStyle={settings.pieceStyle}
                flipped={flipped}
                boardSize={BOARD_SIZE}
              />
            ))
          )}
          <ArrowOverlay bestMove={bestMove} flipped={flipped} squareSize={sqSize} />
        </div>
      </div>
      <InlineStats analysis={analysis} playerColor={playerColor} activeColor={activeColor} />
    </div>
  );
});
