import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { BoardArray, AnalysisState, PieceColor, Settings, SquareData } from '../../types';
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
  settings: Settings;
}

export const BoardView: React.FC<BoardViewProps> = ({ board, bestMove, flipped, analysis, playerColor, settings }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [sqSize, setSqSize] = useState(0);
  const theme = BOARD_THEMES[settings.boardTheme] ?? BOARD_THEMES.green;

  useEffect(() => {
    const measure = () => {
      if (ref.current) setSqSize(Math.floor(ref.current.offsetWidth / BOARD_SIZE));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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
    return <div className="empty-msg">No board detected</div>;
  }

  const useImg = isImgStyle(settings.pieceStyle);

  return (
    <div className="board-view">
      <div className="board-wrap" ref={ref}>
        <div className="board">
          {rows.map((row, dr) =>
            row.map((sq, df) => {
              const light = (sq.srcR + sq.srcF) % 2 === 0;
              const isFrom = hlSquares.from?.f === sq.srcF && hlSquares.from?.r === sq.srcR;
              const isTo = hlSquares.to?.f === sq.srcF && hlSquares.to?.r === sq.srcR;
              const cls = `sq${isFrom ? ' hl-from' : ''}${isTo ? ' hl-to' : ''}`;
              const bg = isFrom || isTo ? undefined : light ? theme.lt : theme.dk;
              const fl = flipped ? FILES[7 - df] : FILES[df];
              const rl = flipped ? dr + 1 : 8 - dr;

              return (
                <div key={dr * BOARD_SIZE + df} className={cls} style={bg ? { background: bg } : undefined}>
                  {sq.cell && (useImg
                    ? <img className="pc-img" src={getPieceImgSrc(sq.cell)} alt="" draggable={false} />
                    : <span className={`pc ${sq.cell.color}`}>{getPieceSymbol(sq.cell, settings.pieceStyle)}</span>
                  )}
                  {dr === 7 && <span className="fl">{fl}</span>}
                  {df === 0 && <span className="rl">{rl}</span>}
                </div>
              );
            })
          )}
          <ArrowOverlay bestMove={bestMove} flipped={flipped} squareSize={sqSize} />
        </div>
      </div>
      <InlineStats analysis={analysis} playerColor={playerColor} />
    </div>
  );
};
