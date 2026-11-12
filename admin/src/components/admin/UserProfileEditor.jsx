import React, { useState, useEffect } from "react";
import {
  User,
  Save,
  RotateCcw,
  Sparkles,
  Shield,
  BadgeCheck,
  Phone,
  Mail,
  CheckCircle2,
  CalendarDays,
  KeyRound,
  ArrowLeft,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { api } from "../../store/authStore";

const DEFAULT_PROFILE_COPY = {
  // Header & Action Buttons
  backToDashboardText: "Back to Dashboard",
  profileActiveBadgeText: "Profile Active",
  editProfileButtonText: "Edit Profile",
  saveChangesButtonText: "Save Changes",
  cancelButtonText: "Cancel",
  noEmailText: "No email added",
  notAddedPhoneText: "Not added",

  // Personal Information Section
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
  genderOptionMale: "Male",
  genderOptionFemale: "Female",
  genderOptionOther: "Other",
  addPhoneButtonText: "Add mobile no.",
  changePhoneButtonText: "Change mobile no.",
  sendOtpButtonText: "Send OTP",
  phoneResendOtpText: "Resend OTP",
  phoneVerifySaveButtonText: "Verify & Save",

  // Account Overview Section
  accountOverviewTitle: "Account Overview",
  memberSinceLabel: "Member Since",
  accountEmailLabel: "Email Address",
  accountPhoneLabel: "Phone Number",
  accountStatusLabel: "Account Status",
  accountStatusValue: "Active",
  badgeAddedText: "Added",
  badgeAddEmailText: "Add email",
  badgeAddPhoneText: "Add phone",

  // Security Section
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

export default function UserProfileEditor({ showToast }) {
  const [formData, setFormData] = useState(DEFAULT_PROFILE_COPY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("header");

  const notify = (msg, type = "success") => {
    if (showToast) {
      showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/settings");
      if (data?.success && data.settings?.userProfilePageCopy) {
        setFormData({
          ...DEFAULT_PROFILE_COPY,
          ...data.settings.userProfilePageCopy,
        });
      }
    } catch (err) {
      console.warn("Could not load user profile copy:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const { data } = await api.put("/admin/settings", {
        userProfilePageCopy: formData,
      });
      if (data?.success) {
        notify("User profile page copy saved successfully!", "success");
        if (data.settings?.userProfilePageCopy) {
          setFormData({
            ...DEFAULT_PROFILE_COPY,
            ...data.settings.userProfilePageCopy,
          });
        }
      } else {
        notify(data?.message || "Failed to save settings.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all profile page text back to system defaults?")) {
      setFormData(DEFAULT_PROFILE_COPY);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-text-muted">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
        <p className="mt-3 text-sm">Loading Profile Page Copy...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Main Editor Header ── */}
      <Card className="overflow-hidden border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan/10 text-cyan">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary">
                  User Profile Page Text Editor
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan/20 bg-cyan/5 px-2.5 py-0.5 text-2xs font-semibold text-cyan">
                  <Sparkles size={11} /> Live Client Sync
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Control and customize all titles, action buttons, badges, helper notes, and overview labels displayed on the client Profile page.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={handleResetDefaults}
              className="text-text-muted hover:text-text-primary"
            >
              Reset Defaults
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Save size={15} />}
              loading={saving}
              onClick={handleSave}
              className="bg-cyan hover:bg-cyan-dim text-white"
            >
              Save Profile Copy
            </Button>
          </div>
        </div>

        {/* ── Visual Interactive Mini-Preview ── */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-surface-2/60 p-4">
          <div className="mb-2 flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-text-muted">
            <span>Visual Preview Sample</span>
            <span className="text-cyan">Live Simulation</span>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-[#235BFF] mb-3">
              <ArrowLeft size={13} />
              <span>{formData.backToDashboardText || "Back to Dashboard"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-sm">
                  User
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <span>Test User</span>
                    <BadgeCheck size={14} className="text-[#235BFF]" />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {formData.profileActiveBadgeText || "Profile Active"}
                    </span>
                    <span className="text-2xs text-text-muted">testuser@example.com</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#235BFF] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                <Edit3 size={12} />
                <span>{formData.editProfileButtonText || "Edit Profile"}</span>
              </button>
            </div>

            {/* Personal Information Mini Preview */}
            {activeSubTab === "personal" && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#235BFF]">
                    <User size={14} />
                  </div>
                  <span className="font-bold text-slate-800 text-xs">{formData.personalInfoTitle || "Personal Information"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                  <div>
                    <span className="font-medium text-slate-600">{formData.fullNameLabel || "Full Name"}</span>
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400">
                      {formData.fullNamePlaceholder || "Enter your full name"}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">{formData.emailAddressLabel || "Email Address"}</span>
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400">
                      {formData.emailPlaceholder || "Enter email address"}
                    </div>
                    <span className="mt-0.5 block text-[10px] text-slate-400">{formData.emailHelperText || "Email cannot be changed"}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-slate-600">{formData.mobileNumberLabel || "Mobile Number"}</span>
                    <div className="mt-1 flex gap-2">
                      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 text-xs font-medium">🇮🇳 +91</div>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400">
                        {formData.phonePlaceholder || "Enter phone number"}
                      </div>
                    </div>
                    <span className="mt-0.5 block text-[10px] text-slate-400">{formData.phoneHelperText || "Use OTP verification to add or change your mobile number."}</span>
                    <span className="mt-1 inline-block rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#235BFF]">
                      {formData.addPhoneButtonText || "Add mobile no."}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
          {[
            { id: "header", label: "Header & Action Buttons", icon: ArrowLeft },
            { id: "personal", label: "Personal Information", icon: User },
            { id: "account", label: "Account Overview", icon: BadgeCheck },
            { id: "security", label: "Security & Passwords", icon: Shield },
            { id: "deletion", label: "Account Deletion", icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-cyan text-white shadow-sm"
                    : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Tab 1: Header & Action Buttons ── */}
      {activeSubTab === "header" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <ArrowLeft size={16} className="text-cyan" />
              Header Banner & Action Buttons
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Texts appearing in the top navigation return link, profile active status badge, and edit triggers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Back to Dashboard Button</label>
              <Input
                value={formData.backToDashboardText}
                onChange={(e) => handleChange("backToDashboardText", e.target.value)}
                placeholder="e.g. Back to Dashboard"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Profile Active Badge</label>
              <Input
                value={formData.profileActiveBadgeText}
                onChange={(e) => handleChange("profileActiveBadgeText", e.target.value)}
                placeholder="e.g. Profile Active"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Edit Profile Button Text</label>
              <Input
                value={formData.editProfileButtonText}
                onChange={(e) => handleChange("editProfileButtonText", e.target.value)}
                placeholder="e.g. Edit Profile"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Save Changes Button Text</label>
              <Input
                value={formData.saveChangesButtonText}
                onChange={(e) => handleChange("saveChangesButtonText", e.target.value)}
                placeholder="e.g. Save Changes"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Cancel Button Text</label>
              <Input
                value={formData.cancelButtonText}
                onChange={(e) => handleChange("cancelButtonText", e.target.value)}
                placeholder="e.g. Cancel"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">No Email Fallback Text</label>
              <Input
                value={formData.noEmailText}
                onChange={(e) => handleChange("noEmailText", e.target.value)}
                placeholder="e.g. No email added"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">Phone Not Added Fallback Text</label>
              <Input
                value={formData.notAddedPhoneText}
                onChange={(e) => handleChange("notAddedPhoneText", e.target.value)}
                placeholder="e.g. Not added"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 2: Personal Information ── */}
      {activeSubTab === "personal" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <User size={16} className="text-cyan" />
              Personal Information Section
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Field labels, input placeholders, helper notes, and mobile verification button labels in the main information card.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Section Title</label>
              <Input
                value={formData.personalInfoTitle}
                onChange={(e) => handleChange("personalInfoTitle", e.target.value)}
                placeholder="e.g. Personal Information"
                className="mt-1.5"
              />
            </div>

            {/* Sub-Card: Full Name & Email */}
            <div className="rounded-2xl border border-border bg-surface-2/60 p-4 space-y-4">
              <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan/15 text-cyan text-2xs font-bold">1</span>
                Full Name & Email Address Fields
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Full Name Field Label</label>
                  <Input
                    value={formData.fullNameLabel}
                    onChange={(e) => handleChange("fullNameLabel", e.target.value)}
                    placeholder="e.g. Full Name"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Full Name Input Placeholder</label>
                  <Input
                    value={formData.fullNamePlaceholder}
                    onChange={(e) => handleChange("fullNamePlaceholder", e.target.value)}
                    placeholder="e.g. Enter your full name"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Email Address Field Label</label>
                  <Input
                    value={formData.emailAddressLabel}
                    onChange={(e) => handleChange("emailAddressLabel", e.target.value)}
                    placeholder="e.g. Email Address"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Email Input Placeholder</label>
                  <Input
                    value={formData.emailPlaceholder}
                    onChange={(e) => handleChange("emailPlaceholder", e.target.value)}
                    placeholder="e.g. Enter email address"
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-text-secondary">Email Helper / Restriction Note</label>
                  <Input
                    value={formData.emailHelperText}
                    onChange={(e) => handleChange("emailHelperText", e.target.value)}
                    placeholder="e.g. Email cannot be changed"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Sub-Card: Mobile Number & Verification */}
            <div className="rounded-2xl border border-border bg-surface-2/60 p-4 space-y-4">
              <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan/15 text-cyan text-2xs font-bold">2</span>
                Mobile Number & OTP Verification Controls
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Mobile Number Field Label</label>
                  <Input
                    value={formData.mobileNumberLabel}
                    onChange={(e) => handleChange("mobileNumberLabel", e.target.value)}
                    placeholder="e.g. Mobile Number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Phone Input Placeholder</label>
                  <Input
                    value={formData.phonePlaceholder}
                    onChange={(e) => handleChange("phonePlaceholder", e.target.value)}
                    placeholder="e.g. Enter phone number"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Phone Helper / Verification Note</label>
                  <Input
                    value={formData.phoneHelperText}
                    onChange={(e) => handleChange("phoneHelperText", e.target.value)}
                    placeholder="e.g. Use OTP verification to add or change your mobile number."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Country Code Search Placeholder</label>
                  <Input
                    value={formData.phoneCountrySearchPlaceholder}
                    onChange={(e) => handleChange("phoneCountrySearchPlaceholder", e.target.value)}
                    placeholder="e.g. Search country"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">"Add mobile no." Button Text</label>
                  <Input
                    value={formData.addPhoneButtonText}
                    onChange={(e) => handleChange("addPhoneButtonText", e.target.value)}
                    placeholder="e.g. Add mobile no."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">"Change mobile no." Button Text</label>
                  <Input
                    value={formData.changePhoneButtonText}
                    onChange={(e) => handleChange("changePhoneButtonText", e.target.value)}
                    placeholder="e.g. Change mobile no."
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">"Send OTP" Button Text</label>
                  <Input
                    value={formData.sendOtpButtonText}
                    onChange={(e) => handleChange("sendOtpButtonText", e.target.value)}
                    placeholder="e.g. Send OTP"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">"Resend OTP" Text</label>
                  <Input
                    value={formData.phoneResendOtpText}
                    onChange={(e) => handleChange("phoneResendOtpText", e.target.value)}
                    placeholder="e.g. Resend OTP"
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-text-secondary">"Verify & Save" Button Text</label>
                  <Input
                    value={formData.phoneVerifySaveButtonText}
                    onChange={(e) => handleChange("phoneVerifySaveButtonText", e.target.value)}
                    placeholder="e.g. Verify & Save"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Sub-Card: Age & Gender */}
            <div className="rounded-2xl border border-border bg-surface-2/60 p-4 space-y-4">
              <h4 className="text-xs font-bold text-text-primary flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan/15 text-cyan text-2xs font-bold">3</span>
                Age & Gender Fields
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Age Field Label</label>
                  <Input
                    value={formData.ageLabel}
                    onChange={(e) => handleChange("ageLabel", e.target.value)}
                    placeholder="e.g. Age"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Age Input Placeholder</label>
                  <Input
                    value={formData.agePlaceholder}
                    onChange={(e) => handleChange("agePlaceholder", e.target.value)}
                    placeholder="e.g. Enter your age"
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-text-secondary">Gender Field Label</label>
                  <Input
                    value={formData.genderLabel}
                    onChange={(e) => handleChange("genderLabel", e.target.value)}
                    placeholder="e.g. Gender"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Option 1: Male Label</label>
                  <Input
                    value={formData.genderOptionMale}
                    onChange={(e) => handleChange("genderOptionMale", e.target.value)}
                    placeholder="e.g. Male"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Option 2: Female Label</label>
                  <Input
                    value={formData.genderOptionFemale}
                    onChange={(e) => handleChange("genderOptionFemale", e.target.value)}
                    placeholder="e.g. Female"
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-text-secondary">Option 3: Other Label</label>
                  <Input
                    value={formData.genderOptionOther}
                    onChange={(e) => handleChange("genderOptionOther", e.target.value)}
                    placeholder="e.g. Other"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 3: Account Overview ── */}
      {activeSubTab === "account" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <BadgeCheck size={16} className="text-cyan" />
              Account Overview Sidebar Card
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Labels for registration date, verified badges, and status pills in the Account Overview card.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Section Title</label>
              <Input
                value={formData.accountOverviewTitle}
                onChange={(e) => handleChange("accountOverviewTitle", e.target.value)}
                placeholder="e.g. Account Overview"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Member Since Label</label>
              <Input
                value={formData.memberSinceLabel}
                onChange={(e) => handleChange("memberSinceLabel", e.target.value)}
                placeholder="e.g. Member Since"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Email Address Row Label</label>
              <Input
                value={formData.accountEmailLabel}
                onChange={(e) => handleChange("accountEmailLabel", e.target.value)}
                placeholder="e.g. Email Address"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Phone Number Row Label</label>
              <Input
                value={formData.accountPhoneLabel}
                onChange={(e) => handleChange("accountPhoneLabel", e.target.value)}
                placeholder="e.g. Phone Number"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Account Status Row Label</label>
              <Input
                value={formData.accountStatusLabel}
                onChange={(e) => handleChange("accountStatusLabel", e.target.value)}
                placeholder="e.g. Account Status"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Account Status Display Value</label>
              <Input
                value={formData.accountStatusValue}
                onChange={(e) => handleChange("accountStatusValue", e.target.value)}
                placeholder="e.g. Active"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Verified "Added" Badge Text</label>
              <Input
                value={formData.badgeAddedText}
                onChange={(e) => handleChange("badgeAddedText", e.target.value)}
                placeholder="e.g. Added"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Action "Add email" Badge Text</label>
              <Input
                value={formData.badgeAddEmailText}
                onChange={(e) => handleChange("badgeAddEmailText", e.target.value)}
                placeholder="e.g. Add email"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">Action "Add phone" Badge Text</label>
              <Input
                value={formData.badgeAddPhoneText}
                onChange={(e) => handleChange("badgeAddPhoneText", e.target.value)}
                placeholder="e.g. Add phone"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 4: Security Section ── */}
      {activeSubTab === "security" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Shield size={16} className="text-cyan" />
              Security & Password Controls
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Heading, guidance description, and button labels for changing or creating passwords.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">Security Section Title</label>
              <Input
                value={formData.securityTitle}
                onChange={(e) => handleChange("securityTitle", e.target.value)}
                placeholder="e.g. Security"
                className="mt-1.5"
              />
            </div>

            {/* Mode 1: Create Password (when account has no password yet) */}
            <div className="md:col-span-2 rounded-2xl border border-cyan/20 bg-cyan/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan/20 text-cyan text-xs font-bold">1</span>
                <span className="text-xs font-bold text-text-primary">State A: When user has no password yet (Create Password)</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Create Password Button Text</label>
                  <Input
                    value={formData.createPasswordButtonText}
                    onChange={(e) => handleChange("createPasswordButtonText", e.target.value)}
                    placeholder="e.g. Create Password"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Create Password Helper Description</label>
                  <Input
                    value={formData.createPasswordDescription}
                    onChange={(e) => handleChange("createPasswordDescription", e.target.value)}
                    placeholder="e.g. Create a password so this account can also sign in with email and password."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Mode 2: Change Password (when account already has a password) */}
            <div className="md:col-span-2 rounded-2xl border border-border bg-surface-2/60 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-text-secondary text-xs font-bold">2</span>
                <span className="text-xs font-bold text-text-primary">State B: When user already has a password (Change Password)</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Change Password Button Text</label>
                  <Input
                    value={formData.changePasswordButtonText}
                    onChange={(e) => handleChange("changePasswordButtonText", e.target.value)}
                    placeholder="e.g. Change Password"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary">Change Password Helper Description</label>
                  <Input
                    value={formData.securityDescription}
                    onChange={(e) => handleChange("securityDescription", e.target.value)}
                    placeholder="e.g. Keep your account secure with a strong password."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 5: Account Deletion ── */}
      {activeSubTab === "deletion" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              Account Deletion & Data Removal Section
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Customize the section title, warning description, button text, and identity verification modal copy shown when users delete their account.
            </p>
          </div>

          {/* Visual Mini Preview of Deletion Card */}
          <div className="rounded-2xl border border-red-200/80 bg-red-50/40 p-4 max-w-md">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle size={16} />
              </div>
              <span className="font-bold text-sm text-slate-900">{formData.deletionTitle || "Account Deletion"}</span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {formData.deletionDescription || "Permanently delete your account and all associated profile data."}
            </p>
            <button
              type="button"
              className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-2xs"
            >
              {formData.deleteAccountButtonText || "Delete Account"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Card Title</label>
              <Input
                value={formData.deletionTitle}
                onChange={(e) => handleChange("deletionTitle", e.target.value)}
                placeholder="e.g. Account Deletion"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Delete Account Button Text</label>
              <Input
                value={formData.deleteAccountButtonText}
                onChange={(e) => handleChange("deleteAccountButtonText", e.target.value)}
                placeholder="e.g. Delete Account"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">Card Description / Warning</label>
              <Input
                value={formData.deletionDescription}
                onChange={(e) => handleChange("deletionDescription", e.target.value)}
                placeholder="e.g. Permanently delete your account and all associated profile data."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Modal Step 1 Title</label>
              <Input
                value={formData.deleteModalTitle}
                onChange={(e) => handleChange("deleteModalTitle", e.target.value)}
                placeholder="e.g. Verify Your Identity"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Modal Step 1 Subtitle</label>
              <Input
                value={formData.deleteModalSubtitle}
                onChange={(e) => handleChange("deleteModalSubtitle", e.target.value)}
                placeholder="e.g. For your security, please verify your identity before permanently deleting your account."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Final Confirmation Title</label>
              <Input
                value={formData.deleteConfirmTitle}
                onChange={(e) => handleChange("deleteConfirmTitle", e.target.value)}
                placeholder="e.g. Are you sure?"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Final Confirmation Warning Subtitle</label>
              <Input
                value={formData.deleteConfirmSubtitle}
                onChange={(e) => handleChange("deleteConfirmSubtitle", e.target.value)}
                placeholder="e.g. This action cannot be undone. All your profile data, applications, and history will be permanently deleted."
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Bottom Floating Save Bar ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetDefaults}
          className="text-text-muted hover:text-text-primary"
        >
          Reset Defaults
        </Button>
        <Button
          type="button"
          variant="primary"
          leftIcon={<Save size={16} />}
          loading={saving}
          onClick={handleSave}
          className="bg-cyan hover:bg-cyan-dim text-white px-6 py-2.5 rounded-xl font-semibold shadow-md"
        >
          Save Profile Copy
        </Button>
      </div>
    </div>
  );
}
