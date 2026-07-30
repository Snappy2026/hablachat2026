import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import SimulatorModal from './components/SimulatorModal';
import InstallPrompt from './components/InstallPrompt';
import QueuePage from './pages/QueuePage';
import MessagesPage from './pages/MessagesPage';
import BookingsPage from './pages/BookingsPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import OnboardingFlow from './pages/OnboardingFlow';
import { getPendingReviews, approveReview, rejectReview, getOnboardingStatus, getWeeklyCharge } from './services/api';
import { wsService } from './services/websocket';

export default function App() {
  // App view: 'loading' | 'landing' | 'onboarding' | 'dashboard'
  const [appView, setAppView] = useState('loading');
  const [weeklyCharge, setWeeklyCharge] = useState(null);

  const [activeTab, setActiveTab] = useState('queue');
  const [reviews, setReviews] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      const savedView = localStorage.getItem('app_view');

      const [status, charge] = await Promise.all([
        getOnboardingStatus(),
        getWeeklyCharge().catch(() => ({ weekly_charge: 14.99 }))
      ]);
      setWeeklyCharge(charge.weekly_charge || 14.99);

      if (viewParam === 'dashboard') {
        setAppView('dashboard');
        initDashboard();
      } else if (viewParam === 'onboarding') {
        setAppView('onboarding');
      } else if (viewParam === 'landing') {
        setAppView('landing');
      } else if (savedView === 'dashboard' && status.is_onboarded) {
        setAppView('dashboard');
        initDashboard();
      } else {
        // Default to Landing Page so user sees landing page & checkout flow!
        setAppView('landing');
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      setAppView('landing');
    }
  };

  const initDashboard = () => {
    fetchReviews();

    // Connect WebSocket
    wsService.connect();

    // Subscribe to events
    wsService.subscribe((msg) => {
      if (msg.event === 'CONNECTED') {
        setIsConnected(true);
      } else if (msg.event === 'DISCONNECTED') {
        setIsConnected(false);
      } else if (msg.event === 'NEW_REVIEW_ITEM') {
        showToast(`🚨 New Review Item from ${msg.data.client_name || 'Client'}`);
        fetchReviews();
      } else if (msg.event === 'REVIEW_RESOLVED' || msg.event === 'MESSAGE_RECEIVED') {
        fetchReviews();
      }
    });
  };

  const fetchReviews = async () => {
    try {
      const data = await getPendingReviews();
      setReviews(data);
    } catch (err) {
      console.error('Error fetching review queue:', err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (reviewId, customReply) => {
    try {
      await approveReview(reviewId, customReply);
      showToast('✅ Reply approved & sent via Twilio!');
      fetchReviews();
    } catch (err) {
      console.error('Error approving review:', err);
    }
  };

  const handleReject = async (reviewId) => {
    try {
      await rejectReview(reviewId);
      showToast('🚫 AI draft rejected. Opened live manager takeover.');
      fetchReviews();
    } catch (err) {
      console.error('Error rejecting review:', err);
    }
  };

  const switchView = (view) => {
    localStorage.setItem('app_view', view);
    setAppView(view);
    if (view === 'dashboard') {
      initDashboard();
    }
  };

  const handleOnboardingComplete = () => {
    switchView('dashboard');
  };

  // ─── Loading Screen ───
  if (appView === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <p className="text-slate-500 text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  // ─── Landing Page ───
  if (appView === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 max-w-md mx-auto relative shadow-2xl">
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 py-2.5 px-4 flex items-center justify-between text-xs text-slate-300 sticky top-0 z-50">
          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
            🌐 <span className="text-white">Public Landing Page</span>
          </span>
          <button
            onClick={() => switchView('dashboard')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition active:scale-95 shadow-md shadow-emerald-600/30"
          >
            Open Admin Dashboard →
          </button>
        </div>
        <LandingPage
          onGetStarted={() => switchView('onboarding')}
          weeklyCharge={weeklyCharge}
        />
      </div>
    );
  }

  // ─── Onboarding Flow ───
  if (appView === 'onboarding') {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onBack={() => switchView('landing')}
      />
    );
  }

  // ─── Main Dashboard ───
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl">
      {/* Top Navbar */}
      <Navbar
        isConnected={isConnected}
        onViewLanding={() => switchView('landing')}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenInstallPrompt={() => setIsInstallOpen(true)}
      />

      {/* Real-time Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xl flex items-center justify-between border border-emerald-400/40 animate-bounce">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'queue' && (
          <QueuePage
            reviews={reviews}
            onApprove={handleApprove}
            onReject={handleReject}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
          />
        )}
        {activeTab === 'messages' && <MessagesPage />}
        {activeTab === 'bookings' && <BookingsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingReviewCount={reviews.length}
      />

      {/* Interactive Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSuccess={() => fetchReviews()}
      />

      {/* PWA Mobile Installation Guide Modal */}
      <InstallPrompt
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
}
