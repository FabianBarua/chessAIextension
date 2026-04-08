import React, { useState, useCallback } from 'react';
import { useChessState } from '../hooks/useChessState';
import { useStockfish } from '../hooks/useStockfish';
import { useSettings } from '../hooks/useSettings';
import { BoardView } from './components/BoardView';
import { MoveList } from './components/MoveList';
import { SettingsPanel } from './components/SettingsPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pause, Play, ExternalLink, RotateCcw } from 'lucide-react';
import '@/globals.css';

export default function App() {
  const { board, moves, fen, active, playerColor, activeColor, resetGame } = useChessState();
  const { settings, updateSettings } = useSettings();
  const { analysis, analyzing, engineReady, toggleAnalysis, resetAnalysis } = useStockfish(fen, settings);
  console.log('[App] fen:', fen?.substring(0, 30), 'bestMove:', analysis.bestMove, 'analyzing:', analyzing, 'engineReady:', engineReady, 'active:', active, 'humanMode:', settings.humanMode);

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
    <div className="flex flex-col w-full min-h-[520px] h-screen min-w-[400px]">
      {/* Header */}
      <header className="px-4 pt-3 pb-2 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-sm font-bold text-primary tracking-tight flex items-center gap-1.5">
            <span className="text-base">♟</span>
            Chess Trainer
          </h1>
          <div className="flex gap-1">
            <Button
              variant={analyzing ? 'default' : 'outline'}
              size="icon"
              className="h-7 w-7"
              onClick={toggleAnalysis}
              title={analyzing ? 'Pause engine' : 'Start engine'}
            >
              {analyzing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleFloat}
              title="Floating window"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={active ? 'default' : 'secondary'} className="text-[10px] gap-1 py-0">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)] animate-pulse_dot' : 'bg-muted-foreground'}`} />
            {active ? 'Live' : 'No board'}
          </Badge>

          {playerColor && (
            <Badge variant="secondary" className="text-[10px] py-0 capitalize">
              {playerColor === 'white' ? '♔' : '♚'} {playerColor}
            </Badge>
          )}

          {activeColor && (
            <Badge variant="secondary" className="text-[10px] py-0">
              {activeColor === 'w' ? '○' : '●'} {activeColor === 'w' ? 'White' : 'Black'} to move
            </Badge>
          )}

          {moves.length > 0 && (
            <Badge variant="outline" className="text-[10px] py-0 ml-auto text-primary border-primary/30">
              {moves.length} moves
            </Badge>
          )}

          {!engineReady && (
            <span className="text-[10px] text-chart-3 animate-pulse ml-auto">Engine loading...</span>
          )}
        </div>
      </header>

      {/* Main content with tabs */}
      <Tabs defaultValue="board" className="flex flex-col flex-1 min-h-0">
        <div className="px-3 pt-2">
          <TabsList className="h-8">
            <TabsTrigger value="board" className="text-[11px]">Board</TabsTrigger>
            <TabsTrigger value="moves" className="text-[11px]">
              Moves{moves.length > 0 && ` (${moves.length})`}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[11px]">⚙ Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
          <BoardView
            board={board}
            bestMove={analysis.bestMove ?? null}
            flipped={flipped}
            analysis={analysis}
            playerColor={playerColor}
            activeColor={activeColor}
            settings={settings}
          />
        </TabsContent>

        <TabsContent value="moves" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
          <MoveList moves={moves} />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
          <SettingsPanel settings={settings} onChange={updateSettings} />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Separator />
      <footer className="p-3 bg-card">
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleReset}
          disabled={moves.length === 0}
        >
          <RotateCcw className="h-3 w-3" />
          Reset Game
        </Button>
      </footer>
    </div>
  );
}
