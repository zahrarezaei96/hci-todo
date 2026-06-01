import { useEffect, useRef, useCallback } from 'react';

const DWELL_TIME = 3000;

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
      position: fixed; width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(0,120,212,0.6);
      border: 3px solid #0078d4;
      pointer-events: none; z-index: 999999;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 16px rgba(0,120,212,0.6);
      display: none;
      transition: left 0.12s ease-out, top 0.12s ease-out;
    `;
    document.body.appendChild(dot);

    const SMOOTH = 14;
    const xBuf: number[] = [], yBuf: number[] = [];
    let lastX = 0, lastY = 0;
    const DEAD_ZONE = 18; // pixels — ignore movements smaller than this

    function handleGaze(data: { x: number; y: number } | null) {
      if (!data) return;
      xBuf.push(data.x); yBuf.push(data.y);
      if (xBuf.length > SMOOTH) { xBuf.shift(); yBuf.shift(); }
      const rawX = xBuf.reduce((a, b) => a + b) / xBuf.length;
      const rawY = yBuf.reduce((a, b) => a + b) / yBuf.length;

      // Dead zone — only move if displacement is significant
      const dx = Math.abs(rawX - lastX);
      const dy = Math.abs(rawY - lastY);
      if (dx < DEAD_ZONE && dy < DEAD_ZONE) return;
      lastX = rawX; lastY = rawY;

      const x = rawX, y = rawY;
      dot.style.display = 'block';
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      let gazedId: string | null = null;
      targetsRef.current.forEach((_, id) => {
        const el = document.querySelector(`[data-gaze-id="${id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) gazedId = id;
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

    function makeDraggable(el: HTMLElement) {
      let dragging = false, sx = 0, sy = 0, sr = 16, sb = 16;
      const handle = document.createElement('div');
      handle.style.cssText = `
        position:absolute; top:0; left:0; right:0; height:22px;
        background:rgba(0,120,212,0.85); cursor:grab; z-index:10;
        display:flex; align-items:center; justify-content:center;
      `;
      handle.innerHTML = `<span style="color:white;font-size:11px;user-select:none;font-family:sans-serif;">⠿ drag</span>`;
      el.appendChild(handle);
      handle.addEventListener('mousedown', (e) => {
        dragging = true; sx = e.clientX; sy = e.clientY;
        const r = el.getBoundingClientRect();
        sr = window.innerWidth - r.right; sb = window.innerHeight - r.bottom;
        handle.style.cursor = 'grabbing'; e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        el.style.right = `${Math.max(0, sr - (e.clientX - sx))}px`;
        el.style.bottom = `${Math.max(0, sb - (e.clientY - sy))}px`;
        el.style.left = 'auto'; el.style.top = 'auto';
      });
      document.addEventListener('mouseup', () => { dragging = false; handle.style.cursor = 'grab'; });
    }

    function applyVideoStyles() {
      const container = document.getElementById('webgazerVideoContainer');
      if (!container) { setTimeout(applyVideoStyles, 400); return; }

      container.setAttribute('style', `
        position: fixed !important; bottom: 16px !important; right: 16px !important;
        top: auto !important; left: auto !important;
        width: 200px !important; height: 192px !important;
        border-radius: 14px !important; overflow: hidden !important;
        border: 2.5px solid #0078d4 !important; z-index: 9998 !important;
        background: #000 !important;
      `);

      const video = document.getElementById('webgazerVideoFeed') as HTMLVideoElement;
      if (video) {
        video.setAttribute('style', `
          width: 200px !important; height: 170px !important;
          object-fit: cover !important; display: block !important;
          transform: scaleX(-1) !important;
          margin-top: 22px !important;
        `);
      }

      // Hide canvas overlays
      container.querySelectorAll('canvas').forEach(c => {
        (c as HTMLElement).setAttribute('style', 'display: none !important;');
      });

      if (!container.dataset.draggable) {
        container.dataset.draggable = '1';
        makeDraggable(container);
      }
    }

    // Load local webgazer
    const script = document.createElement('script');
    script.src = '/webgazer.js';

    script.onload = () => {
      const wg = (window as any).webgazer;
      if (!wg) return;
      console.log('WebGazer loaded');
      wg.setGazeListener(handleGaze);
      wg.showVideoPreview(true);
      wg.showPredictionPoints(false);
      wg.begin();
      [600, 1200, 2000, 3000].forEach(t => setTimeout(applyVideoStyles, t));
    };

    script.onerror = () => console.error('webgazer.js not found');
    document.head.appendChild(script);

    return () => {
      dot.remove();
      if (dwellRef.current?.timer) clearTimeout(dwellRef.current.timer);
      dwellRef.current = null;
      try { (window as any).webgazer?.end(); } catch (_) {}
      script.remove();
      document.getElementById('webgazerVideoContainer')?.remove();
    };
  }, [enabled]);

  return { registerTarget, setProgressCallback };
}
