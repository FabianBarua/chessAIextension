import React, { useRef, useEffect, useMemo } from 'react';
import type { ChessMove, MovePair } from '../../types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

function getMoveTypeClasses(type: string): string {
  switch (type) {
    case 'capture': return 'text-destructive';
    case 'castling': return 'text-blue-400';
    case 'en_passant': return 'text-violet-400';
    case 'promotion': return 'text-amber-400';
    default: return '';
  }
}

const MoveCell: React.FC<{ move: ChessMove | null; side: 'white' | 'black' }> = ({ move, side }) => {
  if (!move) return <div className="flex items-center min-h-[32px] px-2 border-l border-border/30" />;

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 min-h-[32px] border-l border-border/30 text-[13px]',
      side === 'white' ? 'bg-white/[0.02]' : 'bg-black/[0.06]',
    )}>
      <span className="text-base leading-none shrink-0">{move.symbol}</span>
      <span className={cn(
        'font-mono font-semibold text-[13px]',
        side === 'white' ? 'text-[#e8e8d5]' : 'text-[#a09880]',
        getMoveTypeClasses(move.type),
      )}>
        {move.notation}
        {move.type === 'capture' && <span className="text-destructive font-bold"> ×</span>}
      </span>
    </div>
  );
};

export const MoveList = React.memo<MoveListProps>(({ moves }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [moves]);

  const pairs = useMemo(() => pairMoves(moves), [moves]);

  if (!moves.length) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
        No moves yet
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="grid grid-cols-[36px_1fr_1fr] sticky top-0 z-10 bg-card border-b border-border text-[10px] font-bold uppercase text-muted-foreground py-1.5">
        <div className="text-center">#</div>
        <div className="pl-2">White</div>
        <div className="pl-2">Black</div>
      </div>

      {/* Rows */}
      {pairs.map((p) => (
        <div
          key={p.n}
          className={cn(
            'grid grid-cols-[36px_1fr_1fr] border-b border-border/20 transition-colors hover:bg-accent/30',
            p.n === pairs.length && 'bg-chart-1/5',
          )}
        >
          <div className="flex items-center justify-center text-muted-foreground font-bold text-[11px] py-1.5">
            {p.n}.
          </div>
          <MoveCell move={p.w} side="white" />
          <MoveCell move={p.b} side="black" />
        </div>
      ))}
      <div ref={endRef} />
    </ScrollArea>
  );
});
