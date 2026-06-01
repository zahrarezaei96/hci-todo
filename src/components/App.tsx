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

      // NASO
      const nose = landmarks[1];

      // SCREEN COORDS
      const targetX = window.innerWidth  * (1 - nose.x);
      const targetY = window.innerHeight * nose.y;

      // SMOOTHING ADATTIVO
      const dx   = targetX - smoothX.current;
      const dy   = targetY - smoothY.current;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const alpha =
        dist > 200 ? 0.3  :
        dist > 80  ? 0.15 :
                     0.06;

      smoothX.current = smoothX.current * (1 - alpha) + targetX * alpha;
      smoothY.current = smoothY.current * (1 - alpha) + targetY * alpha;

      // CLAMP
      const screenX = Math.max(0, Math.min(window.innerWidth,  smoothX.current));
      const screenY = Math.max(0, Math.min(window.innerHeight, smoothY.current));

      // DEBUG DOT
      setGazePoint({ x: screenX, y: screenY });

      // TARGET
      const target = document.elementFromPoint(screenX, screenY) as HTMLElement | null;

      if (!target) return;

      // RESET HOVER
      document.querySelectorAll('.todo-item-wrap').forEach((el) => {
        (el as HTMLElement).classList.remove('gaze-hover');
      });

      // --- SELETTORI ---

      // STEP CHECK
      const stepBtn = target.closest(
        '[data-gaze-step]'
      ) as HTMLElement | null;

      // CHECK BUTTON
      const checkBtn = target.closest(
        '[data-check-button="true"]'
      ) as HTMLElement | null;

      // STAR
      const starBtn = target.closest(
        '[data-gaze-star="true"]'
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

      // NEW LIST BUTTON (apri form)
      const newListBtn = target.closest(
        '[data-gaze-new-list="true"]'
      ) as HTMLElement | null;

      // NEW LIST CONFIRM
      const newListConfirm = target.closest(
        '[data-gaze-new-list-confirm="true"]'
      ) as HTMLElement | null;

      // NEW LIST CANCEL
      const newListCancel = target.closest(
        '[data-gaze-new-list-cancel="true"]'
      ) as HTMLElement | null;

      // EDIT PROFILE
      const editProfile = target.closest(
        '[data-gaze-edit-profile="true"]'
      ) as HTMLElement | null;

      // TOGGLE SIDEBAR
      const menuBtn = target.closest(
        '.menu-btn'
      ) as HTMLElement | null;

      // ADD TASK OPEN (bottone +)
      const addTaskOpen = target.closest(
        '[data-gaze-add-task-open="true"]'
      ) as HTMLElement | null;

      // PRIORITY PILL
      const priorityBtn = target.closest(
        '[data-gaze-priority]'
      ) as HTMLElement | null;

      // ADD TASK CONFIRM
      const addTaskBtn = target.closest(
        '[data-gaze-add-task="true"]'
      ) as HTMLElement | null;

      // CANCEL TASK
      const cancelTaskBtn = target.closest(
        '[data-gaze-cancel-task="true"]'
      ) as HTMLElement | null;

      // FILTER TOGGLE
      const filterToggle = target.closest(
        '[data-gaze-filter-toggle="true"]'
      ) as HTMLElement | null;

      // FILTER BUTTON
      const filterBtn = target.closest(
        '[data-gaze-filter]'
      ) as HTMLElement | null;

      // INPUT / TEXTAREA
      const inputField = target.closest(
        '[data-gaze-input]'
      ) as HTMLElement | null;

      // VISUAL FEEDBACK
      if (todoWrap) {
        todoWrap.classList.add('gaze-hover');
      }

      const currentElement =
        stepBtn         ||
        checkBtn        ||
        starBtn         ||
        addTaskBtn      ||
        cancelTaskBtn   ||
        priorityBtn     ||
        addTaskOpen     ||
        filterBtn       ||
        filterToggle    ||
        newListConfirm  ||
        newListCancel   ||
        editProfile     ||
        menuBtn         ||
        inputField      ||
        (todoBody && todoWrap ? todoWrap : null) ||
        sidebarItem     ||
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

      // Helper per click semplici a 1000ms
      function gazeClick(el: HTMLElement | null, ms = 1000, cooldown = 1500) {
        if (!el || currentElement !== el) return;
        if (hoverTimeRef.current > ms) {
          clickCooldownRef.current = true;
          el.click();
          hoverTimeRef.current = 0;
          setTimeout(() => { clickCooldownRef.current = false; }, cooldown);
        }
      }

      // SIDEBAR ITEM
      gazeClick(sidebarItem);

      // NEW LIST (apri form)
      gazeClick(newListBtn);

      // NEW LIST CONFIRM
      gazeClick(newListConfirm);

      // NEW LIST CANCEL
      gazeClick(newListCancel);

      // EDIT PROFILE
      gazeClick(editProfile);

      // TOGGLE SIDEBAR
      gazeClick(menuBtn);

      // ADD TASK OPEN
      gazeClick(addTaskOpen);

      // PRIORITY PILL
      gazeClick(priorityBtn);

      // ADD TASK CONFIRM
      gazeClick(addTaskBtn);

      // CANCEL TASK
      gazeClick(cancelTaskBtn);

      // FILTER TOGGLE
      gazeClick(filterToggle);

      // FILTER BUTTON
      gazeClick(filterBtn);

      // STAR
      gazeClick(starBtn);

      // TOGGLE STEP
      gazeClick(stepBtn);

      // OPEN TASK
      if (
        todoBody &&
        todoWrap &&
        currentElement === todoWrap &&
        !checkBtn &&
        !stepBtn &&
        !starBtn &&
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

      // INPUT FOCUS — dwell più lungo per evitare focus accidentali
      if (
        inputField &&
        currentElement === inputField &&
        hoverTimeRef.current > 1500
      ) {
        clickCooldownRef.current = true;
        (inputField as HTMLInputElement).focus();
        hoverTimeRef.current = 0;
        setTimeout(() => { clickCooldownRef.current = false; }, 2000);
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
