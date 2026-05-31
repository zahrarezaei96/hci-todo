import { FaceMesh } from '@mediapipe/face_mesh';
import { useEffect, useRef, useState } from 'react';

import { useStore } from '../store';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Onboarding } from './Onboarding';
import { CalibrationOverlay } from './CalibrationOverlay';
import { AffineTransform, applyTransform } from './useCalibration';

interface Profile {
  name: string;
  gender: 'male' | 'female';
  birthday: string;
  avatar: string;
}

export function App() {

  const { state } = useStore();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loaded, setLoaded] =
    useState(false);

  // CALIBRAZIONE
  const [showCalibration, setShowCalibration] =
    useState(false);

  const [calibrationDone, setCalibrationDone] =
    useState(false);

  const transformRef =
    useRef<AffineTransform | null>(null);

  // Iris grezza passata a CalibrationOverlay
  const [rawIris, setRawIris] =
    useState({ x: 0.5, y: 0.5 });

  // DEBUG DOT
  const [gazePoint, setGazePoint] =
    useState({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

  const videoRef =
    useRef<HTMLVideoElement>(null);

  // HOVER
  const hoveredElementRef =
    useRef<HTMLElement | null>(null);

  const hoverTimeRef =
    useRef(0);

  const lastFrameRef =
    useRef(Date.now());

  const clickCooldownRef =
    useRef(false);

  // SMOOTHING
  const smoothX = useRef(window.innerWidth / 2);
  const smoothY = useRef(window.innerHeight / 2);

  // LOAD PROFILE
  useEffect(() => {

    const saved = localStorage.getItem('focus-profile');

    if (saved) {
      setProfile(JSON.parse(saved));
    }

    setLoaded(true);

  }, []);

  // FACEMESH
  useEffect(() => {

    console.log('FaceMesh started');

    if (!videoRef.current) return;

    let running = true;

    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    faceMesh.onResults((results) => {

      if (!results.multiFaceLandmarks?.length) return;

      const landmarks = results.multiFaceLandmarks[0];

      // LANDMARK SELECTION
      const leftIris  = landmarks[468];
      const rightIris = landmarks[473];
      const leftEye   = landmarks[33];
      const rightEye  = landmarks[263];

      // Offset iris rispetto al centro della testa
      const headCenterX = (leftEye.x + rightEye.x) / 2;
      const headCenterY = (leftEye.y + rightEye.y) / 2;

      const irisX = ((leftIris.x + rightIris.x) / 2) - headCenterX;
      const irisY = ((leftIris.y + rightIris.y) / 2) - headCenterY;

      // Aggiorna iris grezza per CalibrationOverlay
      setRawIris({ x: irisX, y: irisY });

      // CALCOLO POSIZIONE SCHERMO
      let targetX: number;
      let targetY: number;

      if (transformRef.current) {
        // Con calibrazione: trasformazione affine
        const p = applyTransform(transformRef.current, irisX, irisY);
        targetX = p.x;
        targetY = p.y;
      } else {
        // Senza calibrazione: fallback sensitivity fissa
        const sensitivity = 50;
        targetX = window.innerWidth  * (0.5 - irisX * sensitivity);
        targetY = window.innerHeight * (0.5 + irisY * sensitivity);
      }

      // CLAMP ai bordi dello schermo
      targetX = Math.max(0, Math.min(window.innerWidth,  targetX));
      targetY = Math.max(0, Math.min(window.innerHeight, targetY));

      // SMOOTHING ADATTIVO
      // Movimenti grandi (saccadi intenzionali) → meno smoothing, più reattività
      // Movimenti piccoli (microtremori)         → più smoothing, più stabilità
      const dx   = targetX - smoothX.current;
      const dy   = targetY - smoothY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const alpha =
        dist > 200 ? 0.3  :  // salto grande: segui velocemente
        dist > 80  ? 0.15 :  // movimento medio
                     0.06;   // microtremore: ignora quasi tutto

      smoothX.current = smoothX.current * (1 - alpha) + targetX * alpha;
      smoothY.current = smoothY.current * (1 - alpha) + targetY * alpha;

      const screenX = smoothX.current;
      const screenY = smoothY.current;

      // DEBUG DOT
      setGazePoint({ x: screenX, y: screenY });

      // Non processare click durante la calibrazione
      if (showCalibration) return;

      // TARGET
      const target = document.elementFromPoint(screenX, screenY) as HTMLElement | null;

      if (!target) return;

      // RESET HOVER
      document.querySelectorAll('.todo-item-wrap').forEach((el) => {
        (el as HTMLElement).classList.remove('gaze-hover');
      });

      // CHECK BUTTON
      const checkBtn = target.closest(
        '[data-check-button="true"]'
      ) as HTMLElement | null;

      // TODO ITEM WRAP
      const todoWrap = target.closest(
        '.todo-item-wrap'
      ) as HTMLElement | null;

      const todoBody = target.closest(
        '.todo-body'
      ) as HTMLElement | null;

      // SIDEBAR NAV
      const sidebarItem = target.closest(
        '[data-gaze-nav="true"]'
      ) as HTMLElement | null;

      // NEW LIST BUTTON
      const newListBtn = target.closest(
        '[data-gaze-new-list="true"]'
      ) as HTMLElement | null;

      // VISUAL FEEDBACK
      if (todoWrap) {
        todoWrap.classList.add('gaze-hover');
      }

      const currentElement =
        checkBtn ||
        (todoBody && todoWrap ? todoWrap : null) ||
        sidebarItem ||
        newListBtn;

      if (!currentElement) {
        hoveredElementRef.current = null;
        hoverTimeRef.current      = 0;
        lastFrameRef.current      = Date.now();
        return;
      }

      // TIMER
      const now   = Date.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      if (hoveredElementRef.current === currentElement) {
        hoverTimeRef.current += delta;
      } else {
        hoveredElementRef.current = currentElement;
        hoverTimeRef.current      = 0;
      }

      // COOLDOWN
      if (clickCooldownRef.current) return;

      // SIDEBAR ITEM
      if (
        sidebarItem &&
        currentElement === sidebarItem &&
        hoverTimeRef.current > 1000
      ) {
        clickCooldownRef.current = true;
        sidebarItem.click();
        hoverTimeRef.current = 0;
        setTimeout(() => { clickCooldownRef.current = false; }, 1500);
      }

      // NEW LIST BUTTON
      if (
        newListBtn &&
        currentElement === newListBtn &&
        hoverTimeRef.current > 1000
      ) {
        clickCooldownRef.current = true;
        newListBtn.click();
        hoverTimeRef.current = 0;
        setTimeout(() => { clickCooldownRef.current = false; }, 1500);
      }

      // OPEN TASK
      if (
        todoBody &&
        todoWrap &&
        currentElement === todoWrap &&
        !checkBtn &&
        hoverTimeRef.current > 800
      ) {
        clickCooldownRef.current = true;
        todoWrap.click();
        hoverTimeRef.current = 0;
        setTimeout(() => { clickCooldownRef.current = false; }, 1500);
      }

      // COMPLETE TASK
      if (
        checkBtn &&
        currentElement === checkBtn &&
        hoverTimeRef.current > 1000
      ) {
        clickCooldownRef.current = true;
        checkBtn.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
        hoverTimeRef.current = 0;
        setTimeout(() => { clickCooldownRef.current = false; }, 1500);
      }

    });

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user',
        },
      })
      .then(async (stream) => {

        console.log('Webcam OK');

        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detect = async () => {
          if (!running) return;
          if (videoRef.current) {
            await faceMesh.send({ image: videoRef.current });
          }
          requestAnimationFrame(detect);
        };

        detect();

      })
      .catch((err) => {
        console.error('Webcam error:', err);
      });

    return () => {
      running = false;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };

  }, [showCalibration]);

  function handleOnboarding(p: Profile) {
    localStorage.setItem('focus-profile', JSON.stringify(p));
    setProfile(p);
    setShowCalibration(true);
  }

  function handleCalibrationComplete(transform: AffineTransform) {
    transformRef.current = transform;
    setCalibrationDone(true);
    setShowCalibration(false);
  }

  return (
    <>
      {/* DEBUG DOT */}
      <div
        style={{
          position:      'fixed',
          left:          gazePoint.x - 8,
          top:           gazePoint.y - 8,
          width:         16,
          height:        16,
          borderRadius:  '50%',
          background:    'red',
          zIndex:        999999,
          pointerEvents: 'none',
          boxShadow:     '0 0 20px red',
        }}
      />

      {/* VIDEO */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* CALIBRAZIONE */}
      {showCalibration && (
        <CalibrationOverlay
          irisX={rawIris.x}
          irisY={rawIris.y}
          onComplete={handleCalibrationComplete}
          onSkip={() => setShowCalibration(false)}
        />
      )}

      {!loaded ? null : !profile ? (

        <Onboarding onComplete={handleOnboarding} />

      ) : (

        <div
          className={`app-layout ${
            !state.sidebarOpen ? 'app-layout--collapsed' : ''
          }`}
        >
          <Sidebar
            profile={profile}
            onProfileChange={(p) => {
              localStorage.setItem('focus-profile', JSON.stringify(p));
              setProfile(p);
            }}
          />
          <MainContent />

          {/* Bottone ricalibrazione */}
          <button
            onClick={() => setShowCalibration(true)}
            style={{
              position:     'fixed',
              bottom:       16,
              right:        16,
              padding:      '8px 14px',
              background:   calibrationDone ? '#107c10' : '#ca5010',
              border:       'none',
              borderRadius: 8,
              color:        '#fff',
              fontSize:     12,
              cursor:       'pointer',
              zIndex:       9999,
              opacity:      0.8,
            }}
          >
            {calibrationDone ? '✓ Recalibrate' : 'Calibrate'}
          </button>
        </div>

      )}
    </>
  );
}
