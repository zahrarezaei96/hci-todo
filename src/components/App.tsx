import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { Onboarding } from './Onboarding';

interface Profile {
  name: string;
  gender: 'male' | 'female';
  birthday: string;
  avatar: string;
}

export function App() {
  const { state, dispatch } = useStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

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
    <div className={`app-layout ${!state.sidebarOpen ? 'app-layout--collapsed' : ''}`}>
      <Sidebar profile={profile} onProfileChange={p => { localStorage.setItem('focus-profile', JSON.stringify(p)); setProfile(p); }} />
      <MainContent />
    </div>
  );
}
