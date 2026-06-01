import { useState, useEffect } from 'react';

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
  const [clicks, setClicks] = useState(0);
  const [done, setDone] = useState(false);
  const CLICKS_PER_POINT = 3;

  const point = POINTS[current];
  const totalClicks = POINTS.length * CLICKS_PER_POINT;
  const progress = Math.round(((current * CLICKS_PER_POINT + clicks) / totalClicks) * 100);

  function handleClick() {
    const wg = (window as any).webgazer;
    if (wg) {
      // Manually record calibration click
      wg.recordScreenPosition(
        window.innerWidth * (point.x / 100),
        window.innerHeight * (point.y / 100),
        'click'
      );
    }

    const newClicks = clicks + 1;
    if (newClicks >= CLICKS_PER_POINT) {
      if (current + 1 >= POINTS.length) {
        setDone(true);
        setTimeout(onComplete, 1500);
      } else {
        setCurrent(current + 1);
        setClicks(0);
      }
    } else {
      setClicks(newClicks);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,15,20,0.96)',
      zIndex: 100000,
      cursor: 'crosshair',
    }}>
      {/* Instructions */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', color: 'white', pointerEvents: 'none',
      }}>
        {done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Calibration complete!</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, color: '#8b8a97', marginBottom: 8 }}>
              Look at the dot and click on it
            </div>
            <div style={{ fontSize: 13, color: '#55545f' }}>
              {current + 1} / {POINTS.length} points — click {CLICKS_PER_POINT - clicks} more times
            </div>
            {/* Progress bar */}
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

      {/* Calibration dot */}
      {!done && (
        <button
          onClick={handleClick}
          style={{
            position: 'absolute',
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: 'translate(-50%, -50%)',
            width: 24, height: 24,
            borderRadius: '50%',
            background: clicks > 0 ? `rgba(0,120,212,${0.3 + clicks * 0.25})` : '#0078d4',
            border: '3px solid white',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,120,212,0.8)',
            animation: 'pulse 1s infinite',
            transition: 'background 0.2s',
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0,120,212,0.8); }
          50% { box-shadow: 0 0 24px rgba(0,120,212,1); }
        }
      `}</style>
    </div>
  );
}
