import React from 'react';
import { FILES } from '../../utils/constants';

interface ArrowOverlayProps {
  bestMove: string | null;
  flipped: boolean;
  squareSize: number;
}

export const ArrowOverlay = React.memo<ArrowOverlayProps>(({ bestMove, flipped, squareSize }) => {
  console.log('[Arrow] bestMove:', bestMove, 'squareSize:', squareSize, 'flipped:', flipped);
  // Validate: must be UCI format (e.g. "e2e4"), not "(none)" or garbage
  if (!bestMove || bestMove.length < 4 || !squareSize || !/^[a-h][1-8][a-h][1-8]/.test(bestMove)) {
    console.log('[Arrow] SKIP — bestMove:', bestMove, 'squareSize:', squareSize);
    return null;
  }

  let fromF = FILES.indexOf(bestMove[0]);
  let fromR = 8 - parseInt(bestMove[1]);
  let toF = FILES.indexOf(bestMove[2]);
  let toR = 8 - parseInt(bestMove[3]);

  if (flipped) {
    fromF = 7 - fromF; fromR = 7 - fromR;
    toF = 7 - toF; toR = 7 - toR;
  }

  const x1 = (fromF + 0.5) * squareSize;
  const y1 = (fromR + 0.5) * squareSize;
  const x2 = (toF + 0.5) * squareSize;
  const y2 = (toR + 0.5) * squareSize;

  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const ux = dx / len, uy = dy / len;

  const pad = squareSize * 0.15;
  const headLen = squareSize * 0.38;
  const sx = x1 + ux * pad, sy = y1 + uy * pad;
  const ex = x2 - ux * pad, ey = y2 - uy * pad;
  const hx = ex - ux * headLen, hy = ey - uy * headLen;

  const pw = squareSize * 0.26;
  const p1x = hx + uy * pw, p1y = hy - ux * pw;
  const p2x = hx - uy * pw, p2y = hy + ux * pw;

  const w = squareSize * 8, h = squareSize * 8;
  const strokeW = squareSize * 0.14;

  return (
    <svg className="arrow-svg" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <filter id="ag" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#ag)">
        <line x1={sx} y1={sy} x2={hx} y2={hy} stroke="#3b82f6" strokeWidth={strokeW} strokeLinecap="round" />
        <polygon points={`${ex},${ey} ${p1x},${p1y} ${p2x},${p2y}`} fill="#3b82f6" />
      </g>
    </svg>
  );
});
