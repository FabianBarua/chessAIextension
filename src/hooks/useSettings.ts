import { useState, useEffect } from 'react';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });

  useEffect(() => {
    chrome.storage.local.get(['chessSettings'], (d: { [key: string]: any }) => {
      if (d.chessSettings) {
        setSettings(prev => ({ ...prev, ...d.chessSettings }));
      }
    });
  }, []);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    chrome.storage.local.set({ chessSettings: next });
  };

  const resetSettings = () => updateSettings({ ...DEFAULT_SETTINGS });

  return { settings, updateSettings, resetSettings };
}
