  import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Camera,
  Shield,
  KeyRound,
  Save,
  X,
  Edit3,
  ArrowLeft,
  Loader2,
  Phone,
  Search,
  ChevronDown,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Settings2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAuthStore, api } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input, { Select } from "../components/ui/Input";
import OtpInput from "../components/ui/OtpInput";
import ProfileImageUploadModal from "../components/profile/ProfileImageUploadModal";
import { useLocation, useNavigate } from "react-router-dom";
import { formatOrdinalDate } from "../utils/dateUtils";
import { getFileUrl } from "../utils/fileUrl";
import { useAuthControls } from "../hooks/useAuthControls";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  filterPhoneCountryOptions,
  findPhoneCountryOption,
  getPhoneCountryOptions,
  loadPhoneCountryOptions,
  parsePhoneWithCountryCode,
} from "../utils/phoneCountryCodes";

const formatMemberSince = (value) => {
  if (!value) return "Recently joined";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently joined";
  return formatOrdinalDate(parsed);
};

const createEmptyOtp = (length = 6) => Array.from({ length: length === 4 ? 4 : 6 }, () => "");

const DEFAULT_PROFILE_PAGE_COPY = {
  backToDashboardText: "Back to Dashboard",
  profileActiveBadgeText: "Profile Active",
  editProfileButtonText: "Edit Profile",
  saveChangesButtonText: "Save Changes",
  cancelButtonText: "Cancel",
  noEmailText: "No email added",
  notAddedPhoneText: "Not added",

  personalInfoTitle: "Personal Information",
  fullNameLabel: "Full Name",
  fullNamePlaceholder: "Enter your full name",
  emailAddressLabel: "Email Address",
  emailPlaceholder: "Enter email address",
  emailHelperText: "Email cannot be changed",
  mobileNumberLabel: "Mobile Number",
  phonePlaceholder: "Enter phone number",
  phoneHelperText: "Use OTP verification to add or change your mobile number.",
  phoneCountrySearchPlaceholder: "Search country",
  ageLabel: "Age",
  agePlaceholder: "Enter your age",
  genderLabel: "Gender",
  genderPlaceholder: "Select gender",
  genderOptionMale: "Male",
  genderOptionFemale: "Female",
  genderOptionOther: "Other",
  addPhoneButtonText: "Add mobile no.",
  changePhoneButtonText: "Change mobile no.",
  sendOtpButtonText: "Send OTP",
  phoneResendOtpText: "Resend OTP",
  phoneVerifySaveButtonText: "Verify & Save",

  accountOverviewTitle: "Account Overview",
  memberSinceLabel: "Member Since",
  accountEmailLabel: "Email Address",
  accountPhoneLabel: "Phone Number",
  accountStatusLabel: "Account Status",
  accountStatusValue: "Active",
  badgeAddedText: "Added",
  badgeAddEmailText: "Add email",
  badgeAddPhoneText: "Add phone",

  securityTitle: "Security",
  securityDescription: "Keep your account secure with a strong password.",
  createPasswordDescription: "Create a password so this account can also sign in with email and password.",
  changePasswordButtonText: "Change Password",
  createPasswordButtonText: "Create Password",

  // Account Deletion Section
  deletionTitle: "Account Deletion",
  deletionDescription: "Permanently delete your account and all associated profile data.",
  deleteAccountButtonText: "Delete Account",
  deleteModalTitle: "Verify Your Identity",
  deleteModalSubtitle: "For your security, please verify your identity before permanently deleting your account.",
  deleteConfirmTitle: "Are you sure?",
  deleteConfirmSubtitle: "This action cannot be undone. All your profile data, applications, and history will be permanently deleted.",
};

