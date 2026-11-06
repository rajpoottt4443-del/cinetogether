/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Views
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { WatchPartyRoomView } from './views/WatchPartyRoomView';
import { CreateRoomView } from './views/CreateRoomView';
import { AuthView } from './views/AuthView';
import { ProfileView } from './views/ProfileView';
import { FriendsView } from './views/FriendsView';
import { SettingsView } from './views/SettingsView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { SeoLandingView } from './views/SeoLandingView';
import { StaticPagesView } from './views/StaticPagesView';
import { JoinRoomView } from './views/JoinRoomView';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');
  const [viewParams, setViewParams] = useState<any>({});

  // Check URL query parameters (e.g. ?party=PARTY-4029 or direct invite links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const partyCode = params.get('party') || params.get('room');
    if (partyCode) {
      setCurrentView('party');
      setViewParams({ roomId: partyCode });
    }
  }, []);

  const handleNavigate = (view: string, params: any = {}) => {
    setCurrentView(view);
    setViewParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView onNavigate={handleNavigate} />;
      
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;

      case 'party':
        return <WatchPartyRoomView roomId={viewParams.roomId || 'room_nebula'} onNavigate={handleNavigate} />;

      case 'create-room':
        return <CreateRoomView onNavigate={handleNavigate} />;

      case 'join-room':
        return <JoinRoomView onNavigate={handleNavigate} />;

      case 'login':
        return <AuthView initialMode="login" onNavigate={handleNavigate} />;

      case 'register':
        return <AuthView initialMode="register" onNavigate={handleNavigate} />;

      case 'profile':
        return <ProfileView onNavigate={handleNavigate} />;

      case 'friends':
        return <FriendsView onNavigate={handleNavigate} />;

      case 'settings':
        return <SettingsView onNavigate={handleNavigate} />;

      case 'admin':
        return <AdminDashboardView onNavigate={handleNavigate} />;

      // SEO Landing Pages
      case 'seo-watch-party':
        return <SeoLandingView pageType="watch-party" onNavigate={handleNavigate} />;
      case 'seo-screen-sharing':
        return <SeoLandingView pageType="screen-sharing" onNavigate={handleNavigate} />;
      case 'seo-movies':
        return <SeoLandingView pageType="movies" onNavigate={handleNavigate} />;
      case 'seo-android':
        return <SeoLandingView pageType="android" onNavigate={handleNavigate} />;
      case 'seo-video-chat':
        return <SeoLandingView pageType="video-chat" onNavigate={handleNavigate} />;

      // Static & Legal Pages
      case 'how-it-works':
        return <StaticPagesView page="how-it-works" onNavigate={handleNavigate} />;
      case 'about':
        return <StaticPagesView page="about" onNavigate={handleNavigate} />;
      case 'faq':
        return <StaticPagesView page="faq" onNavigate={handleNavigate} />;
      case 'contact':
        return <StaticPagesView page="contact" onNavigate={handleNavigate} />;
      case 'privacy-policy':
        return <StaticPagesView page="privacy" onNavigate={handleNavigate} />;
      case 'terms-of-service':
        return <StaticPagesView page="terms" onNavigate={handleNavigate} />;
      case 'cookie-policy':
        return <StaticPagesView page="cookies" onNavigate={handleNavigate} />;

      default:
        return <LandingView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1">
        {renderCurrentView()}
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
