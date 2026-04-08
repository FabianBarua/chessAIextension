import React, { useState, useCallback } from 'react';
import { useChessState } from '../hooks/useChessState';
import { useStockfish } from '../hooks/useStockfish';
import { useSettings } from '../hooks/useSettings';
import { BoardView } from './components/BoardView';
import { MoveList } from './components/MoveList';
import { SettingsPanel } from './components/SettingsPanel';
import './App.css';

type TabKey = 'board' | 'moves' | 'settings';

const TAB_LABELS: Record<TabKey, string> = {
  board: 'Board',
  moves: 'Moves',
  settings: '\u2699 Settings',
};

export default function App() {
  const { board, moves, fen, active, playerColor, activeColor, resetGame } = useChessState();
  const { analysis, analyzing, engineReady, toggleAnalysis, resetAnalysis } = useStockfish(fen);
  const { settings, updateSettings } = useSettings();
  const [tab, setTab] = useState<TabKey>('board');

  const flipped = playerColor === 'black';

  const handleReset = useCallback(() => {
    resetAnalysis();
    resetGame();
  }, [resetAnalysis, resetGame]);

  const handleFloat = useCallback(() => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 420,
      height: 620,
      focused: true,
    });
    window.close();
  }, []);

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-row">
          <h1>{'\u265F'} Chess Trainer</h1>
          <div className="hdr-btns">
            <button
              className={`btn-az ${analyzing ? 'on' : 'off'}`}
              onClick={toggleAnalysis}
              title={analyzing ? 'Pause engine' : 'Start engine'}
            >
              {analyzing ? '\u23F8' : '\u25B6'}
            </button>
            <button className="btn-fl" onClick={handleFloat} title="Floating window">
              {'\u29C9'}
            </button>
          </div>
        </div>
        <div className={`status ${active ? 'on' : ''}`}>
          <span className="dot" />
          <span>{active ? 'Live' : 'No board'}</span>
          {playerColor && (
            <span className={`cbadge ${playerColor}`}>
              {playerColor === 'white' ? '\u2654' : '\u265A'} {playerColor}
            </span>
          )}
          {activeColor && (
            <span className={`turn-badge ${activeColor === 'w' ? 'white' : 'black'}`}>
              {activeColor === 'w' ? '\u25CB' : '\u25CF'} {activeColor === 'w' ? 'White' : 'Black'} to move
            </span>
          )}
          {moves.length > 0 && <span className="mcnt">{moves.length} moves</span>}
          {!engineReady && <span className="engine-loading">Engine loading...</span>}
        </div>
      </header>

      <nav className="tabs">
        {(['board', 'moves', 'settings'] as TabKey[]).map((t) => {
          const label = t === 'moves' && moves.length > 0
            ? `${TAB_LABELS[t]} (${moves.length})`
            : TAB_LABELS[t];
          return (
            <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {label}
            </button>
          );
        })}
      </nav>

      <main className="main">
        {tab === 'board' && (
          <BoardView
            board={board}
            bestMove={analysis.bestMove ?? null}
            flipped={flipped}
            analysis={analysis}
            playerColor={playerColor}
            activeColor={activeColor}
            settings={settings}
          />
        )}
        {tab === 'moves' && <MoveList moves={moves} />}
        {tab === 'settings' && <SettingsPanel settings={settings} onChange={updateSettings} />}
      </main>

      <footer className="ftr">
        <button className="btn-rst" onClick={handleReset} disabled={moves.length === 0}>
          Reset
        </button>
      </footer>
    </div>
  );
}
