import React from 'react';
import type { AnalysisState, PieceColor, ActiveColor } from '../../types';
import { formatScore, cpToWinProb, getVerdict, uciToAlgebraic } from '../../utils/chess';

interface InlineStatsProps {
  analysis: AnalysisState;
  playerColor: PieceColor | null;
  activeColor: ActiveColor | null;
}

export const InlineStats = React.memo<InlineStatsProps>(({ analysis, playerColor, activeColor }) => {
  const winWhite = cpToWinProb(analysis.score);
  const winBlack = 100 - winWhite;
  const myWin = playerColor === 'black' ? winBlack : winWhite;
  const v = getVerdict(myWin, analysis.score, playerColor);
  const turnLabel = activeColor === 'w' ? 'White' : activeColor === 'b' ? 'Black' : null;

  return (
    <div className="inline-stats">
      {analysis.bestMove ? (
        <>
          <div className="is-row">
            <span className={`is-verdict ${v.cls}`}>{v.text}</span>
            <span className="is-eval">{formatScore(analysis.score)}</span>
            {analysis.depth > 0 && <span className="is-depth">d{analysis.depth}</span>}
          </div>

          <div className="is-bar">
            <div className="is-bar-fill" style={{ width: `${winWhite}%` }} />
            <span className="is-bar-txt">{winWhite}% W — {winBlack}% B</span>
          </div>

          <div className="is-probs">
            <span className="is-prob white">{'\u2654'} {winWhite}%</span>
            <span className="is-prob black">{'\u265A'} {winBlack}%</span>
          </div>

          <div className="is-best">
            <span className="is-best-label">
              Best{turnLabel ? ` (${turnLabel})` : ''}:
            </span>
            <span className="is-best-move">{uciToAlgebraic(analysis.bestMove)}</span>
            {analysis.ponder && <span className="is-then">then {uciToAlgebraic(analysis.ponder)}</span>}
          </div>

          {analysis.pv.length > 2 && (
            <div className="is-pv">
              <span className="is-pv-label">Line:</span>
              <span className="is-pv-moves">
                {analysis.pv.slice(0, 6).map(uciToAlgebraic).join(' · ')}
              </span>
            </div>
          )}

          {analysis.nps != null && (
            <div className="is-meta">
              {(analysis.nps / 1000).toFixed(0)}k nps
              {analysis.nodes != null && ` · ${(analysis.nodes / 1000).toFixed(0)}k nodes`}
            </div>
          )}
        </>
      ) : analysis.depth > 0 && analysis.score ? (
        <>
          <div className="is-row">
            <span className="is-verdict equal">Thinking...</span>
            <span className="is-eval">{formatScore(analysis.score)}</span>
            <span className="is-depth">d{analysis.depth}</span>
          </div>
          <div className="is-bar">
            <div className="is-bar-fill" style={{ width: `${winWhite}%` }} />
            <span className="is-bar-txt">{winWhite}% W — {winBlack}% B</span>
          </div>
          {analysis.pv.length > 0 && (
            <div className="is-best">
              <span className="is-best-label">
                Candidate{turnLabel ? ` (${turnLabel})` : ''}:
              </span>
              <span className="is-best-move">{uciToAlgebraic(analysis.pv[0])}</span>
            </div>
          )}
        </>
      ) : (
        <div className="is-waiting">
          {turnLabel ? `Analyzing for ${turnLabel}...` : 'Waiting for analysis...'}
        </div>
      )}
    </div>
  );
});
