import { useEffect, useRef, useCallback } from 'react';
import { handsManager } from './handsManager';

const SMOOTH = 8;
const DEAD_ZONE = 10;

export interface GazeTarget {
  id: string;
  action: () => void;
}

export function useGazeTracker(enabled: boolean) {
  const targetsRef = useRef<Map<string, GazeTarget>>(new Map());

  const registerTarget = useCallback((id: string, action: () => void) => {
    targetsRef.current.set(id, { id, action });
    return () => targetsRef.current.delete(id);
  }, []);

  const setProgressCallback = useCallback((_cb: any) => {}, []);

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

    // ── Shared video container ──
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
    video.id = 'shared-webcam-video';
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = `
      width: 200px; height: 170px;
      object-fit: cover; display: block;
      transform: scaleX(-1);
    `;

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
    // Use calibration from onboarding if available (stored on window)
    let refNoseX = (window as any).__noseRefX ?? 0.5;
    let refNoseY = (window as any).__noseRefY ?? 0.4;
    let calibrated = (window as any).__noseCalibrated ?? false;
    const animFrameRef = { current: 0 };
    const runningRef = { current: false };
    const landmarkerRef = { current: null as any };
    const handScrollRef = { lastY: null as number | null, lastTime: 0 };

    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed; top: 16px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,120,212,0.9); color: white;
      padding: 10px 20px; border-radius: 10px;
      font-size: 13px; font-family: sans-serif;
      z-index: 999998; pointer-events: none;
    `;
    hint.textContent = '👃 Look straight and press Space to calibrate';
    document.body.appendChild(hint);

    function calibrate(noseX: number, noseY: number) {
      refNoseX = noseX; refNoseY = noseY;
      calibrated = true;
      (window as any).__noseRefX = noseX;
      (window as any).__noseRefY = noseY;
      (window as any).__noseCalibrated = true;
      hint.textContent = '✓ Calibrated! Use voice commands to interact';
      setTimeout(() => { try { hint.remove(); } catch(_) {} }, 3000);
    }

    const onSpace = (e: KeyboardEvent) => {
      if (e.code === 'Space' && landmarkerRef.current) {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        if (results?.faceLandmarks?.[0]) {
          calibrate(results.faceLandmarks[0][4].x, results.faceLandmarks[0][4].y);
        }
      }
    };
    window.addEventListener('keydown', onSpace);

    function processNose(noseX: number, noseY: number) {
      const SCALE = 3.5;
      let screenX: number, screenY: number;
      if (calibrated) {
        screenX = window.innerWidth / 2 + (refNoseX - noseX) * SCALE * window.innerWidth;
        screenY = window.innerHeight / 2 + (noseY - refNoseY) * SCALE * window.innerHeight;
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
    }

    async function init(retryCount = 0) {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
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

        // Check video is actually showing
        if (video.videoWidth === 0 && retryCount < 3) {
          await new Promise(r => setTimeout(r, 500));
          stream.getTracks().forEach(t => t.stop());
          video.srcObject = null;
          init(retryCount + 1);
          return;
        }

        // Also init hand scroll using same stream
        initHandScroll(stream);

        runningRef.current = true;
        detect();
      } catch (err) {
        console.error('Init error:', err);
        if (retryCount < 3) {
          setTimeout(() => init(retryCount + 1), 1000);
        }
      }
    }

    function initHandScroll(stream: MediaStream) {
      // Use singleton handsManager — prevents multiple Hands instances loading simultaneously
      let anchorY: number | null = null;
      let lastGestureTime = 0;
      const SWIPE_THRESHOLD = 0.06;
      const GESTURE_COOLDOWN = 600;

      handsManager.subscribe('gazeTracker', (results: any) => {
        if (!results.multiHandLandmarks?.length) { anchorY = null; return; }
        const wristY = results.multiHandLandmarks[0][0].y;
        const now = Date.now();

        if (anchorY === null) { anchorY = wristY; return; }
        const delta = wristY - anchorY;

        if (Math.abs(delta) > SWIPE_THRESHOLD && now - lastGestureTime > GESTURE_COOLDOWN) {
          const openDropdownRef = (window as any).__openDropdownRef;
          const openDropdown = openDropdownRef?.current as HTMLElement;
          if (openDropdown) {
            openDropdown.scrollTop += delta > 0 ? 100 : -100;
          } else {
            const taskList = (document.querySelector('.task-list') || document.querySelector('.ob-card')) as HTMLElement;
            taskList?.scrollBy({ top: delta > 0 ? 150 : -150, behavior: 'smooth' });
          }
          lastGestureTime = now;
          anchorY = wristY;
        }
      });

      handsManager.setVideo(video);
    }

    function detect() {
      if (!runningRef.current || !landmarkerRef.current) return;
      if (video.readyState >= 2) {
        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        if (results?.faceLandmarks?.[0]) {
          const nose = results.faceLandmarks[0][4];
          if (nose) processNose(nose.x, nose.y);
        }
      }
      animFrameRef.current = requestAnimationFrame(detect);
    }

    // Delay to ensure webcam is released before reinitializing
    const initTimer = setTimeout(() => { init(); }, 800);

    return () => {
      clearTimeout(initTimer);
      runningRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      handsManager.unsubscribe('gazeTracker');
      handsManager.setVideo(null);
      try { dot.remove(); } catch(_) {}
      try { container.remove(); } catch(_) {}
      try { hint.remove(); } catch(_) {}
      window.removeEventListener('keydown', onSpace);
      try {
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        video.srcObject = null;
      } catch(_) {}
      // Reset global dropdown ref
      (window as any).__openDropdownRef = null;
    };
  }, [enabled]);

  return { registerTarget, setProgressCallback };
}
