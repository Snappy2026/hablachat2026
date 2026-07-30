import React, { useState } from 'react';
import { Check, Edit3, X, AlertTriangle, Sparkles, MessageCircle, Send, HelpCircle } from 'lucide-react';

export default function ReviewCard({ item, onApprove, onReject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(item.proposed_reply);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(item.id, isEditing ? editedText : null);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(item.id);
    } finally {
      setLoading(false);
    }
  };

  const confidencePct = Math.round((item.confidence || 0) * 100);

  return (
    <div className="glass-card rounded-2xl p-4 border border-rose-500/30 bg-slate-900/80 shadow-xl relative overflow-hidden transition-all">
      {/* Decorative Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500" />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-100 text-sm">{item.session?.client_name || item.client_name || 'Valued Client'}</h3>
            <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {item.intent || 'Inquiry'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.session?.phone_number || item.phone_number}</p>
        </div>

        {/* Confidence Score Badge */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-amber-400">
            <span>Confidence</span>
            <span>{confidencePct}%</span>
          </div>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                confidencePct >= 85 ? 'bg-emerald-500' : confidencePct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`} 
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Review Reason Banner */}
      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-3 py-2 rounded-xl mb-3">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
        <span className="leading-tight text-[11px] font-medium">{item.review_reason}</span>
      </div>

      {/* Customer Inbound Message */}
      <div className="mb-3 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
          <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Client Query:</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-normal italic">
          "{item.message?.content || item.client_message || 'Inquiry'}"
        </p>
      </div>

      {/* Claude AI Draft / Edit View */}
      <div className="mb-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Claude Proposed Reply:</span>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <Edit3 className="w-3 h-3" /> Edit Draft
            </button>
          )}
        </div>

        {isEditing ? (
          <div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[70px]"
              placeholder="Edit AI proposed reply..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => { setIsEditing(false); setEditedText(item.proposed_reply); }}
                className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-emerald-100 leading-relaxed font-normal">
            {editedText}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition disabled:opacity-50"
        >
          {isEditing ? <Send className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{isEditing ? 'Send Edited Reply' : 'Approve & Send'}</span>
        </button>

        <button
          onClick={handleReject}
          disabled={loading}
          className="bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-800/80 text-slate-300 hover:text-rose-300 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition disabled:opacity-50"
          title="Reject AI draft & manual takeover"
        >
          <X className="w-4 h-4" />
          <span>Reject</span>
        </button>
      </div>
    </div>
  );
}
