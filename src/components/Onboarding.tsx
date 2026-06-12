import { useState, useEffect, useRef } from 'react';
import { CustomSelect } from './CustomSelect';
import { ChevronRight, ChevronLeft, Check, Eye, EyeOff, Mic, MicOff } from 'lucide-react';
import { startSpeechRecognition } from '../hooks/useSpeechCommands';

interface Profile {
  name: string;
  gender: 'male' | 'female';
  birthday: string;
  avatar: string;
}

interface Props {
  onComplete: (profile: Profile) => void;
}

const MALE_AVATARS = ['🧑‍💻', '👨‍🎨', '🧔', '👨‍🚀', '🧑‍🎓', '👨‍💼'];
const FEMALE_AVATARS = ['👩‍💻', '👩‍🎨', '👩‍🦰', '👩‍🚀', '👩‍🎓', '👩‍💼'];



export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [birthday, setBirthday] = useState('');
  const [avatar, setAvatar] = useState('');
  const [noseOn, setNoseOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [calibHint, setCalibHint] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runRef = useRef(false);
  const landRef = useRef<any>(null);
  const animRef = useRef(0);
  const xBuf = useRef<number[]>([]);
  const yBuf = useRef<number[]>([]);

  const avatars = gender === 'male' ? MALE_AVATARS : FEMALE_AVATARS;

  // ── Nose + Hand tracking ──
  const streamRef = useRef<MediaStream | null>(null);

  // Init once on mount, pause/resume on toggle
  useEffect(() => {
    let dot = document.getElementById('gaze-cursor-dot') as HTMLDivElement;
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'gaze-cursor-dot';
      dot.style.cssText = `
        position: fixed; width: 20px; height: 20px;
        border-radius: 50%; background: rgba(0,120,212,0.6);
        border: 3px solid #0078d4; pointer-events: none; z-index: 999999;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 16px rgba(0,120,212,0.6); display: none;
        transition: left 0.06s ease-out, top 0.06s ease-out;
      `;
      document.body.appendChild(dot);
    }

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; width: 200px; height: 192px;
      border-radius: 14px; overflow: hidden; border: 2.5px solid #0078d4;
      z-index: 9998; background: #000;
    `;
    const handle = document.createElement('div');
    handle.style.cssText = `width:100%;height:22px;background:rgba(0,120,212,0.85);cursor:grab;display:flex;align-items:center;justify-content:center;user-select:none;`;
    handle.innerHTML = `<span style="color:white;font-size:11px;font-family:sans-serif;">⠿ drag</span>`;
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true; video.muted = true;
    video.style.cssText = `width:200px;height:170px;object-fit:cover;display:block;transform:scaleX(-1);`;
    container.appendChild(handle); container.appendChild(video);
    document.body.appendChild(container);
    containerRef.current = container;
    videoRef.current = video;

    let dragging = false, sx = 0, sy = 0, sr = 16, sb = 16;
    handle.addEventListener('mousedown', e => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = container.getBoundingClientRect();
      sr = window.innerWidth - r.right; sb = window.innerHeight - r.bottom; e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      container.style.right = `${Math.max(0, sr-(e.clientX-sx))}px`;
      container.style.bottom = `${Math.max(0, sb-(e.clientY-sy))}px`;
      container.style.left = 'auto'; container.style.top = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    const onSpace = (e: KeyboardEvent) => {
      if (e.code === 'Space' && landRef.current && video.readyState >= 2) {
        const res = landRef.current.detectForVideo(video, performance.now());
        if (res?.faceLandmarks?.[0]) {
          const n = res.faceLandmarks[0][4];
          (window as any).__noseRefX = n.x;
          (window as any).__noseRefY = n.y;
          (window as any).__noseCalibrated = true;
          setCalibrated(true);
          setCalibHint('✓ Calibrated!');
          setTimeout(() => setCalibHint(''), 2000);
        }
      }
    };
    window.addEventListener('keydown', onSpace);

    async function init() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
        landRef.current = await FaceLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO', numFaces: 1,
          outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
        });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        initHandScroll(video);
        runRef.current = true;
        detect();
      } catch(e) { console.error(e); }
    }

    function initHandScroll(vid: HTMLVideoElement) {
      import('@mediapipe/hands').then(({ Hands }) => {
        const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
        let lastY: number | null = null, lastTime = 0;
        hands.onResults((results: any) => {
          if (!results.multiHandLandmarks?.length) { lastY = null; return; }
          const wristY = results.multiHandLandmarks[0][0].y;
          const now = Date.now();
          if (lastY !== null && now - lastTime > 150) {
            const dy = wristY - lastY;
            if (Math.abs(dy) > 0.03) {
              const openDropdownRef = (window as any).__openDropdownRef;
              const openDropdown = openDropdownRef?.current as HTMLElement;
              if (openDropdown) {
                openDropdown.scrollTop += dy > 0 ? 80 : -80;
              } else {
                const card = document.querySelector('.ob-card') as HTMLElement;
                card?.scrollBy({ top: dy > 0 ? 100 : -100, behavior: 'smooth' });
              }
              lastTime = now;
            }
          }
          lastY = wristY;
        });
        const feed = async () => {
          if (!runRef.current) return;
          if (vid.readyState >= 2) await hands.send({ image: vid });
          setTimeout(feed, 33);
        };
        setTimeout(feed, 1000);
      }).catch(() => {});
    }

    function processNose(noseX: number, noseY: number) {
      const SCALE = 3.5;
      const isCalibrated = (window as any).__noseCalibrated;
      let screenX = isCalibrated
        ? window.innerWidth / 2 + (((window as any).__noseRefX ?? 0.5) - noseX) * SCALE * window.innerWidth
        : (1 - noseX) * window.innerWidth;
      let screenY = isCalibrated
        ? window.innerHeight / 2 + (noseY - ((window as any).__noseRefY ?? 0.4)) * SCALE * window.innerHeight
        : noseY * window.innerHeight;
      screenX = Math.max(0, Math.min(window.innerWidth, screenX));
      screenY = Math.max(0, Math.min(window.innerHeight, screenY));
      xBuf.current.push(screenX); yBuf.current.push(screenY);
      if (xBuf.current.length > 8) { xBuf.current.shift(); yBuf.current.shift(); }
      const x = xBuf.current.reduce((a,b)=>a+b)/xBuf.current.length;
      const y = yBuf.current.reduce((a,b)=>a+b)/yBuf.current.length;
      const dotEl = document.getElementById('gaze-cursor-dot')!;
      dotEl.style.display = 'block';
      dotEl.style.left = `${x}px`;
      dotEl.style.top = `${y}px`;
    }

    function detect() {
      if (!runRef.current || !landRef.current) return;
      if (video.readyState >= 2) {
        const res = landRef.current.detectForVideo(video, performance.now());
        if (res?.faceLandmarks?.[0]) processNose(res.faceLandmarks[0][4].x, res.faceLandmarks[0][4].y);
      }
      animRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      runRef.current = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', onSpace);
      try { document.getElementById('gaze-cursor-dot')?.remove(); } catch(_) {}
      try { container.remove(); } catch(_) {}
      containerRef.current = null; videoRef.current = null; landRef.current = null;
      xBuf.current = []; yBuf.current = [];
      try {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      } catch(_) {}
    };
  }, []); // Only init ONCE

  // Separate effect just for pause/resume
  useEffect(() => {
    if (!noseOn) {
      const dot = document.getElementById('gaze-cursor-dot');
      if (dot) dot.style.display = 'none';
    }
    // Show/hide calibration hint
    if (noseOn && !calibrated) {
      setCalibHint('👃 Press Space to calibrate');
    } else if (!noseOn) {
      setCalibHint('');
    }
  }, [noseOn]);

  // ── Voice ──
  useEffect(() => {
    (window as any).__voiceWasEnabled = voiceOn;
    if (voiceOn) startSpeechRecognition();
  }, [voiceOn]);

  function canNext() {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return gender !== null && birthday !== '' && !birthday.includes('undefined') && birthday.split('-').every(p => p && p !== '01' || true);
    if (step === 2) return avatar !== '';
    return false;
  }

  function finish() {
    if (!gender || !avatar) return;
    (window as any).__noseWasEnabled = noseOn;
    (window as any).__voiceWasEnabled = voiceOn;
    onComplete({ name: name.trim(), gender, birthday, avatar });
  }

  return (
    <div className="ob-overlay">
      {/* Toggle buttons — outside card, top right of screen */}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100001 }}>
        <button className={`gaze-toggle ${noseOn ? 'gaze-toggle--active' : ''}`}
          onClick={() => setNoseOn(n => !n)}>
          {noseOn ? <Eye size={16} /> : <EyeOff size={16} />}
          <span style={{ marginLeft: 4 }}>{noseOn ? 'Nose On' : 'Nose Off'}</span>
        </button>
        <button className={`gaze-toggle ${voiceOn ? 'gaze-toggle--active' : ''}`}
          onClick={() => setVoiceOn(v => !v)}>
          {voiceOn ? <Mic size={16} /> : <MicOff size={16} />}
          <span style={{ marginLeft: 4 }}>{voiceOn ? 'Voice On' : 'Voice Off'}</span>
        </button>
      </div>

      <div className="ob-card" style={{ position: 'relative', overflowY: 'auto', maxHeight: '90vh', width: '460px' }}>

        {/* Calibration hint */}
        {noseOn && calibHint && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: calibrated ? 'rgba(74,222,128,0.9)' : 'rgba(0,120,212,0.9)',
            color: 'white', padding: '8px 16px', borderRadius: 8,
            fontSize: 13, fontFamily: 'sans-serif', zIndex: 999997, pointerEvents: 'none',
          }}>
            {calibHint}
          </div>
        )}

        {/* Progress dots */}
        <div className="ob-dots">
          {[0, 1, 2].map(i => (
            <div key={i} className={`ob-dot ${step === i ? 'ob-dot--active' : ''} ${step > i ? 'ob-dot--done' : ''}`}>
              {step > i ? <Check size={10} /> : null}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="ob-step">
            <div className="ob-emoji">👋</div>
            <h1 className="ob-title">Welcome!</h1>
            <p className="ob-sub">What should we call you?</p>
            <input className="ob-input" placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canNext()) setStep(1); }}
              autoFocus maxLength={30} />
          </div>
        )}

        {step === 1 && (
          <div className="ob-step">
            <div className="ob-emoji">🎂</div>
            <h1 className="ob-title">Tell us about you</h1>
            <p className="ob-sub">A bit more about yourself</p>
            <div className="ob-gender-row">
              <button className={`ob-gender-btn ${gender === 'male' ? 'ob-gender-btn--active' : ''}`}
                onClick={() => { setGender('male'); setAvatar(MALE_AVATARS[0]); }}>
                <span className="ob-gender-icon">👨</span><span>Male</span>
              </button>
              <button className={`ob-gender-btn ${gender === 'female' ? 'ob-gender-btn--active' : ''}`}
                onClick={() => { setGender('female'); setAvatar(FEMALE_AVATARS[0]); }}>
                <span className="ob-gender-icon">👩</span><span>Female</span>
              </button>
            </div>
            <label className="ob-label">Date of birth</label>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <div style={{ flex: 1 }}>
                <CustomSelect
                  placeholder="Day"
                  value={birthday ? birthday.split('-')[2] : ''}
                  options={Array.from({length:31},(_,i)=>({ value: String(i+1).padStart(2,'0'), label: String(i+1) }))}
                  onChange={v => {
                    const parts = birthday ? birthday.split('-') : [String(new Date().getFullYear()), '01', '01'];
                    setBirthday(`${parts[0]}-${parts[1]}-${String(v).padStart(2,'0')}`);
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <CustomSelect
                  placeholder="Month"
                  value={birthday ? birthday.split('-')[1] : ''}
                  options={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>({ value: String(i+1).padStart(2,'0'), label: m }))}
                  onChange={v => {
                    const parts = birthday ? birthday.split('-') : [String(new Date().getFullYear()), '01', '01'];
                    setBirthday(`${parts[0]}-${String(v).padStart(2,'0')}-${parts[2] || '01'}`);
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <CustomSelect
                  placeholder="Year"
                  value={birthday ? birthday.split('-')[0] : ''}
                  options={Array.from({length:80},(_,i)=>{ const y=new Date().getFullYear()-i; return { value: String(y), label: String(y) }; })}
                  onChange={v => {
                    const parts = birthday ? birthday.split('-') : [String(new Date().getFullYear()), '01', '01'];
                    setBirthday(`${v}-${parts[1] || '01'}-${parts[2] || '01'}`);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step">
            <div className="ob-emoji">{avatar || (gender === 'male' ? '👨' : '👩')}</div>
            <h1 className="ob-title">Pick your avatar</h1>
            <p className="ob-sub">Choose one that feels like you</p>
            <div className="ob-avatar-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", width: "100%" }}>
              {avatars.map(av => (
                <button key={av} className={`ob-avatar-btn ${avatar === av ? 'ob-avatar-btn--active' : ''}`}
                  onClick={() => setAvatar(av)}>{av}</button>
              ))}
            </div>
          </div>
        )}

        <div className="ob-nav">
          {step > 0 ? (
            <button className="ob-back" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}
          {step < 2 ? (
            <button className={`ob-next ${canNext() ? '' : 'ob-next--disabled'}`}
              onClick={() => canNext() && setStep(step + 1)}>
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button className={`ob-next ${canNext() ? '' : 'ob-next--disabled'}`}
              onClick={() => canNext() && finish()}>
              Let's go! <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
