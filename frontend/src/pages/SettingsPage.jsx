import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Sparkles, Key, CheckCircle, AlertCircle, Save, Globe, MessageSquare, Tag, Smartphone } from 'lucide-react';
import { getSettings, updateSettings, getReplyPatterns, createReplyPattern, deleteReplyPattern, getOnboardingStatus } from '../services/api';

export default function SettingsPage() {
  const [settingsData, setSettingsData] = useState(null);
  const [assignedPhone, setAssignedPhone] = useState('+1 (260) 366-0928');
  const [autoReply, setAutoReply] = useState(true);
  const [threshold, setThreshold] = useState(0.85);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [language, setLanguage] = useState('Auto-detect (Match Client)');
  const [tone, setTone] = useState('Warm & Luxurious Spa');
  const [signature, setSignature] = useState('thanks babe x');
  const [replyPatterns, setReplyPatterns] = useState([]);
  const [newCategory, setNewCategory] = useState('arrival');
  const [newKeywords, setNewKeywords] = useState('');
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const data = await getReplyPatterns();
      setReplyPatterns(data);
    } catch (err) {
      console.error('Error fetching reply patterns:', err);
    }
  };

  const handleAddPattern = async () => {
    if (!newKeywords.trim() || !newReply.trim()) return;
    try {
      await createReplyPattern({
        category: newCategory || 'general',
        keywords: newKeywords,
        preferred_reply: newReply,
        auto_send: true
      });
      setNewKeywords('');
      setNewReply('');
      fetchPatterns();
    } catch (err) {
      console.error('Error creating pattern:', err);
    }
  };

  const handleDeletePattern = async (id) => {
    try {
      await deleteReplyPattern(id);
      fetchPatterns();
    } catch (err) {
      console.error('Error deleting pattern:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const [data, statusData] = await Promise.all([
        getSettings(),
        getOnboardingStatus().catch(() => null)
      ]);
      setSettingsData(data);
      setAutoReply(data.auto_reply_enabled);
      setThreshold(data.confidence_threshold);
      setSystemPrompt(data.system_prompt);
      if (data.language) setLanguage(data.language);
      if (data.tone) setTone(data.tone);
      if (data.custom_signature !== undefined) setSignature(data.custom_signature || '');
      if (statusData && statusData.client && statusData.client.phone_number) {
        setAssignedPhone(statusData.client.phone_number);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateSettings({
        auto_reply_enabled: autoReply,
        confidence_threshold: threshold,
        system_prompt: systemPrompt,
        language: language,
        tone: tone,
        custom_signature: signature
      });
      setSettingsData(updated);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const languageOptions = [
    'Auto-detect (Match Client)',
    'English',
    'Spanish (Español)',
    'French (Français)',
    'German (Deutsch)',
    'Portuguese (Português)',
    'Traditional Chinese (繁體中文)'
  ];

  const toneOptions = [
    'Warm & Luxurious Spa',
    'Professional & Concise',
    'Casual & Friendly',
    'Strict & Formal'
  ];

  return (
    <div className="space-y-4 pb-20">
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Bot Control & AI Setup</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage language, tone of voice, Claude master prompt & review rules</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.href = '/?view=landing'}
          className="bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition flex items-center gap-1.5 flex-shrink-0"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Landing Page</span>
        </button>
      </div>

      {/* Active AI Mobile Line Display Card */}
      <div className="glass-card p-4 rounded-2xl border border-red-800/60 bg-red-950/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-900/50 flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">Assigned AI Mobile Line</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">ACTIVE</span>
              </div>
              <p className="text-base font-mono font-bold text-white tracking-wide">
                {assignedPhone || '+1 (260) 366-0928'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const num = assignedPhone || '+1 (260) 366-0928';
              navigator.clipboard.writeText(num);
              alert(`Copied AI Mobile Line: ${num}`);
            }}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-md active:scale-95 flex-shrink-0"
          >
            Copy Number
          </button>
        </div>

        {/* 1-Click Directory Links: WhatsApp & SMS */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              const clean = (assignedPhone || '+12603660928').replace(/\D/g, '');
              const waUrl = `https://wa.me/${clean}`;
              navigator.clipboard.writeText(waUrl);
              alert(`Copied WhatsApp Direct Link:\n${waUrl}\n\nPaste this onto your escort directory listing!`);
            }}
            className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-xs font-semibold py-2 px-2.5 rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>💬 Copy WhatsApp Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const clean = (assignedPhone || '+12603660928').replace(/\D/g, '');
              const smsUrl = `sms:+${clean}`;
              navigator.clipboard.writeText(smsUrl);
              alert(`Copied Direct SMS Link:\n${smsUrl}\n\nPaste this onto your website!`);
            }}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold py-2 px-2.5 rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>📱 Copy SMS Link</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Custom Message Signature */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Custom Message Sign-off</span>
          </h3>
          <p className="text-[11px] text-slate-400">This signature is added to the end of your automated client replies</p>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="e.g. thanks babe x"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving Setup...' : 'Save Setup Settings'}</span>
        </button>

        {savedMsg && (
          <p className="text-center text-xs text-emerald-400 font-semibold animate-fade-in">
            ✅ Language, Tone & Settings updated successfully!
          </p>
        )}
      </form>
    </div>
  );
}
