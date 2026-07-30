import React, { useState, useEffect } from 'react';
import { CalendarCheck, Filter } from 'lucide-react';
import { getBookings, updateBookingStatus } from '../services/api';
import BookingCard from '../components/BookingCard';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await getBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      fetchBookings();
    } catch (err) {
      console.error('Error updating booking status:', err);
    }
  };

  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const filteredBookings = safeBookings.filter((b) => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-400" />
            <span>Extracted Bookings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Appointments auto-parsed by Claude (Haiku 4.5) AI</p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'all' ? 'bg-slate-800 font-semibold text-white' : 'text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'pending' ? 'bg-amber-500/20 font-semibold text-amber-400' : 'text-slate-400'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-2.5 py-1 rounded-lg transition ${
              filter === 'confirmed' ? 'bg-emerald-500/20 font-semibold text-emerald-400' : 'text-slate-400'
            }`}
          >
            Confirmed
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No appointments found matching filter.</div>
        ) : (
          filteredBookings.map((b) => (
            <BookingCard key={b.id} booking={b} onUpdateStatus={handleUpdateStatus} />
          ))
        )}
      </div>
    </div>
  );
}
