import { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
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

  const avatars = gender === 'male' ? MALE_AVATARS : FEMALE_AVATARS;

  // Voice always on
  useEffect(() => {
    (window as any).__voiceWasEnabled = true;
    startSpeechRecognition();
  }, []);

  function canNext() {
  if (step === 0) return true;
  if (step === 1) return name.trim().length >= 2;
  if (step === 2) return gender !== null && birthday !== "" && !birthday.includes("undefined");
  if (step === 3) return avatar !== "";
  return false;
}

  function finish() {
    if (!gender || !avatar) return;
    (window as any).__noseWasEnabled = true;
    (window as any).__voiceWasEnabled = true;
    onComplete({ name: name.trim(), gender, birthday, avatar });
  }

  return (
    <div className="ob-overlay">
      <div className="ob-card" style={{ position: 'relative', overflowY: 'auto', maxHeight: '90vh', width: '460px' }}>

        {/* Progress dots */}
        <div className="ob-dots">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`ob-dot ${step === i ? 'ob-dot--active' : ''} ${step > i ? 'ob-dot--done' : ''}`}>
              {step > i ? <Check size={10} /> : null}
            </div>
          ))}
        </div>
        {step === 0 && (
  <div className="ob-step">
    <div className="ob-emoji">👋</div>

<h1 className="ob-title">Welcome!</h1>

<p className="ob-sub">
  Before you begin, let's take a quick look at the different ways you can interact with the application.
</p>

    <div style={{ textAlign: "left", marginTop: 20, lineHeight: "1.8" }}>

  <p>🖐 <strong>Hand Gestures</strong><br />
  Swipe up or down to select or adjust the date..</p>

  <p>👃 <strong>Nose Tracking</strong><br />
  Press <strong>Press Space to calibrate before using Nose Tracking.</strong><br />
Then move your head to control the cursor.</p>

  <p>🎤 <strong>Voice Commands</strong><br />
 Use voice commands to navigate and perform actions.</p>

  <p>⌨️ <strong>Mouse & Keyboard</strong><br />
  Use the mouse and keyboard whenever you prefer.</p>

</div>

    <p style={{ marginTop: 20 }}>
  You can switch between interaction methods at any time.
  <br /><br />
  Click <strong>Get Started</strong> to begin the setup.
</p>
  </div>
)}

        {step === 1 && (
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

        {step === 2 && (
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

        {step === 3 && (
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
          {step < 3 ? (
            <button className={`ob-next ${canNext() ? '' : 'ob-next--disabled'}`}
              onClick={() => canNext() && setStep(step + 1)}>
              Get Started <ChevronRight size={18} />
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
