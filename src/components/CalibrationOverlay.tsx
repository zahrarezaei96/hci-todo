// CalibrationOverlay.tsx

import { useEffect, useRef, useState } from 'react';
import {
  getCalibrationTargets,
  computeAffineTransform,
  CalibrationPoint,
  AffineTransform,
} from './useCalibration';

const SAMPLES_PER_POINT = 60;  // più campioni = media più stabile
const DWELL_MS          = 1500; // più tempo per stabilizzarsi sul punto

interface Props {
  irisX: number;
  irisY: number;
  onComplete: (transform: AffineTransform) => void;
  onSkip: () => void;
}

type Phase = 'intro' | 'calibrating' | 'done';

export function CalibrationOverlay({
  irisX,
  irisY,
  onComplete,
  onSkip,
}: Props) {

  const targets = getCalibrationTargets(
    window.innerWidth,
    window.innerHeight
  );

  const [phase, setPhase]           = useState<Phase>('intro');
  const [pointIndex, setPointIndex] = useState(0);
  const [progress, setProgress]     = useState(0);
  const [collected, setCollected]   = useState<CalibrationPoint[]>([]);

  const samplesRef  = useRef<{ x: number; y: number }[]>([]);
  const dwellRef    = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {

    if (phase !== 'calibrating') return;

    const now   = Date.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    dwellRef.current += delta;

    if (dwellRef.current < DWELL_MS) {
      setProgress(
        Math.round((dwellRef.current / DWELL_MS) * 30)
      );
      return;
    }

    samplesRef.current.push({ x: irisX, y: irisY });

    const pct = Math.round(
      30 + (samplesRef.current.length / SAMPLES_PER_POINT) * 70
    );
    setProgress(Math.min(pct, 100));

    if (samplesRef.current.length >= SAMPLES_PER_POINT) {

      // Filtraggio outlier: scarta il 10% più estremo in X e in Y
      const trim = Math.floor(samplesRef.current.length * 0.1);

      const sortedX = [...samplesRef.current].sort((a, b) => a.x - b.x);
      const middleX = sortedX.slice(trim, sortedX.length - trim);
      const avgX    = middleX.reduce((s, p) => s + p.x, 0) / middleX.length;

      const sortedY = [...samplesRef.current].sort((a, b) => a.y - b.y);
      const middleY = sortedY.slice(trim, sortedY.length - trim);
      const avgY    = middleY.reduce((s, p) => s + p.y, 0) / middleY.length;

      const target = targets[pointIndex];

      const newPoint: CalibrationPoint = {
        screenX: target.x,
        screenY: target.y,
        irisX:   avgX,
        irisY:   avgY,
      };

      const newCollected = [...collected, newPoint];
      setCollected(newCollected);

      if (pointIndex + 1 >= targets.length) {
        const transform = computeAffineTransform(newCollected);
        if (transform) {
          setPhase('done');
          setTimeout(() => onComplete(transform), 600);
        } else {
          restart();
        }
      } else {
        samplesRef.current = [];
        dwellRef.current   = 0;
        setProgress(0);
        setPointIndex(pointIndex + 1);
      }
    }

  }, [irisX, irisY]);

  function restart() {
    samplesRef.current = [];
    dwellRef.current   = 0;
    setProgress(0);
    setPointIndex(0);
    setCollected([]);
    setPhase('calibrating');
  }

  const currentTarget =
    phase === 'calibrating' ? targets[pointIndex] : null;

  const R    = 22;
  const C    = 2 * Math.PI * R;
  const dash = C - (progress / 100) * C;

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         99999,
      background:     'rgba(0,0,0,0.85)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      fontFamily:     'sans-serif',
      color:          '#fff',
    }}>

      {phase === 'intro' && (
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <h2 style={{ fontSize: 24, marginBottom: 12 }}>
            Eye tracking calibration
          </h2>
          <p style={{ color: '#aaa', lineHeight: 1.6, marginBottom: 32 }}>
            Nine points will appear on screen one at a time.
            Fix your gaze on each point until the circle fills up.
            Keep your head still and move only your eyes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={restart}
              style={{
                padding:      '10px 28px',
                background:   '#0078d4',
                border:       'none',
                borderRadius: 8,
                color:        '#fff',
                fontSize:     15,
                cursor:       'pointer',
              }}
            >
              Start calibration
            </button>
            <button
              onClick={onSkip}
              style={{
                padding:      '10px 28px',
                background:   'transparent',
                border:       '1px solid #555',
                borderRadius: 8,
                color:        '#aaa',
                fontSize:     15,
                cursor:       'pointer',
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {phase === 'calibrating' && currentTarget && (
        <>
          <div style={{
            position:  'fixed',
            top:       24,
            left:      '50%',
            transform: 'translateX(-50%)',
            color:     '#aaa',
            fontSize:  14,
          }}>
            Point {pointIndex + 1} of {targets.length} — look at the circle
          </div>

          <div style={{
            position: 'fixed',
            left:     currentTarget.x - 28,
            top:      currentTarget.y - 28,
            width:    56,
            height:   56,
          }}>
            <svg width="56" height="56">
              <circle
                cx="28" cy="28" r={R}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="3"
              />
              <circle
                cx="28" cy="28" r={R}
                fill="none"
                stroke="#0078d4"
                strokeWidth="3"
                strokeDasharray={C}
                strokeDashoffset={dash}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
              <circle cx="28" cy="28" r="5" fill="#fff" />
            </svg>
          </div>
        </>
      )}

      {phase === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <p style={{ color: '#aaa' }}>Calibration complete</p>
        </div>
      )}

    </div>
  );
}
