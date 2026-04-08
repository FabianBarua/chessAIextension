import React from 'react';
import type { Settings, PieceStyleKey, BoardThemeKey } from '../../types';
import { PIECE_STYLES, BOARD_THEMES, DEFAULT_SETTINGS, HUMAN_LEVELS } from '../../utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

export const SettingsPanel = React.memo<SettingsPanelProps>(({ settings, onChange }) => {
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Human Mode */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
              Human Mode
            </CardTitle>
            <Switch
              checked={settings.humanMode}
              onCheckedChange={(checked) => set('humanMode', checked)}
            />
          </div>
        </CardHeader>
        {settings.humanMode && (
          <CardContent className="p-3 pt-3">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Level: <span className="text-foreground font-medium">{HUMAN_LEVELS[settings.humanLevel].label}</span>
                </span>
              </div>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((lvl) => (
                  <Button
                    key={lvl}
                    variant={settings.humanLevel === lvl ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'flex-1 h-8 text-xs font-bold',
                      settings.humanLevel === lvl && 'shadow-md',
                    )}
                    onClick={() => set('humanLevel', lvl)}
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Piece Style */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
            Piece Style
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(PIECE_STYLES) as PieceStyleKey[]).map((k) => {
              const ps = PIECE_STYLES[k];
              const isActive = settings.pieceStyle === k;
              return (
                <button
                  key={k}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all min-w-[60px]',
                    isActive
                      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => set('pieceStyle', k)}
                >
                  <span className="text-xl leading-none flex items-center gap-0.5">
                    {ps.isImg ? (
                      <>
                        <img src="pieces/wk.png" className="w-5 h-5 object-contain" alt="" />
                        <img src="pieces/bq.png" className="w-5 h-5 object-contain" alt="" />
                      </>
                    ) : (
                      <>{ps.wk} {ps.bq}</>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold">{ps.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Board Theme */}
      <Card>
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
            Board Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(BOARD_THEMES) as BoardThemeKey[]).map((k) => {
              const t = BOARD_THEMES[k];
              const isActive = settings.boardTheme === k;
              return (
                <button
                  key={k}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all min-w-[60px]',
                    isActive
                      ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => set('boardTheme', k)}
                >
                  <span className="flex gap-0.5">
                    <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: t.lt }} />
                    <span className="w-3.5 h-3.5 rounded-sm inline-block" style={{ background: t.dk }} />
                  </span>
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button
        variant="ghost"
        size="sm"
        className="self-start text-xs text-muted-foreground hover:text-destructive"
        onClick={() => onChange({ ...DEFAULT_SETTINGS })}
      >
        <RotateCcw className="h-3 w-3" />
        Reset to Defaults
      </Button>
    </div>
  );
});