const StatusPill = ({ children, tone = "green", onClick }) => {
  const tones = {
    green: "bg-[#607938]/15 text-[#4e632d] border border-[#607938]/30",
    blue: "bg-[#607938]/15 text-[#4e632d] border border-[#607938]/30",
    amber: "bg-[#b45309]/15 text-[#92400e] border border-[#b45309]/30",
    zinc: "bg-[#dfd2bc] text-[#2D2B22] border border-[#2D2B22]/15",
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold cursor-pointer transition-all hover:brightness-95 active:scale-95 ${tones[tone]}`}
      >
        {children}
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const OverviewRow = ({ icon: Icon, label, value, valueTone = "green", onValueClick }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex items-center gap-3 text-sm font-medium text-[var(--dp-muted,#6E6A59)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[var(--dp-accent,#607938)] ![box-shadow:var(--master-sm-inner-drop-shadow)]">
        <Icon size={16} />
      </span>
      <span>{label}</span>
    </div>
    {typeof value === "string" && ["green", "blue", "amber", "zinc"].includes(valueTone) ? (
      <StatusPill tone={valueTone} onClick={onValueClick}>{value}</StatusPill>
    ) : (
      <span className="text-sm font-bold text-[var(--dp-ink,#2D2B22)]">{value}</span>
    )}
  </div>
);

const SectionShell = ({ icon: Icon, title, children, className = "" }) => (
  <Card
    padding="none"
    className={`flex h-full flex-col overflow-visible rounded-[26px] border-0 bg-[var(--dp-bg,#EEDFC7)] ![box-shadow:var(--master-outer-drop-shadow)] ${className}`}
  >
    <div className="flex items-center gap-3 rounded-t-[26px] border-b border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_10%,transparent)] px-7 py-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-transparent text-[var(--dp-accent,#607938)] ![box-shadow:var(--master-sm-inner-drop-shadow)]">
        <Icon size={19} />
      </span>
      <h2 className="text-[1.3rem] font-extrabold tracking-tight text-[var(--dp-ink,#2D2B22)]">{title}</h2>
    </div>
    <div className="flex flex-1 flex-col px-7 py-6">{children}</div>
  </Card>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    updateProfile,
    requestProfilePhoneOtp,
    verifyProfilePhoneOtp,
    uploadProfileImage,
    removeProfileImage,
    changeUserPassword,
    deleteAccount,
    sendDeleteOtp,
    verifyDeleteOtp,
    generateCaptcha,
    verifyCaptcha,
    isLoading,
  } = useAuthStore();
  const { showToast } = useUIStore();
  const { authControls } = useAuthControls();

  const countryCodeDropdownRef = useRef(null);
  const genderDropdownRef = useRef(null);
  const phoneInputRef = useRef(null);
  const [profileCopy, setProfileCopy] = useState(DEFAULT_PROFILE_PAGE_COPY);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const resolvedProfileImageUrl = getFileUrl(user?.profileImage);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedProfileImageUrl]);

  useEffect(() => {
    let alive = true;
    const fetchProfileCopy = async () => {
      try {
        const { data } = await api.get("/config/profile-copy");
        if (alive && data?.success && data?.copy) {
          setProfileCopy((prev) => ({ ...prev, ...data.copy }));
        }
      } catch {
        try {
          const { data } = await api.get("/config/destination-content");
          if (alive && data?.config?.userProfilePageCopy) {
            setProfileCopy((prev) => ({ ...prev, ...data.config.userProfilePageCopy }));
          }
        } catch {}
      }
    };
    fetchProfileCopy();
    return () => {
      alive = false;
    };
  }, []);
  const [isEditing, setIsEditing] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [activeSectionTab, setActiveSectionTab] = useState("profile");
  const [isUploading, setIsUploading] = useState(false);
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const [phoneCountryOptions, setPhoneCountryOptions] = useState(() => getPhoneCountryOptions());
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [phoneOtpActive, setPhoneOtpActive] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpDigits, setPhoneOtpDigits] = useState(createEmptyOtp(6));
  const [phoneOtpLength, setPhoneOtpLength] = useState(6);
  const [phoneOtpChannel, setPhoneOtpChannel] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState("");
  const [phoneChangeError, setPhoneChangeError] = useState("");

  const [deletePhone, setDeletePhone] = useState("");
  const [deletePhoneError, setDeletePhoneError] = useState("");
  const [deleteOtpDigits, setDeleteOtpDigits] = useState(createEmptyOtp(4));
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteToken, setDeleteToken] = useState("");
  const [deleteOtpError, setDeleteOtpError] = useState("");
  const [deleteOtpCountdown, setDeleteOtpCountdown] = useState(0);
  const [captchaData, setCaptchaData] = useState({ id: "", image: "" });
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [isGeneratingCaptcha, setIsGeneratingCaptcha] = useState(false);
  const [showFinalDeleteConfirm, setShowFinalDeleteConfirm] = useState(false);

  useEffect(() => {
    let interval;
    if (deleteOtpCountdown > 0) {
      interval = setInterval(() => setDeleteOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [deleteOtpCountdown]);

  const loadCaptcha = async () => {
    setIsGeneratingCaptcha(true);
    setCaptchaError("");
    setCaptchaInput("");
    const res = await generateCaptcha();
    if (res.success) {
      setCaptchaData({ id: res.captchaId, image: res.image });
    } else {
      setCaptchaError(res.message || "Failed to load CAPTCHA");
    }
    setIsGeneratingCaptcha(false);
  };

  useEffect(() => {
    if (showDeleteModal) {
      setDeletePhone("");
      setDeletePhoneError("");
      setDeleteOtpDigits(createEmptyOtp(4));
      setDeleteOtpSent(false);
      setDeleteToken("");
      setDeleteOtpError("");
      setDeleteOtpCountdown(0);
      setShowFinalDeleteConfirm(false);
      loadCaptcha();
    }
  }, [showDeleteModal]);

  const handleSendDeleteOtp = async () => {
    if (!deletePhone) {
      setDeletePhoneError("Please enter your registered phone number");
      return;
    }
    
    const justDigits = String(deletePhone).replace(/\D/g, "");
    if (justDigits.length < 10) {
      setDeletePhoneError("Please enter a valid 10-digit mobile number");
      return;
    }
    
    const userDigits = String(user.phone || "").replace(/\D/g, "");
    if (justDigits !== userDigits && userDigits.length === 10) {
      setDeletePhoneError("This phone number is not linked to your account.");
      return;
    }

    setDeletePhoneError("");
    const res = await sendDeleteOtp(deletePhone);
    if (res.success) {
      setDeleteOtpSent(true);
      setDeleteOtpCountdown(60);
      showToast(res.message, "success");
    } else {
      setDeletePhoneError(res.message);
    }
  };

  const handleVerifyDeleteOtp = async (otpString) => {
    if (otpString.length !== 4) return;
    setDeleteOtpError("");
    const res = await verifyDeleteOtp(deletePhone, otpString);
    if (res.success) {
      setDeleteToken(res.deleteToken);
      showToast("OTP Verified successfully", "success");
    } else {
      setDeleteOtpError(res.message);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    email: "",
    phone: "",
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isCreatingPassword = !user?.hasPassword;

  const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    if (!isCreatingPassword && !currentPassword.trim()) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one uppercase letter.";
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one lowercase letter.";
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one digit.";
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = "Password must include at least one special character.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  };

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
    if (user) {
      const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
      setFormData({
        name: user.name || "",
        age: user.age !== undefined && user.age !== null ? user.age : "",
        gender: user.gender || "Other",
        email: user.email || "",
        phone: parsedPhone.phone,
        phoneCountryCode: parsedPhone.countryCode,
      });
    }
  }, [phoneCountryOptions, user]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!countryCodeDropdownRef.current?.contains(event.target)) {
        setCountryCodeOpen(false);
      }
      if (!genderDropdownRef.current?.contains(event.target)) {
        setGenderOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleBack = () => {
    const returnTo = location.state?.from;
    if (returnTo && returnTo !== location.pathname) {
      navigate(returnTo);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const updates = {
      name: formData.name,
      age: formData.age !== "" && formData.age != null ? Number(formData.age) : null,
      gender: formData.gender || "Other",
    };

    const { success } = await updateProfile(updates);
    if (success) {
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } else {
      showToast("Failed to update profile", "error");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
      setFormData({
        name: user.name || "",
        age: user.age !== undefined && user.age !== null ? user.age : "",
        gender: user.gender || "Other",
        email: user.email || "",
        phone: parsedPhone.phone,
        phoneCountryCode: parsedPhone.countryCode,
      });
    }
    setPhoneOtpActive(false);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(6));
    setPhoneOtpLength(6);
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
    setPhoneChangeError("");
  };

  const handleStartPhoneChange = () => {
    const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
    setFormData((prev) => ({
      ...prev,
      phone: parsedPhone.phone,
      phoneCountryCode: parsedPhone.countryCode,
    }));
    setPhoneOtpActive(true);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(6));
    setPhoneOtpLength(6);
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
    setPhoneChangeError("");
  };

  const handleCancelPhoneChange = () => {
    const parsedPhone = parsePhoneWithCountryCode(user.phone, phoneCountryOptions);
    setFormData((prev) => ({
      ...prev,
      phone: parsedPhone.phone,
      phoneCountryCode: parsedPhone.countryCode,
    }));
    setPhoneOtpActive(false);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(6));
    setPhoneOtpLength(6);
    setPhoneOtpChannel("");
    setPhoneDevOtp("");
    setPhoneChangeError("");
  };

  const getEnteredFullPhone = () => {
    const digits = String(formData.phone || "").replace(/\D/g, "");
    return `${formData.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
  };

  const handleSendPhoneOtp = async () => {
    const digits = String(formData.phone || "").replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneChangeError("Enter a valid 10-digit mobile number.");
      showToast("Enter a valid 10-digit mobile number.", "error");
      return;
    }

    const currentDigits = String(user.phone || "").replace(/\D/g, "").slice(-10);
    if (currentDigits && currentDigits === digits) {
      setPhoneChangeError("Enter a different mobile number.");
      showToast("Enter a different mobile number.", "error");
      return;
    }

    const fullPhone = getEnteredFullPhone();
    const { success, message, devOtp, channel, otpLength } = await requestProfilePhoneOtp(fullPhone);
    if (!success) {
      setPhoneChangeError(message || "Could not send OTP.");
      showToast(message || "Could not send OTP.", "error");
      return;
    }

    const nextLength = otpLength === 4 ? 4 : 6;
    const nextDevOtp = devOtp != null ? String(devOtp).slice(0, nextLength) : "";
    setPhoneOtpSent(true);
    setPhoneOtpLength(nextLength);
    setPhoneOtpDigits(nextDevOtp ? nextDevOtp.padEnd(nextLength, "").split("").slice(0, nextLength) : createEmptyOtp(nextLength));
    setPhoneOtpChannel(channel || "");
    setPhoneDevOtp(nextDevOtp);
    setPhoneChangeError("");
    showToast(nextDevOtp ? "Testing OTP filled automatically." : "OTP sent to your mobile number.", "success");
  };

  const handleVerifyPhoneOtp = async () => {
    const otp = phoneOtpDigits.join("");
    if (otp.length !== phoneOtpLength) {
      showToast(`Please enter the ${phoneOtpLength}-digit OTP.`, "error");
      return;
    }

    const fullPhone = getEnteredFullPhone();
    const { success, message } = await verifyProfilePhoneOtp(fullPhone, otp);
    if (!success) {
      showToast(message || "Invalid OTP.", "error");
      return;
    }

    const parsedPhone = parsePhoneWithCountryCode(fullPhone, phoneCountryOptions);
    setFormData((prev) => ({
      ...prev,
      phone: parsedPhone.phone,
      phoneCountryCode: parsedPhone.countryCode,
    }));
    setPhoneOtpActive(false);
    setPhoneOtpSent(false);
    setPhoneOtpDigits(createEmptyOtp(phoneOtpLength));
    setPhoneDevOtp("");
    setPhoneChangeError("");
    showToast("Mobile number updated successfully.", "success");
  };

  const handleImageClick = () => {
    setShowPhotoModal(true);
  };

  const handleCroppedImageUpload = async (compressedFile, sizeMeta) => {
    setIsUploading(true);
    const result = await uploadProfileImage(compressedFile);
    setIsUploading(false);

    if (result?.success) {
      setAvatarLoadError(false);
      const kb = Math.max(1, Math.round((sizeMeta?.compressedSize || compressedFile.size) / 1024));
      showToast(`Profile image updated (${kb} KB)!`, "success");
      return true;
    }

    showToast("Failed to upload image", "error");
    return false;
  };

  const handleRemoveProfileImage = async () => {
    setIsUploading(true);
    const result = await removeProfileImage();
    setIsUploading(false);

    if (result?.success) {
      setAvatarLoadError(false);
      showToast("Profile photo removed", "success");
      return true;
    }

    showToast("Failed to remove profile photo", "error");
    return false;
  };

  const handleChangePassword = async () => {
    const errors = validatePasswordChange(passwordForm);
    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      setPasswordErrors(errors);
      const firstError = errors.currentPassword || errors.newPassword || errors.confirmPassword;
      showToast(firstError, "error");
      return;
    }

    setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setIsChangingPassword(true);
    const currentPasswordValue = isCreatingPassword ? "" : passwordForm.currentPassword;
    const { success, message } = await changeUserPassword(currentPasswordValue, passwordForm.newPassword);
    setIsChangingPassword(false);

    if (success) {
      showToast(isCreatingPassword ? "Password created successfully!" : "Password updated successfully!", "success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowSecurityForm(false);
    } else {
      showToast(message || "Failed to update password", "error");
    }
  };

  const handleVerifyAndNext = async () => {
    if (!deleteToken || !captchaInput) return;
    
    setIsDeletingAccount(true);
    const res = await verifyCaptcha(captchaData.id, captchaInput);
    setIsDeletingAccount(false);
    
    if (res.success) {
      setShowFinalDeleteConfirm(true);
    } else {
      setCaptchaError(res.message);
      setTimeout(() => {
        loadCaptcha();
      }, 1500);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const { success, message } = await deleteAccount({ 
      deleteToken, 
      captchaId: captchaData.id, 
      captchaText: captchaInput 
    });
    setIsDeletingAccount(false);
    
    if (success) {
      showToast("Account deleted successfully.", "success");
      navigate("/");
    } else {
      showToast(message || "Failed to delete account.", "error");
      setShowDeleteModal(false);
      setShowFinalDeleteConfirm(false);
    }
  };

  if (!user) return null;

  const displayPhoneDigits = String(user.phone || formData.phone || "").replace(/\D/g, "");
  const displayPhoneCountryCode = formData.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE;
  const displayPhone =
    displayPhoneDigits.length === 10
      ? `${displayPhoneCountryCode} ${displayPhoneDigits.slice(0, 5)} ${displayPhoneDigits.slice(5)}`
      : (user.phone || formData.phone || profileCopy.notAddedPhoneText || "Not added");

  const filteredCountryOptions = filterPhoneCountryOptions(countryCodeSearch, phoneCountryOptions);
  const selectedCountryOption = findPhoneCountryOption(formData.phoneCountryCode, phoneCountryOptions);
  const phoneInputLocked = !phoneOtpActive || phoneOtpSent;
  const phoneActionLabel = displayPhoneDigits
    ? (profileCopy.changePhoneButtonText || "Change mobile no.")
    : (profileCopy.addPhoneButtonText || "Add mobile no.");

  const memberSince = formatMemberSince(user.createdAt);
  const hasProfileChanges =
    String(formData.name || "") !== String(user.name || "") ||
    String(formData.age ?? "") !== String(user.age ?? "") ||
    String(formData.gender || "Other") !== String(user.gender || "Other");

  return (
    <div className="compact-application min-h-screen bg-[var(--dp-bg,#EEDFC7)] text-[var(--dp-ink,#2D2B22)] flex flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 pb-12 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="group inline-flex h-[38px] items-center gap-2 rounded-[12px] border-0 bg-[var(--dp-bg,#EEDFC7)] pl-3 pr-4 text-[14px] font-semibold text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:text-[var(--dp-accent,#607938)] active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
            aria-label="Go back"
          >
            <ArrowLeft size={16} strokeWidth={2.2} className="group-hover:-translate-x-[3px] transition-transform duration-150" />
            <span>Back</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_minmax(0,1fr)] items-start">
          {/* Profile Sidebar: Compact Identity Card + Navigation */}
          <aside className="rounded-[26px] border-0 bg-[var(--dp-bg,#EEDFC7)] p-5 ![box-shadow:var(--master-outer-drop-shadow)] lg:sticky lg:top-24 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3.5">
                <button
                  type="button"
                  onClick={handleImageClick}
                  title="Update profile photo"
                  className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#EEDFC7] bg-[#dfd2bc] shadow-[inset_2px_3px_8px_rgba(45,43,34,0.2),4px_4px_12px_rgba(45,43,34,0.2)]"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin text-[#607938]" size={26} />
                  ) : resolvedProfileImageUrl && !avatarLoadError ? (
                    <img
                      src={resolvedProfileImageUrl}
                      alt="Profile"
                      onError={() => setAvatarLoadError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-[#607938]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleImageClick}
                  aria-label="Upload photo"
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#EEDFC7] bg-[#607938] text-white shadow-[2px_3px_6px_rgba(45,43,34,0.28)] transition-transform hover:scale-105 active:scale-95"
                >
                  <Camera size={12} />
                </button>
              </div>

              <h1 className="flex items-center justify-center gap-2 text-xl font-extrabold tracking-tight text-[#2D2B22]">
                <span className="break-words">{user.name}</span>
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#607938] text-white">
                  <BadgeCheck size={12} />
                </span>
              </h1>

              <div className="mt-2">
                <StatusPill tone="green">{profileCopy.profileActiveBadgeText || "Profile Active"}</StatusPill>
              </div>
            </div>

            <div className="border-t border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_10%,transparent)] pt-4 flex flex-row lg:flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveSectionTab("profile")}
                className={`flex flex-1 lg:w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                  activeSectionTab === "profile"
                    ? "bg-[var(--dp-bg,#EEDFC7)] text-[var(--dp-accent,#607938)] ![box-shadow:var(--master-inner-drop-shadow)]"
                    : "text-[var(--dp-muted,#6E6A59)] hover:bg-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_5%,transparent)] hover:text-[var(--dp-ink,#2D2B22)]"
                }`}
              >
                <User size={17} className="shrink-0" />
                <span className="truncate">Profile & Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionTab("security")}
                className={`flex flex-1 lg:w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                  activeSectionTab === "security"
                    ? "bg-[var(--dp-bg,#EEDFC7)] text-[var(--dp-accent,#607938)] ![box-shadow:var(--master-inner-drop-shadow)]"
                    : "text-[var(--dp-muted,#6E6A59)] hover:bg-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_5%,transparent)] hover:text-[var(--dp-ink,#2D2B22)]"
                }`}
              >
                <Shield size={17} className="shrink-0" />
                <span className="truncate">Security & Privacy</span>
              </button>
            </div>
          </aside>

          {/* Active Tab Content */}
          <div className="min-w-0">
            {activeSectionTab === "profile" ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_340px] items-stretch">
                <SectionShell icon={User} title={profileCopy.personalInfoTitle || "Personal Information"}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label={profileCopy.fullNameLabel || "Full Name"}
                placeholder={profileCopy.fullNamePlaceholder || "Enter your full name"}
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="h-12 rounded-xl border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent px-4 py-0 text-sm font-medium text-[var(--dp-ink,#2D2B22)] transition-all ![box-shadow:var(--master-inner-drop-shadow)] focus:ring-0 focus:border-[var(--dp-accent,#607938)] focus:bg-transparent"
              />

              <Input
                label={profileCopy.emailAddressLabel || "Email Address"}
                placeholder={profileCopy.emailPlaceholder || "Enter email address"}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                helper={profileCopy.emailHelperText || "Email cannot be changed"}
                className="h-12 rounded-xl border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent px-4 py-0 text-sm font-medium text-[var(--dp-ink,#2D2B22)] opacity-80 ![box-shadow:var(--master-inner-drop-shadow)] focus:ring-0"
              />

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{profileCopy.mobileNumberLabel || "Mobile Number"}</label>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div ref={countryCodeDropdownRef} className="relative">
                    <button
                      type="button"
                      disabled={phoneOtpSent}
                      onClick={() => {
                        if (!phoneOtpActive) {
                          handleStartPhoneChange();
                          setCountryCodeOpen(true);
                          setCountryCodeSearch("");
                          return;
                        }
                        if (phoneOtpSent) return;
                        setCountryCodeOpen((prev) => !prev);
                        setCountryCodeSearch("");
                      }}
                      className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)] transition-all ${
                        phoneOtpSent
                          ? "cursor-default border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent opacity-80"
                          : phoneOtpActive
                            ? "border-[var(--dp-accent,#607938)] bg-transparent"
                            : "cursor-pointer border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent hover:border-[color:color-mix(in_srgb,var(--dp-accent,#607938)_50%,transparent)]"
                      }`}
                    >
                      <span className="truncate text-left flex items-center gap-2">
                        {selectedCountryOption?.flagUrl ? (
                          <img src={selectedCountryOption.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-[2px]" />
                        ) : selectedCountryOption?.flag ? (
                          <span className="text-lg leading-none">{selectedCountryOption.flag}</span>
                        ) : null}
                        <span>{selectedCountryOption?.value || "+91"}</span>
                      </span>
                      <ChevronDown size={18} className={`shrink-0 text-[#6E6A59] transition-transform ${countryCodeOpen ? "rotate-180" : ""}`} />
                    </button>

                      {countryCodeOpen && !phoneOtpSent && (
                      <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-[#2D2B22]/15 bg-[#EEDFC7] shadow-[0_18px_40px_rgba(45,43,34,0.28)]">
                        <div className="relative border-b border-[#2D2B22]/10 p-3">
                          <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6E6A59]" />
                          <input
                            type="text"
                            value={countryCodeSearch}
                            onChange={(e) => setCountryCodeSearch(e.target.value)}
                            placeholder={profileCopy.phoneCountrySearchPlaceholder || "Search country"}
                            autoFocus
                            className="w-full rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] py-2 pl-9 pr-3 text-sm text-[#2D2B22] placeholder:text-[#6E6A59] focus:border-[#607938] focus:outline-none"
                          />
                        </div>
                        <div
                          className="max-h-60 overflow-y-auto py-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#607938]/45 hover:[&::-webkit-scrollbar-thumb]:bg-[#607938]/70"
                          style={{ scrollbarWidth: "thin", scrollbarColor: "color-mix(in srgb, var(--ac, #607938) 50%, transparent) transparent" }}
                        >
                          {filteredCountryOptions.length ? (
                            filteredCountryOptions.map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, phoneCountryCode: option.value }));
                                  setCountryCodeOpen(false);
                                  setCountryCodeSearch("");
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                  formData.phoneCountryCode === option.value
                                    ? "bg-[#607938]/15 text-[#4e632d] font-bold"
                                    : "text-[#2D2B22] hover:bg-[#dfd2bc]/70"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {option.flagUrl ? (
                                    <img src={option.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-[2px]" />
                                  ) : option.flag ? (
                                    <span className="text-lg leading-none">{option.flag}</span>
                                  ) : null}
                                  <span>{option.label}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-3 text-sm text-[#6E6A59]">No countries found.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    onClick={() => {
                      if (!phoneOtpActive) {
                        handleStartPhoneChange();
                        setTimeout(() => phoneInputRef.current?.focus(), 0);
                      }
                    }}
                    className="w-full"
                  >
                    <input
                      ref={phoneInputRef}
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder={profileCopy.phonePlaceholder || "Enter phone number"}
                      value={formData.phone}
                      readOnly={!phoneOtpActive}
                      disabled={phoneOtpSent}
                      onFocus={() => {
                        if (!phoneOtpActive) {
                          handleStartPhoneChange();
                        }
                      }}
                      onChange={(e) => {
                        if (!phoneOtpActive) return;
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData((prev) => ({ ...prev, phone: digitsOnly }));
                      }}
                      className={`h-12 w-full rounded-xl border px-4 text-sm font-medium text-[var(--dp-ink,#2D2B22)] placeholder:text-[var(--dp-muted,#6E6A59)] ![box-shadow:var(--master-inner-drop-shadow)] focus:outline-none focus:border-[var(--dp-accent,#607938)] transition-all ${
                        phoneOtpSent
                          ? "cursor-default border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent opacity-80"
                          : phoneOtpActive
                            ? "border-[var(--dp-accent,#607938)] bg-transparent"
                            : "cursor-pointer border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent hover:border-[color:color-mix(in_srgb,var(--dp-accent,#607938)_50%,transparent)]"
                      }`}
                    />
                  </div>
                </div>
                {phoneChangeError ? (
                  <p className="mt-1 text-xs font-semibold text-[#9a3b2a]">{phoneChangeError}</p>
                ) : (
                  <p className="mt-1 text-xs text-[#6E6A59]">
                    {phoneOtpActive
                      ? phoneOtpSent
                        ? (profileCopy.phoneOtpEnterHelperText || "Enter the OTP sent to this mobile number.")
                        : (profileCopy.phoneOtpSelectHelperText || "Choose a country code and enter a 10-digit mobile number.")
                      : (profileCopy.phoneHelperText || "Use OTP verification to add or change your mobile number.")}
                  </p>
                )}

                {phoneOtpActive &&
                  (phoneOtpSent ||
                    (String(formData.phone || "").replace(/\D/g, "").length === 10 &&
                      String(formData.phone || "").replace(/\D/g, "") !==
                        String(user.phone || "").replace(/\D/g, "").slice(-10))) && (
                  <div className="mt-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent p-4 ![box-shadow:var(--master-inner-drop-shadow)]">
                      {!phoneOtpSent ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-[var(--dp-ink,#2D2B22)] leading-snug">
                            {profileCopy.phoneOtpConfirmPrompt || "Send an OTP to confirm this mobile number."}
                          </p>
                          <div className="flex shrink-0 items-center gap-2.5">
                            <button
                              type="button"
                              onClick={handleCancelPhoneChange}
                              className="inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-[var(--dp-bg,#EEDFC7)] px-4 text-sm font-bold text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={handleSendPhoneOtp}
                              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--dp-accent,#607938)] px-5 text-sm font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:opacity-60"
                            >
                              {isLoading && <Loader2 size={15} className="animate-spin" />}
                              {profileCopy.sendOtpButtonText || "Send OTP"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-[#2D2B22]">
                              OTP sent{phoneOtpChannel ? ` via ${phoneOtpChannel}` : ""}.
                            </p>
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              className="w-fit text-sm font-bold text-[#607938] hover:text-[#4e632d]"
                            >
                              {profileCopy.phoneResendOtpText || "Resend OTP"}
                            </button>
                          </div>
                          {phoneDevOtp && (
                            <div className="rounded-xl border border-[#b45309]/30 bg-[#b45309]/10 px-4 py-3 text-sm text-[#92400e]">
                              Test OTP:{" "}
                              <button
                                type="button"
                                className="font-bold underline"
                                onClick={() => setPhoneOtpDigits(phoneDevOtp.split("").slice(0, phoneOtpLength))}
                              >
                                {phoneDevOtp}
                              </button>
                            </div>
                          )}
                          <OtpInput value={phoneOtpDigits} onChange={setPhoneOtpDigits} disabled={isLoading} length={phoneOtpLength} />
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleCancelPhoneChange}
                              className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-[var(--dp-bg,#EEDFC7)] px-4 text-sm font-bold text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isLoading || phoneOtpDigits.join("").length !== phoneOtpLength}
                              onClick={handleVerifyPhoneOtp}
                              className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--dp-accent,#607938)] px-5 text-sm font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {isLoading && <Loader2 size={15} className="animate-spin" />}
                              {profileCopy.phoneVerifySaveButtonText || "Verify & Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                )}
              </div>

              <Input
                label={profileCopy.ageLabel || "Age"}
                name="age"
                type="number"
                min="0"
                placeholder={profileCopy.agePlaceholder || "Enter your age"}
                value={formData.age}
                onChange={handleChange}
                className="h-12 rounded-xl border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent px-4 py-0 text-sm font-medium text-[var(--dp-ink,#2D2B22)] transition-all ![box-shadow:var(--master-inner-drop-shadow)] focus:ring-0 focus:border-[var(--dp-accent,#607938)] focus:bg-transparent"
              />

              <div ref={genderDropdownRef} className="relative flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">
                  {profileCopy.genderLabel || "Gender"}
                </label>
                <button
                  type="button"
                  onClick={() => setGenderOpen((prev) => !prev)}
                  className={`flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium text-[var(--dp-ink,#2D2B22)] transition-all ![box-shadow:var(--master-inner-drop-shadow)] focus:outline-none ${
                    genderOpen
                      ? "border-[var(--dp-accent,#607938)] bg-transparent"
                      : "border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent hover:border-[color:color-mix(in_srgb,var(--dp-accent,#607938)_50%,transparent)]"
                  }`}
                >
                  <span>
                    {formData.gender === "Male"
                      ? (profileCopy.genderOptionMale || "Male")
                      : formData.gender === "Female"
                        ? (profileCopy.genderOptionFemale || "Female")
                        : (profileCopy.genderOptionOther || "Other")}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[#6E6A59] transition-transform ${genderOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {genderOpen && (
                  <div className="absolute left-0 top-full z-40 mt-2 w-full overflow-hidden rounded-2xl border border-[#2D2B22]/15 bg-[#EEDFC7] py-1.5 shadow-[0_18px_40px_rgba(45,43,34,0.28)]">
                    {[
                      { value: "Male", label: profileCopy.genderOptionMale || "Male" },
                      { value: "Female", label: profileCopy.genderOptionFemale || "Female" },
                      { value: "Other", label: profileCopy.genderOptionOther || "Other" },
                    ].map((opt) => {
                      const selected = (formData.gender || "Other") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, gender: opt.value }));
                            setGenderOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                            selected
                              ? "bg-[#607938]/15 font-bold text-[#4e632d]"
                              : "font-medium text-[#2D2B22] hover:bg-[#dfd2bc]/75"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {selected && <BadgeCheck size={15} className="text-[#607938]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {hasProfileChanges && (
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_10%,transparent)] pt-5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-[var(--dp-bg,#EEDFC7)] px-5 py-2.5 text-sm font-bold text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
                >
                  <X size={16} />
                  {profileCopy.cancelButtonText || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--dp-accent,#607938)] px-6 py-2.5 text-sm font-bold text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)] disabled:opacity-60"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {profileCopy.saveChangesButtonText || "Save Changes"}
                </button>
              </div>
            )}
          </SectionShell>

                <SectionShell icon={BadgeCheck} title={profileCopy.accountOverviewTitle || "Account Overview"}>
                  <div className="divide-y divide-[#2D2B22]/10">
                    <OverviewRow icon={CalendarDays} label={profileCopy.memberSinceLabel || "Member Since"} value={memberSince} valueTone="zinc" />
                    <OverviewRow icon={Mail} label={profileCopy.accountEmailLabel || "Email Address"} value={user.email ? (profileCopy.badgeAddedText || "Added") : (profileCopy.badgeAddEmailText || "Add email")} valueTone={user.email ? "green" : "amber"} />
                    <OverviewRow
                      icon={Phone}
                      label={profileCopy.accountPhoneLabel || "Phone Number"}
                      value={displayPhoneDigits ? (profileCopy.badgeAddedText || "Added") : (profileCopy.badgeAddPhoneText || "Add phone")}
                      valueTone={displayPhoneDigits ? "green" : "amber"}
                      onValueClick={
                        !displayPhoneDigits
                          ? () => {
                              setActiveSectionTab("profile");
                              if (!phoneOtpActive) handleStartPhoneChange();
                              setTimeout(() => {
                                phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                phoneInputRef.current?.focus();
                              }, 60);
                            }
                          : undefined
                      }
                    />
                    <OverviewRow icon={Shield} label={profileCopy.accountStatusLabel || "Account Status"} value={profileCopy.accountStatusValue || "Active"} valueTone="green" />
                  </div>
                </SectionShell>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch">
                {authControls.passwordEnabled && (
                  <SectionShell icon={Shield} title={profileCopy.securityTitle || "Security"}>
                    <div className="flex flex-1 flex-col justify-between gap-5">
                      <div className="space-y-2">
                        <p className="text-sm leading-relaxed text-[#6E6A59]">
                          {isCreatingPassword
                            ? (profileCopy.createPasswordDescription || "Create a password so this account can also sign in with email and password.")
                            : (profileCopy.securityDescription || "Keep your account secure with a strong password.")}
                        </p>
                      </div>

                      {!showSecurityForm ? (
                        <button
                          type="button"
                          onClick={() => setShowSecurityForm(true)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--dp-accent,#607938)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--dp-accent,#607938)_14%,transparent)] px-5 py-3 text-sm font-bold text-[var(--dp-accent,#607938)] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:brightness-95 active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
                        >
                          <KeyRound size={16} />
                          {isCreatingPassword ? (profileCopy.createPasswordButtonText || "Create Password") : (profileCopy.changePasswordButtonText || "Change Password")}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {!isCreatingPassword && (
                            <Input
                              label="Current Password"
                              type="password"
                              name="currentPassword"
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                              placeholder="........"
                              error={passwordErrors.currentPassword}
                              className="rounded-xl border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent px-4 py-3.5 text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)]"
                            />
                          )}

                          <Input
                            label={isCreatingPassword ? "Create Password" : "New Password"}
                            type="password"
                            name="newPassword"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="........"
                            helper="Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char"
                            error={passwordErrors.newPassword}
                            className="rounded-xl border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent px-4 py-3.5 text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)]"
                          />

                          <Input
                            label={isCreatingPassword ? "Re-enter Password" : "Confirm New Password"}
                            type="password"
                            name="confirmPassword"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="........"
                            error={passwordErrors.confirmPassword}
                            className="rounded-xl border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-transparent px-4 py-3.5 text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-inner-drop-shadow)]"
                          />

                          <div className="flex gap-3">
                            <Button
                              variant="ghost"
                              fullWidth
                              onClick={() => {
                                setShowSecurityForm(false);
                                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
                              }}
                              className="rounded-xl border border-[color:color-mix(in_srgb,var(--dp-ink,#2D2B22)_12%,transparent)] bg-[var(--dp-bg,#EEDFC7)] text-[var(--dp-ink,#2D2B22)] ![box-shadow:var(--master-btn-outer-drop-shadow)] active:![box-shadow:var(--master-inner-drop-shadow)]"
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="primary"
                              fullWidth
                              leftIcon={<KeyRound size={16} />}
                              onClick={handleChangePassword}
                              loading={isChangingPassword}
                              className="rounded-xl bg-[var(--dp-accent,#607938)] text-white ![box-shadow:var(--master-btn-outer-drop-shadow)] hover:brightness-95 active:![box-shadow:var(--master-colored-btn-inner-drop-shadow)]"
                            >
                              {isCreatingPassword ? "Create Password" : "Update Password"}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </SectionShell>
                )}

                <SectionShell icon={AlertTriangle} title={profileCopy.deletionTitle || "Account Deletion"}>
                  <div className="flex flex-1 flex-col justify-between gap-5">
                    <p className="text-sm leading-relaxed text-[var(--dp-muted,#6E6A59)]">
                      {profileCopy.deletionDescription || "Permanently delete your account and all associated profile data."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#9a3b2a]/30 bg-[#9a3b2a]/15 px-5 py-3 text-sm font-bold text-[#9a3b2a] ![box-shadow:var(--master-btn-outer-drop-shadow)] transition-all hover:bg-[#9a3b2a]/25 active:translate-y-[1px] active:![box-shadow:var(--master-inner-drop-shadow)]"
                    >
                      <AlertTriangle size={16} />
                      {profileCopy.deleteAccountButtonText || "Delete Account"}
                    </button>
                  </div>
                </SectionShell>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2B22]/45 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_24px_64px_rgba(45,43,34,0.35)]"
          >
            <div className="p-6 sm:p-8">
              {!showFinalDeleteConfirm ? (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#9a3b2a]/15 text-[#9a3b2a]">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-extrabold text-[#2D2B22]">
                    {profileCopy.deleteModalTitle || "Verify Your Identity"}
                  </h3>
                  <p className="text-center text-sm text-[#6E6A59] mb-6">
                    {profileCopy.deleteModalSubtitle || "For your security, please verify your identity before permanently deleting your account."}
                  </p>

                  <div className="space-y-5 text-left">
                    {/* 1. Registered Phone Number */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-[#2D2B22]">1. Registered Phone Number</label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={deletePhone}
                          onChange={(e) => {
                            setDeletePhone(e.target.value);
                            setDeletePhoneError("");
                          }}
                          placeholder="Enter your registered phone number"
                          disabled={deleteOtpSent || Boolean(deleteToken)}
                          className="flex-1 rounded-xl border-[#2D2B22]/15 bg-[#dfd2bc] text-[#2D2B22]"
                        />
                        <Button 
                          onClick={handleSendDeleteOtp}
                          disabled={(deleteOtpSent && deleteOtpCountdown > 0) || Boolean(deleteToken) || isLoading}
                          loading={isLoading && !isDeletingAccount && !deleteOtpSent}
                          className="rounded-xl bg-[#607938] text-white hover:bg-[#536930] px-4 shrink-0"
                        >
                          {deleteOtpCountdown > 0 ? `Resend (${deleteOtpCountdown}s)` : (deleteOtpSent ? "Resend OTP" : "Send OTP")}
                        </Button>
                      </div>
                      {deletePhoneError && <p className="text-sm text-[#9a3b2a]">{deletePhoneError}</p>}
                      {deleteOtpSent && !deletePhoneError && <p className="text-sm text-[#4e632d] font-medium">OTP sent successfully.</p>}
                    </div>

                    {/* 2. OTP Verification */}
                    {deleteOtpSent && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-[#2D2B22]/10">
                        <label className="text-sm font-bold text-[#2D2B22] flex justify-between items-center">
                          2. OTP Verification
                          {deleteToken && <BadgeCheck size={18} className="text-[#607938]" />}
                        </label>
                        <OtpInput
                          length={4}
                          value={deleteOtpDigits}
                          onChange={(newDigits) => {
                            setDeleteOtpDigits(newDigits);
                            const otpString = newDigits.join("");
                            if (otpString.length === 4) {
                              handleVerifyDeleteOtp(otpString);
                            }
                          }}
                          disabled={Boolean(deleteToken)}
                        />
                        {deleteOtpError && <p className="text-sm text-[#9a3b2a] text-center">{deleteOtpError}</p>}
                      </div>
                    )}

                    {/* 3. CAPTCHA Verification */}
                    <div className="space-y-3 mt-4 pt-4 border-t border-[#2D2B22]/10">
                      <label className="text-sm font-bold text-[#2D2B22]">3. CAPTCHA Verification</label>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 h-14 bg-[#dfd2bc] rounded-xl overflow-hidden border border-[#2D2B22]/15 flex items-center justify-center relative">
                          {isGeneratingCaptcha ? (
                            <Loader2 className="animate-spin text-[#607938]" size={20} />
                          ) : captchaData.image ? (
                            <div dangerouslySetInnerHTML={{ __html: captchaData.image }} className="w-full h-full flex justify-center items-center [&>svg]:w-full [&>svg]:h-full" />
                          ) : null}
                        </div>
                        <button 
                          onClick={loadCaptcha}
                          className="p-3 text-[#6E6A59] hover:text-[#2D2B22] hover:bg-[#dfd2bc] rounded-xl transition-colors shrink-0"
                          title="Refresh CAPTCHA"
                          disabled={isGeneratingCaptcha}
                        >
                          <RefreshCw size={20} className={isGeneratingCaptcha ? "animate-spin" : ""} />
                        </button>
                      </div>
                      <Input
                        value={captchaInput}
                        onChange={(e) => {
                          setCaptchaInput(e.target.value);
                          setCaptchaError("");
                        }}
                        placeholder="Enter CAPTCHA text"
                        error={captchaError}
                        className={`rounded-xl border-[#2D2B22]/15 bg-[#dfd2bc] text-[#2D2B22] transition-all ${captchaError ? 'border-2 border-[#9a3b2a]' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row mt-8">
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isDeletingAccount}
                      className="rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] text-[#2D2B22] hover:bg-[#d5c5ab]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      loading={isDeletingAccount}
                      onClick={handleVerifyAndNext}
                      disabled={!deleteToken || !captchaInput}
                      className="rounded-xl bg-[#607938] text-white hover:bg-[#536930] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#9a3b2a]/15 text-[#9a3b2a]">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-extrabold text-[#2D2B22]">
                    {profileCopy.deleteConfirmTitle || "Are you sure?"}
                  </h3>
                  <p className="text-center text-sm text-[#6E6A59] mb-6">
                    {profileCopy.deleteConfirmSubtitle || "This action cannot be undone. All your profile data, applications, and history will be permanently deleted."}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row mt-8">
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isDeletingAccount}
                      className="rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] text-[#2D2B22] hover:bg-[#d5c5ab]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      fullWidth
                      loading={isDeletingAccount}
                      onClick={handleDeleteAccount}
                      className="rounded-xl bg-[#9a3b2a] text-white hover:bg-[#7d2e20] disabled:opacity-50"
                    >
                      Delete Account
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
      <ProfileImageUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onUpload={handleCroppedImageUpload}
        onRemove={handleRemoveProfileImage}
        currentImage={avatarLoadError ? "" : resolvedProfileImageUrl}
      />

      <Footer />
    </div>
  );
};

export default ProfilePage;
