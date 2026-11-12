// ============================================================
//  Admin Login Page — Password-Free Authorized Email & OTP
//  Dedicated multi-factor login route for administrators
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import Button from "../components/ui/Button";

// Baseline of authorized Administrator emails
const ALLOWED_ADMIN_EMAILS = [
  "yashrajsingh28359@gmail.com",
  "gauravajm@gmail.com",
  "merakimovies@gmail.com",
  "tech.visaandvoyage@gmail.com",
];

const Login = () => {
  const navigate = useNavigate();
  const {
    sendAdminOtp,
    resendAdminOtp,
    verifyAdminOtp,
    getAllowedAdminEmails,
    clearError,
  } = useAuthStore();

  // ── Form State ─────────────────────────────────────────────
  // Steps: 'email' | 'otp'
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [allowedEmails, setAllowedEmails] = useState(ALLOWED_ADMIN_EMAILS);
  const [cooldown, setCooldown] = useState(0);

  const otpInputRef = useRef(null);

  // Sync dynamic authorized emails from backend on mount
  useEffect(() => {
    let mounted = true;
    const fetchWhitelist = async () => {
      try {
        const emails = await getAllowedAdminEmails();
        if (mounted && Array.isArray(emails) && emails.length > 0) {
          setAllowedEmails(Array.from(new Set([...ALLOWED_ADMIN_EMAILS, ...emails])));
        }
      } catch (_) {}
    };
    fetchWhitelist();
    return () => {
      mounted = false;
    };
  }, [getAllowedAdminEmails]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus OTP input when switching to OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  }, [step]);

  // ── Step 1: Request OTP ────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearError();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg("Please enter your administrator email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    // STRICT Whitelist validation: Only authorized emails are allowed
    if (allowedEmails.length > 0 && !allowedEmails.includes(cleanEmail)) {
      setErrorMsg(
        "Access Denied: This email is not authorized for Admin access. Only whitelisted administrators are permitted."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await sendAdminOtp(cleanEmail);

      if (res.success) {
        setStep("otp");
        setOtp("");
        setCooldown(res.cooldownSeconds || 30);
        setSuccessMsg(res.message || "Verification code sent to your email.");
      } else {
        setErrorMsg(res.message || "Unable to send verification code. Please try again.");
        if (res.cooldownRemaining) {
          setCooldown(res.cooldownRemaining);
        }
      }
    } catch (err) {
      setErrorMsg("Connection error. Please ensure the server is running and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP Handler ──────────────────────────────────────
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setErrorMsg("");
    setSuccessMsg("");
    setResending(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await resendAdminOtp(cleanEmail);

      if (res.success) {
        setCooldown(res.cooldownSeconds || 30);
        setSuccessMsg(res.message || "New verification code sent to your email.");
      } else {
        setErrorMsg(res.message || "Failed to resend code.");
        if (res.cooldownRemaining) {
          setCooldown(res.cooldownRemaining);
        }
      }
    } catch (err) {
      setErrorMsg("Network error while resending verification code.");
    } finally {
      setResending(false);
    }
  };

  // ── Step 2: Verify OTP & Sign In ────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearError();
    setErrorMsg("");

    const cleanOtp = otp.trim().replace(/\D/g, "");

    if (!cleanOtp) {
      setErrorMsg("Please enter the verification code.");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await verifyAdminOtp(cleanEmail, cleanOtp);

      if (res.success) {
        navigate("/");
      } else {
        setErrorMsg(res.message || "Invalid verification code. Please check and try again.");
      }
    } catch (err) {
      setErrorMsg("Network error during verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background hero-gradient flex items-center justify-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background dot pattern */}
      <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* ── Card ── */}
        <div className="bg-surface border border-gold/30 rounded-3xl p-8 sm:p-9 shadow-modal shadow-gold/5">
          {/* Header */}
          <div className="text-center mb-7 relative">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center shadow-lg shadow-gold/25">
                <ShieldCheck size={20} className="text-background" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-xl text-gold tracking-tight">
                Admin Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {step === "email" ? "Authorized Access" : "Security Verification"}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              {step === "email"
                ? "Password-free login with one-time verification passcode"
                : "Enter the code sent to your authorized email"}
            </p>
          </div>

          {/* ── Alerts ── */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                key="error-alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-xs font-semibold flex items-start gap-2.5"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                key="success-alert"
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 text-xs font-semibold flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── STEP 1: EMAIL INPUT ── */}
          {step === "email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-bold text-text-secondary"
                >
                  Authorized Admin Email <span className="text-gold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMsg("");
                    }}
                    placeholder="Enter authorized admin email"
                    autoComplete="email"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-medium"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-gold shrink-0" />
                  <span>Strictly restricted to whitelisted administrator accounts.</span>
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={!loading ? <ArrowRight size={18} /> : null}
                className="bg-gold hover:bg-gold/90 text-background shadow-gold/20 shadow-lg border-none font-bold"
              >
                Send Verification Code
              </Button>
            </form>
          ) : (
            /* ── STEP 2: OTP VERIFICATION ── */
            <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Email
                </button>
                <span className="text-[10px] font-black uppercase tracking-wider text-gold bg-gold/10 px-2.5 py-0.5 rounded-full border border-gold/20">
                  Step 2 of 2
                </span>
              </div>

              {/* Destination email badge */}
              <div className="p-3 bg-gold/5 border border-gold/20 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-text-primary">
                <div className="w-6 h-6 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 text-gold">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{email}</span>
              </div>

              {/* OTP Input */}
              <div className="space-y-2">
                <label
                  htmlFor="admin-otp"
                  className="block text-xs font-bold text-text-secondary"
                >
                  One-Time Passcode (OTP)
                </label>
                <input
                  id="admin-otp"
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(clean);
                    setErrorMsg("");
                  }}
                  placeholder="• • • •"
                  maxLength={6}
                  required
                  className="w-full text-center tracking-[0.45em] text-3xl font-black py-3.5 bg-surface-2 border border-border rounded-xl text-gold placeholder:text-text-muted/40 outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-mono"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-text-muted">Valid for 2 minutes</span>

                  {/* Resend button / countdown */}
                  {cooldown > 0 ? (
                    <span className="text-[11px] font-bold text-text-muted">
                      Resend in {cooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-[11px] font-bold text-gold hover:text-gold/80 hover:underline transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      {resending ? (
                        <>
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>Resending...</span>
                        </>
                      ) : (
                        <span>Resend Code</span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading || !otp.trim()}
                rightIcon={!loading ? <ArrowRight size={18} /> : null}
                className="bg-gold hover:bg-gold/90 text-background shadow-gold/20 shadow-lg border-none font-bold disabled:opacity-50"
              >
                Verify &amp; Access Dashboard
              </Button>
            </form>
          )}
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-text-muted mt-5 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-gold" />
          <span>Restricted to Visa &amp; Voyage administrative personnel.</span>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
