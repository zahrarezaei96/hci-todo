/**
 * handsManager.ts
 *
 * Singleton. ONE Hands instance, ONE feed loop.
 * useGazeTracker calls setVideo() when webcam is ready.
 * GestureDateControl / Onboarding / etc. just subscribe().
 */

type ResultsCallback = (results: any) => void;

export interface HandsManager {
  subscribe: (id: string, cb: ResultsCallback) => void;
  unsubscribe: (id: string) => void;
  /** Called by useGazeTracker once the shared webcam video is ready */
  setVideo: (videoEl: HTMLVideoElement | null) => void;
  /** Returns true if the feed is currently running */
  isRunning: () => boolean;
}

let handsInstance: any = null;
let initPromise: Promise<any> | null = null;
let feedLoopId: ReturnType<typeof setTimeout> | null = null;
let feedRunning = false;
let currentVideo: HTMLVideoElement | null = null;
const subscribers = new Map<string, ResultsCallback>();

function initHands(): Promise<any> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { Hands } = await import('@mediapipe/hands');

    const h = new Hands({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });

    h.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    h.onResults((results: any) => {
      subscribers.forEach(cb => cb(results));
    });

    // No dummy frame — just initialize and let the real video feed start it
    // Sending a dummy canvas before real video causes WASM state corruption
    handsInstance = h;
    return h;
  })();

  return initPromise;
}

async function startFeed(video: HTMLVideoElement) {
  const hands = await initHands();
  if (!feedRunning || currentVideo !== video) return;

  // Give model a moment to fully initialize before sending real frames
  await new Promise(r => setTimeout(r, 300));
  if (!feedRunning || currentVideo !== video) return;

  const tick = async () => {
    if (!feedRunning || currentVideo !== video) return;

    if (video.readyState >= 2) {
      try {
        await hands.send({ image: video });
      } catch (err) {
        // Model not ready yet — skip this frame silently, try again soon
        feedLoopId = setTimeout(tick, 200);
        return;
      }
    }

    if (feedRunning && currentVideo === video) {
      feedLoopId = setTimeout(tick, 66); // ~15fps
    }
  };

  feedLoopId = setTimeout(tick, 200);
}

function stopFeed() {
  feedRunning = false;
  if (feedLoopId !== null) { clearTimeout(feedLoopId); feedLoopId = null; }
}

export const handsManager: HandsManager = {
  subscribe(id, cb) {
    subscribers.set(id, cb);
  },

  unsubscribe(id) {
    subscribers.delete(id);
  },

  setVideo(videoEl) {
    if (videoEl === null) {
      stopFeed();
      currentVideo = null;
      return;
    }

    if (feedRunning && currentVideo === videoEl) return; // already running on this video

    stopFeed();
    currentVideo = videoEl;
    feedRunning = true;
    startFeed(videoEl);
  },

  isRunning() {
    return feedRunning;
  },
};
