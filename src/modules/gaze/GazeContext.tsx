import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useGazeTracker } from './useGazeTracker';

interface GazeContextType {
  enabled: boolean;
  registerTarget: (id: string, action: () => void) => () => void;
  getProgress: (id: string) => number;
}

const GazeContext = createContext<GazeContextType | null>(null);

export function GazeProvider({ children }: { children: ReactNode }) {
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // Always enabled — no toggle
  const { registerTarget, setProgressCallback } = useGazeTracker(true);

  setProgressCallback((id: string, progress: number) => {
    setProgressMap(prev => ({ ...prev, [id]: progress }));
  });

  const getProgress = useCallback((id: string) => progressMap[id] ?? 0, [progressMap]);

  return (
    <GazeContext.Provider value={{ enabled: true, registerTarget, getProgress }}>
      {children}
    </GazeContext.Provider>
  );
}

export function useGaze() {
  const ctx = useContext(GazeContext);
  if (!ctx) throw new Error('useGaze must be used within GazeProvider');
  return ctx;
}
