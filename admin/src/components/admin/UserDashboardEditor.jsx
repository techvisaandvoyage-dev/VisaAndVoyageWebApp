import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Save,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  User,
  PlusCircle,
  Mail,
  Smartphone,
  FileText,
  CheckCircle,
  TrendingUp,
  Clock,
  Download,
  Search,
  Filter,
  LogOut,
  FolderDown,
  Layers,
} from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import Input from "../common/Input";
import { api } from "../../store/authStore";

const DEFAULT_DASHBOARD_COPY = {
  // Header & Actions
  backToHomepageText: "Back to Homepage",
  overviewSubtitle: "Here's an overview of your visa applications.",
  myProfileButtonText: "My Profile",
  newApplicationButtonText: "New Application",
  signOutButtonText: "Sign Out",

  // Your Account Card
  yourAccountTitle: "YOUR ACCOUNT",
  emailLabel: "Email",
  phoneLabel: "Phone",
  emptyAccountPlaceholder: "—",

  // Summary Statistics Cards
  totalApplicationsLabel: "Total Applications",
  approvedLabel: "Approved",
  underReviewLabel: "Under Review",
  pendingActionLabel: "Pending Action",

  // Received Visa Files Section
  receivedVisaFilesTitle: "Received Visa Files",
  receivedVisaFilesEmptyText: "Approved visa files sent by admin will appear here.",
  openFileButtonText: "Open File",

  // My Applications Section & Filters
  myApplicationsTitle: "My Applications",
  searchCountryPlaceholder: "Search country...",
  allStatusFilterLabel: "All Status",
  docPendingFilterLabel: "Doc Pending",
  uploadDriveLinkFilterLabel: "Upload Drive Link",
  underReviewFilterLabel: "Under Review",
  approvedFilterLabel: "Approved",
  rejectedFilterLabel: "Rejected",
  noApplicationsFoundText: "No applications found.",
  startNewApplicationButtonText: "Start New Application",
};

