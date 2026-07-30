import React from 'react';
import { ShieldAlert, CheckCircle2, Sparkles, Inbox } from 'lucide-react';
import ReviewCard from '../components/ReviewCard';

export default function QueuePage({ reviews, onApprove, onReject, onOpenSimulator }) {
  return (
    <div className="space-y-4 pb-20">
      {/* Page Header Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="font-bold text-base text-white">Pending Manager Reviews</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review & approve AI drafts for discounts, complaints & custom queries
            </p>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-xl">
            {reviews.length} Pending
          </div>
        </div>
      </div>

      {/* Review Queue List */}
      {reviews.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 my-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">All Clear!</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            No pending AI responses require manager review right now.
          </p>
          <button
            onClick={onOpenSimulator}
            className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Simulator</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
