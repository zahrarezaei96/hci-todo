import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

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

  function handleGenderSelect(g: 'male' | 'female') {
    setGender(g);
    setAvatar(g === 'male' ? MALE_AVATARS[0] : FEMALE_AVATARS[0]);
  }

  function canNext() {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return gender !== null && birthday !== '';
    if (step === 2) return avatar !== '';
    return false;
  }

  function finish() {
    if (!gender || !avatar) return;
    onComplete({ name: name.trim(), gender, birthday, avatar });
  }

  return (
    <div className="ob-overlay">
      <div className="ob-card">

        {/* Progress dots */}
        <div className="ob-dots">
          {[0, 1, 2].map(i => (
            <div key={i} className={`ob-dot ${step === i ? 'ob-dot--active' : ''} ${step > i ? 'ob-dot--done' : ''}`}>
              {step > i ? <Check size={10} /> : null}
            </div>
          ))}
        </div>

        {/* ── Step 0: Name ── */}
        {step === 0 && (
          <div className="ob-step">
            <div className="ob-emoji">👋</div>
            <h1 className="ob-title">Welcome!</h1>
            <p className="ob-sub">What should we call you?</p>
            <input
              className="ob-input"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canNext()) setStep(1); }}
              autoFocus
              maxLength={30}
            />
          </div>
        )}

        {/* ── Step 1: Gender + Birthday ── */}
        {step === 1 && (
          <div className="ob-step">
            <div className="ob-emoji">🎂</div>
            <h1 className="ob-title">Tell us about you</h1>
            <p className="ob-sub">A bit more about yourself</p>

            <div className="ob-gender-row">
              <button
                className={`ob-gender-btn ${gender === 'male' ? 'ob-gender-btn--active' : ''}`}
                onClick={() => handleGenderSelect('male')}
              >
                <span className="ob-gender-icon">👨</span>
                <span>Male</span>
              </button>
              <button
                className={`ob-gender-btn ${gender === 'female' ? 'ob-gender-btn--active' : ''}`}
                onClick={() => handleGenderSelect('female')}
              >
                <span className="ob-gender-icon">👩</span>
                <span>Female</span>
              </button>
            </div>

            <label className="ob-label">Date of birth</label>
            <input
              type="date"
              className="ob-input"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}

        {/* ── Step 2: Avatar ── */}
        {step === 2 && (
          <div className="ob-step">
            <div className="ob-emoji">{avatar || (gender === 'male' ? '👨' : '👩')}</div>
            <h1 className="ob-title">Pick your avatar</h1>
            <p className="ob-sub">Choose one that feels like you</p>
            <div className="ob-avatar-grid">
              {avatars.map(av => (
                <button
                  key={av}
                  className={`ob-avatar-btn ${avatar === av ? 'ob-avatar-btn--active' : ''}`}
                  onClick={() => setAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="ob-nav">
          {step > 0 ? (
            <button className="ob-back" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={18} /> Back
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              className={`ob-next ${canNext() ? '' : 'ob-next--disabled'}`}
              onClick={() => canNext() && setStep(step + 1)}
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className={`ob-next ${canNext() ? '' : 'ob-next--disabled'}`}
              onClick={() => canNext() && finish()}
            >
              Let's go! <ChevronRight size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
