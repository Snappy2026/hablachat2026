import React, { useState } from 'react';
import { Sparkles, MessageSquare, Calendar, ListChecks, User, Wrench, Rocket, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'pl', flag: '🇵🇱', label: 'Polski' },
  { code: 'ro', flag: '🇷🇴', label: 'Română' },
];

const TRANSLATIONS = {
  en: {
    heroBadge: "Specialist Escort",
    heroTitle: "Customer Messaging",
    heroSub: "Automated customer enquiry management 24/7. Instant responses, booking management, and a review queue — all from your phone.",
    feature1Title: "Instant Auto-Reply",
    feature2Title: "Smart Booking Management",
    feature3Title: "Manager Review Queue",
    howItWorks: "How It Works",
    step1Title: "1. Sign Up",
    step1Desc: "Enter your details and get your own mobile phone number",
    step2Title: "2. Set Up Assistant",
    step2Desc: "Customise your tone, services, and pricing",
    step3Title: "3. Go Live",
    step3Desc: "Customers text your number, system handles the rest",
    readyTitle: "Ready to get started?",
    getStartedNow: "Get Started Now",
  },
  es: {
    heroBadge: "Especialista en Chat",
    heroTitle: "Mensajería con Clientes",
    heroSub: "Gestión automatizada de consultas 24/7. Respuestas al instante, reservas y control de mensajes desde tu teléfono.",
    feature1Title: "Respuesta Automática",
    feature2Title: "Gestión de Reservas",
    feature3Title: "Cola de Revisión",
    howItWorks: "Cómo Funciona",
    step1Title: "1. Regístrate",
    step1Desc: "Introduce tus datos y obtén tu número de teléfono móvil",
    step2Title: "2. Configura el Asistente",
    step2Desc: "Personaliza el tono, tus tarifas y los detalles",
    step3Title: "3. Ponte en Marcha",
    step3Desc: "Los clientes escriben a tu número, el sistema hace el resto",
    readyTitle: "¿Lista para empezar?",
    getStartedNow: "Comenzar Ahora",
  },
  fr: {
    heroBadge: "Assistant Spécialisé",
    heroTitle: "Messagerie Client Intelligente",
    heroSub: "Gestion automatisée de vos demandes 24h/24 et 7j/7. Réponses instantanées et suivi des réservations depuis votre téléphone.",
    feature1Title: "Auto-Réponse Instantanée",
    feature2Title: "Gestion des Réservations",
    feature3Title: "File de Validation",
    howItWorks: "Comment Ça Marche",
    step1Title: "1. Inscription",
    step1Desc: "Créez votre compte et obtenez votre numéro mobile dédié",
    step2Title: "2. Configuration",
    step2Desc: "Personnalisez vos tarifs, règles et votre style de réponse",
    step3Title: "3. Lancement",
    step3Desc: "Vos clients envoient un SMS, le système répond automatiquement",
    readyTitle: "Prête à commencer ?",
    getStartedNow: "Lancer Maintenant",
  },
  de: {
    heroBadge: "Spezialist Chat",
    heroTitle: "Kundenservice & Nachrichten",
    heroSub: "Automatisierte Kundenanfragen rund um die Uhr. Sofortige Antworten und smarte Buchungsverwaltung direkt vom Smartphone.",
    feature1Title: "Sofort-Auto-Antwort",
    feature2Title: "Smarte Buchungsverwaltung",
    feature3Title: "Freigabe-Warteschlange",
    howItWorks: "So Funktioniert Es",
    step1Title: "1. Registrierung",
    step1Desc: "Daten eingeben und eigene Mobilfunknummer erhalten",
    step2Title: "2. Assistent Einrichten",
    step2Desc: "Preise, Stil und Adresse anpassen",
    step3Title: "3. Starten",
    step3Desc: "Kunden schreiben per WhatsApp/SMS, das System erledigt den Rest",
    readyTitle: "Bereit durchzustarten?",
    getStartedNow: "Jetzt Starten",
  },
  it: {
    heroBadge: "Specialista Chat",
    heroTitle: "Messaggistica Clienti",
    heroSub: "Gestione automatizzata delle richieste 24/7. Risposte veloci e prenotazioni automatiche dal tuo smartphone.",
    feature1Title: "Risposta Automatica",
    feature2Title: "Gestione Prenotazioni",
    feature3Title: "Coda di Revisione",
    howItWorks: "Come Funziona",
    step1Title: "1. Registrazione",
    step1Desc: "Inserisci i dettagli e ricevi il tuo numero di cellulare",
    step2Title: "2. Configura l'Assistente",
    step2Desc: "Personalizza prezzi, orari e stile dei messaggi",
    step3Title: "3. Vai Online",
    step3Desc: "I clienti ti scrivono su WhatsApp, il sistema fa tutto per te",
    readyTitle: "Pronta per iniziare?",
    getStartedNow: "Inizia Subito",
  },
  pt: {
    heroBadge: "Especialista em Chat",
    heroTitle: "Mensagens para Clientes",
    heroSub: "Atendimento automatizado a clientes 24 horas por dia. Respostas automáticas e gestão de agendamentos pelo celular.",
    feature1Title: "Resposta Automática",
    feature2Title: "Gestão de Agendamentos",
    feature3Title: "Fila de Revisão",
    howItWorks: "Como Funciona",
    step1Title: "1. Cadastre-se",
    step1Desc: "Insira os dados e obtenha seu próprio número de celular",
    step2Title: "2. Ajuste o Assistente",
    step2Desc: "Personalize seu estilo, valores e localização",
    step3Title: "3. Fique Online",
    step3Desc: "Seus clientes enviam mensagens e o sistema responde",
    readyTitle: "Pronta para começar?",
    getStartedNow: "Começar Já",
  },
  pl: {
    heroBadge: "Specjalny Chat",
    heroTitle: "Wiadomości od Klientów",
    heroSub: "Automatyczna obsługa wiadomości od klientów 24/7. Automatyczne rezerwacje i szybkie odpowiedzi z telefonu.",
    feature1Title: "Automatyczne Odpowiedzi",
    feature2Title: "Zarządzanie Rezerwacjami",
    feature3Title: "Kolejka Akceptacji",
    howItWorks: "Jak To Działa",
    step1Title: "1. Zarejestruj się",
    step1Desc: "Wpisz dane i odbierz swój dedykowany numer komórkowy",
    step2Title: "2. Ustaw Asystenta",
    step2Desc: "Dostosuj cennik i styl wypowiedzi",
    step3Title: "3. Działaj",
    step3Desc: "Klienci piszą na Twój numer, a system załatwia resztę",
    readyTitle: "Gotowa na start?",
    getStartedNow: "Rozpocznij Teraz",
  },
  ro: {
    heroBadge: "Specialist Chat",
    heroTitle: "Mesaje pentru Clienți",
    heroSub: "Gestionare automatizată a întrebărilor clienților 24/7. Răspunsuri instant și rezervări rapide direct de pe telefon.",
    feature1Title: "Răspuns Automat Instant",
    feature2Title: "Gestionare Rezervări",
    feature3Title: "Coadă de Revizuire",
    howItWorks: "Cum Funcționează",
    step1Title: "1. Înregistrează-te",
    step1Desc: "Introdu datele și primești propriul număr de mobil",
    step2Title: "2. Setează Asistentul",
    step2Desc: "Personalizează-ți stilul, tarifele și detaliile",
    step3Title: "3. Fii Live",
    step3Desc: "Clienții scriu pe numărul tău, sistemul se ocupă de restul",
    readyTitle: "Ești gata de start?",
    getStartedNow: "Începe Acum",
  }
};

