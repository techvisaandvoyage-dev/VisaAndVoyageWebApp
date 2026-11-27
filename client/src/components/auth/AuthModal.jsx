import { useState, useRef, useEffect } from "react";
import {
  X,
  Smartphone,
  ArrowLeft,
  ClipboardList,
  User,
  Mail,
  ShieldCheck,
  ChevronDown,
  Search,
  Phone,
  LockKeyhole,
  BadgeCheck,
} from "lucide-react";
import { api, useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  filterPhoneCountryOptions,
  findPhoneCountryOption,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
} from "../../utils/phoneCountryCodes";

const SecureNote = ({ className = "" }) => (
  <div className={`flex items-center justify-center gap-2 text-[13px] font-medium text-[#6E6A59] ${className}`}>
    <LockKeyhole size={15} strokeWidth={1.8} />
    <span>Your information is secure with us.</span>
  </div>
);

const DecorativeSparkles = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]" aria-hidden="true">
    <span className="absolute left-[16%] top-[9%] h-1.5 w-1.5 rotate-45 bg-[#607938]/60" />
    <span className="absolute right-[38%] top-[7%] h-1.5 w-1.5 rotate-45 bg-[#7a944e]/60" />
    <span className="absolute left-[28%] top-[13%] h-1 w-1 rotate-45 bg-[#948a7b]" />
    <span className="absolute right-[23%] top-[12%] h-1 w-1 rotate-45 bg-[#607938]/50" />
  </div>
);

const ModalWave = () => (
  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 overflow-hidden rounded-b-[22px]" aria-hidden="true">
    <div className="absolute -bottom-10 left-[-12%] h-24 w-[54%] rounded-[50%] bg-[#e6d5ba]" />
    <div className="absolute -bottom-12 left-[28%] h-24 w-[58%] rounded-[50%] bg-[#dfd0b6]" />
    <div className="absolute -bottom-10 right-[-13%] h-24 w-[52%] rounded-[50%] bg-[#e6d5ba]" />
  </div>
);

const StepIconBubble = ({ children }) => (
  <div className="relative mb-5 flex h-[92px] w-[92px] items-center justify-center rounded-full border border-[#607938]/20 bg-[#607938]/12 text-[#607938] ![box-shadow:var(--master-sm-inner-drop-shadow)]">
    <span className="absolute -left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 bg-[#607938]/60" />
    <span className="absolute -right-2 top-6 h-1.5 w-1.5 rotate-45 bg-[#607938]/60" />
    <span className="absolute right-3 top-1 h-1 w-1 rotate-45 bg-[#607938]/50" />
    {children}
  </div>
);

const SuccessArt = () => (
  <div className="relative mb-11 mt-36 flex h-[134px] w-[134px] items-center justify-center rounded-full border border-[#607938]/25 bg-[#607938]/15 text-[#607938] shadow-[0_20px_45px_rgba(45,43,34,0.18)]">
    <DecorativeSparkles />
    <ShieldCheck size={86} strokeWidth={1.3} fill="#EEDFC7" />
    <BadgeCheck size={54} strokeWidth={2.8} className="absolute text-[#607938]" />
  </div>
);

const createEmptyOtp = (length = 6) => Array.from({ length: length === 4 ? 4 : 6 }, () => "");
const otpChannelLabel = (channel) => {
  if (channel === "sms") return "SMS";
  if (channel === "email") return "Email";
  return "WhatsApp";
};

const getConfiguredChannels = (config) => {
  if (!config?.channels) return [];
  const ordered = [
    config?.priority?.primary,
    config?.priority?.fallback1,
    config?.priority?.fallback2,
    "whatsapp",
    "sms",
  ].filter(Boolean);
  const isTesting = config?.testing?.enabled;
  return [...new Set(ordered)]
    .filter((channel) => channel !== "none" && channel !== "email")
    .filter((channel) => {
      const c = config.channels[channel];
      return c?.enabled && (c?.configured || isTesting);
    });
};

const AuthModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState("phone");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpLength, setOtpLength] = useState(6);
  const [otpChannel, setOtpChannel] = useState("whatsapp");
  const [otpConfig, setOtpConfig] = useState(null);
  const [otp, setOtp] = useState(createEmptyOtp(6));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { popupCheckPhone, popupRequestOtp, popupVerifyOtp, popupCompleteSignup } = useAuthStore();
  const { showToast } = useUIStore();
  const inputRefs = useRef([]);

  // Country Code Logic
  const countryCodeDropdownRef = useRef(null);
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneCountryLabel, setPhoneCountryLabel] = useState("");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const [phoneCountryOptions, setPhoneCountryOptions] = useState(() => getPhoneCountryOptions());

  useEffect(() => {
    let mounted = true;
    loadPhoneCountryOptions().then((options) => {
      if (mounted && Array.isArray(options) && options.length) {
        setPhoneCountryOptions(options);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    api
      .get("/auth/otp-config")
      .then(({ data }) => {
        if (active && data?.success) setOtpConfig(data.config);
      })
      .catch(() => {
        if (active) setOtpConfig(null);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!countryCodeDropdownRef.current?.contains(event.target)) {
        setCountryCodeOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredCountryOptions = filterPhoneCountryOptions(countryCodeSearch, phoneCountryOptions);
  const selectedCountryOption =
    phoneCountryOptions.find(
      (option) => option.value === phoneCountryCode && option.label === phoneCountryLabel
    ) || findPhoneCountryOption(phoneCountryCode, phoneCountryOptions);
  const selectedCountryName = String(selectedCountryOption?.label || "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) return undefined;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setStep("phone");
      setIsExistingUser(false);
      setPhone("");
      setOtpLength(6);
      setOtpChannel("whatsapp");
      setOtp(createEmptyOtp(6));
      setFirstName("");
      setLastName("");
      setEmail("");
      setError("");
      setPhoneCountryCode(DEFAULT_PHONE_COUNTRY_CODE);
      setPhoneCountryLabel("");
      setCountryCodeOpen(false);
      setCountryCodeSearch("");
    });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const configuredPhoneChannels = getConfiguredChannels(otpConfig);
  const primaryPhoneChannel = "auto";
  const otpSent = step === "otp";
  const fullPhone = phoneCountryCode + phone;

  const handlePhoneSubmit = async (channel = primaryPhoneChannel) => {
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    const checkRes = await popupCheckPhone(fullPhone);
    if (!checkRes.success) {
      setLoading(false);
      setError(checkRes.message || "Could not check phone number");
      return;
    }

    setIsExistingUser(checkRes.exists);
    const res = await popupRequestOtp(fullPhone, channel);
    setLoading(false);
    
    if (res.success) {
      const nextLength = res.otpLength === 4 ? 4 : 6;
      setOtpLength(nextLength);
      setOtpChannel(res.channel || "whatsapp");
      setStep("otp");
      if (res.devOtp) {
        setOtp(res.devOtp.split("").slice(0, nextLength));
      } else {
        setOtp(createEmptyOtp(nextLength));
      }
    } else {
      setError(res.message || "Failed to send OTP");
    }
  };

  const handleEditPhone = () => {
    setStep("phone");
    setIsExistingUser(false);
    setOtp(createEmptyOtp(otpLength));
    setError("");
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length < otpLength) {
      setError(`Please enter a valid ${otpLength}-digit OTP`);
      return;
    }
    setError("");
    setLoading(true);
    const res = await popupVerifyOtp(fullPhone, otpValue);
    setLoading(false);

    if (res.success) {
      if (isExistingUser || res.userExists) {
        showToast("Logged in successfully!", "success");
        onComplete();
      } else {
        setStep("details");
      }
    } else {
      setError(res.message || "Invalid OTP");
    }
  };

  const handleDetailsSubmit = async () => {
    if (!firstName.trim()) {
      setError("First Name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last Name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    const otpValue = otp.join("");
    const res = await popupCompleteSignup(fullPhone, otpValue, firstName, lastName, email);
    setLoading(false);

    if (res.success) {
      setStep("success");
      showToast("Account created successfully!", "success");
      window.setTimeout(() => onComplete(), 500);
    } else {
      setError(res.message || "Failed to create account");
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otpLength - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-[#2D2B22]/35 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative min-h-[620px] w-full max-w-[390px] overflow-hidden rounded-[22px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_24px_60px_rgba(45,43,34,0.34),0_4px_12px_rgba(45,43,34,0.16)] animate-in fade-in zoom-in-95 duration-200">
        <ModalWave />
        
        <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
          <button 
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg,#EEDFC7)] text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
            aria-label="Close"
          >
            <X size={21} strokeWidth={2.2} />
          </button>
        </div>

        {(step === "otp" || step === "details") && (
          <div className="absolute left-5 top-5 z-10">
            <button 
              onClick={() => {
                setError("");
                setStep(step === "details" ? "otp" : "phone");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg,#EEDFC7)] text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
              aria-label="Back"
            >
              <ArrowLeft size={21} strokeWidth={2.2} />
            </button>
          </div>
        )}

        <div className="relative z-[1] px-6 pb-8 pt-8 sm:px-7">
          
          {(step === "phone" || step === "otp") && (
            <div className="flex flex-col items-center">
              <StepIconBubble>
                <Smartphone size={48} strokeWidth={1.7} />
              </StepIconBubble>
              <h2 className="mb-3 text-[28px] font-extrabold leading-none tracking-normal text-[#2D2B22]">Welcome</h2>
              <p className="mb-8 text-center text-[15px] font-medium text-[#6E6A59]">Login or sign up with your mobile number</p>

              <div className="w-full space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="block text-[14px] font-extrabold text-[#2D2B22]">Enter Country Code</label>
                  <div ref={countryCodeDropdownRef} className="relative">
                    <button
                      type="button"
                      disabled={step !== "phone"}
                      onClick={() => {
                        if (step !== "phone") return;
                        setCountryCodeOpen((prev) => !prev);
                      }}
                      aria-expanded={countryCodeOpen}
                      aria-haspopup="listbox"
                      className="flex h-[58px] w-full items-center justify-between gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] px-5 text-[15px] font-bold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all focus:border-[var(--ac,#607938)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="min-w-0 flex flex-1 items-center gap-2.5 text-left">
                        {selectedCountryOption?.flagUrl ? (
                          <img src={selectedCountryOption.flagUrl} alt="" className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm" />
                        ) : selectedCountryOption?.flag ? (
                          <span className="text-lg leading-none">{selectedCountryOption.flag}</span>
                        ) : null}
                        <span className="shrink-0">{selectedCountryOption?.value || "+91"}</span>
                        {selectedCountryName ? (
                          <span className="min-w-0 flex-1 truncate font-semibold text-[#6E6A59]">{selectedCountryName}</span>
                        ) : null}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-[#6E6A59] transition-transform duration-200 ${countryCodeOpen ? "rotate-180 text-[#607938]" : ""}`}
                      />
                    </button>

                    {countryCodeOpen && step === "phone" && (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#2D2B22]/15 bg-[#EEDFC7] shadow-[0_18px_40px_rgba(45,43,34,0.28)]">
                        <div className="border-b border-[#2D2B22]/10 p-2.5">
                          <div className="relative">
                            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6A59]" />
                            <input
                              type="text"
                              value={countryCodeSearch}
                              onChange={(e) => setCountryCodeSearch(e.target.value)}
                              placeholder="Search country or code..."
                              autoFocus
                              className="h-10 w-full rounded-lg border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] pl-9 pr-3 text-[13px] font-semibold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] placeholder:text-[var(--mu,#6E6A59)] focus:border-[var(--ac,#607938)] focus:outline-none"
                            />
                          </div>
                        </div>

                        <ul role="listbox" className="max-h-56 overflow-y-auto p-1.5">
                          {filteredCountryOptions.length === 0 ? (
                            <li className="px-3 py-4 text-center text-[13px] font-medium text-[#6E6A59]">
                              No matching countries
                            </li>
                          ) : (
                            filteredCountryOptions.map((option) => {
                              const isSelected =
                                option.value === (selectedCountryOption?.value || phoneCountryCode) &&
                                option.label === selectedCountryOption?.label;
                              const cleanName = String(option.label || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

                              return (
                                <li key={`${option.label}-${option.value}`}>
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                      setPhoneCountryCode(option.value);
                                      setPhoneCountryLabel(option.label);
                                      setCountryCodeOpen(false);
                                      setCountryCodeSearch("");
                                    }}
                                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors ${
                                      isSelected
                                        ? "bg-[#607938] font-bold text-white"
                                        : "font-semibold text-[#2D2B22] hover:bg-[#dfd2bc]"
                                    }`}
                                  >
                                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                                      {option.flagUrl ? (
                                        <img src={option.flagUrl} alt="" className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover" />
                                      ) : option.flag ? (
                                        <span className="text-base leading-none">{option.flag}</span>
                                      ) : null}
                                      <span className="truncate">{cleanName}</span>
                                    </span>
                                    <span className={`shrink-0 font-bold ${isSelected ? "text-white/95" : "text-[#6E6A59]"}`}>
                                      {option.value}
                                    </span>
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-[14px] font-extrabold text-[#2D2B22]">Enter Mobile Number</label>
                    {otpSent && (
                      <button
                        type="button"
                        onClick={handleEditPhone}
                        className="shrink-0 text-[13px] font-bold text-[#607938] transition-colors hover:text-[#4e632d]"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Phone size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6E6A59]" strokeWidth={1.8} />
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                      placeholder="Enter mobile number"
                      disabled={step !== "phone"}
                      className="h-[58px] w-full rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] px-5 pl-14 text-[15px] font-semibold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all placeholder:text-[var(--mu,#6E6A59)] focus:border-[var(--ac,#607938)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25 disabled:opacity-60"
                    />
                  </div>
                </div>

                {step === "phone" && (
                  <div className="mt-2 space-y-3">
                    {configuredPhoneChannels.length === 0 ? (
                      <button
                        onClick={() => handlePhoneSubmit("auto")}
                        disabled={loading || phone.length < 10}
                        className="h-[54px] w-full rounded-xl bg-[var(--ac,#607938)] text-[17px] font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {loading ? "Sending..." : "Continue"}
                      </button>
                    ) : (
                      configuredPhoneChannels.map((channel, index) => {
                        const isPrimary = index === 0;
                        return (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => handlePhoneSubmit(channel)}
                            disabled={loading || phone.length < 10}
                            className={
                              isPrimary
                                ? "h-[54px] w-full rounded-xl bg-[var(--ac,#607938)] text-[17px] font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:cursor-not-allowed disabled:opacity-55"
                                : "h-[50px] w-full rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] text-[15px] font-bold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)] disabled:cursor-not-allowed disabled:opacity-55"
                            }
                          >
                            {loading 
                              ? "Sending..." 
                              : `Login with ${channel === "whatsapp" ? "WhatsApp" : "SMS"} OTP`
                            }
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${step === "otp" ? "mt-7 max-h-72 opacity-100" : "mt-0 max-h-0 opacity-0"}`}>
                  <div className="relative pt-7">
                    <div className="absolute left-0 right-0 top-0 h-px bg-[#2D2B22]/15" />
                    <div className="absolute left-1/2 top-0 h-5 w-12 -translate-x-1/2 -translate-y-1/2 bg-[#EEDFC7] text-center text-[#2D2B22]/30">
                      <ChevronDown size={28} className="mx-auto" />
                    </div>
                    <label className="mb-4 block text-[14px] font-extrabold text-[#2D2B22]">Enter OTP</label>
                    <div className="mb-5 flex justify-between gap-3">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="h-16 w-12 rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] text-center text-xl font-extrabold text-[var(--ac,#607938)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all focus:border-[var(--ac,#607938)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25"
                        />
                      ))}
                    </div>
                    <p className="mb-8 flex items-center justify-center gap-1 text-[13px] font-medium text-[#6E6A59]">
                      OTP has been sent via {otpChannelLabel(otpChannel)}
                    </p>

                    <button 
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.join("").length < otpLength}
                      className="h-[54px] w-full rounded-xl bg-[var(--ac,#607938)] text-[18px] font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {loading ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                </div>

                {error && <p className="mt-2 text-center text-xs font-semibold text-[#b91c1c]">{error}</p>}
                
                <SecureNote className="mt-6 pt-3" />
              </div>
            </div>
          )}
          
          {step === "details" && (
            <div className="flex flex-col items-center">
              <StepIconBubble>
                <ClipboardList size={50} strokeWidth={1.7} />
              </StepIconBubble>
              <h2 className="mb-3 text-center text-[27px] font-extrabold leading-tight tracking-normal text-[#2D2B22]">Complete Your Details</h2>
              <p className="mb-9 text-center text-[15px] font-medium text-[#6E6A59]">Please fill in your details below</p>

              <div className="w-full space-y-6">
                <div>
                  <label className="mb-2 block text-[14px] font-extrabold text-[#2D2B22]">First Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-[#6E6A59]">
                      <User size={20} strokeWidth={1.8} />
                    </div>
                    <input 
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="h-[58px] w-full rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] px-5 pl-14 text-[15px] font-semibold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all placeholder:text-[var(--mu,#6E6A59)] focus:border-[var(--ac,#607938)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-extrabold text-[#2D2B22]">Last Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-[#6E6A59]">
                      <User size={20} strokeWidth={1.8} />
                    </div>
                    <input 
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="h-[58px] w-full rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] px-5 pl-14 text-[15px] font-semibold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all placeholder:text-[var(--mu,#6E6A59)] focus:border-[var(--ac,#607938)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-extrabold text-[#2D2B22]">Enter Email</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-[#6E6A59]">
                      <Mail size={20} strokeWidth={1.8} />
                    </div>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="h-[58px] w-full rounded-xl border border-[color:color-mix(in_srgb,var(--ink,#2D2B22)_12%,transparent)] bg-[var(--bg,#EEDFC7)] px-5 pl-14 text-[15px] font-semibold text-[var(--ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all placeholder:text-[var(--mu,#6E6A59)] focus:border-[var(--ac,#607938)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25"
                    />
                  </div>
                </div>

                {error && <p className="text-center text-xs font-semibold text-[#b91c1c]">{error}</p>}

                <button 
                  onClick={handleDetailsSubmit}
                  disabled={loading}
                  className="mt-8 h-[54px] w-full rounded-xl bg-[var(--ac,#607938)] text-[18px] font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? "Saving..." : "Continue"}
                </button>
                
                <SecureNote className="mt-4" />
              </div>
            </div>
          )}
          
          {step === "success" && (
            <div className="flex min-h-[560px] flex-col items-center">
              <SuccessArt />
              
              <h2 className="mb-5 text-center text-[28px] font-extrabold leading-none tracking-normal text-[#2D2B22]">You're All Set!</h2>
              <p className="px-4 text-center text-[15px] font-medium leading-7 text-[#6E6A59]">
                Your account has been created successfully.<br />You can now continue.
              </p>

              <div className="mt-auto w-full pb-1">
                <button 
                  onClick={() => onComplete()}
                  className="h-[54px] w-full rounded-xl bg-[var(--ac,#607938)] text-[18px] font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)]"
                >
                  Done
                </button>
                
                <SecureNote className="mt-6" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
