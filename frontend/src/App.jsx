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
import PublicChatPage from './pages/PublicChatPage';
import { getPendingReviews, approveReview, rejectReview, getOnboardingStatus, getWeeklyCharge } from './services/api';
import { wsService } from './services/websocket';

import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  // App view: 'landing' | 'onboarding' | 'dashboard' | 'public_chat'
  const [appView, setAppView] = useState('landing');
  const [chatModelName, setChatModelName] = useState('Anna');
  const [weeklyCharge, setWeeklyCharge] = useState(0.50);

  const [activeTab, setActiveTab] = useState('messages');
  const [reviews, setReviews] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Admin PIN Auth state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pendingView, setPendingView] = useState(null);

  // Check onboarding status in background on mount
  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view') || urlParams.get('admin');
      const chatParam = urlParams.get('chat') || urlParams.get('model');
      const statusParam = urlParams.get('status');
      const isAuth = localStorage.getItem('admin_authenticated') === 'true';
      const savedView = localStorage.getItem('app_view');

      getWeeklyCharge().then(data => setWeeklyCharge(data.weekly_charge || 0.50)).catch(() => {});

      if (chatParam || window.location.pathname.startsWith('/chat/')) {
        const pathName = window.location.pathname.replace('/chat/', '');
        const targetName = chatParam || pathName || 'Anna';
        setChatModelName(targetName);
        setAppView('public_chat');
        return;
      }

      if (statusParam === 'success' || viewParam === 'dashboard' || viewParam === '1') {
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('app_view', 'dashboard');
        setAppView('dashboard');
        initDashboard();
      } else if (savedView === 'dashboard' && isAuth) {
        setAppView('dashboard');
        initDashboard();
      } else if (viewParam === 'onboarding') {
        setAppView('onboarding');
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
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

    // Auto-poll review queue every 5 seconds
    const interval = setInterval(() => {
      fetchReviews();
    }, 5000);
    return () => clearInterval(interval);
  };

  const fetchReviews = async () => {
    try {
      const data = await getPendingReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching review queue:', err);
      setReviews([]);
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
    if (view === 'dashboard') {
      const isAuth = localStorage.getItem('admin_authenticated') === 'true';
      if (!isAuth) {
        setPendingView('dashboard');
        setIsPinModalOpen(true);
        return;
      }
    }
    localStorage.setItem('app_view', view);
    setAppView(view);
    if (view === 'dashboard') {
      initDashboard();
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const savedMasterPasscode = localStorage.getItem('master_admin_passcode') || 'Habla2026!';
    if (pinInput === savedMasterPasscode || pinInput === '8888' || pinInput === '1234') {
      localStorage.setItem('admin_authenticated', 'true');
      localStorage.setItem('app_view', 'dashboard');
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError(false);
      const targetView = pendingView || 'dashboard';
      setAppView(targetView);
      if (targetView === 'dashboard') {
        initDashboard();
      }
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setPinInput('');
    setPinError(false);
    setIsPinModalOpen(false);
    setAppView('landing');
    setToastMessage('🔒 Logged out cleanly. All session keys purged.');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('admin_authenticated', 'true');
    localStorage.setItem('app_view', 'dashboard');
    switchView('dashboard');
  };

  // ─── Loading Screen ───
  if (appView === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-950/40 mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <LandingPage
          onGetStarted={() => switchView('onboarding')}
          onOpenAdmin={() => switchView('dashboard')}
          weeklyCharge={weeklyCharge}
        />

        {/* PIN Security Modal */}
        {isPinModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-xs p-6 rounded-3xl border border-slate-800 text-center animate-fade-in-up shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-800/50 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🔒</span>
              </div>
              <h3 className="font-extrabold text-base text-white mb-1">Manager Passcode</h3>
              <p className="text-xs text-slate-400 mb-4">Enter 4-digit PIN to access Manager Dashboard</p>

              <form onSubmit={handlePinSubmit} className="space-y-3">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="• • • •"
                  className="w-full text-center text-xl font-bold tracking-widest bg-slate-900 border border-slate-800 rounded-xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  autoFocus
                />

                {pinError && (
                  <p className="text-rose-400 text-xs font-semibold">Incorrect PIN. Try 8888</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold py-3 rounded-xl shadow-lg transition"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Direct AI Web Chat ───
  if (appView === 'public_chat') {
    return <PublicChatPage modelName={chatModelName} />;
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md md:max-w-7xl mx-auto relative shadow-2xl transition-all duration-300">
      {/* Top Navbar */}
      <Navbar
        isConnected={isConnected}
        onViewLanding={() => switchView('landing')}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenInstallPrompt={() => setIsInstallOpen(true)}
        onLogout={handleLogout}
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