export default function LandingPage({ onGetStarted, weeklyCharge, onOpenAdmin = () => {} }) {
  const [lang, setLang] = useState('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const activeLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div className="min-h-screen hero-gradient text-white overflow-y-auto no-scrollbar relative">
      {/* Curved background ambient light streak */}
      <div 
        className="absolute top-0 right-0 w-[550px] h-[750px] pointer-events-none opacity-50 z-0"
        style={{
          background: 'radial-gradient(ellipse at 85% 15%, rgba(244, 63, 94, 0.45) 0%, rgba(225, 29, 72, 0.15) 45%, rgba(9, 9, 11, 0) 75%)',
        }}
      />

      {/* ─── Header Flag Language Switcher Bar ─── */}
      <div className="relative z-30 px-6 pt-5 max-w-lg mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/50 border border-white/20">
            <Sparkles className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          </div>
          <span className="font-extrabold text-sm text-depth-white tracking-tight">Specialist Escort Chat</span>
        </div>

        {/* Top Bar Actions: Manager Login & Flag Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdmin}
            className="bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            Login
          </button>

          {/* Flag Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-700/60 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-xl backdrop-blur-md transition active:scale-95"
            >
              <span className="text-base leading-none">{activeLang.flag}</span>
              <span className="text-slate-200">{activeLang.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-xl animate-fade-in-up">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                      lang === l.code
                        ? 'bg-rose-950/80 text-rose-300 font-bold border border-rose-800/60'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative px-6 pt-8 pb-6 text-center max-w-lg mx-auto z-10">
        {/* Headline */}
        <h1 className="relative z-10 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
          <span className="text-depth-white block">{t.heroBadge}</span>
          <span className="text-glow-red block font-black">{t.heroTitle}</span>
        </h1>

        <p className="relative z-10 text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 max-w-sm mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {t.heroSub}
        </p>
      </section>

      {/* ─── 3 Glassmorphism Feature Cards ─── */}
      <section className="px-4 pb-10 max-w-lg mx-auto relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {/* Card 1 */}
          <div className="glass-3d-card rounded-2xl p-3 text-center flex flex-col items-center justify-center min-h-[110px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-10 h-10 bg-white/20 blur-md pointer-events-none rounded-full" />
            <MessageSquare className="w-6 h-6 text-white mb-2 flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
            <h3 className="font-extrabold text-[11px] text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t.feature1Title}</h3>
          </div>

          {/* Card 2 */}
          <div className="glass-3d-card rounded-2xl p-3 text-center flex flex-col items-center justify-center min-h-[110px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-10 h-10 bg-white/20 blur-md pointer-events-none rounded-full" />
            <Calendar className="w-6 h-6 text-white mb-2 flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
            <h3 className="font-extrabold text-[11px] text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t.feature2Title}</h3>
          </div>

          {/* Card 3 */}
          <div className="glass-3d-card rounded-2xl p-3 text-center flex flex-col items-center justify-center min-h-[110px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-10 h-10 bg-white/20 blur-md pointer-events-none rounded-full" />
            <ListChecks className="w-6 h-6 text-white mb-2 flex-shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform" />
            <h3 className="font-extrabold text-[11px] text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t.feature3Title}</h3>
          </div>
        </div>
      </section>

      {/* ─── How It Works (Exact Mockup Stepper) ─── */}
      <section className="px-4 pb-12 max-w-lg mx-auto relative z-10">
        <h2 className="text-center text-lg font-extrabold text-depth-white mb-8 tracking-wide">{t.howItWorks}</h2>

        <div className="relative">
          {/* Horizontal Laser Connecting Line */}
          <div className="absolute top-6 left-12 right-12 laser-beam-line pointer-events-none hidden sm:block" />

          <div className="grid grid-cols-3 gap-2 relative z-10 text-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full glass-sphere flex items-center justify-center mb-3">
                <User className="w-5.5 h-5.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>
              <h4 className="font-extrabold text-xs text-white leading-tight mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t.step1Title}</h4>
              <p className="text-[10px] text-slate-300 leading-snug max-w-[100px] mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t.step1Desc}</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full glass-sphere flex items-center justify-center mb-3">
                <Wrench className="w-5.5 h-5.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>
              <h4 className="font-extrabold text-xs text-white leading-tight mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t.step2Title}</h4>
              <p className="text-[10px] text-slate-300 leading-snug max-w-[100px] mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t.step2Desc}</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full glass-sphere flex items-center justify-center mb-3">
                <Rocket className="w-5.5 h-5.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>
              <h4 className="font-extrabold text-xs text-white leading-tight mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{t.step3Title}</h4>
              <p className="text-[10px] text-slate-300 leading-snug max-w-[100px] mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing CTA Card ─── */}
      <section className="px-5 pb-16 max-w-lg mx-auto relative z-10">
        <div className="cta-3d-card p-6 rounded-3xl text-center relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <h3 className="font-extrabold text-lg text-depth-white">{t.readyTitle}</h3>
          </div>

          <div className="mb-6">
            <span className="text-4xl font-black text-depth-white">
              £{weeklyCharge || '75'}
            </span>
            <span className="text-slate-400 text-sm font-medium">/week</span>
          </div>

          <button
            onClick={onGetStarted}
            className="w-full btn-3d-red text-white font-extrabold text-base py-4 rounded-2xl transition-all active:scale-95 text-depth-white"
          >
            {t.getStartedNow}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 px-6">
        <p
          onClick={onOpenAdmin}
          className="text-slate-500 hover:text-slate-400 text-xs font-medium tracking-wide cursor-pointer transition select-none"
        >
          Powered by Specialist Escort Chat
        </p>
      </footer>
    </div>
  );
}