export default function UserDashboardEditor({ showToast }) {
  const [formData, setFormData] = useState(DEFAULT_DASHBOARD_COPY);
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
      if (data?.success && data.settings?.userDashboardPageCopy) {
        setFormData({
          ...DEFAULT_DASHBOARD_COPY,
          ...data.settings.userDashboardPageCopy,
        });
      }
    } catch (err) {
      console.warn("Could not load user dashboard copy:", err);
      try {
        const { data: publicData } = await api.get("/config/dashboard-copy");
        if (publicData?.success && publicData?.copy) {
          setFormData({
            ...DEFAULT_DASHBOARD_COPY,
            ...publicData.copy,
          });
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to restore default dashboard texts?")) {
      setFormData(DEFAULT_DASHBOARD_COPY);
      notify("Default dashboard copy restored in editor (click Save to publish).", "info");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put("/admin/settings", {
        userDashboardPageCopy: formData,
      });
      if (res?.data?.success) {
        notify("User Dashboard texts saved successfully!", "success");
      } else {
        notify(res?.data?.message || "Failed to save dashboard copy", "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      notify(err.response?.data?.message || "Error saving dashboard copy", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-text-muted">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
        <p className="mt-3 text-sm">Loading Dashboard Page Copy...</p>
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
              <LayoutDashboard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary">
                  User Dashboard Page Text Editor
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan/20 bg-cyan/5 px-2.5 py-0.5 text-2xs font-semibold text-cyan">
                  <Sparkles size={11} /> Live Client Sync
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Control and customize all titles, action buttons, KPI stat labels, empty state guidance, and filter labels displayed on the client User Dashboard.
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
              Save Dashboard Copy
            </Button>
          </div>
        </div>

        {/* ── Visual Interactive Mini-Preview ── */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-surface-2/60 p-4">
          <div className="mb-2 flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-text-muted">
            <span>Visual Preview Sample</span>
            <span className="text-cyan">Live Simulation</span>
          </div>

          <div className="rounded-xl border border-border bg-white p-4 shadow-xs space-y-4">
            {/* Top link & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                  <ArrowLeft size={13} />
                  <span>{formData.backToHomepageText || "Back to Homepage"}</span>
                </div>
                <p className="text-xs text-slate-500">{formData.overviewSubtitle || "Here's an overview of your visa applications."}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-2xs font-semibold text-slate-700 shadow-2xs">
                  <User size={12} />
                  {formData.myProfileButtonText || "My Profile"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#235BFF] px-2.5 py-1 text-2xs font-semibold text-white shadow-2xs">
                  <PlusCircle size={12} />
                  {formData.newApplicationButtonText || "New Application"}
                </span>
              </div>
            </div>

            {/* YOUR ACCOUNT Card Preview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {formData.yourAccountTitle || "YOUR ACCOUNT"}
              </span>
              <div className="mt-2 grid grid-cols-2 gap-3 text-2xs">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-[#235BFF]" />
                  <div>
                    <span className="block text-[10px] text-slate-400">{formData.emailLabel || "Email"}</span>
                    <span className="font-medium text-slate-800">testuser@example.com</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone size={13} className="text-[#235BFF]" />
                  <div>
                    <span className="block text-[10px] text-slate-400">{formData.phoneLabel || "Phone"}</span>
                    <span className="font-medium text-slate-800">+91 98765 43210</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Stats Cards Preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#235BFF]">
                  <FileText size={15} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">1</div>
                  <div className="text-[10px] text-slate-500">{formData.totalApplicationsLabel || "Total Applications"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle size={15} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">0</div>
                  <div className="text-[10px] text-slate-500">{formData.approvedLabel || "Approved"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <TrendingUp size={15} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">0</div>
                  <div className="text-[10px] text-slate-500">{formData.underReviewLabel || "Under Review"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock size={15} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">1</div>
                  <div className="text-[10px] text-slate-500">{formData.pendingActionLabel || "Pending Action"}</div>
                </div>
              </div>
            </div>

            {/* Received Visa Files Preview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{formData.receivedVisaFilesTitle || "Received Visa Files"}</span>
              </div>
              <p className="mt-1 text-2xs text-slate-500">{formData.receivedVisaFilesEmptyText || "Approved visa files sent by admin will appear here."}</p>
            </div>

            {/* My Applications Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">{formData.myApplicationsTitle || "My Applications"}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-2xs text-slate-400">
                    <Search size={11} />
                    <span>{formData.searchCountryPlaceholder || "Search country..."}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-2xs text-slate-600">
                    <Filter size={11} />
                    <span>{formData.allStatusFilterLabel || "All Status"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
          {[
            { id: "header", label: "Header & Actions", icon: ArrowLeft },
            { id: "account", label: "Your Account Card", icon: Mail },
            { id: "stats", label: "KPI Statistics Cards", icon: TrendingUp },
            { id: "files", label: "Received Visa Files", icon: FolderDown },
            { id: "applications", label: "My Applications & Filters", icon: Layers },
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

      {/* ── Tab 1: Header & Actions ── */}
      {activeSubTab === "header" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <ArrowLeft size={16} className="text-cyan" />
              Header Navigation & Action Buttons
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Top return link, dashboard overview subtitle, profile & new application trigger buttons, and sign out label.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">"Back to Homepage" Link Text</label>
              <Input
                value={formData.backToHomepageText}
                onChange={(e) => handleChange("backToHomepageText", e.target.value)}
                placeholder="e.g. Back to Homepage"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Overview Subtitle Description</label>
              <Input
                value={formData.overviewSubtitle}
                onChange={(e) => handleChange("overviewSubtitle", e.target.value)}
                placeholder="e.g. Here's an overview of your visa applications."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">"My Profile" Button Text</label>
              <Input
                value={formData.myProfileButtonText}
                onChange={(e) => handleChange("myProfileButtonText", e.target.value)}
                placeholder="e.g. My Profile"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">"New Application" Button Text</label>
              <Input
                value={formData.newApplicationButtonText}
                onChange={(e) => handleChange("newApplicationButtonText", e.target.value)}
                placeholder="e.g. New Application"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">"Sign Out" Button Text</label>
              <Input
                value={formData.signOutButtonText}
                onChange={(e) => handleChange("signOutButtonText", e.target.value)}
                placeholder="e.g. Sign Out"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 2: Your Account Card ── */}
      {activeSubTab === "account" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Mail size={16} className="text-cyan" />
              "Your Account" Banner Card
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Labels for the account summary card displaying the logged-in user's email and phone number.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Card Heading</label>
              <Input
                value={formData.yourAccountTitle}
                onChange={(e) => handleChange("yourAccountTitle", e.target.value)}
                placeholder="e.g. YOUR ACCOUNT"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Empty Value Placeholder</label>
              <Input
                value={formData.emptyAccountPlaceholder}
                onChange={(e) => handleChange("emptyAccountPlaceholder", e.target.value)}
                placeholder="e.g. —"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Email Field Label</label>
              <Input
                value={formData.emailLabel}
                onChange={(e) => handleChange("emailLabel", e.target.value)}
                placeholder="e.g. Email"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Phone Field Label</label>
              <Input
                value={formData.phoneLabel}
                onChange={(e) => handleChange("phoneLabel", e.target.value)}
                placeholder="e.g. Phone"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 3: KPI Statistics Cards ── */}
      {activeSubTab === "stats" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan" />
              KPI Summary Statistics Cards
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Custom labels for the 4 dashboard statistic metric cards.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Card 1: Total Applications Label</label>
              <Input
                value={formData.totalApplicationsLabel}
                onChange={(e) => handleChange("totalApplicationsLabel", e.target.value)}
                placeholder="e.g. Total Applications"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Card 2: Approved Label</label>
              <Input
                value={formData.approvedLabel}
                onChange={(e) => handleChange("approvedLabel", e.target.value)}
                placeholder="e.g. Approved"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Card 3: Under Review Label</label>
              <Input
                value={formData.underReviewLabel}
                onChange={(e) => handleChange("underReviewLabel", e.target.value)}
                placeholder="e.g. Under Review"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Card 4: Pending Action Label</label>
              <Input
                value={formData.pendingActionLabel}
                onChange={(e) => handleChange("pendingActionLabel", e.target.value)}
                placeholder="e.g. Pending Action"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 4: Received Visa Files ── */}
      {activeSubTab === "files" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <FolderDown size={16} className="text-cyan" />
              Received Visa Files Section
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Section heading, empty state notification, and document action button for received visa files.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary">Section Heading</label>
              <Input
                value={formData.receivedVisaFilesTitle}
                onChange={(e) => handleChange("receivedVisaFilesTitle", e.target.value)}
                placeholder="e.g. Received Visa Files"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Empty State Guidance Text</label>
              <Input
                value={formData.receivedVisaFilesEmptyText}
                onChange={(e) => handleChange("receivedVisaFilesEmptyText", e.target.value)}
                placeholder="e.g. Approved visa files sent by admin will appear here."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">"Open File" Button Text</label>
              <Input
                value={formData.openFileButtonText}
                onChange={(e) => handleChange("openFileButtonText", e.target.value)}
                placeholder="e.g. Open File"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* ── Tab 5: My Applications & Filters ── */}
      {activeSubTab === "applications" && (
        <Card className="border border-border bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Layers size={16} className="text-cyan" />
              My Applications & Filter Controls
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Section title, search input placeholder, filter dropdown option labels, and empty state CTA.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Section Heading</label>
              <Input
                value={formData.myApplicationsTitle}
                onChange={(e) => handleChange("myApplicationsTitle", e.target.value)}
                placeholder="e.g. My Applications"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Search Country Input Placeholder</label>
              <Input
                value={formData.searchCountryPlaceholder}
                onChange={(e) => handleChange("searchCountryPlaceholder", e.target.value)}
                placeholder="e.g. Search country..."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Filter Option: "All Status"</label>
              <Input
                value={formData.allStatusFilterLabel}
                onChange={(e) => handleChange("allStatusFilterLabel", e.target.value)}
                placeholder="e.g. All Status"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Filter Option: "Doc Pending"</label>
              <Input
                value={formData.docPendingFilterLabel}
                onChange={(e) => handleChange("docPendingFilterLabel", e.target.value)}
                placeholder="e.g. Doc Pending"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Filter Option: "Upload Drive Link"</label>
              <Input
                value={formData.uploadDriveLinkFilterLabel}
                onChange={(e) => handleChange("uploadDriveLinkFilterLabel", e.target.value)}
                placeholder="e.g. Upload Drive Link"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Filter Option: "Under Review"</label>
              <Input
                value={formData.underReviewFilterLabel}
                onChange={(e) => handleChange("underReviewFilterLabel", e.target.value)}
                placeholder="e.g. Under Review"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Filter Option: "Approved"</label>
              <Input
                value={formData.approvedFilterLabel}
                onChange={(e) => handleChange("approvedFilterLabel", e.target.value)}
                placeholder="e.g. Approved"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Filter Option: "Rejected"</label>
              <Input
                value={formData.rejectedFilterLabel}
                onChange={(e) => handleChange("rejectedFilterLabel", e.target.value)}
                placeholder="e.g. Rejected"
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Empty State: "No applications found."</label>
              <Input
                value={formData.noApplicationsFoundText}
                onChange={(e) => handleChange("noApplicationsFoundText", e.target.value)}
                placeholder="e.g. No applications found."
                className="mt-1.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary">Empty State CTA Button Text</label>
              <Input
                value={formData.startNewApplicationButtonText}
                onChange={(e) => handleChange("startNewApplicationButtonText", e.target.value)}
                placeholder="e.g. Start New Application"
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
          Save Dashboard Copy
        </Button>
      </div>
    </div>
  );
}

