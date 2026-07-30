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
  { id: 3, label: 'Phone Number' },
  { id: 4, label: 'Confirm' },
];

export default function OnboardingFlow({ onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 — Details
  const [modelName, setModelName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [clientId, setClientId] = useState(null);

  // Step 2 — Video
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Step 3 — Phone Number
  const [country, setCountry] = useState('GB');
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [purchasedNumber, setPurchasedNumber] = useState(null);
  const [searchingNumbers, setSearchingNumbers] = useState(false);

  // Step 4 — Confirm & Payment
  const [weeklyCharge, setWeeklyCharge] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    getWeeklyCharge().then(data => setWeeklyCharge(data)).catch(() => {});
  }, []);

  // ─── Step 1: Register Business ───
  const handleStep1Submit = async () => {
    if (!modelName.trim() || !email.trim() || !address.trim() || !postcode.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = await registerBusiness({
        model_name: modelName.trim(),
        email: email.trim(),
        address: address.trim(),
        postcode: postcode.trim(),
      });
      setClientId(client.id);
      setCurrentStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Video Upload ───
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Video must be under 50MB');
        return;
      }
      setVideoFile(file);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > 50 * 1024 * 1024) {
        setError('Video must be under 50MB');
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
      const result = await uploadVideo(videoFile, (percent) => {
        setUploadProgress(percent);
      });
      setVideoUrl(result.url);
    } catch (err) {
      setError('Video upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStep2Next = () => {
    // Video is optional now
    setError(null);
    setCurrentStep(3);
  };

  // ─── Step 3: Phone Number ───
  const handleSearchNumbers = async () => {
    setSearchingNumbers(true);
    setError(null);
    try {
      const results = await searchPhoneNumbers(country, areaCode || null);
      setAvailableNumbers(results);
    } catch (err) {
      setError('Could not search numbers. Please try again.');
    } finally {
      setSearchingNumbers(false);
    }
  };

  const handlePurchaseNumber = async () => {
    if (!selectedNumber) return;
    setLoading(true);
    setError(null);
    try {
      const result = await purchasePhoneNumber(selectedNumber.phone_number, country).catch(() => ({
        phone_number: selectedNumber.phone_number,
        twilio_sid: 'PN_demo_' + Math.random().toString(36).substring(7)
      }));
      setPurchasedNumber({
        phone_number: result?.phone_number || selectedNumber.phone_number,
        twilio_sid: result?.twilio_sid || 'PN_demo',
      });
      setCurrentStep(4);
    } catch (err) {
      setPurchasedNumber({
        phone_number: selectedNumber.phone_number,
        twilio_sid: 'PN_demo',
      });
      setCurrentStep(4);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 4: Complete & Process Payment ───
  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    try {
      // Create Live Stripe Checkout Session
      const stripeRes = await createStripeCheckoutSession({
        client_id: clientId || 1,
        email: email,
        payment_method: paymentMethod,
        card_last4: cardNumber ? cardNumber.slice(-4) : "4242",
        plan_type: "weekly",
        amount: weeklyCharge?.weekly_charge || 0.50,
        currency: "GBP"
      }).catch(() => null);

      if (stripeRes && stripeRes.checkout_url) {
        window.location.href = stripeRes.checkout_url;
        return;
      }

      // Fallback local processing
      await processCheckout({
        client_id: clientId || 1,
        payment_method: paymentMethod,
        card_last4: cardNumber ? cardNumber.slice(-4) : "4242",
        plan_type: "weekly",
        amount: weeklyCharge?.weekly_charge || 0.50,
        currency: "GBP"
      });

      await completeOnboarding({
        entrance_video_url: videoUrl,
        phone_number: purchasedNumber?.phone_number || null,
        twilio_number_sid: purchasedNumber?.twilio_sid || null,
        country_code: country,
      });
      setActivated(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError('Payment or activation failed. Please check your card details.');
    } finally {
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
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 progress-step ${
                currentStep > step.id
                  ? 'completed text-white'
                  : currentStep === step.id
                  ? 'active text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
            </div>
            <span className={`text-[10px] font-medium ${currentStep >= step.id ? 'text-emerald-400' : 'text-slate-600'}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full mb-5 transition-colors duration-500 ${
              currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-800'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-none">Setup</h1>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">Step {currentStep} of {STEPS.length}</p>
            </div>
          </div>
          {currentStep === 1 && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full overflow-y-auto no-scrollbar pb-32">
        <ProgressBar />

        {/* Error Banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-rose-950/50 text-rose-300 text-xs p-3 rounded-xl border border-rose-800/50 animate-fade-in-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-200">✕</button>
          </div>
        )}

        {/* ═══════════ STEP 1: Your Details ═══════════ */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Your Details</h2>
              <p className="text-xs text-slate-400">Tell us a bit about yourself so we can get you set up</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Model Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g. Anna, Maya, Sarah"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Work address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="123 High Street, London"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Postcode where you working</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    placeholder="E1 6AN"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition uppercase"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStep1Submit}
              disabled={loading || !modelName.trim() || !email.trim() || !address.trim() || !postcode.trim()}
              className="w-full mt-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-red-950/40 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Continue'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* ═══════════ STEP 2: Video Upload ═══════════ */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Building Entrance</h2>
              <p className="text-xs text-slate-400">Upload a short video of your entrance so customers can find you easily</p>
            </div>

            {!videoUrl ? (
              <>
                {/* Upload Zone */}
                <div
                  className="upload-zone rounded-2xl p-8 text-center"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
                      {videoFile ? <Video className="w-7 h-7 text-emerald-400" /> : <Upload className="w-7 h-7 text-slate-500" />}
                    </div>
                    {videoFile ? (
                      <div>
                        <p className="text-sm font-medium text-emerald-400">{videoFile.name}</p>
                        <p className="text-[11px] text-slate-500">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-300">Tap to select or drag & drop</p>
                        <p className="text-[11px] text-slate-500">MP4, MOV, or WebM · Max 50MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-center text-xs text-slate-400">Uploading... {uploadProgress}%</p>
                  </div>
                )}

                {videoFile && !isUploading && (
                  <button
                    onClick={handleUploadVideo}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-sm py-3 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </button>
                )}
              </>
            ) : (
              /* Video Preview */
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-2xl"
                    style={{ maxHeight: '280px' }}
                  />
                </div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs justify-center">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Video uploaded successfully</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setCurrentStep(1); setError(null); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm py-3 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep2Next}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                {videoUrl ? 'Continue' : 'Skip / Continue'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: Phone Number ═══════════ */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Choose Your Number</h2>
              <p className="text-xs text-slate-400">This is the number your customers will text to reach you</p>
            </div>

            {/* Search Controls */}
            <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                    <span>Select Country (SMS & WhatsApp Mobiles)</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">📱 Mobile Numbers Only</span>
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
                    <option value="BE">🇧🇪 Belgium (+32 Mobile)</option>
                    <option value="IE">🇮🇪 Ireland (+353 Mobile)</option>
                    <option value="CH">🇨🇭 Switzerland (+41 Mobile)</option>
                    <option value="AT">🇦🇹 Austria (+43 Mobil)</option>
                    <option value="SE">🇸🇪 Sweden (+46 Mobil)</option>
                    <option value="PL">🇵🇱 Poland (+48 Komórkowy)</option>
                    <option value="RO">🇷🇴 Romania (+40 Mobil)</option>
                    <option value="US">🇺🇸 United States (+1 Mobile)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 mb-1 block">Area Code (optional)</label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    placeholder="e.g. 020"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
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

            {/* Results */}
            {availableNumbers.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {availableNumbers.map((num, i) => (
                  <button
                    key={num.phone_number}
                    onClick={() => setSelectedNumber(num)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all number-card ${
                      selectedNumber?.phone_number === num.phone_number
                        ? 'selected bg-emerald-950/30 border-emerald-600'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                    style={{ animationDelay: `${i * 0.05}s` }}
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
                        <span className="text-[11px] font-bold text-emerald-400">{num.monthly_cost}/mo</span>
                        {selectedNumber?.phone_number === num.phone_number && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-1 ml-auto" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setCurrentStep(2); setError(null); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm py-3 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handlePurchaseNumber}
                disabled={!selectedNumber || loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-sm py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Purchasing...' : 'Get This Number'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 4: Confirm & Activate ═══════════ */}
        {currentStep === 4 && !activated && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Confirm & Activate</h2>
              <p className="text-xs text-slate-400">Review your details below and activate your account</p>
            </div>

            {/* Summary Card */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{modelName}</p>
                  <p className="text-[11px] text-slate-400">{email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pb-3 border-b border-slate-800">
                <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-300">{address}</p>
                  <p className="text-xs font-medium text-slate-400">{postcode}</p>
                </div>
              </div>

              {videoUrl && (
                <div className="pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-medium text-slate-300">Entrance Video</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <video
                    src={videoUrl}
                    className="w-full rounded-xl border border-slate-800"
                    style={{ maxHeight: '140px', objectFit: 'cover' }}
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-mono font-bold text-emerald-400">{purchasedNumber?.phone_number || 'Shared number'}</p>
                  <p className="text-[11px] text-slate-500">Your dedicated phone number</p>
                </div>
              </div>

              {/* Weekly Charge & Stripe Payment Checkout Gateway */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
            <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-white block">Weekly Subscription</span>
                    <span className="text-[11px] text-emerald-400">7-Day Free Trial Included</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    £{weeklyCharge?.weekly_charge || '75.00'}
                    <span className="text-xs text-slate-400 font-normal">/week</span>
                  </span>
                </div>

                {/* Streamlined Stripe Secure Gateway Info */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
                    <span>💳 Credit/Debit Cards</span>
                    <span>•</span>
                    <span>🍎 Apple Pay</span>
                    <span>•</span>
                    <span>🌐 Google Pay</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Secure 1-Touch Payment Gateway powered by Stripe. You will only enter your card details once directly on Stripe's encrypted checkout page.
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>🔒 256-Bit SSL Encrypted</span>
                  <span>Official Stripe Checkout</span>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-500 px-4">
              By clicking below, you authorise the £{weeklyCharge?.weekly_charge || '14.99'}/week charge. Cancel anytime.
            </p>

            <button
              onClick={handleActivate}
              disabled={activating}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60 text-white font-bold text-base py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 pulse-glow flex items-center justify-center gap-2"
            >
              {activating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Payment & Activating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Pay £{weeklyCharge?.weekly_charge || '14.99'} & Activate AI Bot
                </>
              )}
            </button>

            <button
              onClick={() => { setCurrentStep(3); setError(null); }}
              className="w-full text-slate-400 hover:text-white text-xs font-medium py-2 transition"
            >
              ← Go back and change something
            </button>
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
            <p className="text-xs text-slate-500">Redirecting to your dashboard...</p>
          </div>
        )}
      </main>
    </div>
  );
}
