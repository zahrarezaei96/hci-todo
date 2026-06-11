import { useEffect, useRef, useCallback } from 'react';

const DWELL_TIME = 2500;
const SMOOTH = 8;
const DEAD_ZONE = 10;

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
  const animFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const runningRef = useRef(false);

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
      transition: left 0.06s ease-out, top 0.06s ease-out;
    `;
    document.body.appendChild(dot);

    // ── Video container (draggable) ──
    const container = document.createElement('div');
    container.id = 'gaze-video-container';
    container.style.cssText = `
      position: fixed; bottom: 16px; right: 16px;
      width: 200px; height: 192px;
      border-radius: 14px; overflow: hidden;
      border: 2.5px solid #0078d4;
      z-index: 9998; background: #000;
    `;

    const handle = document.createElement('div');
    handle.style.cssText = `
      width: 100%; height: 22px;
      background: rgba(0,120,212,0.85);
      cursor: grab; display: flex;
      align-items: center; justify-content: center;
      user-select: none;
    `;
    handle.innerHTML = `<span style="color:white;font-size:11px;font-family:sans-serif;">⠿ drag</span>`;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = `
      width: 200px; height: 170px;
      object-fit: cover; display: block;
      transform: scaleX(-1);
    `;
    videoRef.current = video;

    container.appendChild(handle);
    container.appendChild(video);
    document.body.appendChild(container);

    // Drag
    let dragging = false, sx = 0, sy = 0, sr = 16, sb = 16;
    handle.addEventListener('mousedown', (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = container.getBoundingClientRect();
      sr = window.innerWidth - r.right; sb = window.innerHeight - r.bottom;
      handle.style.cursor = 'grabbing'; e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      container.style.right = `${Math.max(0, sr - (e.clientX - sx))}px`;
      container.style.bottom = `${Math.max(0, sb - (e.clientY - sy))}px`;
      container.style.left = 'auto'; container.style.top = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; handle.style.cursor = 'grab'; });

    // Smoothing
    const xBuf: number[] = [], yBuf: number[] = [];
    let lastX = -999, lastY = -999;

    // Calibration offset — user clicks to set reference point
    let offsetX = 0, offsetY = 0;
    let refNoseX = 0.5, refNoseY = 0.4;
    let calibrated = false;

    // Show calibration hint
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed; top: 16px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,120,212,0.9); color: white;
      padding: 10px 20px; border-radius: 10px;
      font-size: 13px; font-family: sans-serif;
      z-index: 999998; pointer-events: none;
    `;
    hint.textContent = '👃 Look straight at the screen and press Space to calibrate';
    document.body.appendChild(hint);

    function calibrate(noseX: number, noseY: number) {
      refNoseX = noseX;
      refNoseY = noseY;
      offsetX = window.innerWidth / 2 - (noseX * window.innerWidth);
      offsetY = window.innerHeight / 2 - (noseY * window.innerHeight);
      calibrated = true;
      hint.textContent = '✓ Calibrated! Move your nose to control the cursor';
      setTimeout(() => hint.remove(), 3000);
    }

    const onSpace = (e: KeyboardEvent) => {
      if (e.code === 'Space' && landmarkerRef.current) {
        const v = videoRef.current;
        if (!v || v.readyState < 2) return;
        const results = landmarkerRef.current.detectForVideo(v, performance.now());
        if (results?.faceLandmarks?.[0]) {
          // Nose tip = landmark 4
          const nose = results.faceLandmarks[0][4];
          calibrate(nose.x, nose.y);
        }
      }
    };
    window.addEventListener('keydown', onSpace);

    function processNose(noseX: number, noseY: number) {
      // Scale nose movement to screen
      const SCALE = 3.5;
      let screenX: number, screenY: number;

      if (calibrated) {
        const dx = (refNoseX - noseX) * SCALE;
        const dy = (noseY - refNoseY) * SCALE;
        screenX = window.innerWidth / 2 + dx * window.innerWidth;
        screenY = window.innerHeight / 2 + dy * window.innerHeight;
      } else {
        screenX = noseX * window.innerWidth;
        screenY = noseY * window.innerHeight;
      }

      screenX = Math.max(0, Math.min(window.innerWidth, screenX));
      screenY = Math.max(0, Math.min(window.innerHeight, screenY));

      xBuf.push(screenX); yBuf.push(screenY);
      if (xBuf.length > SMOOTH) { xBuf.shift(); yBuf.shift(); }
      const x = xBuf.reduce((a, b) => a + b) / xBuf.length;
      const y = yBuf.reduce((a, b) => a + b) / yBuf.length;

      if (Math.abs(x - lastX) < DEAD_ZONE && Math.abs(y - lastY) < DEAD_ZONE) return;
      lastX = x; lastY = y;

      dot.style.display = 'block';
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      // Check dwell targets
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

    // ── MediaPipe Face Landmarker ──
    async function init() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

      console.log('GazeCloudAPI loaded, starting...');

        landmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        video.srcObject = stream;
        await video.play();

        console.log('Nose tracking ready — press Space to calibrate');
        runningRef.current = true;
        detect();
      } catch (err) {
        console.error('Init error:', err);
      }
    }

    function detect() {
      if (!runningRef.current || !landmarkerRef.current) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(v, performance.now());
        if (results?.faceLandmarks?.[0]) {
          const nose = results.faceLandmarks[0][4]; // nose tip
          if (nose) processNose(nose.x, nose.y);
        }
      }
      animFrameRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      runningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (dwellRef.current?.timer) clearTimeout(dwellRef.current.timer);
      dwellRef.current = null;
      dot.remove();
      container.remove();
      hint.remove();
      window.removeEventListener('keydown', onSpace);
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  return { registerTarget, setProgressCallback };
}
