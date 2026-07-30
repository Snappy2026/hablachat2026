import React from 'react';
import { Sparkles, MessageSquareCode, Wifi, WifiOff, Smartphone, Globe } from 'lucide-react';

export default function Navbar({ isConnected, onViewLanding, onOpenSimulator, onOpenInstallPrompt }) {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-900/40">
            <Sparkles className="w-5 h-5 text-white font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-white tracking-tight leading-none">Specialist Escort Chat</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">Automated Assistant Manager</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Connection Status Dot */}
          <div 
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
              isConnected 
                ? 'bg-red-950/60 text-red-400 border-red-800/50' 
                : 'bg-amber-950/60 text-amber-400 border-amber-800/50'
            }`}
            title={isConnected ? 'Live WebSockets Connected' : 'Reconnecting...'}
          >
            {isConnected ? <Wifi className="w-3 h-3 text-red-400" /> : <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />}
            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Syncing'}</span>
          </div>

          {/* Landing Page Trigger */}
          <button
            onClick={onViewLanding}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-700 transition"
            title="View Landing Page"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Landing</span>
          </button>

          {/* Simulator Trigger */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <MessageSquareCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Bot</span>
          </button>

          {/* PWA Install Button */}
          <button
            onClick={onOpenInstallPrompt}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition"
            title="Install App on Home Screen"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
