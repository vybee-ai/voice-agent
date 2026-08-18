"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, PhoneCall, User, Phone, ArrowRight, ArrowLeft, Check, Edit3, Sparkles, Loader2 } from "lucide-react";

export interface LeadPayload {
  leadId: string;
  buyerName: string;
  phone: string;
}

interface Props {
  onStart: (leadInfo: LeadPayload) => void;
  error: string | null;
  onRetry: () => void;
  notConfigured: boolean;
}

const COUNTRY_CODES = [
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+1", country: "US / Canada", flag: "🇺🇸" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+961", country: "Lebanon", flag: "🇱🇧" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
];

export default function WebCallLanding({ onStart, error, onRetry, notConfigured }: Props) {
  // Slide state: 1 = Name, 2 = Phone, 3 = Confirmation & Talk to Sofia
  const [slide, setSlide] = useState<1 | 2 | 3>(1);

  const [buyerName, setBuyerName] = useState("");
  const [countryCode, setCountryCode] = useState("+971");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadId] = useState("");

  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when slide changes
  useEffect(() => {
    if (slide === 1) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    } else if (slide === 2) {
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    }
  }, [slide]);

  // ─── Step 1: Submit Name ──────────────────────────────────────────────────
  const handleNameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = buyerName.trim();
    if (!trimmed) {
      setInputError("Please enter your name to continue.");
      return;
    }
    if (trimmed.length < 2) {
      setInputError("Name must be at least 2 characters.");
      return;
    }
    setInputError(null);
    setSlide(2);
  };

  // ─── Step 2: Submit Phone & Sync Lead to Google Sheets ────────────────────
  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawDigits = phone.replace(/[^\d]/g, "");
    if (!rawDigits || rawDigits.length < 6) {
      setInputError("Please enter a valid phone number (minimum 6 digits).");
      return;
    }

    setInputError(null);
    setIsSubmitting(true);

    const fullPhone = `${countryCode} ${phone.trim()}`;
    const generatedId = `ONX-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      // Send lead to backend API to write into Google Sheets
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: generatedId,
          buyerName: buyerName.trim(),
          phone: fullPhone,
          source: "Web Voice Call (Sofia)",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLeadId(data.lead?.leadId || generatedId);
      } else {
        setLeadId(generatedId);
      }
    } catch (err) {
      console.warn("Could not sync lead via API, continuing with local id:", err);
      setLeadId(generatedId);
    } finally {
      setIsSubmitting(false);
      setSlide(3);
    }
  };

  // ─── Step 3: Start Voice Session with Sofia ───────────────────────────────
  const handleStartCall = () => {
    const fullPhone = `${countryCode} ${phone.trim()}`;
    const finalLeadId = leadId || `ONX-${Math.floor(100000 + Math.random() * 900000)}`;

    onStart({
      leadId: finalLeadId,
      buyerName: buyerName.trim(),
      phone: fullPhone,
    });
  };

  const firstName = buyerName.trim().split(" ")[0] || "there";

  return (
    <div className="sofia-landing">
      {/* Background subtle gradient orbs */}
      <div className="sofia-bg-orb sofia-bg-orb-1" aria-hidden="true" />
      <div className="sofia-bg-orb sofia-bg-orb-2" aria-hidden="true" />

      <div className="sofia-landing-inner">
        {/* Logo / Brand */}
        <div className="sofia-brand">
          <div className="sofia-brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="sofia-brand-name">OneX</span>
        </div>

        {/* ─── SLIDE 1: ASK FOR NAME ────────────────────────────────────────── */}
        {slide === 1 && (
          <div className="sofia-slide-card animate-fade-in">
            {/* Step progress pills */}
            <div className="sofia-step-progress" aria-label="Step 1 of 2: Name">
              <div className="sofia-step-dot sofia-step-dot-active" />
              <div className="sofia-step-dot" />
            </div>
            <span className="sofia-step-badge">Step 1 of 2</span>

            <div className="sofia-slide-header">
              <div className="sofia-slide-icon-circle">
                <User size={26} className="text-gold" />
              </div>
              <h1 className="sofia-slide-title">Welcome to OneX</h1>
              <p className="sofia-slide-subtitle">
                What is your name? Sofia will personalize your property consultation.
              </p>
            </div>

            <form onSubmit={handleNameSubmit} className="sofia-form">
              <div className="sofia-input-group">
                <label htmlFor="sofia-buyer-name" className="sofia-input-label">
                  Your Full Name
                </label>
                <div className="sofia-input-wrapper">
                  <User size={18} className="sofia-input-icon" />
                  <input
                    id="sofia-buyer-name"
                    ref={nameInputRef}
                    type="text"
                    className={`sofia-input ${inputError ? "sofia-input-invalid" : ""}`}
                    placeholder="e.g. Zayn Al-Mansoor"
                    value={buyerName}
                    onChange={(e) => {
                      setBuyerName(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    autoComplete="name"
                    maxLength={70}
                  />
                </div>
                {inputError && (
                  <p className="sofia-field-error" role="alert">
                    {inputError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="sofia-name-next-btn"
                className="sofia-btn sofia-btn-primary w-full"
                aria-label="Continue to phone number step"
              >
                <span>Continue</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* ─── SLIDE 2: ASK FOR PHONE NUMBER ────────────────────────────────── */}
        {slide === 2 && (
          <div className="sofia-slide-card animate-fade-in">
            {/* Step progress pills */}
            <div className="sofia-step-progress" aria-label="Step 2 of 2: Phone Number">
              <div className="sofia-step-dot sofia-step-dot-done" />
              <div className="sofia-step-dot sofia-step-dot-active" />
            </div>
            <span className="sofia-step-badge">Step 2 of 2</span>

            <div className="sofia-slide-header">
              <div className="sofia-slide-icon-circle">
                <Phone size={26} className="text-gold" />
              </div>
              <h1 className="sofia-slide-title">Nice to meet you, {firstName}!</h1>
              <p className="sofia-slide-subtitle">
                Please provide your phone number so we can link your consultation and share property recommendations.
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="sofia-form">
              <div className="sofia-input-group">
                <label htmlFor="sofia-phone" className="sofia-input-label">
                  Mobile Number / WhatsApp
                </label>
                <div className="sofia-phone-row">
                  <div className="sofia-country-select-wrapper">
                    <select
                      id="sofia-country-code"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="sofia-country-select"
                      aria-label="Country Dial Code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code + c.country} value={c.code}>
                          {c.flag} {c.code} ({c.country})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sofia-input-wrapper flex-1">
                    <Phone size={18} className="sofia-input-icon" />
                    <input
                      id="sofia-phone"
                      ref={phoneInputRef}
                      type="tel"
                      className={`sofia-input ${inputError ? "sofia-input-invalid" : ""}`}
                      placeholder="50 123 4567"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (inputError) setInputError(null);
                      }}
                      autoComplete="tel"
                      maxLength={20}
                    />
                  </div>
                </div>
                {inputError && (
                  <p className="sofia-field-error" role="alert">
                    {inputError}
                  </p>
                )}
              </div>

              <div className="sofia-form-btn-row">
                <button
                  type="button"
                  id="sofia-phone-back-btn"
                  className="sofia-btn sofia-btn-outline"
                  onClick={() => {
                    setInputError(null);
                    setSlide(1);
                  }}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  id="sofia-phone-confirm-btn"
                  className="sofia-btn sofia-btn-primary flex-1"
                  disabled={isSubmitting}
                  aria-label="Confirm details and unlock voice call"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Details</span>
                      <Check size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── SLIDE 3: CONFIRMED & READY FOR TALK TO SOFIA ─────────────────── */}
        {slide === 3 && (
          <div className="sofia-slide-card sofia-slide-card-ready animate-fade-in">
            {/* Confirmed profile chip with edit action */}
            <div className="sofia-profile-summary">
              <div className="sofia-profile-info">
                <span className="sofia-profile-label">Speaking as:</span>
                <span className="sofia-profile-name">{buyerName}</span>
                <span className="sofia-profile-phone">{countryCode} {phone}</span>
              </div>
              <button
                type="button"
                className="sofia-profile-edit-btn"
                onClick={() => setSlide(1)}
                title="Edit your details"
                aria-label="Edit name and phone"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            {/* Hero orb */}
            <div className="sofia-hero-orb-wrapper" aria-hidden="true">
              <div className="sofia-hero-orb sofia-hero-orb-idle">
                <div className="sofia-orb-ring sofia-orb-ring-1" />
                <div className="sofia-orb-ring sofia-orb-ring-2" />
                <div className="sofia-orb-core">
                  <Mic size={28} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Hero text */}
            <div className="sofia-hero-text">
              <div className="sofia-ready-pill">
                <Sparkles size={14} className="text-gold" />
                <span>Ready for Live Voice</span>
              </div>
              <h1 className="sofia-hero-name">Sofia</h1>
              <p className="sofia-hero-role">AI Property Consultant</p>
              <p className="sofia-hero-intro">
                Sofia is ready to speak with you, <strong className="text-white">{firstName}</strong>.
                Have a live voice conversation about your Dubai property requirements.
              </p>
            </div>

            {/* Not configured warning */}
            {notConfigured && (
              <div className="sofia-notice sofia-notice-warn" role="alert">
                <span>⚠️</span>
                <span>Live voice is not yet configured. Please contact OneX to enable this feature.</span>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="sofia-notice sofia-notice-error" role="alert">
                <span>⚠️ {error}</span>
                <button
                  id="sofia-retry-btn"
                  className="sofia-btn sofia-btn-outline"
                  onClick={onRetry}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* CTA Talk to Sofia */}
            {!error && (
              <button
                id="sofia-start-btn"
                className="sofia-btn sofia-btn-primary sofia-btn-pulse"
                onClick={handleStartCall}
                disabled={notConfigured}
                aria-label="Start voice conversation with Sofia"
              >
                <PhoneCall size={19} strokeWidth={2} />
                <span>Talk to Sofia</span>
              </button>
            )}
          </div>
        )}

        {/* Trust indicators */}
        <div className="sofia-trust">
          <div className="sofia-trust-item">
            <span className="sofia-trust-dot sofia-trust-dot-green" />
            Real-time voice AI
          </div>
          <div className="sofia-trust-divider" aria-hidden="true" />
          <div className="sofia-trust-item">
            <span className="sofia-trust-dot sofia-trust-dot-gold" />
            Powered by OneX
          </div>
          <div className="sofia-trust-divider" aria-hidden="true" />
          <div className="sofia-trust-item">
            <span className="sofia-trust-dot sofia-trust-dot-blue" />
            Dubai property experts
          </div>
        </div>
      </div>
    </div>
  );
}
