import { useEffect, useRef, useState } from "react";
import { handsManager } from "../modules/gaze/handsManager";

type Props = {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

// Unique ID counter so multiple GestureDateControl instances don't clash
let idCounter = 0;

export default function GestureDateControl({
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
}: Props) {
  const instanceId = useRef(`gesture-date-${++idCounter}`);
  const lastGestureTimeRef = useRef<number>(0);
  const anchorXRef = useRef<number | null>(null);
  const anchorYRef = useRef<number | null>(null);

  const [gestureMode, setGestureMode] = useState(false);
  const [status, setStatus] = useState("Gesture mode off");

  useEffect(() => {
    if (!gestureMode) {
      handsManager.unsubscribe(instanceId.current);
      setStatus("Gesture mode off");
      return;
    }

    const SWIPE_THRESHOLD = 0.10;
    const GESTURE_COOLDOWN = 1000;

    handsManager.subscribe(instanceId.current, (results) => {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setStatus("No hand detected");
        anchorXRef.current = null;
        anchorYRef.current = null;
        return;
      }

      const wrist = results.multiHandLandmarks[0][0];
      const currentX = wrist.x;
      const currentY = wrist.y;

      // Set anchor on first detection
      if (anchorXRef.current === null || anchorYRef.current === null) {
        anchorXRef.current = currentX;
        anchorYRef.current = currentY;
        setStatus("Hand detected — move to swipe");
        return;
      }

      const movementX = currentX - anchorXRef.current;
      const movementY = currentY - anchorYRef.current;
      const now = Date.now();

      if (now - lastGestureTimeRef.current > GESTURE_COOLDOWN) {
        const absX = Math.abs(movementX);
        const absY = Math.abs(movementY);

        if (absY > absX && movementY < -SWIPE_THRESHOLD) {
          setStatus("Swipe up detected ↑");
          onSwipeUp?.();
          lastGestureTimeRef.current = now;
          anchorXRef.current = currentX;
          anchorYRef.current = currentY;
        } else if (absY > absX && movementY > SWIPE_THRESHOLD) {
          setStatus("Swipe down detected ↓");
          onSwipeDown?.();
          lastGestureTimeRef.current = now;
          anchorXRef.current = currentX;
          anchorYRef.current = currentY;
        } else if (absX > absY && movementX > SWIPE_THRESHOLD) {
          setStatus("Swipe right detected →");
          onSwipeRight?.();
          lastGestureTimeRef.current = now;
          anchorXRef.current = currentX;
          anchorYRef.current = currentY;
        } else if (absX > absY && movementX < -SWIPE_THRESHOLD) {
          setStatus("Swipe left detected ←");
          onSwipeLeft?.();
          lastGestureTimeRef.current = now;
          anchorXRef.current = currentX;
          anchorYRef.current = currentY;
        } else {
          setStatus("Hand detected");
        }
      }
    });

    setStatus("Gesture mode on — show your hand");

    return () => {
      handsManager.unsubscribe(instanceId.current);
    };
  }, [gestureMode, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight]);

  return (
    <div className="gesture-panel">
      <button type="button" onClick={() => setGestureMode(!gestureMode)}>
        {gestureMode ? "Disable Gesture Mode" : "Enable Gesture Mode"}
      </button>
      <p>{status}</p>
    </div>
  );
}
