import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, RefreshCw } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import OtpInput from "../ui/OtpInput";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { isValidEmail } from "../../utils/authIdentifier";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  filterPhoneCountryOptions,
  findPhoneCountryOption,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
  parsePhoneWithCountryCode,
} from "../../utils/phoneCountryCodes";

const createEmptyOtp = (length = 6) => Array.from({ length: length === 4 ? 4 : 6 }, () => "");

/**
 * Inline phone or email capture (phone is saved only after OTP verification). No redirect.
 * @param {"phone"|"email"} mode
 */
const ContactVerificationModal = ({
  isOpen,
  mode,
  onClose,
  onCompleted,
  allowSkip = false,
  onSkip,
  skipLabel = "Remind me later",
}) => {
  const {
    user,
    updateProfile,
    refreshUserFromServer,
    requestProfilePhoneOtp,
    verifyProfilePhoneOtp,
    isLoading,
  } = useAuthStore();
  const { showToast } = useUIStore();
  const countryCodeDropdownRef = useRef(null);
  const [value, setValue] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const [phoneCountryOptions, setPhoneCountryOptions] = useState(() => getPhoneCountryOptions());
  const [phoneError, setPhoneError] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(createEmptyOtp(6));
  const [phoneOtpLength, setPhoneOtpLength] = useState(6);
  const [phoneOtpChannel, setPhoneOtpChannel] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState("");

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
    if (!isOpen) return;
    if (mode === "phone") {
      const parsedPhone = parsePhoneWithCountryCode(user?.phone, phoneCountryOptions);
      setValue(parsedPhone.phone);
      setPhoneCountryCode("+91");
      setPhoneError("");
      setCountryCodeOpen(false);
      setCountryCodeSearch("");
      setPhoneOtpSent(false);
      setPhoneOtpDigits(createEmptyOtp(6));
      setPhoneOtpLength(6);
      setPhoneOtpChannel("");
      setPhoneDevOtp("");
    } else {
      setValue(String(user?.email || "").trim());
    }
  }, [isOpen, mode, phoneCountryOptions, user?.phone, user?.email]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!countryCodeDropdownRef.current?.contains(event.target)) {
        setCountryCodeOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const getEnteredFullPhone = () => `${phoneCountryCode}${String(value || "").replace(/\D/g, "")}`;

  const validatePhone = () => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length !== 10) {
      const message = digits.length ? "Number is incomplete." : "Enter a valid mobile number.";
      setPhoneError(message);
      showToast(message, "error");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const resetPhoneOtp = () => {
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(phoneOtpLength));
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
  };

  const handleSendPhoneOtp = async () => {
    if (!validatePhone()) return;

    const { success, message, devOtp, channel, otpLength } = await requestProfilePhoneOtp(getEnteredFullPhone());
    if (!success) {
      showToast(message || "Could not send OTP.", "error");
      return;
    }

    const nextLength = otpLength === 4 ? 4 : 6;
    const nextDevOtp = devOtp != null ? String(devOtp).slice(0, nextLength) : "";
    setPhoneOtpSent(true);
    setPhoneOtpLength(nextLength);
    setPhoneOtpDigits(nextDevOtp ? nextDevOtp.split("").slice(0, nextLength) : createEmptyOtp(nextLength));
    setPhoneOtpChannel(channel || "");
    setPhoneDevOtp(nextDevOtp);
    showToast(nextDevOtp ? "Testing OTP filled automatically." : "OTP sent to your mobile number.", "success");
  };

  const handleVerifyPhoneOtp = async () => {
    if (!validatePhone()) return;

    const otp = phoneOtpDigits.join("");
    if (otp.length !== phoneOtpLength) {
      showToast(`Please enter the ${phoneOtpLength}-digit OTP.`, "error");
      return;
    }

    const { success, message } = await verifyProfilePhoneOtp(getEnteredFullPhone(), otp);
    if (!success) {
      showToast(message || "Invalid OTP.", "error");
      return;
    }

    await refreshUserFromServer();
    showToast("Phone number verified and saved.", "success");
    onCompleted?.();
    onClose?.();
  };

  const handleSaveEmail = async () => {
    const em = String(value || "").trim().toLowerCase();
    if (!isValidEmail(em)) {
      showToast("Enter a valid email address.", "error");
      return;
    }
    const { success, message } = await updateProfile({ email: em });
    if (!success) {
      showToast(message || "Could not save email.", "error");
      return;
    }
    await refreshUserFromServer();
    showToast("Email saved.", "success");
    onCompleted?.();
    onClose?.();
  };

  const title = mode === "phone" ? "Add your mobile number" : "Add your email address";

  const filteredCountryOptions = filterPhoneCountryOptions(countryCodeSearch, phoneCountryOptions);
  const selectedCountryOption = findPhoneCountryOption(phoneCountryCode, phoneCountryOptions);
  const footerActionLabel = mode === "phone" ? (phoneOtpSent ? "Verify & continue" : "Send OTP") : "Save & continue";
  const footerAction = mode === "phone" ? (phoneOtpSent ? handleVerifyPhoneOtp : handleSendPhoneOtp) : handleSaveEmail;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      hideCloseButton={false}
      closeOnBackdropClick={allowSkip}
      allowOverflow={mode === "phone"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
          {allowSkip && (
            <Button
              type="button"
              variant="ghost"
              className="sm:min-w-[120px] rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc]/75 text-[#2D2B22] font-semibold shadow-[2px_3px_6px_rgba(45,43,34,0.14),0_1px_2px_rgba(45,43,34,0.08)] hover:bg-[#dfd2bc] active:translate-y-[1px] active:bg-[#d5c5ab] active:shadow-[inset_2px_3px_6px_rgba(45,43,34,0.26),inset_0_1px_2px_rgba(45,43,34,0.16)]"
              onClick={onSkip}
            >
              {skipLabel}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            className="sm:min-w-[140px] rounded-xl bg-[#607938] text-white font-bold shadow-[1px_3px_8px_rgba(45,43,34,0.32)] hover:bg-[#536930] active:translate-y-[1px] active:shadow-[inset_2px_3px_7px_rgba(0,0,0,0.5),inset_0_1px_3px_rgba(0,0,0,0.35)] border-none"
            loading={isLoading}
            onClick={footerAction}
          >
            {footerActionLabel}
          </Button>
        </div>
      }
    >

      {mode === "phone" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#2D2B22]">
              Country code
            </label>
            <div ref={countryCodeDropdownRef} className="relative">
              <button
                type="button"
                disabled={phoneOtpSent}
                onClick={() => {
                  if (phoneOtpSent) return;
                  setCountryCodeOpen((prev) => !prev);
                }}
                aria-expanded={countryCodeOpen}
                aria-haspopup="listbox"
                className="w-full flex h-[48px] items-center justify-between gap-3 rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-4 text-sm font-semibold text-[#2D2B22] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.2),inset_0_1px_2px_rgba(45,43,34,0.12)] transition-all focus:outline-none focus:border-[#607938] focus:ring-2 focus:ring-[#607938]/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5 truncate text-left">
                  {selectedCountryOption?.flagUrl ? (
                    <img src={selectedCountryOption.flagUrl} alt="" className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-sm" />
                  ) : selectedCountryOption?.flag ? (
                    <span className="text-base leading-none">{selectedCountryOption.flag}</span>
                  ) : null}
                  <span className="truncate">{selectedCountryOption?.label || "India (+91)"}</span>
                </span>
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-[#6E6A59] transition-transform duration-200 ${countryCodeOpen ? "rotate-180 text-[#607938]" : ""}`}
                />
              </button>

              {countryCodeOpen && !phoneOtpSent && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#2D2B22]/15 bg-[#EEDFC7] shadow-[0_18px_40px_rgba(45,43,34,0.28)]">
                  <div className="border-b border-[#2D2B22]/10 p-2">
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6A59]" />
                      <input
                        type="text"
                        value={countryCodeSearch}
                        onChange={(e) => setCountryCodeSearch(e.target.value)}
                        placeholder="Search country or code..."
                        autoFocus
                        className="h-9 w-full rounded-lg border border-[#2D2B22]/15 bg-[#dfd2bc] pl-9 pr-3 text-[13px] font-semibold text-[#2D2B22] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.16)] placeholder:text-[#6E6A59] focus:border-[#607938] focus:outline-none"
                      />
                    </div>
                  </div>
                  <ul role="listbox" className="max-h-52 overflow-y-auto p-1.5">
                    {filteredCountryOptions.length === 0 ? (
                      <li className="px-3 py-4 text-center text-[13px] font-medium text-[#6E6A59]">
                        No matching countries
                      </li>
                    ) : (
                      filteredCountryOptions.map((option) => {
                        const isSelected =
                          option.value === (selectedCountryOption?.value || phoneCountryCode) &&
                          option.label === selectedCountryOption?.label;
                        return (
                          <li key={`${option.label}-${option.value}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setPhoneCountryCode(option.value);
                                setCountryCodeOpen(false);
                                setCountryCodeSearch("");
                              }}
                              className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
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
                                <span className="truncate">{option.label}</span>
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
          <Input
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Enter phone number"
            value={value}
            error={phoneError}
            className="h-[48px] rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-4 text-[15px] font-medium text-[#2D2B22] placeholder:text-[#6E6A59] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.22),inset_0_1px_2px_rgba(45,43,34,0.12)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25 focus:border-[#607938]"
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setValue(digits);
              if (phoneOtpSent) resetPhoneOtp();
              if (!digits.length || digits.length >= 10) {
                setPhoneError("");
              } else {
                setPhoneError("Number is incomplete.");
              }
            }}
            disabled={phoneOtpSent}
            helper={!phoneError ? "Enter a 10-digit mobile number." : ""}
          />
          {phoneOtpSent && (
            <div className="space-y-3 rounded-2xl border border-[#2D2B22]/15 bg-[#dfd2bc]/60 p-4 shadow-[inset_1px_2px_5px_rgba(45,43,34,0.12)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#2D2B22]">Enter OTP</p>
                  <p className="mt-1 text-xs text-[#6E6A59]">
                    Code sent{phoneOtpChannel ? ` via ${phoneOtpChannel}` : ""} to {phoneCountryCode} ******{String(value).slice(-4)}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#607938] hover:text-[#4e632d] disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  Resend
                </button>
              </div>
              {phoneDevOtp && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  Test OTP: <span className="font-mono font-bold tracking-widest text-amber-900">{phoneDevOtp}</span>
                </div>
              )}
              <OtpInput value={phoneOtpDigits} onChange={setPhoneOtpDigits} disabled={isLoading} length={phoneOtpLength} />
            </div>
          )}
        </div>
      ) : (
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={value}
          className="h-[48px] rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-4 text-[15px] font-medium text-[#2D2B22] placeholder:text-[#6E6A59] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.22),inset_0_1px_2px_rgba(45,43,34,0.12)] focus:outline-none focus:ring-2 focus:ring-[#607938]/25 focus:border-[#607938]"
          onChange={(e) => setValue(e.target.value)}
        />
      )}
    </Modal>
  );
};

export default ContactVerificationModal;
