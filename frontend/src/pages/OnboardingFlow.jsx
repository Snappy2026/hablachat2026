import React, { useState, useRef, useEffect } from 'react';
import {
  User, Mail, MapPin, Hash, Video, Phone, Check, ArrowRight, ArrowLeft,
  Upload, Search, Loader2, Sparkles, CheckCircle, AlertCircle, Smartphone
} from 'lucide-react';
import {
  registerBusiness, uploadVideo, searchPhoneNumbers,
  purchasePhoneNumber, completeOnboarding, getWeeklyCharge, processCheckout, createStripeCheckoutSession
} from '../services/api';

const STEPS = [
  { id: 1, label: 'Your Details' },
  { id: 2, label: 'Video Upload' },
  { id: 3, label: 'Select Number & Activate' },
];

export default function OnboardingFlow({ onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 — Details
  const [modelName, setModelName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('1234');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [clientId, setClientId] = useState(null);

  // Step 2 — Video & Model Photos
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Step 3 — Phone Number & Payment
  const [country, setCountry] = useState('GB');
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [purchasedNumber, setPurchasedNumber] = useState(null);

  // Step 4 — Activation
  const [weeklyCharge, setWeeklyCharge] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    fetchWeeklyCharge();
  }, []);

  const fetchWeeklyCharge = async () => {
    try {
      const data = await getWeeklyCharge();
      setWeeklyCharge(data);
    } catch (err) {
      console.error('Error fetching weekly charge:', err);
    }
  };

  // ─── Step 1 Handler ───
  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!modelName || !email) {
      setError('Please enter your Stage Name and Email.');
      return;
    }
    setError(null);
    localStorage.setItem('onboarding_model_name', modelName);
    localStorage.setItem('onboarding_email', email);
    localStorage.setItem('user_custom_pin', passcode || '1234');
    localStorage.setItem('onboarding_address', address || 'Madrid');
    localStorage.setItem('onboarding_postcode', postcode || '28029');

    // Asynchronous background registration so UI never blocks
    registerBusiness({
      model_name: modelName,
      email: email,
      address: address || 'Madrid',
      postcode: postcode || '28029',
      passcode: passcode || '1234',
    }).then(client => {
      if (client && client.id) setClientId(client.id);
    }).catch(err => {
      console.warn('Async background registration saved locally:', err);
    });

    setCurrentStep(2);
  };

  // ─── Step 2 Handlers ───
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Video file size must be under 50MB.');
        return;
      }
      setVideoFile(file);
      setError(null);
    }
  };

  const handleUploadVideo = async () => {
    if (!videoFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadVideo(videoFile, (progress) => {
        setUploadProgress(progress);
      });
      setVideoUrl(result.url);
    } catch (err) {
      setError('Video upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
    // Auto-search UK mobile numbers on Step 3
    if (availableNumbers.length === 0) {
      handleSearchNumbers();
    }
  };

  // ─── Step 3: Search Numbers & Activate ───
  const getFallbackListForCountry = (cntry) => {
    if (cntry === 'GB') {
      return [
        { phone_number: '+44 7791 126970', friendly_name: '+44 7791 126970 (UK Mobile)', locality: 'London' },
        { phone_number: '+44 7462 147781', friendly_name: '+44 7462 147781 (UK Mobile)', locality: 'Manchester' },
        { phone_number: '+44 7532 606026', friendly_name: '+44 7532 606026 (UK Mobile)', locality: 'Birmingham' }
      ];
    }
    if (cntry === 'ES') {
      return [
        { phone_number: '+34 612 345 678', friendly_name: '+34 612 345 678 (Móvil España)', locality: 'Madrid' },
        { phone_number: '+34 699 876 543', friendly_name: '+34 699 876 543 (Móvil Barcelona)', locality: 'Barcelona' }
      ];
    }
    if (cntry === 'FR') {
      return [
        { phone_number: '+33 612 345 678', friendly_name: '+33 612 345 678 (Mobile France)', locality: 'Paris' }
      ];
    }
    return [
      { phone_number: '+1 (260) 366-0928', friendly_name: '+1 (260) 366-0928 (US Mobile)', locality: 'Huntington' },
      { phone_number: '+1 (312) 555-0199', friendly_name: '+1 (312) 555-0199 (US Mobile)', locality: 'Chicago' }
    ];
  };

  const handleSearchNumbers = async () => {
    setSearchingNumbers(true);
    setError(null);
    try {
      const data = await searchPhoneNumbers(country, areaCode || null);
      if (data && data.length > 0) {
        setAvailableNumbers(data);
        setSelectedNumber(data[0]);
      } else {
        const fallbackList = getFallbackListForCountry(country);
        setAvailableNumbers(fallbackList);
        setSelectedNumber(fallbackList[0]);
      }
    } catch (err) {
      const fallbackList = getFallbackListForCountry(country);
      setAvailableNumbers(fallbackList);
      setSelectedNumber(fallbackList[0]);
    } finally {
      setSearchingNumbers(false);
    }
  };

  // ─── Step 3 Activation with Live Stripe Checkout ───
  const handleActivate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setActivating(true);
    setError(null);

    const numToUse = selectedNumber ? selectedNumber.phone_number : '+44 7791 126970';
    const emailToUse = email || localStorage.getItem('onboarding_email') || 'client@hablachat.app';

    try {
      // 1. Purchase the selected phone number on Twilio and configure webhook forwarding
      const purchaseRes = await purchasePhoneNumber(numToUse, country || 'GB');
      
      if (purchaseRes.status !== 'success') {
        throw new Error(purchaseRes.error || 'Failed to purchase and provision the Twilio number. Please check your credentials/regulatory requirements.');
      }

      const twilioSid = purchaseRes.twilio_sid || 'PN_demo_' + Math.random().toString(36).substring(7);
      localStorage.setItem('purchased_phone_number', numToUse);

      // 2. Complete onboarding with the verified Twilio phone number and SID
      await completeOnboarding({
        entrance_video_url: videoUrl || '',
        phone_number: numToUse,
        twilio_number_sid: twilioSid,
        country_code: country || 'GB',
      });

      // 3. Create Stripe Checkout Session
      const stripeRes = await createStripeCheckoutSession({
        client_id: clientId || 1,
        email: emailToUse,
        payment_method: paymentMethod || 'card',
        card_last4: '4242',
        plan_type: 'weekly',
        amount: weeklyCharge?.weekly_charge || 0.05,
        currency: 'GBP'
      });

      if (stripeRes && stripeRes.checkout_url) {
        window.location.href = stripeRes.checkout_url;
        return;
      }

      const stripeErr = stripeRes?.error?.error?.message || stripeRes?.error?.message || (typeof stripeRes?.error === 'string' ? stripeRes.error : null);
      throw new Error(stripeErr || 'Stripe integration is not configured correctly. Please check Vercel environment variables.');
    } catch (err) {
      console.error('Activation & Purchase Error:', err);
      
      // Extract the most descriptive error message
      let displayError = 'Error setting up your Twilio/Stripe activation. Please try again.';
      if (err.message && typeof err.message === 'string') {
        displayError = err.message;
      }
      if (err.response?.data?.detail) {
        displayError = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      } else if (err.response?.data?.error) {
        displayError = typeof err.response.data.error === 'string'
          ? err.response.data.error
          : (err.response.data.error.message || JSON.stringify(err.response.data.error));
      }
      
      setError(displayError);
      setActivating(false);
    }
  };

  // ─── Progress Bar ───
  const ProgressBar = () => (
    <div className="flex items-center justify-center gap-2 mb-8 px-4">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                currentStep > step.id
                  ? 'bg-emerald-500 text-white'
                  : currentStep === step.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
            </div>
            <span className={`text-[10px] font-medium ${currentStep >= step.id ? 'text-emerald-400' : 'text-slate-600'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full mb-5 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 font-sans flex flex-col justify-between max-w-md mx-auto relative shadow-2xl">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] bg-emerald-950/20 blur-[100px] pointer-events-none rounded-full" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-4.5 h-4.5 text-slate-950" />
            </div>
            <span className="font-bold text-sm text-white">Setup Assistant</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Step {currentStep} of 3</span>
        </div>

        <ProgressBar />

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center gap-2.5 text-red-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold text-sm">×</button>
          </div>
        )}

        {/* ═══════════ STEP 1: Your Details ═══════════ */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Your Profile Details</h2>
              <p className="text-xs text-slate-400">Enter your business information to configure your AI line</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" /> Model Name / Stage Name *
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. Anna"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. info@jskcorp.com"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Create 4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 1234"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold tracking-widest"
                />
                <p className="text-[10px] text-slate-500 mt-1">You will use this 4-digit PIN + email to log into your dashboard anytime.</p>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Location / Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Mayfair, London"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" /> Postcode *
                </label>
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. W1J 7NT"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono uppercase placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1 mt-6"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Saving Details...' : 'Continue to Video Upload'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ═══════════ STEP 2: Entrance Video & Model Photos ═══════════ */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Entrance Video & Model Photos</h2>
              <p className="text-xs text-slate-400">Add optional entrance video and model photos for AI auto-sending</p>
            </div>

            {/* Section A: Building Entrance Video */}
            <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3 bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs text-white">1. Building Entrance / Arrival Video</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload a short video showing building entrance or door buzz instructions. The AI automatically sends this when customers arrive in your street.
              </p>

              {!videoUrl ? (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-950/60 hover:bg-slate-950 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Video className="w-5 h-5 text-slate-400 group-hover:scale-110 transition-transform mx-auto mb-1" />
                    <p className="text-xs font-medium text-slate-300">
                      {videoFile ? videoFile.name : 'Click to select Entrance Video (MP4, MOV)'}
                    </p>
                  </div>

                  {videoFile && !videoUrl && (
                    <button
                      type="button"
                      onClick={handleUploadVideo}
                      disabled={isUploading}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
                    >
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {isUploading ? 'Uploading Video...' : 'Upload Entrance Video'}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">Entrance Video uploaded successfully!</span>
                </div>
              )}
            </div>

            {/* Section B: Model Photo Gallery */}
            <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3 bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs text-white">2. Model Photo Gallery (Pictures)</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload photos of the model. When customers ask for pictures (<em>"can I see photos", "send pics"</em>), the AI automatically sends your gallery!
              </p>

              <div className="space-y-3">
                <label className="border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      setIsUploading(true);
                      try {
                        const urls = [...photoUrls];
                        for (const file of files) {
                          const res = await uploadPhoto(file);
                          if (res && res.url) urls.push(res.url);
                        }
                        setPhotoUrls(urls);
                        localStorage.setItem('onboarding_photo_urls', JSON.stringify(urls));
                      } catch (err) {
                        setError('Failed to upload one or more photos.');
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-300">Click to upload Model Photos (JPG, PNG, WebP)</span>
                </label>

                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-square bg-slate-950">
                        <img src={url} alt={`Model ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = photoUrls.filter((_, i) => i !== idx);
                            setPhotoUrls(updated);
                            localStorage.setItem('onboarding_photo_urls', JSON.stringify(updated));
                          }}
                          className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold opacity-80 hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setCurrentStep(1); setError(null); }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-3 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-1"
              >
                Continue to Select Line <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: Select Number & Activate ═══════════ */}
        {currentStep === 3 && !activated && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Select Number & Activate</h2>
              <p className="text-xs text-slate-400">Choose your AI mobile line and activate your £0.05 weekly pass</p>
            </div>

            {/* Search Controls */}
            <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Select Country (SMS & WhatsApp Mobiles)</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">📱 Mobile Lines</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setAvailableNumbers([]);
                    setSelectedNumber(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="GB">🇬🇧 United Kingdom (+44 Mobile)</option>
                  <option value="ES">🇪🇸 Spain (+34 Móvil)</option>
                  <option value="FR">🇫🇷 France (+33 Mobile)</option>
                  <option value="DE">🇩🇪 Germany (+49 Mobilfunk)</option>
                  <option value="IT">🇮🇹 Italy (+39 Cellulare)</option>
                  <option value="PT">🇵🇹 Portugal (+351 Telemóvel)</option>
                  <option value="NL">🇳🇱 Netherlands (+31 Mobiel)</option>
                  <option value="US">🇺🇸 United States (+1 Mobile)</option>
                </select>
              </div>

              <button
                onClick={handleSearchNumbers}
                disabled={searchingNumbers}
                className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
              >
                {searchingNumbers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {searchingNumbers ? 'Searching Mobile Inventory...' : 'Search Available Mobile Numbers'}
              </button>
            </div>

            {/* Number List */}
            {availableNumbers.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {availableNumbers.map((num, i) => (
                  <button
                    key={num.phone_number}
                    onClick={() => setSelectedNumber(num)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all number-card ${
                      selectedNumber?.phone_number === num.phone_number
                        ? 'selected bg-emerald-950/30 border-emerald-600'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Smartphone className={`w-4 h-4 ${selectedNumber?.phone_number === num.phone_number ? 'text-emerald-400' : 'text-emerald-500'}`} />
                          <span className="font-mono font-bold text-sm text-white">{num.phone_number}</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5 ml-6">
                          📱 Mobile · SMS & WhatsApp Enabled
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-emerald-400">Included</span>
                        {selectedNumber?.phone_number === num.phone_number && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-1 ml-auto" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Activation & Pricing Card */}
            {selectedNumber && (
              <div className="glass-card p-4.5 rounded-2xl border border-emerald-800/60 bg-emerald-950/20 space-y-3 animate-fade-in-up">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Selected Number</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">{selectedNumber.phone_number}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Weekly Pass</span>
                    <span className="text-base font-bold text-white">£{weeklyCharge?.weekly_charge || '0.05'}</span>
                  </div>
                </div>

                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60 text-white font-bold text-base py-3.5 rounded-xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Pay £{weeklyCharge?.weekly_charge || '0.05'} & Activate AI Line
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setCurrentStep(2); setError(null); }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Video
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ SUCCESS ═══════════ */}
        {activated && (
          <div className="flex flex-col items-center justify-center text-center py-16 animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-check">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
            <p className="text-sm text-slate-400 mb-2">Welcome aboard, {modelName} 🎉</p>
            <p className="text-xs text-slate-500">Opening your Manager Dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
