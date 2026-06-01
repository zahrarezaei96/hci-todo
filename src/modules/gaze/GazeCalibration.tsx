import { useState } from 'react';

interface Props {
  onComplete: () => void;
}

const POINTS = [
  { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
  { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
  { x: 10, y: 90 }, { x: 50, y: 90 }, { x: 90, y: 90 },
];

export function GazeCalibration({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);

  const point = POINTS[current];
  const progress = Math.round((current / POINTS.length) * 100);

  function handleClick() {
    if (current + 1 >= POINTS.length) {
      setDone(true);
      setTimeout(onComplete, 1000);
    } else {
      setCurrent(current + 1);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,20,0.97)',
      zIndex: 100000,
      cursor: 'crosshair',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', color: 'white', pointerEvents: 'none',
      }}>
        {done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'sans-serif' }}>Ready!</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, color: '#8b8a97', marginBottom: 8, fontFamily: 'sans-serif' }}>
              Look at the dot and click it
            </div>
            <div style={{ fontSize: 13, color: '#55545f', fontFamily: 'sans-serif' }}>
              {current + 1} / {POINTS.length}
            </div>
            <div style={{
              width: 200, height: 4, background: '#2a2a30',
              borderRadius: 99, margin: '16px auto 0',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: '#0078d4', borderRadius: 99,
                transition: 'width 0.2s',
              }} />
            </div>
          </>
        )}
      </div>

      {!done && (
        <button
          onClick={handleClick}
          style={{
            position: 'absolute',
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 26, height: 26,
            borderRadius: '50%',
            background: '#0078d4',
            border: '3px solid white',
            cursor: 'crosshair',
            boxShadow: '0 0 20px rgba(0,120,212,0.9)',
            animation: 'pulse 1s infinite',
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 10px rgba(0,120,212,0.8); transform: translate(-50%,-50%) scale(1); }
          50% { box-shadow: 0 0 28px rgba(0,120,212,1); transform: translate(-50%,-50%) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
