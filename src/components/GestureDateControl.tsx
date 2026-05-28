import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

type Props = {
  onNextDate: () => void;
  onPreviousDate: () => void;
};

export default function GestureDateControl({ onNextDate, onPreviousDate }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastGestureTimeRef = useRef<number>(0);

  const [gestureMode, setGestureMode] = useState(false);
  const [status, setStatus] = useState("Gesture mode off");

  useEffect(() => {
    if (!gestureMode || !videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setStatus("No hand detected");
        return;
      }

      setStatus("Hand detected");

      const wrist = results.multiHandLandmarks[0][0];
      const currentX = wrist.x;
      const previousX = lastXRef.current;

      if (previousX !== null) {
        const movement = currentX - previousX;
        const now = Date.now();

        if (now - lastGestureTimeRef.current > 1000) {
          if (movement > 0.12) {
            setStatus("Swipe right → next date");
            onNextDate();
            lastGestureTimeRef.current = now;
          }

          if (movement < -0.12) {
            setStatus("Swipe left → previous date");
            onPreviousDate();
            lastGestureTimeRef.current = now;
          }
        }
      }

      lastXRef.current = currentX;
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
  }, [gestureMode, onNextDate, onPreviousDate]);

  return (
    <div className="gesture-panel">
      <button type="button" onClick={() => setGestureMode(!gestureMode)}>
        {gestureMode ? "Disable Gesture Mode" : "Enable Gesture Mode"}
      </button>

      <p>{status}</p>

      {gestureMode && (
        <video
          ref={videoRef}
          style={{ width: "160px", borderRadius: "12px", marginTop: "8px" }}
        />
      )}
    </div>
  );
}