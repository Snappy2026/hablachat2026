import React from 'react';
import { Sparkles, MessageSquareCode, Wifi, WifiOff, Smartphone, Globe, LogOut } from 'lucide-react';

export default function Navbar({ isConnected, onViewLanding, onOpenSimulator, onOpenInstallPrompt, onLogout }) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md md:max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-900/40">
            <Sparkles className="w-5 h-5 text-white font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-white tracking-tight leading-none">HablaChat</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">Automated Assistant Manager</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Log Out Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 active:scale-95 text-red-200 hover:text-white text-xs font-extrabold px-3 py-1.5 rounded-xl border border-red-700/80 transition shadow-lg shadow-red-950/50"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
