'use client';

import { useAuthStore } from '@/lib/auth-store';
import { Camera, Users, Image as ImageIcon, Heart, Bell, User as UserIcon, Search } from 'lucide-react';
import { useState } from 'react';
import Feed from './components/Feed';
import Groups from './components/Groups';
import Notifications from './components/Notifications';
import Profile from './components/Profile';
import Discover from './components/Discover';

export default function Home() {
  const { user, loading, signInWithGoogle, logOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'groups' | 'notifications' | 'profile' | 'discover'>('feed');

  if (loading) return <div className="h-screen w-screen flex items-center justify-center dark:bg-zinc-950 dark:text-zinc-50">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
              <Camera className="w-8 h-8 text-white rotate-6" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Circled</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">Share your world with the people who matter.</p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col md:flex-row">
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:relative md:w-64 bg-white dark:bg-zinc-900 border-t md:border-r md:border-t-0 border-zinc-200 dark:border-zinc-800">
        <div className="flex md:flex-col h-16 md:h-screen justify-around md:justify-start p-2 md:p-6 gap-2">
          <div className="hidden md:flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Circled</span>
          </div>

          <NavItem icon={<ImageIcon />} label="Feed" active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <NavItem icon={<Search />} label="Discover" active={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
          <NavItem icon={<Users />} label="Circles" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
          <NavItem icon={<Bell />} label="Alerts" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
          <NavItem icon={<UserIcon />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          
          <div className="flex-1 hidden md:block" />
          
          <button onClick={logOut} className="hidden md:flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium">
            Log out
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full pb-20 md:pb-0 overflow-y-auto h-screen relative">
        <div className="p-4 md:p-8">
           {activeTab === 'feed' && <Feed />}
           {activeTab === 'discover' && <Discover />}
           {activeTab === 'groups' && <Groups />}
           {activeTab === 'notifications' && <Notifications />}
           {activeTab === 'profile' && <Profile />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex md:w-full items-center justify-center md:justify-start gap-3 px-3 py-3 rounded-xl transition-colors font-medium ${
        active 
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-500' 
          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
      <span className="hidden md:block">{label}</span>
    </button>
  );
}
