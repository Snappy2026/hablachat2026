import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, User, Sparkles, UserCheck, ArrowLeft } from 'lucide-react';
import { getSessions, getSessionMessages, sendManualReply } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function MessagesPage() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const handleSelectSession = async (sess) => {
    setSelectedSession(sess);
    setLoading(true);
    try {
      const msgs = await getSessionMessages(sess.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendManualReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedSession) return;

    const content = replyContent;
    setReplyContent('');

    try {
      await sendManualReply(selectedSession.id, content);
      // Refresh messages
      const msgs = await getSessionMessages(selectedSession.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Error sending manual reply:', err);
    }
  };

  if (selectedSession) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] pb-16">
        {/* Chat Header */}
        <div className="glass-panel p-3 rounded-2xl border border-slate-800 flex items-center gap-3 mb-3">
          <button
            onClick={() => setSelectedSession(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-white text-sm">{selectedSession.client_name || 'Client'}</h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {selectedSession.phone_number} • {selectedSession.channel.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Message Timeline */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 no-scrollbar">
          {loading ? (
            <div className="text-center text-xs text-slate-400 py-8">{t('common.loading')}</div>
          ) : (
            messages.map((m) => {
              const isClient = m.sender === 'client';
              const isBot = m.sender === 'bot';
              const isManager = m.sender === 'manager';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isClient
                        ? 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                        : isBot
                        ? 'bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                        : 'bg-teal-900/80 text-teal-100 border border-teal-500/40 rounded-tr-none'
                    }`}
                  >
                    {/* Sender Header */}
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold mb-1 opacity-80">
                      {isClient && <User className="w-3 h-3 text-slate-300" />}
                      {isBot && <Sparkles className="w-3 h-3 text-emerald-400" />}
                      {isManager && <UserCheck className="w-3 h-3 text-teal-300" />}
                      <span>{isClient ? 'Client' : isBot ? 'Claude AI' : 'Manager Override'}</span>
                    </div>

                    <p>{m.content}</p>

                    {/* Footer Status Tag */}
                    <div className="flex items-center justify-end gap-1 text-[9px] opacity-60 mt-1">
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.twilio_sid && <span className="font-mono">✓ Twilio</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendManualReply} className="mt-2 glass-panel p-2 rounded-2xl border border-slate-800 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t('messages.typeMessage')}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!replyContent.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <h2 className="font-bold text-base text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-400" />
          <span>{t('messages.title')}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t('messages.noChatSelected')}</p>
      </div>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">{t('messages.noClientsFound')}</div>
        ) : (
          sessions.map((sess) => (
            <button
              key={sess.id}
              onClick={() => handleSelectSession(sess)}
              className="w-full text-left glass-card p-3.5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-sm border border-slate-700">
                  {sess.client_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{sess.client_name || 'Client'}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{sess.phone_number}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {sess.channel}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(sess.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
