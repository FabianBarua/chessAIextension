import React, { useRef, useEffect, useMemo } from 'react';
import type { ChessMove, MovePair } from '../../types';

interface MoveListProps {
  moves: ChessMove[];
}

function pairMoves(moves: ChessMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  let cur: MovePair | null = null;

  for (const m of moves) {
    if (m.color === 'white') {
      if (cur) pairs.push(cur);
      cur = { n: pairs.length + 1, w: m, b: null };
    } else {
      if (!cur) cur = { n: pairs.length + 1, w: null, b: null };
      cur.b = m;
      pairs.push(cur);
      cur = null;
    }
  }
  if (cur) pairs.push(cur);
  return pairs;
}

function getMoveTypeClass(type: string): string {
  switch (type) {
    case 'capture': return ' cap';
    case 'castling': return ' castle';
    case 'en_passant': return ' ep';
    case 'promotion': return ' promo';
    default: return '';
  }
}

const MoveCell: React.FC<{ move: ChessMove | null; side: string }> = ({ move, side }) => {
  if (!move) return <div className={`mv-cell ${side}`} />;

  return (
    <div className={`mv-cell ${side}${getMoveTypeClass(move.type)}`}>
      <span className="mv-sym">{move.symbol}</span>
      <span className="mv-not">{move.notation}</span>
    </div>
  );
};

export const MoveList: React.FC<MoveListProps> = ({ moves }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [moves]);

  const pairs = useMemo(() => pairMoves(moves), [moves]);

  if (!moves.length) return <div className="empty-msg">No moves yet</div>;

  return (
    <div className="mv-list" ref={ref}>
      <div className="mv-header">
        <div className="mv-h-num">#</div>
        <div className="mv-h-col">White</div>
        <div className="mv-h-col">Black</div>
      </div>
      {pairs.map((p) => (
        <div key={p.n} className={`mv-row${p.n === pairs.length ? ' last' : ''}`}>
          <div className="mv-num">{p.n}.</div>
          <MoveCell move={p.w} side="white" />
          <MoveCell move={p.b} side="black" />
        </div>
      ))}
    </div>
  );
};
