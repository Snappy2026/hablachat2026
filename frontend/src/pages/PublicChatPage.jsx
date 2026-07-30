import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Calendar, Clock, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { sendSimulatorMessage } from '../services/api';

export default function PublicChatPage({ modelName = 'Anna' }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hiya babe! Thanks for messaging ${modelName} 💕 How can I help you today? Are you looking to book an appointment?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      const res = await sendSimulatorMessage({
        phone_number: `+447700${Math.floor(100000 + Math.random() * 900000)}`,
        message_body: currentInput,
        channel: 'web',
        client_name: 'Guest Client'
      });

      let reply = "Thanks for your inquiry babe! Let me check my schedule for you 💕";
      if (res && res.result && res.result.reply_text) {
        reply = res.result.reply_text;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: "Hi babe, I received your message! Let me double check my availability x",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md md:max-w-xl mx-auto shadow-2xl relative border-x border-slate-800/60">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-950/50 text-lg">
              {modelName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-base text-white tracking-tight leading-none">{modelName}</h2>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <span>●</span> Online & Responding Instantly
            </p>
          </div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 fill-rose-400" /> Verified Assistant
        </div>
      </header>

      {/* Quick Action Chips */}
      <div className="bg-slate-900/40 p-2.5 px-4 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <button
          onClick={() => {
            setInputText("Hi babe, what are your rates and availability?");
          }}
          className="bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold px-3 py-1.5 rounded-full border border-rose-500/20 whitespace-nowrap transition"
        >
          💎 Rates & Availability
        </button>
        <button
          onClick={() => {
            setInputText("Are you available for a 1-hour appointment today?");
          }}
          className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold px-3 py-1.5 rounded-full border border-emerald-500/20 whitespace-nowrap transition"
        >
          📅 Book Today
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[400px] max-h-[calc(100vh-180px)]">
        {messages.map((m) => {
          const isBot = m.sender === 'bot';
          return (
            <div key={m.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}>
              <div className={`max-w-[82%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                isBot 
                  ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none' 
                  : 'bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-tr-none font-medium'
              }`}>
                <p className="whitespace-pre-line">{m.text}</p>
                <span className={`text-[10px] block mt-1 text-right ${isBot ? 'text-slate-500' : 'text-rose-200'}`}>
                  {m.time}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400 animate-spin" />
              <span>{modelName} is typing a message...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <footer className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-3 pb-safe">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${modelName} directly...`}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-12 h-12 bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition shadow-lg shadow-rose-950/50 active:scale-95 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
