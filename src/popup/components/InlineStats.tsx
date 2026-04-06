import React from 'react';
import type { AnalysisState, PieceColor } from '../../types';
import { formatScore, cpToWinProb, getVerdict, uciToAlgebraic } from '../../utils/chess';

interface InlineStatsProps {
  analysis: AnalysisState;
  playerColor: PieceColor | null;
}

export const InlineStats: React.FC<InlineStatsProps> = ({ analysis, playerColor }) => {
  const winWhite = cpToWinProb(analysis.score);
  const myWin = playerColor === 'black' ? 100 - winWhite : winWhite;
  const v = getVerdict(myWin, analysis.score, playerColor);

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
            <div className="is-bar-fill" style={{ width: `${myWin}%` }} />
            <span className="is-bar-txt">{myWin}% win</span>
          </div>
          <div className="is-best">
            <span className="is-best-label">Best:</span>
            <span className="is-best-move">{uciToAlgebraic(analysis.bestMove)}</span>
            {analysis.ponder && <span className="is-then">then {uciToAlgebraic(analysis.ponder)}</span>}
          </div>
        </>
      ) : (
        <div className="is-waiting">Waiting for analysis...</div>
      )}
    </div>
  );
};
