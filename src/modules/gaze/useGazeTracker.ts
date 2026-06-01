import { useEffect, useRef, useCallback } from 'react';

const DWELL_TIME = 2500;
const SMOOTH = 8;
const DEAD_ZONE = 12;

export interface GazeTarget {
  id: string;
  action: () => void;
}

interface DwellState {
  id: string;
  startTime: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export function useGazeTracker(enabled: boolean) {
  const targetsRef = useRef<Map<string, GazeTarget>>(new Map());
  const dwellRef = useRef<DwellState | null>(null);
  const progressCallbackRef = useRef<((id: string, progress: number) => void) | null>(null);

  const registerTarget = useCallback((id: string, action: () => void) => {
    targetsRef.current.set(id, { id, action });
    return () => targetsRef.current.delete(id);
  }, []);

  const setProgressCallback = useCallback((cb: (id: string, progress: number) => void) => {
    progressCallbackRef.current = cb;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // ── Gaze dot ──
    const dot = document.createElement('div');
    dot.id = 'gaze-cursor-dot';
    dot.style.cssText = `
      position: fixed; width: 20px; height: 20px;
      border-radius: 50%;
      background: rgba(0,120,212,0.6);
      border: 3px solid #0078d4;
      pointer-events: none; z-index: 999999;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 16px rgba(0,120,212,0.6);
      display: none;
      transition: left 0.08s ease-out, top 0.08s ease-out;
    `;
    document.body.appendChild(dot);

    // Smoothing
    const xBuf: number[] = [], yBuf: number[] = [];
    let lastX = -999, lastY = -999;

    function processGaze(rawX: number, rawY: number) {
      xBuf.push(rawX); yBuf.push(rawY);
      if (xBuf.length > SMOOTH) { xBuf.shift(); yBuf.shift(); }
      const x = xBuf.reduce((a, b) => a + b) / xBuf.length;
      const y = yBuf.reduce((a, b) => a + b) / yBuf.length;

      const dx = Math.abs(x - lastX);
      const dy = Math.abs(y - lastY);
      if (dx < DEAD_ZONE && dy < DEAD_ZONE) return;
      lastX = x; lastY = y;

      dot.style.display = 'block';
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      // Check gaze targets
      let gazedId: string | null = null;
      targetsRef.current.forEach((_, id) => {
        const el = document.querySelector(`[data-gaze-id="${id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          gazedId = id;
        }
      });

      if (gazedId) {
        if (!dwellRef.current || dwellRef.current.id !== gazedId) {
          if (dwellRef.current?.timer) clearTimeout(dwellRef.current.timer);
          if (dwellRef.current) progressCallbackRef.current?.(dwellRef.current.id, 0);
          const startTime = Date.now();
          const capturedId = gazedId;
          const timer = setTimeout(() => {
            targetsRef.current.get(capturedId)?.action();
            dwellRef.current = null;
            progressCallbackRef.current?.(capturedId, 0);
          }, DWELL_TIME);
          dwellRef.current = { id: gazedId, startTime, timer };
        } else {
          const elapsed = Date.now() - dwellRef.current.startTime;
          progressCallbackRef.current?.(gazedId, Math.min(elapsed / DWELL_TIME, 1));
        }
      } else {
        if (dwellRef.current) {
          if (dwellRef.current.timer) clearTimeout(dwellRef.current.timer);
          progressCallbackRef.current?.(dwellRef.current.id, 0);
          dwellRef.current = null;
        }
      }
    }

    // ── Load GazeCloud ──
    const script = document.createElement('script');
    script.src = 'https://api.gazerecorder.com/GazeCloudAPI.js';
    script.async = true;

    script.onload = () => {
      const GazeCloud = (window as any).GazeCloudAPI;
      if (!GazeCloud) { console.error('GazeCloudAPI not found'); return; }

      console.log('GazeCloudAPI loaded, starting...');

      GazeCloud.OnResult = function(data: any) {
        // state: 0 = valid, -1 = face lost, 1 = uncalibrated
        if (data.state !== 0) return;
        processGaze(data.docX, data.docY);
      };

      GazeCloud.OnCalibrationComplete = function() {
        console.log('GazeCloud calibration complete!');
      };

      GazeCloud.OnCamDenied = function() {
        console.error('Camera access denied');
      };

      GazeCloud.OnError = function(msg: string) {
        console.error('GazeCloud error:', msg);
      };

      GazeCloud.UseClickRecalibration = true;
      GazeCloud.StartEyeTracking();
    };

    script.onerror = () => console.error('GazeCloudAPI script failed to load');
    document.head.appendChild(script);

    return () => {
      dot.remove();
      if (dwellRef.current?.timer) clearTimeout(dwellRef.current.timer);
      dwellRef.current = null;
      try { (window as any).GazeCloudAPI?.StopEyeTracking(); } catch (_) {}
      script.remove();
    };
  }, [enabled]);

  return { registerTarget, setProgressCallback };
}
