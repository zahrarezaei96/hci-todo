import { useEffect, useRef, useCallback } from 'react';

const DWELL_TIME = 2500;
const SMOOTH = 10;
const DEAD_ZONE = 15;

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
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    containerRef.current = container;

    const handle = document.createElement('div');
    handle.style.cssText = `
      width: 100%; height: 22px;
      background: rgba(0,120,212,0.85);
      cursor: grab; display: flex;
      align-items: center; justify-content: center;
      user-select: none; flex-shrink: 0;
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

    // Drag logic
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

    function processGaze(screenX: number, screenY: number) {
      xBuf.push(screenX); yBuf.push(screenY);
      if (xBuf.length > SMOOTH) { xBuf.shift(); yBuf.shift(); }
      const rawX = xBuf.reduce((a, b) => a + b) / xBuf.length;
      const rawY = yBuf.reduce((a, b) => a + b) / yBuf.length;

      const dx = Math.abs(rawX - lastX);
      const dy = Math.abs(rawY - lastY);
      if (dx < DEAD_ZONE && dy < DEAD_ZONE) return;
      lastX = rawX; lastY = rawY;

      dot.style.display = 'block';
      dot.style.left = `${rawX}px`;
      dot.style.top = `${rawY}px`;

      // Check gaze targets
      let gazedId: string | null = null;
      targetsRef.current.forEach((_, id) => {
        const el = document.querySelector(`[data-gaze-id="${id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rawX >= rect.left && rawX <= rect.right && rawY >= rect.top && rawY <= rect.bottom) {
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

    // ── MediaPipe Face Landmarker ──
    let faceLandmarker: any = null;
    let running = true;

    async function initMediaPipe() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        // Get camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        video.srcObject = stream;
        await video.play();

        console.log('MediaPipe Face Landmarker ready');
        detect();
      } catch (err) {
        console.error('MediaPipe init error:', err);
      }
    }

    function detect() {
      if (!running || !faceLandmarker || !videoRef.current) return;

      const v = videoRef.current;
      if (v.readyState >= 2) {
        const results = faceLandmarker.detectForVideo(v, performance.now());

        if (results?.faceLandmarks?.[0]) {
          const landmarks = results.faceLandmarks[0];

          // Iris landmarks: 468-471 = left iris, 473-476 = right iris
          // Use left iris center (landmark 468) and right iris center (473)
          const leftIris = landmarks[468];
          const rightIris = landmarks[473];

          if (leftIris && rightIris) {
            // Average of both irises — mirror the x because video is mirrored
            const irisX = 1 - ((leftIris.x + rightIris.x) / 2);
            const irisY = (leftIris.y + rightIris.y) / 2;

            // Map iris position to screen
            // Iris typically moves in a smaller range, so we scale it up
            const scaleX = 2.2;
            const scaleY = 2.8;
            const centerX = 0.5, centerY = 0.42;

            const screenX = window.innerWidth * (centerX + (irisX - centerX) * scaleX);
            const screenY = window.innerHeight * (centerY + (irisY - centerY) * scaleY);

            processGaze(
              Math.max(0, Math.min(window.innerWidth, screenX)),
              Math.max(0, Math.min(window.innerHeight, screenY))
            );
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(detect);
    }

    initMediaPipe();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (dwellRef.current?.timer) clearTimeout(dwellRef.current.timer);
      dwellRef.current = null;
      dot.remove();
      container.remove();
      // Stop camera
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  return { registerTarget, setProgressCallback };
}
