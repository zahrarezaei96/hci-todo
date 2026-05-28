import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

type Props = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

export default function GestureDateControl({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastGestureTimeRef = useRef<number>(0);

  const [gestureMode, setGestureMode] = useState(false);
  const [status, setStatus] = useState("Gesture mode off");

  useEffect(() => {
    if (!gestureMode || !videoRef.current) return;

    const hands = new Hands({
      locateFile: file =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(results => {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setStatus("No hand detected");
        return;
      }

      const wrist = results.multiHandLandmarks[0][0];
      const currentX = wrist.x;
      const currentY = wrist.y;

      const previousX = lastXRef.current;
      const previousY = lastYRef.current;

      if (previousX !== null && previousY !== null) {
        const movementX = currentX - previousX;
        const movementY = currentY - previousY;
        const now = Date.now();
if (now - lastGestureTimeRef.current > 800) {
  const absX = Math.abs(movementX);
  const absY = Math.abs(movementY);

  if (absY > absX && movementY < -0.08) {
    setStatus("Swipe up detected ↑");
    onSwipeUp?.();
    lastGestureTimeRef.current = now;
  } else if (absY > absX && movementY > 0.08) {
    setStatus("Swipe down detected ↓");
    onSwipeDown?.();
    lastGestureTimeRef.current = now;
  } else if (absX > absY && movementX > 0.08) {
    setStatus("Swipe right detected → next date");
    onSwipeRight?.();
    lastGestureTimeRef.current = now;
  } else if (absX > absY && movementX < -0.08) {
    setStatus("Swipe left detected → previous date");
    onSwipeLeft?.();
    lastGestureTimeRef.current = now;
  } else {
    setStatus("Hand detected");
  }
}
      }

      lastXRef.current = currentX;
      lastYRef.current = currentY;
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 320,
      height: 240,
    });

    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, [gestureMode, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight]);

  return (
    <div className="gesture-panel">
      <button type="button" onClick={() => setGestureMode(!gestureMode)}>
        {gestureMode ? "Disable Gesture Mode" : "Enable Gesture Mode"}
      </button>

      <p>{status}</p>

      {gestureMode && (
        <video
          ref={videoRef}
          style={{
            width: "160px",
            borderRadius: "12px",
            marginTop: "8px",
          }}
        />
      )}
    </div>
  );
}