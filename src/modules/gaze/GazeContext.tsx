import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useGazeTracker } from './useGazeTracker';

interface GazeContextType {
  enabled: boolean;
  toggleGaze: () => void;
  registerTarget: (id: string, action: () => void) => () => void;
  getProgress: (id: string) => number;
}

const GazeContext = createContext<GazeContextType | null>(null);

export function GazeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const { registerTarget, setProgressCallback } = useGazeTracker(enabled);

  setProgressCallback((id, progress) => {
    setProgressMap(prev => ({ ...prev, [id]: progress }));
  });

  const toggleGaze = useCallback(() => setEnabled(e => !e), []);
  const getProgress = useCallback((id: string) => progressMap[id] ?? 0, [progressMap]);

  return (
    <GazeContext.Provider value={{ enabled, toggleGaze, registerTarget, getProgress }}>
      {children}
    </GazeContext.Provider>
  );
}

export function useGaze() {
  const ctx = useContext(GazeContext);
  if (!ctx) throw new Error('useGaze must be used within GazeProvider');
  return ctx;
}
