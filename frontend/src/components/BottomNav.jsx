import React from 'react';
import { ShieldAlert, MessageCircle, CalendarCheck, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, pendingReviewCount }) {
  const tabs = [
    {
      id: 'queue',
      label: 'Review Queue',
      icon: ShieldAlert,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageCircle,
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: CalendarCheck,
    },
    {
      id: 'settings',
      label: 'Bot Setup',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/90 px-3 py-2 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition ${
                isActive
                  ? 'text-red-400 bg-red-500/10 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-red-400' : ''} transition-transform`} />
                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-[18px] text-center text-[10px] font-bold rounded-full animate-bounce shadow-md ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
