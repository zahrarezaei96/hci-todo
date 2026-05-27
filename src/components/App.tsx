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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // DEBUG DOT
  const [gazePoint, setGazePoint] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  // HOVER TRACKING
  const hoveredTodoRef = useRef<HTMLElement | null>(null);

  // TEMPO SGUARDO
  const hoverTimeRef = useRef(0);

  // TEMPO FRAME
  const lastFrameRef = useRef(Date.now());

  // COOLDOWN CLICK
  const clickCooldownRef = useRef(false);

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

      locateFile: (file) => {

        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;

      }

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
      const targetX =
        window.innerWidth * (1 - nose.x);

      const targetY =
        window.innerHeight * nose.y;

      // SMOOTHING
      smoothX.current =
        smoothX.current * 0.7 +
        targetX * 0.3;

      smoothY.current =
        smoothY.current * 0.7 +
        targetY * 0.3;

      const screenX = smoothX.current;
      const screenY = smoothY.current;

      // DEBUG DOT
      setGazePoint({
        x: screenX,
        y: screenY,
      });

      // REMOVE OLD HOVER
      document
        .querySelectorAll('.todo-item-wrap')
        .forEach((el) => {

          (el as HTMLElement)
            .classList
            .remove('gaze-hover');

        });

      // TARGET
      const target =
        document.elementFromPoint(
          screenX,
          screenY
        );

      if (!target) return;

      const todo = target.closest(
        '.todo-item-wrap'
      ) as HTMLElement | null;

      if (!todo) {

        hoveredTodoRef.current = null;
        hoverTimeRef.current = 0;

        return;

      }

      // VISUAL HOVER
      todo.classList.add('gaze-hover');

      // DELTA TIME
      const now = Date.now();

      const delta =
        now - lastFrameRef.current;

      lastFrameRef.current = now;

      // STESSA TASK
      if (hoveredTodoRef.current === todo) {

        hoverTimeRef.current += delta;

      } else {

        hoveredTodoRef.current = todo;

        hoverTimeRef.current = 0;

      }

      // CHECK DOPO 2.4 SECONDI
      if (
        hoverTimeRef.current > 2400 &&
        !clickCooldownRef.current
      ) {

        clickCooldownRef.current = true;

        const checkBtn = todo.querySelector(
          '[data-check-button="true"]'
        ) as HTMLElement | null;

        if (checkBtn) {

          checkBtn.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );

        }

        hoverTimeRef.current = 0;

        setTimeout(() => {

          clickCooldownRef.current = false;

        }, 1500);

      }

    });

    navigator.mediaDevices
      .getUserMedia({

        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }

      })
      .then(async (stream) => {

        console.log('Webcam OK');

        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        const detect = async () => {

          if (!running) return;

          if (videoRef.current) {

            await faceMesh.send({

              image: videoRef.current

            });

          }

          requestAnimationFrame(detect);

        };

        detect();

      })
      .catch((err) => {

        console.error(
          'Webcam error:',
          err
        );

      });

    return () => {

      running = false;

      const stream =
        videoRef.current
          ?.srcObject as MediaStream | null;

      stream
        ?.getTracks()
        .forEach(track => track.stop());

    };

  }, []);

  function handleOnboarding(
    p: Profile
  ) {

    localStorage.setItem(
      'focus-profile',
      JSON.stringify(p)
    );

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
        style={{
          display: 'none'
        }}
      />

      {!loaded ? null : !profile ? (

        <Onboarding
          onComplete={
            handleOnboarding
          }
        />

      ) : (

        <div
          className={`app-layout ${
            !state.sidebarOpen
              ? 'app-layout--collapsed'
              : ''
          }`}
        >

          <Sidebar
            profile={profile}
            onProfileChange={(p) => {

              localStorage.setItem(
                'focus-profile',
                JSON.stringify(p)
              );

              setProfile(p);

            }}
          />

          <MainContent />

        </div>

      )}

    </>

  );

}