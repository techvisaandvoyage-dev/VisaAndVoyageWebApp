import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Mail,
  Plus,
  Trash2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  Lock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { useAuthStore, api } from "../../store/authStore";

export default function AuthorizedAdminsManager({ showToast: parentShowToast }) {
  const { user } = useAuthStore();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);

  // OTP Modal State
  const [otpModal, setOtpModal] = useState(null); // { email: '', otp: '', cooldown: 30 }
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const currentLoggedInEmail = (
    user?.email ||
    sessionStorage.getItem("adminEmail") ||
    localStorage.getItem("adminEmail") ||
    ""
  ).toLowerCase();

  const showToast = (msg, type = "success") => {
    if (parentShowToast) {
      parentShowToast(msg, type);
    } else {
      if (type === "error") {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 4500);
      } else {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
      }
    }
  };

  // Cooldown countdown timer
  useEffect(() => {
    if (!otpModal || otpModal.cooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpModal((prev) =>
        prev && prev.cooldown > 0 ? { ...prev, cooldown: prev.cooldown - 1 } : prev
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [otpModal?.cooldown]);

  // Fetch authorized emails from backend
  const fetchEmails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/auth/emails");
      if (data?.success && Array.isArray(data.emails)) {
        setEmails(data.emails);

        // If the current logged-in user was deleted, immediately log them out
        if (
          currentLoggedInEmail &&
          !data.emails.map((e) => e.toLowerCase()).includes(currentLoggedInEmail)
        ) {
          showToast("Your admin account is no longer authorized. Logging out...", "error");
          sessionStorage.clear();
          localStorage.removeItem("admin_token");
          localStorage.removeItem("adminEmail");
          localStorage.removeItem("adminAuthenticated");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
          return;
        }
      } else {
        showToast(data?.message || "Failed to load authorized emails.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to fetch authorized admin emails.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Step 1: Send OTP to new email address to initiate authorization
  const handleInitiateAdd = async (e) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();

    if (!clean) {
      showToast("Please enter an email address.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    if (emails.map((e) => e.toLowerCase()).includes(clean)) {
      showToast("This email is already in the authorized administrator list.", "error");
      return;
    }

    try {
      setAdding(true);
      const { data } = await api.post("/admin/auth/emails/send-otp", { email: clean });

      if (data?.success) {
        setOtpModal({
          email: clean,
          otp: "",
          cooldown: data.cooldownSeconds || 30,
        });
        setOtpError("");
        showToast(data.message || `Verification code sent to ${clean}`);
      } else {
        showToast(data?.message || "Failed to send verification code.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Error requesting verification code.", "error");
    } finally {
      setAdding(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!otpModal?.email || otpModal.cooldown > 0 || resendingOtp) return;
    try {
      setResendingOtp(true);
      setOtpError("");
      const { data } = await api.post("/admin/auth/emails/resend-otp", {
        email: otpModal.email,
      });
      if (data?.success) {
        setOtpModal((prev) => ({ ...prev, cooldown: data.cooldownSeconds || 30 }));
        showToast(`Verification code resent to ${otpModal.email}`);
      } else {
        setOtpError(data?.message || "Failed to resend code.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Network error while resending code.");
    } finally {
      setResendingOtp(false);
    }
  };

  // Step 2: Verify OTP and authorize email in database
  const handleVerifyAndAdd = async (e) => {
    e.preventDefault();
    const cleanOtp = (otpModal?.otp || "").trim().replace(/\D/g, "");
    if (!cleanOtp) {
      setOtpError("Please enter the verification code.");
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError("");
      const { data } = await api.post("/admin/auth/emails", {
        email: otpModal.email,
        otp: cleanOtp,
      });

      if (data?.success) {
        showToast(data.message || `${otpModal.email} authorized successfully!`);
        setEmails(data.emails || [...emails, otpModal.email]);
        setNewEmail("");
        setOtpModal(null);
      } else {
        setOtpError(data?.message || "Failed to verify code.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid or expired verification code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Remove email
  const handleRemoveEmail = async (emailToRemove) => {
    if (emails.length <= 1) {
      showToast("Cannot delete the last remaining administrator email.", "error");
      setConfirmDeleteModal(null);
      return;
    }

    const cleanEmailToRemove = String(emailToRemove).trim().toLowerCase();
    const isSelfDelete = cleanEmailToRemove === currentLoggedInEmail;

    try {
      setRemovingEmail(cleanEmailToRemove);
      const { data } = await api.delete("/admin/auth/emails", {
        params: { email: cleanEmailToRemove },
        data: { email: cleanEmailToRemove },
      });

      if (data?.success) {
        showToast(data.message || "Admin email removed successfully!");
        const updatedList = Array.isArray(data.emails)
          ? data.emails
          : emails.filter((e) => e.toLowerCase() !== cleanEmailToRemove);
        setEmails(updatedList);
        setConfirmDeleteModal(null);

        if (isSelfDelete) {
          showToast("You removed your own admin access. Logging out now...", "error");
          sessionStorage.clear();
          localStorage.removeItem("admin_token");
          localStorage.removeItem("adminEmail");
          localStorage.removeItem("adminAuthenticated");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
          return;
        }
      } else {
        showToast(data?.message || "Failed to remove admin email.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Error removing admin email.", "error");
    } finally {
      setRemovingEmail(null);
      setConfirmDeleteModal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification (Fallback if not parent managed) */}
      {!parentShowToast && toastMessage && (
        <div className="fixed bottom-6 right-6 z-[300] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {!parentShowToast && errorMessage && (
        <div className="fixed bottom-6 right-6 z-[300] bg-red-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-white shrink-0" />
          <span className="text-xs font-bold">{errorMessage}</span>
        </div>
      )}

      {/* Header & Description */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                Authorized Admin Access
              </h2>
              <p className="text-xs text-text-muted">
                Whitelisted administrator email accounts permitted to sign in via OTP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold/10 text-gold border border-gold/20">
              <Lock className="w-3.5 h-3.5" />
              Password-Free OTP Auth
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchEmails}
              disabled={loading}
              leftIcon={<RotateCw size={14} className={loading ? "animate-spin" : ""} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Add New Administrator Card */}
      <div className="rounded-2xl border border-border bg-surface-2/60 p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4 text-gold" />
          Authorize New Administrator
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Enter an email address to grant admin access. A security verification code will be sent to confirm authorization.
        </p>

        <form onSubmit={handleInitiateAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. manager@visaandvoyage.com"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={adding || !newEmail.trim()}
            loading={adding}
            leftIcon={!adding ? <Plus size={16} /> : null}
            className="bg-gold hover:bg-gold/90 text-background font-bold shadow-gold/20 border-none shrink-0"
          >
            Authorize Email
          </Button>
        </form>
      </div>

      {/* Authorized Admins List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Active Administrators ({emails.length})
          </h3>
          <span className="text-[11px] text-text-muted">
            Minimum 1 administrator required
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-text-muted text-sm flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-gold" />
            <span>Loading authorized administrators...</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm bg-surface-2 rounded-2xl border border-border">
            No authorized administrator emails found.
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((emailItem) => {
              const cleanItem = String(emailItem).trim().toLowerCase();
              const isCurrent = cleanItem === currentLoggedInEmail;
              const isOnlyOne = emails.length <= 1;

              return (
                <div
                  key={cleanItem}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-border bg-surface hover:border-gold/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0 text-text-muted group-hover:text-gold transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate font-mono">
                        {cleanItem}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        Full administrative access via OTP
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCurrent && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Current Session
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isOnlyOne || removingEmail === cleanItem}
                      onClick={() => setConfirmDeleteModal(cleanItem)}
                      title={
                        isOnlyOne
                          ? "Cannot delete the only remaining admin"
                          : `Remove ${cleanItem}`
                      }
                      className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Info Card */}
      <div className="rounded-2xl border border-border bg-surface-2/40 p-4 text-xs text-text-muted flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">Admin Access Protocol</p>
          <p className="leading-relaxed">
            Only email addresses listed above can receive OTP login codes. Removing an email instantly revokes access to the Admin Portal. To ensure you never get locked out, at least one admin email must always remain.
          </p>
        </div>
      </div>

      {/* ── OTP Verification Modal ── */}
      {otpModal && (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary tracking-tight">
                    Verify Administrator Email
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Security confirmation code required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOtpModal(null)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-muted leading-relaxed">
                We sent a secure verification code to:
              </p>
              <div className="p-2.5 bg-gold/10 border border-gold/20 rounded-xl flex items-center gap-2 text-xs font-bold text-gold truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{otpModal.email}</span>
              </div>
            </div>

            {otpError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAndAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Enter One-Time Passcode (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpModal.otp}
                  onChange={(e) => {
                    setOtpModal((prev) => ({
                      ...prev,
                      otp: e.target.value.replace(/\D/g, ""),
                    }));
                    setOtpError("");
                  }}
                  placeholder="• • • •"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.45em] text-2xl font-black py-3 bg-surface-2 border border-border rounded-xl outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all text-gold font-mono"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-text-muted">Valid for 2 minutes</span>

                {otpModal.cooldown > 0 ? (
                  <span className="text-[11px] font-bold text-text-muted">
                    Resend in {otpModal.cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendingOtp}
                    className="text-[11px] font-bold text-gold hover:text-gold/80 hover:underline transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    {resendingOtp ? (
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

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOtpModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={verifyingOtp}
                  disabled={verifyingOtp || !otpModal.otp.trim()}
                  className="bg-gold hover:bg-gold/90 text-background font-bold border-none"
                >
                  Confirm &amp; Add Admin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation Delete Modal ── */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary tracking-tight">
                  Revoke Admin Access?
                </h3>
                <p className="text-[11px] text-text-muted">
                  This action takes effect immediately.
                </p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to remove <strong className="text-text-primary">{confirmDeleteModal}</strong>? They will no longer be permitted to log in to the Admin Dashboard.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={removingEmail === confirmDeleteModal}
                onClick={() => handleRemoveEmail(confirmDeleteModal)}
              >
                Revoke Access
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

