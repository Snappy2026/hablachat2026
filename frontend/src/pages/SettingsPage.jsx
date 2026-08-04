import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Sparkles, Key, CheckCircle, AlertCircle, Save, Globe, MessageSquare, Tag, Smartphone } from 'lucide-react';
import { getSettings, updateSettings, getReplyPatterns, createReplyPattern, deleteReplyPattern, getOnboardingStatus, getAllClients, updateClientStatus, updateClientPhone, updateClientPasscode, getWeeklyCharge, updateWeeklyCharge } from '../services/api';

export default function SettingsPage() {
  const [settingsData, setSettingsData] = useState(null);
  const [assignedPhone, setAssignedPhone] = useState(localStorage.getItem('purchased_phone_number') || '');
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
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [masterPasscode, setMasterPasscode] = useState(localStorage.getItem('master_admin_passcode') || 'Habla2026!');
  const [newMasterPasscode, setNewMasterPasscode] = useState('');
  const [passcodeSaved, setPasscodeSaved] = useState(false);
  const [clientList, setClientList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [weeklyPriceInput, setWeeklyPriceInput] = useState('0.50');
  const [priceSavedMsg, setPriceSavedMsg] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchPatterns();
    fetchClients();
    getWeeklyCharge().then(d => setWeeklyPriceInput(String(d.weekly_charge || '0.50'))).catch(() => {});
  }, []);

  const fetchClients = async () => {
    try {
      const data = await getAllClients();
      if (data && data.length > 0) {
        setClientList(data);
      }
    } catch (err) {
      console.error('Error fetching clients list:', err);
    }
  };

  const handleToggleStatus = async (clientId, currentStatus) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await updateClientStatus(clientId, nextStatus);
      fetchClients();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleReassignPhone = async (clientId, currentPhone) => {
    const newPhone = prompt('Enter new assigned Twilio Mobile Line for this model:', currentPhone || '+44 7791 126970');
    if (!newPhone) return;
    try {
      await updateClientPhone(clientId, newPhone.trim());
      fetchClients();
      alert(`Reassigned line for account #${clientId} to: ${newPhone.trim()}`);
    } catch (err) {
      alert('Error reassigning phone: ' + err.message);
    }
  };

  const handleUpdatePasscode = async (clientId, currentPasscode) => {
    const newPin = prompt('Set private PIN / Password for this model account:', currentPasscode || '8888');
    if (!newPin) return;
    try {
      await updateClientPasscode(clientId, newPin.trim());
      fetchClients();
      alert(`Updated passcode for account #${clientId} to: ${newPin.trim()}`);
    } catch (err) {
      alert('Error updating passcode: ' + err.message);
    }
  };

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
        localStorage.setItem('purchased_phone_number', statusData.client.phone_number);
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
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              <span>{isMasterAdmin ? '👑 Master Agency Admin Portal' : 'Bot Control & Setup'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isMasterAdmin ? 'Full control over client roster, system prompts, and Twilio lines' : 'Manage your active mobile line and message signature'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMasterAdmin(!isMasterAdmin)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition active:scale-95 flex items-center gap-1.5 ${
              isMasterAdmin 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-950/40' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <span>{isMasterAdmin ? '👑 Master Admin Mode' : '📱 Member View'}</span>
          </button>
        </div>

        {/* Master Admin Info Banner */}
        {isMasterAdmin && (
          <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl flex items-center justify-between text-xs text-amber-200">
            <span className="font-semibold">🔑 Master Passcode: <span className="font-mono text-white font-extrabold tracking-wider bg-amber-900/60 px-2 py-0.5 rounded">8888</span></span>
            <span className="text-[11px] text-amber-400 font-medium">Full Master Admin Privileges Granted</span>
          </div>
        )}
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
                {assignedPhone || 'Line Pending Provisioning'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const num = assignedPhone || 'Line Pending Provisioning';
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

      {/* 👑 MASTER ADMIN EXCLUSIVE CONTROLS */}
      {isMasterAdmin && (
        <div className="space-y-4">
          {/* Master Admin Passcode Security Settings */}
          <div className="glass-card p-4 rounded-2xl border border-rose-800/60 bg-rose-950/20 space-y-3">
            <h3 className="font-bold text-sm text-rose-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-rose-400" />
              <span>🔐 Master Admin Passcode Security</span>
            </h3>
            <p className="text-[11px] text-slate-300">Set your private custom passcode to log into Master Admin mode</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMasterPasscode}
                onChange={(e) => setNewMasterPasscode(e.target.value)}
                placeholder="Enter new Master Passcode (e.g. MyAgency2026!)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMasterPasscode.trim()) return;
                  localStorage.setItem('master_admin_passcode', newMasterPasscode.trim());
                  setMasterPasscode(newMasterPasscode.trim());
                  setNewMasterPasscode('');
                  setPasscodeSaved(true);
                  setTimeout(() => setPasscodeSaved(false), 4000);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md active:scale-95 flex-shrink-0"
              >
                Save Passcode
              </button>
            </div>
            {passcodeSaved && (
              <p className="text-xs text-emerald-400 font-bold animate-fade-in">
                ✅ Master Admin Passcode updated to: <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded">{masterPasscode}</span>
              </p>
            )}
          </div>

          {/* Master Weekly Subscription Price Control */}
          <div className="glass-card p-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/20 space-y-3">
            <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>💰 Master Subscription Price Manager</span>
            </h3>
            <p className="text-[11px] text-slate-300">Set the weekly membership fee charged to model accounts on signup & Stripe checkout</p>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  value={weeklyPriceInput}
                  onChange={(e) => setWeeklyPriceInput(e.target.value)}
                  placeholder="14.99"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!weeklyPriceInput) return;
                  try {
                    await updateWeeklyCharge(parseFloat(weeklyPriceInput));
                    setPriceSavedMsg(true);
                    setTimeout(() => setPriceSavedMsg(false), 4000);
                  } catch (err) {
                    alert('Error updating price: ' + err.message);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md active:scale-95 flex-shrink-0"
              >
                Save New Price
              </button>
            </div>
            {priceSavedMsg && (
              <p className="text-xs text-emerald-400 font-bold animate-fade-in">
                ✅ Weekly Subscription price updated to: <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded">£{weeklyPriceInput} / week</span> (Stripe checkout & onboarding updated!)
              </p>
            )}
          </div>

          {/* Registered Agency Members Roster */}
          <div className="glass-card p-4 rounded-2xl border border-amber-800/60 bg-amber-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>👑 Enterprise Agency Roster & Action Controls</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const items = clientList.length > 0 ? clientList : [{ id: 1, model_name: 'Anna', email: 'anna@hablachat.app', phone_number: '+12603660928', status: 'active' }];
                  const csvHeader = 'ID,Model Name,Email,Assigned Phone,Status\n';
                  const csvRows = items.map(c => `${c.id},"${c.model_name || ''}","${c.email || ''}","${c.phone_number || ''}",${c.status || 'active'}`).join('\n');
                  const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `HablaChat_Agency_Roster_${new Date().toISOString().slice(0,10)}.csv`;
                  a.click();
                }}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition active:scale-95 flex items-center gap-1"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Real-time Search Bar */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search models by name, email, or mobile line..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            {/* Member Action Cards List */}
            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {clientList
                .filter(c => 
                  !searchTerm || 
                  (c.model_name && c.model_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (c.phone_number && c.phone_number.includes(searchTerm))
                )
                .length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-300">No registered member accounts yet</p>
                    <p className="text-[11px] text-slate-500">New model signups and active subscriptions will appear here in real time.</p>
                  </div>
                ) : (
                  clientList
                    .filter(c => 
                      !searchTerm || 
                      (c.model_name && c.model_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (c.phone_number && c.phone_number.includes(searchTerm))
                    )
                    .map((c) => {
                      const isSuspended = c.status === 'suspended';
                      return (
                        <div key={c.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white">{c.model_name || 'Anna Model'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{c.email} • {c.phone_number}</p>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              isSuspended 
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                            </span>
                          </div>

                          {/* 1-Click Action Controls */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-900">
                            <button
                              type="button"
                              onClick={() => handleUpdatePasscode(c.id, c.passcode)}
                              className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 text-[10px] font-bold px-2.5 py-1 rounded-lg transition active:scale-95 flex items-center gap-1"
                              title="Set or Update Account PIN / Password"
                            >
                              🔑 PIN: {c.passcode || '8888'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReassignPhone(c.id, c.phone_number)}
                              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-lg transition active:scale-95"
                            >
                              📱 Reassign Line
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(c.id, c.status)}
                              className={`border text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition active:scale-95 ${
                                isSuspended
                                  ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                                  : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-800/60'
                              }`}
                            >
                              {isSuspended ? '🟢 Reactivate Account' : '🔴 Suspend Account'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
            </div>
          </div>

          {/* Master Claude Prompt & Engine Customization */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Claude Master System Prompt</span>
            </h3>
            <p className="text-[11px] text-slate-400">Services, pricing, cancellation policies, and studio rules</p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Simulation Reply Library */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span>Simulation Reply Library</span>
              </h3>
              <a
                href="/thinking-sheet.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-teal-300 hover:text-white font-semibold bg-teal-950/80 hover:bg-teal-900 px-2.5 py-1 rounded-lg border border-teal-700/60 transition flex items-center gap-1"
              >
                🧠 Print Thinking Sheet
              </a>
            </div>
            <p className="text-[11px] text-slate-400">Define specific client inquiry triggers and your exact preferred responses.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {replyPatterns.map((p) => (
                <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700">{p.category}</span>
                      <span className="text-[11px] font-mono text-slate-300">Triggers: {p.keywords}</span>
                    </div>
                    <p className="text-xs text-emerald-200 font-normal italic leading-relaxed">"{p.preferred_reply}"</p>
                  </div>
                  <button type="button" onClick={() => handleDeletePattern(p.id)} className="text-slate-500 hover:text-rose-400 p-1">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
