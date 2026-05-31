import { FaceMesh } from '@mediapipe/face_mesh';
import { useEffect, useRef, useState } from 'react';

import { useStore } from '../store';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Onboarding } from './Onboarding';

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
  const smoothX =
    useRef(window.innerWidth / 2);

  const smoothY =
    useRef(window.innerHeight / 2);

  // LOAD PROFILE
  useEffect(() => {

    const saved =
      localStorage.getItem('focus-profile');

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
      // landmarks[1]   = nose tip  → head tracking (original)
      // landmarks[468] = left iris center  → true eye tracking (con refineLandmarks: true)
      // landmarks[473] = right iris center → true eye tracking (con refineLandmarks: true)
      // Media degli iris per punto di gaze più stabile:
      const leftIris  = landmarks[468];
      const rightIris = landmarks[473];

      const gaze = {
        x: (leftIris.x + rightIris.x) / 2,
        y: (leftIris.y + rightIris.y) / 2,
      };

      // SCREEN COORDS
      const targetX = window.innerWidth  * (1 - gaze.x);
      const targetY = window.innerHeight * gaze.y;

      // SMOOTHING (0.8/0.2 = più lento ma più stabile; abbassa a 0.6/0.4 per più reattività)
      smoothX.current = smoothX.current * 0.8 + targetX * 0.2;
      smoothY.current = smoothY.current * 0.8 + targetY * 0.2;

      const screenX = smoothX.current;
      const screenY = smoothY.current;

      // DEBUG DOT
      setGazePoint({ x: screenX, y: screenY });

      // TARGET
      const target = document.elementFromPoint(screenX, screenY) as HTMLElement | null;

      if (!target) return;

      // RESET HOVER su tutti gli item
      document.querySelectorAll('.todo-item-wrap').forEach((el) => {
        (el as HTMLElement).classList.remove('gaze-hover');
      });

      // --- RISOLTO BUG #1: selettori corretti per Sidebar ---

      // CHECK BUTTON (TodoItem: data-check-button="true")
      const checkBtn = target.closest(
        '[data-check-button="true"]'
      ) as HTMLElement | null;

      // TODO ITEM WRAP — FIX: il click per espandere va sul wrapper, non su .todo-body
      const todoWrap = target.closest(
        '.todo-item-wrap'
      ) as HTMLElement | null;

      // .todo-body è usato solo per capire se siamo sull'area testo,
      // ma il click viene sparato sul wrapper
      const todoBody = target.closest(
        '.todo-body'
      ) as HTMLElement | null;

      // SIDEBAR NAV — FIX: era data-sidebar-item, ora data-gaze-nav
      const sidebarItem = target.closest(
        '[data-gaze-nav="true"]'
      ) as HTMLElement | null;

      // NEW LIST BUTTON — FIX: era data-new-list-button, ora data-gaze-new-list
      const newListBtn = target.closest(
        '[data-gaze-new-list="true"]'
      ) as HTMLElement | null;

      // VISUAL FEEDBACK sul todo wrap
      if (todoWrap) {
        todoWrap.classList.add('gaze-hover');
      }

      // --- RISOLTO BUG #2: delta calcolato solo quando c'è un elemento valido ---
      const currentElement =
        checkBtn ||
        (todoBody && todoWrap ? todoWrap : null) ||  // usa il wrapper come target del click
        sidebarItem ||
        newListBtn;

      if (!currentElement) {
        hoveredElementRef.current = null;
        hoverTimeRef.current     = 0;
        lastFrameRef.current     = Date.now(); // reset anche qui per evitare delta spike
        return;
      }

      // TIMER — delta calcolato solo qui, quando c'è un elemento valido
      const now   = Date.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      // SAME ELEMENT
      if (hoveredElementRef.current === currentElement) {
        hoverTimeRef.current += delta;
      } else {
        hoveredElementRef.current = currentElement;
        hoverTimeRef.current      = 0;
      }

      // COOLDOWN
      if (clickCooldownRef.current) return;

      // -------------------
      // SIDEBAR ITEM
      // -------------------
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

      // -------------------
      // NEW LIST BUTTON
      // -------------------
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

      // -------------------
      // OPEN TASK — FIX: click su todoWrap, non su .todo-body
      // -------------------
      if (
        todoBody &&
        todoWrap &&
        currentElement === todoWrap &&
        !checkBtn &&                  // evita di aprire mentre si punta al check
        hoverTimeRef.current > 800
      ) {
        clickCooldownRef.current = true;
        todoWrap.click();
        hoverTimeRef.current = 0;
        setTimeout(() => { clickCooldownRef.current = false; }, 1500);
      }

      // -------------------
      // COMPLETE TASK
      // -------------------
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

  }, []);

  function handleOnboarding(p: Profile) {
    localStorage.setItem('focus-profile', JSON.stringify(p));
    setProfile(p);
  }

  return (
    <>
      {/* DEBUG DOT */}
      <div
        style={{
          position: 'fixed',
          left: gazePoint.x - 8,
          top: gazePoint.y - 8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'red',
          zIndex: 999999,
          pointerEvents: 'none',
          boxShadow: '0 0 20px red',
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
        </div>

      )}
    </>
  );
}
