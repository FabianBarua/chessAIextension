import React from 'react';
import type { AnalysisState, PieceColor, ActiveColor } from '../../types';
import { formatScore, cpToWinProb, getVerdict, uciToAlgebraic } from '../../utils/chess';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InlineStatsProps {
  analysis: AnalysisState;
  playerColor: PieceColor | null;
  activeColor: ActiveColor | null;
}

const verdictColorMap: Record<string, string> = {
  winning: 'text-emerald-400',
  equal: 'text-yellow-400',
  difficult: 'text-orange-400',
  losing: 'text-red-400',
};

export const InlineStats = React.memo<InlineStatsProps>(({ analysis, playerColor, activeColor }) => {
  const winWhite = cpToWinProb(analysis.score);
  const winBlack = 100 - winWhite;
  const myWin = playerColor === 'black' ? winBlack : winWhite;
  const v = getVerdict(myWin, analysis.score, playerColor);
  const turnLabel = activeColor === 'w' ? 'White' : activeColor === 'b' ? 'Black' : null;

  return (
    <Card className="mt-2.5">
      <CardContent className="p-3">
        {analysis.bestMove ? (
          <div className="flex flex-col gap-2.5">
            {/* Verdict + Eval */}
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-extrabold', verdictColorMap[v.cls] || 'text-foreground')}>
                {v.text}
              </span>
              <Badge variant="secondary" className="ml-auto font-mono text-xs font-bold text-primary">
                {formatScore(analysis.score)}
              </Badge>
              {analysis.depth > 0 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  d{analysis.depth}
                </Badge>
              )}
            </div>

            {/* Win probability bar */}
            <div className="relative h-3.5 rounded-full overflow-hidden bg-[#3a352e]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d4d4c0] to-[#e8e8d5] transition-all duration-500 ease-out"
                style={{ width: `${winWhite}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground mix-blend-difference">
                {winWhite}% W — {winBlack}% B
              </span>
            </div>

            {/* Win percentages */}
            <div className="flex gap-4 justify-center">
              <span className="text-[11px] font-bold text-[#e8e8d5]">♔ {winWhite}%</span>
              <span className="text-[11px] font-bold text-[#a09880]">♚ {winBlack}%</span>
            </div>

            {/* Best move */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-semibold text-emerald-400">
                Best{turnLabel ? ` (${turnLabel})` : ''}:
              </span>
              <span className="text-base font-bold font-mono text-foreground">
                {uciToAlgebraic(analysis.bestMove)}
              </span>
              {analysis.ponder && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  then {uciToAlgebraic(analysis.ponder)}
                </span>
              )}
            </div>

            {/* PV line */}
            {analysis.pv.length > 2 && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Line:</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {analysis.pv.slice(0, 6).map(uciToAlgebraic).join(' · ')}
                </span>
              </div>
            )}

            {/* Meta */}
            {analysis.nps != null && (
              <div className="text-[9px] text-muted-foreground text-right font-mono">
                {(analysis.nps / 1000).toFixed(0)}k nps
                {analysis.nodes != null && ` · ${(analysis.nodes / 1000).toFixed(0)}k nodes`}
              </div>
            )}
          </div>
        ) : analysis.depth > 0 && analysis.score ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-yellow-400">Thinking...</span>
              <Badge variant="secondary" className="ml-auto font-mono text-xs font-bold text-primary">
                {formatScore(analysis.score)}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                d{analysis.depth}
              </Badge>
            </div>
            <div className="relative h-3.5 rounded-full overflow-hidden bg-[#3a352e]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d4d4c0] to-[#e8e8d5] transition-all duration-500 ease-out"
                style={{ width: `${winWhite}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground mix-blend-difference">
                {winWhite}% W — {winBlack}% B
              </span>
            </div>
            {analysis.pv.length > 0 && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-semibold text-emerald-400">
                  Candidate{turnLabel ? ` (${turnLabel})` : ''}:
                </span>
                <span className="text-base font-bold font-mono text-foreground">
                  {uciToAlgebraic(analysis.pv[0])}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground text-center py-1">
            {turnLabel ? `Analyzing for ${turnLabel}...` : 'Waiting for analysis...'}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
