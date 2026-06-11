import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Onboarding } from './Onboarding';
<<<<<<< HEAD
import { GazeProvider } from '../modules/gaze/GazeContext';
=======
import { startSpeechRecognition } from '../hooks/useSpeechCommands'; 

>>>>>>> feature/voice

interface Profile {
  name: string;
  gender: 'male' | 'female';
  birthday: string;
  avatar: string;
}

export function App() {
  const { state } = useStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    startSpeechRecognition();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('focus-profile');
    if (saved) setProfile(JSON.parse(saved));
    setLoaded(true);
  }, []);

  function handleOnboarding(p: Profile) {
    localStorage.setItem('focus-profile', JSON.stringify(p));
    setProfile(p);
  }

  if (!loaded) return null;
  if (!profile) return <Onboarding onComplete={handleOnboarding} />;

  return (
<<<<<<< HEAD
    <GazeProvider>
      <div className={`app-layout ${!state.sidebarOpen ? 'app-layout--collapsed' : ''}`}>
        <Sidebar
          profile={profile}
          onProfileChange={p => {
            localStorage.setItem('focus-profile', JSON.stringify(p));
            setProfile(p);
          }}
        />
        <MainContent />
      </div>
    </GazeProvider>
  );
=======
  <div className={`app-layout ${!state.sidebarOpen ? 'app-layout--collapsed' : ''}`}>
    <Sidebar profile={profile} onProfileChange={p => { localStorage.setItem('focus-profile', JSON.stringify(p)); setProfile(p); }} />


    <MainContent />
  </div>
);
>>>>>>> feature/voice
}
