import React, { useState } from 'react';
import { X, Send, Sparkles, Phone, MessageSquare, Tag, AlertCircle } from 'lucide-react';
import { sendSimulatorMessage } from '../services/api';

export default function SimulatorModal({ isOpen, onClose, onSuccess }) {
  const [clientName, setClientName] = useState('Sarah Jenkins');
  const [phoneNumber, setPhoneNumber] = useState('+14155552671');
  const [channel, setChannel] = useState('whatsapp');
  const [messageBody, setMessageBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  if (!isOpen) return null;

  const presets = [
    {
      title: 'Street Arrival (1.1)',
      text: 'im in the street, which door number do i buzz?',
      icon: Sparkles
    },
    {
      title: 'Short Notice (2.1)',
      text: 'can i come over, are you free in 15mins?',
      icon: Sparkles
    },
    {
      title: 'Services & Pricing (3.1)',
      text: 'how much are your rates and services?',
      icon: MessageSquare
    },
    {
      title: 'Discount Request (7.1)',
      text: 'can i get a discount or cheap deal?',
      icon: Tag
    },
    {
      title: 'Parking & Transport (12.1)',
      text: 'where to park near you?',
      icon: Sparkles
    },
    {
      title: 'First-Time Client (17.1)',
      text: 'first time client, what to expect?',
      icon: Sparkles
    },
    {
      title: 'Off-Topic / Hardcore (18.1)',
      text: 'do you do anything hardcore?',
      icon: AlertCircle
    },
    {
      title: 'Duo / Friend Request (20.1)',
      text: 'Do you do Duo or have a friend?',
      icon: Tag
    },
    {
      title: 'Full Service List (22.1)',
      text: 'What are your services, prices, located, based?',
      icon: MessageSquare
    }
  ];

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!messageBody.trim()) return;

    setLoading(true);
    setLastResult(null);
    try {
      const res = await sendSimulatorMessage({
        client_name: clientName,
        phone_number: phoneNumber,
        channel: channel,
        message_body: messageBody
      });
      setLastResult(res.result);
      setMessageBody('');
      if (onSuccess) onSuccess(res.result);
    } catch (err) {
      console.error('Simulator error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-5 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Telnyx Message Simulator</h3>
              <p className="text-[11px] text-slate-400">Test Claude (Haiku 4.5) AI response & review queue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Quick Picker */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick Sample Presets
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessageBody(p.text)}
                  className="text-left p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-200 transition flex items-center gap-1.5 active:scale-95"
                >
                  <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium">{p.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Messaging Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`py-1.5 text-xs font-semibold rounded-xl border transition ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`py-1.5 text-xs font-semibold rounded-xl border transition ${
                  channel === 'sms'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                SMS
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Message Content</label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={3}
              placeholder="Type customer message to test..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !messageBody.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Analyzing with Claude...' : 'Send Simulated Message'}</span>
          </button>
        </form>

        {/* Result Feedback Banner */}
        {lastResult && (
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-emerald-500/30 text-xs">
            <div className="flex items-center justify-between font-semibold text-emerald-400 mb-1">
              <span>Execution Result:</span>
              <span className="uppercase text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {lastResult.status}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              {lastResult.status === 'queued_for_review'
                ? '➡️ Message flagged! Added to Manager Review Queue.'
                : `✅ Auto-replied: "${lastResult.reply_text}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
