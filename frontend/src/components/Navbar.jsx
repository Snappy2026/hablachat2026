import React from 'react';
import { Sparkles, Globe, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ isConnected, onViewLanding, onOpenSimulator, onOpenInstallPrompt, onLogout }) {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();

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
              <h1 className="font-bold text-sm text-white tracking-tight leading-none">{t('nav.title')}</h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">{t('nav.subtitle')}</p>
          </div>
        </div>

        {/* Action Buttons & Language Selector */}
        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300">
            <Globe className="w-3.5 h-3.5 text-rose-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Log Out Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 active:scale-95 text-red-200 hover:text-white text-xs font-extrabold px-3 py-1.5 rounded-xl border border-red-700/80 transition shadow-lg shadow-red-950/50"
            title={t('nav.logout')}
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
