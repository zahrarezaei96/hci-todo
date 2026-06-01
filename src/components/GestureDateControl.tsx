import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

type Props = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onThumbsUp?: () => void;
};

export default function GestureDateControl({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  onThumbsUp,
}: Props)  {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastGestureTimeRef = useRef<number>(0);

  const [gestureMode, setGestureMode] = useState(false);
  const [status, setStatus] = useState("Gesture mode off");
  const [lastGesture, setLastGesture] = useState("None");

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
      const thumbTip = results.multiHandLandmarks[0][4];
const indexTip = results.multiHandLandmarks[0][8];
const middleTip = results.multiHandLandmarks[0][12];
const ringTip = results.multiHandLandmarks[0][16];
const pinkyTip = results.multiHandLandmarks[0][20];

const isThumbsUp =
  thumbTip.y < indexTip.y &&
  thumbTip.y < middleTip.y &&
  thumbTip.y < ringTip.y &&
  thumbTip.y < pinkyTip.y;
      const currentX = wrist.x;
      const currentY = wrist.y;

      const previousX = lastXRef.current;
      const previousY = lastYRef.current;

      if (previousX !== null && previousY !== null) {
        const movementX = currentX - previousX;
        const movementY = currentY - previousY;
        const now = Date.now();
if (now - lastGestureTimeRef.current > 800) {

    if (isThumbsUp) {
  setStatus("Thumbs up detected 👍");
  setLastGesture("👍 Confirm Date");
  onThumbsUp?.();
  lastGestureTimeRef.current = now;
  return;
}
  const absX = Math.abs(movementX);
  const absY = Math.abs(movementY);

  if (absY > absX && movementY < -0.08) {
    setStatus("Swipe up detected ↑");
    setLastGesture("⬆️ Previous Week");
    onSwipeUp?.();
    lastGestureTimeRef.current = now;
  } else if (absY > absX && movementY > 0.08) {
    setStatus("Swipe down detected ↓");
    setLastGesture("⬇️ Next Week");
    onSwipeDown?.();
    lastGestureTimeRef.current = now;
  } else if (absX > absY && movementX > 0.08) {
    setStatus("Swipe right detected → next date");
    setLastGesture("👉 Next Day");
    onSwipeRight?.();
    lastGestureTimeRef.current = now;
  } else if (absX > absY && movementX < -0.08) {
    setStatus("Swipe left detected → previous date");
    setLastGesture("👈 Previous Day");
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

      <div style={{ marginTop: "8px", fontSize: "13px" }}>
  <p><strong>Status:</strong> {status}</p>
  <p><strong>Last gesture:</strong> {lastGesture}</p>
  <p style={{ fontSize: "12px", opacity: 0.75 }}>
    Swipe ← / → for days, ↑ / ↓ for weeks
  </p>
</div>

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

      <div
  style={{
    marginTop: "12px",
    padding: "10px",
    border: "1px solid #444",
    borderRadius: "8px",
    fontSize: "12px",
    backgroundColor: "#1f1f1f",
    color: "white",
  }}
>
  <strong>🎮 Gesture Guide</strong>

  <div style={{ marginTop: "6px" }}>
    👈 Swipe Left → Previous Day
  </div>

  <div>
    👉 Swipe Right → Next Day
  </div>

  <div>
    ⬆️ Swipe Up → Previous Week
  </div>

  <div>
    ⬇️ Swipe Down → Next Week
  </div>
</div>
    </div>
  );
}