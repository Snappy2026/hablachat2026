import React from 'react';
import { Calendar, Clock, User, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function BookingCard({ booking, onUpdateStatus }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Pending Confirmation
          </span>
        );
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/60 shadow-lg">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-white">{booking.client_name}</h4>
            {getStatusBadge(booking.status)}
          </div>
          <p className="text-[11px] text-slate-400">{booking.phone_number}</p>
        </div>
      </div>

      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 mb-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Service:
          </span>
          <span className="font-semibold text-emerald-300">{booking.service_name}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-400" /> Date:
          </span>
          <span className="font-medium text-slate-200">{booking.booking_date}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Time:
          </span>
          <span className="font-medium text-slate-200">{booking.booking_time} ({booking.duration_minutes || 60} mins)</span>
        </div>

        {booking.notes && (
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <span className="font-semibold text-slate-300">Notes:</span> {booking.notes}
          </div>
        )}
      </div>

      {booking.status === 'pending' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateStatus(booking.id, 'confirmed')}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl transition"
          >
            Confirm Slot
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, 'cancelled')}
            className="bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-xs font-semibold px-3 py-2 rounded-xl transition border border-slate-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
