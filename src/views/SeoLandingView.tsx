import React from 'react';
import { Film, Monitor, Smartphone, Video, Users, Check, ArrowRight, Shield, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SeoLandingViewProps {
  pageType: 'watch-party' | 'screen-sharing' | 'movies' | 'android' | 'video-chat';
  onNavigate: (view: string, params?: any) => void;
}

export const SeoLandingView: React.FC<SeoLandingViewProps> = ({ pageType, onNavigate }) => {
  const { isAuthenticated } = useAuth();

  const pagesData: Record<string, any> = {
    'watch-party': {
      title: 'Watch Party Online – Free Synchronized Movie Streaming with Friends',
      subtitle: 'Experience virtual watch parties with frame-accurate video synchronization, low-latency audio, and zero software downloads.',
      keywords: 'Watch Movies Together Online, Watch Party Online, Free Watch Party, Virtual Watch Party, Synchronized Video Player',
      heroImage: '/src/assets/images/hero_watch_party_1793972645942.jpg',
      icon: Film,
      benefits: [
        'Frame-accurate playback synchronization for all room members',
        'Direct browser streaming without requiring invasive browser extensions',
        'Integrated WebRTC camera and microphone calls alongside video',
        'Strict 18+ verified rooms with host moderation tools'
      ],
      faq: [
        {
          q: 'How does CineTogether synchronize video playback between friends?',
          a: 'CineTogether uses high-frequency WebRTC signaling and a centralized playback clock. When the host plays, pauses, or seeks, state transitions broadcast with sub-50ms latency.'
        },
        {
          q: 'Do my friends need to pay or install an app to join a watch party?',
          a: 'No. CineTogether runs natively in any standard web browser on desktop, laptops, and tablets without third-party downloads.'
        }
      ]
    },
    'screen-sharing': {
      title: 'Screen Sharing Website – High-Performance Online Screen Sharing with Audio',
      subtitle: 'Stream your entire desktop, single application window, or browser tab with full internal audio and microphone support.',
      keywords: 'Screen Sharing Website, Online Screen Sharing, Share Screen With Friends, Real-Time Screen Sharing, Browser Screen Sharing',
      heroImage: '/src/assets/images/movie_cyber_runner_1793972648223.jpg',
      icon: Monitor,
      benefits: [
        'Full 1080p 60fps high-clarity desktop screen sharing via getDisplayMedia',
        'Capture internal application audio and system sounds directly',
        'Zero-buffer WebRTC SFU routing for minimal latency',
        'Integrated chat and live participant video overlays'
      ],
      faq: [
        {
          q: 'Can I share system audio when sharing a browser tab or window?',
          a: 'Yes! When initiating a screen share, select "Share system audio" in the browser prompt to route movie sound or gameplay audio directly to your friends.'
        },
        {
          q: 'Is there a limit on how long a screen sharing session can last?',
          a: 'No, CineTogether supports unlimited screen-sharing party durations for verified accounts.'
        }
      ]
    },
    'movies': {
      title: 'Watch Movies Together Online – Legal & Licensed Synchronized Cinema',
      subtitle: 'Stream licensed, open-source, and creative commons cinema with friends legally without bypassing DRM or copyright restrictions.',
      keywords: 'Watch Movies Together, Watch Movies With Friends, Watch Videos Together, Legal Watch Party, Group Movie Watching',
      heroImage: '/src/assets/images/movie_cosmic_odyssey_1793972646755.jpg',
      icon: Film,
      benefits: [
        'Authorized, high-definition catalog of curated sci-fi, documentary, and animation films',
        'Support for custom authorized video stream URLs (HLS, MP4, WebM)',
        'Independent video streams delivered directly to each participant for pristine quality',
        'No piracy or DRM-circumvention techniques'
      ],
      faq: [
        {
          q: 'Why does CineTogether emphasize legal and authorized streaming?',
          a: 'We respect creators and digital rights. Delivering direct streams rather than single-user re-encodes ensures superior bitrate, adaptive quality, and full compliance.'
        }
      ]
    },
    'android': {
      title: 'Android Screen Sharing – Native MediaProjection Foreground Companion',
      subtitle: 'Overcome browser limitations with our Kotlin companion architecture designed for full mobile OS screen casting.',
      keywords: 'Android Screen Sharing, Mobile Screen Sharing, Android MediaProjection, Stream Phone Screen Online',
      heroImage: '/src/assets/images/movie_ocean_depths_1793972647552.jpg',
      icon: Smartphone,
      benefits: [
        'Native Kotlin Foreground Service utilizing Android MediaProjection API',
        'Bypasses mobile browser restrictions that block full-device OS capture',
        'Full microphone and internal device audio streaming',
        'Complete source code and architecture provided transparently'
      ],
      faq: [
        {
          q: 'Why can’t standard mobile web browsers share the entire phone screen?',
          a: 'Android security policies restrict web browsers from recording outside their sandbox. A foreground service with explicit MediaProjection consent is mandatory for true OS-level screen sharing.'
        }
      ]
    },
    'video-chat': {
      title: 'Online Group Video Chat – WebRTC Voice & Video Rooms for Movie Nights',
      subtitle: 'Crystal-clear peer audio and video channels paired with synchronized party controls and interactive photo-sharing chat.',
      keywords: 'Online Video Chat, Online Group Video Chat, Watch Party With Friends Online, Live Video Calling',
      heroImage: '/src/assets/images/hero_watch_party_1793972645942.jpg',
      icon: Video,
      benefits: [
        'Low-overhead WebRTC audio and video calling with acoustic echo cancellation',
        'Picture-in-picture floating participant webcam tiles',
        'Real-time text chat with photo uploads and emoji reactions',
        'Host controls: mute, kick, promote, and manage party permissions'
      ],
      faq: [
        {
          q: 'Does video chat slow down video streaming playback?',
          a: 'No. CineTogether separates media tracks into independent channels through a selective forwarding unit (SFU), keeping movie sync independent of camera feeds.'
        }
      ]
    }
  };

  const page = pagesData[pageType] || pagesData['watch-party'];
  const IconComponent = page.icon;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-black py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      
      {/* Hero Header */}
      <div className="max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#102D55]/60 border border-[#B5D5ED]/20 text-xs font-semibold text-[#B5D5ED]">
          <IconComponent className="w-4 h-4 text-[#B5D5ED]" />
          <span>CineTogether Technology Guide</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight text-balance">
          {page.title}
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {page.subtitle}
        </p>

        {/* Primary CTA */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate(isAuthenticated ? 'create-room' : 'register')}
            className="glass-button-primary px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(57,124,184,0.4)]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Free Room</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="glass-button-secondary px-6 py-3.5 rounded-xl text-sm font-semibold"
          >
            Explore Active Parties
          </button>
        </div>

        {/* SEO Keywords Strip */}
        <div className="pt-4 text-xs text-slate-500 font-mono">
          Related Index Topics: {page.keywords}
        </div>
      </div>

      {/* Visual Feature Card */}
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden glass-panel border border-[#B5D5ED]/20 shadow-2xl aspect-[21/9]">
          <img
            src={page.heroImage}
            alt={page.title}
            className="w-full h-full object-cover opacity-85"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-6 sm:p-10">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#B5D5ED] uppercase tracking-wider">CineTogether Architecture</span>
              <p className="text-lg sm:text-xl font-bold text-white">Full-Stack WebRTC & Synchronized Streaming Engine</p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Advantages List */}
      <div className="max-w-5xl mx-auto glass-panel rounded-2xl p-8 border border-[#B5D5ED]/15 space-y-6">
        <h2 className="text-xl font-bold text-white">Key Capabilities & Engineering Specifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {page.benefits.map((benefit: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl glass-panel-subtle">
              <div className="w-5 h-5 rounded-full bg-[#397CB8] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs text-slate-300 leading-relaxed font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Frequently Asked Questions */}
      {page.faq && (
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-white text-center">Frequently Asked Technical Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {page.faq.map((item: any, i: number) => (
              <div key={i} className="glass-panel rounded-2xl p-6 border border-[#B5D5ED]/15 space-y-2">
                <h3 className="text-sm font-bold text-white">{item.q}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Action Banner */}
      <div className="max-w-4xl mx-auto text-center pt-8 border-t border-[#B5D5ED]/10">
        <button
          onClick={() => onNavigate(isAuthenticated ? 'create-room' : 'register')}
          className="glass-button-primary px-8 py-3.5 rounded-xl text-xs font-bold shadow-lg"
        >
          Create Watch Party Now
        </button>
      </div>

    </div>
  );
};
