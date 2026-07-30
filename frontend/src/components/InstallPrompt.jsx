import React from 'react';
import { X, Smartphone, Share, PlusSquare, ArrowUpRight } from 'lucide-react';

export default function InstallPrompt({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Install App on Home Screen</h3>
              <p className="text-[11px] text-slate-400">Mobile PWA Installation Guide</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* iOS Safari Instructions */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
              <span>📱 iPhone / iOS Safari</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-normal">
              <li className="flex items-center gap-1.5">
                <span>1. Tap the Share button</span>
                <Share className="w-3.5 h-3.5 text-emerald-400 inline" />
              </li>
              <li className="flex items-center gap-1.5">
                <span>2. Scroll & tap "Add to Home Screen"</span>
                <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" />
              </li>
              <li>3. Launch directly from your iPhone app grid!</li>
            </ol>
          </div>

          {/* Android Chrome Instructions */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-semibold text-teal-400 mb-2">
              <span>🤖 Android / Google Chrome</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-normal">
              <li>1. Tap the Chrome menu button (top right 3 dots)</li>
              <li>2. Select "Install app" or "Add to Home screen"</li>
              <li>3. Confirm installation</li>
            </ol>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 rounded-xl border border-slate-700 transition"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
