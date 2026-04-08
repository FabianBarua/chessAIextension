import React from 'react';
import type { Settings, PieceStyleKey, BoardThemeKey } from '../../types';
import { PIECE_STYLES, BOARD_THEMES, DEFAULT_SETTINGS, HUMAN_LEVELS } from '../../utils/constants';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (next: Settings) => void;
}

export const SettingsPanel = React.memo<SettingsPanelProps>(({ settings, onChange }) => {
  const set = <K extends keyof Settings>(key: K, val: Settings[K]) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className="settings-panel">
      <div className="sett-group">
        <label className="sett-label">
          <span>Human Mode</span>
          <label className="sett-toggle">
            <input
              type="checkbox"
              checked={settings.humanMode}
              onChange={(e) => set('humanMode', e.target.checked)}
            />
            <span className="sett-toggle-slider" />
          </label>
        </label>
        {settings.humanMode && (
          <div className="sett-human-level">
            <div className="sett-level-header">
              <span>Level: {HUMAN_LEVELS[settings.humanLevel].label}</span>
            </div>
            <div className="sett-level-btns">
              {([1, 2, 3, 4, 5] as const).map((lvl) => (
                <button
                  key={lvl}
                  className={`sett-lvl-btn${settings.humanLevel === lvl ? ' on' : ''}`}
                  onClick={() => set('humanLevel', lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sett-group">
        <label className="sett-label">Piece Style</label>
        <div className="sett-options">
          {(Object.keys(PIECE_STYLES) as PieceStyleKey[]).map((k) => {
            const ps = PIECE_STYLES[k];
            return (
              <button
                key={k}
                className={`sett-opt${settings.pieceStyle === k ? ' on' : ''}`}
                onClick={() => set('pieceStyle', k)}
              >
                <span className="sett-preview">
                  {ps.isImg ? (
                    <>
                      <img src="pieces/wk.png" className="sett-prev-img" alt="" />
                      <img src="pieces/bq.png" className="sett-prev-img" alt="" />
                    </>
                  ) : (
                    <>{ps.wk} {ps.bq}</>
                  )}
                </span>
                <span className="sett-opt-label">{ps.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sett-group">
        <label className="sett-label">Board Theme</label>
        <div className="sett-options">
          {(Object.keys(BOARD_THEMES) as BoardThemeKey[]).map((k) => {
            const t = BOARD_THEMES[k];
            return (
              <button
                key={k}
                className={`sett-opt${settings.boardTheme === k ? ' on' : ''}`}
                onClick={() => set('boardTheme', k)}
              >
                <span className="sett-preview sett-color-prev">
                  <span style={{ background: t.lt, width: 14, height: 14, display: 'inline-block', borderRadius: 2 }} />
                  <span style={{ background: t.dk, width: 14, height: 14, display: 'inline-block', borderRadius: 2 }} />
                </span>
                <span className="sett-opt-label">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button className="btn-reset-settings" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>
        Reset to Defaults
      </button>
    </div>
  );
});
