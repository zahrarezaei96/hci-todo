/**
 * streamManager.ts
 * 
 * Singleton webcam stream. ONE getUserMedia for the whole app lifecycle.
 * Onboarding grabs it first, useGazeTracker reuses it — no double request.
 */

let streamPromise: Promise<MediaStream> | null = null;
let currentStream: MediaStream | null = null;

export async function getStream(): Promise<MediaStream> {
  // Return existing live stream immediately
  if (currentStream && currentStream.getTracks().some(t => t.readyState === 'live')) {
    return currentStream;
  }

  // Deduplicate concurrent calls
  if (streamPromise) return streamPromise;

  streamPromise = navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: 'user' }
  }).then(stream => {
    currentStream = stream;
    streamPromise = null;
    return stream;
  }).catch(err => {
    streamPromise = null;
    currentStream = null;
    throw err;
  });

  return streamPromise;
}

/** Only call this when the app is fully done with the camera (e.g. page unload) */
export function releaseStream() {
  currentStream?.getTracks().forEach(t => t.stop());
  currentStream = null;
  streamPromise = null;
}
