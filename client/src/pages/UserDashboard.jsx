import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PlusCircle, Clock, CheckCircle, FileText, ChevronRight, ChevronDown, Check, Calendar, Search, Filter,
  TrendingUp, Globe, ArrowLeft, User, Mail, Smartphone, Download, Users, Star, Pencil, Trash2, ShieldCheck,
  Upload, ExternalLink, LogOut, AlertTriangle, ArrowUpDown, Eye, Plane,
} from "lucide-react";
import CompactDateRangePicker from "../components/application/CompactDateRangePicker";
import "../components/application/compactApplication.css";
import "./userDashboardBoardingPass.css";
import { StatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { motion } from "framer-motion";
import { api, useAuthStore, SERVER_URL } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { useUIStore } from "../store/uiStore";
import { getApplicationProgress, getDerivedApplicationProgress, resolveApplicationStatus } from "../utils/applicationProgress";
import ContactVerificationModal from "../components/account/ContactVerificationModal";
import { needsPhoneContactGate, needsEmailContactGate } from "../utils/contactVerificationGate";
import { formatOrdinalDate } from "../utils/dateUtils";
import FilePreviewModal from "../components/ui/FilePreviewModal";
import { getFileUrl } from "../utils/fileUrl";
import CountryFlagBadge from "../components/ui/CountryFlagBadge";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import AtlasLoader from "../components/ui/AtlasLoader";
import DashboardPaySummaryModal from "../components/dashboard/DashboardPaySummaryModal";

/**
 * Map every built-in doc key → its lucide icon component. Used to render the
 * tiny "missing documents" icon chips on each booking card. Unknown keys
 * (custom admin-added docs) fall back to a generic FileText icon.
 */
const fmtDate = (iso) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : formatOrdinalDate(d);
};

const travelerFormDefaults = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  passportNumber: "",
  passportExpiryDate: "",
  nationality: "",
  mobileNumber: "",
  email: "",
  relationship: "Self",
  isDefault: false,
};

const getApplicationDocSuccessStorageKey = (applicationId) =>
  applicationId ? `application-doc-successes:${applicationId}` : "";

const getStoredUploadSuccesses = (booking) => {
  const applicationId = String(booking?._id || booking?.id || "");
  if (!applicationId) return {};

  try {
    const raw = localStorage.getItem(getApplicationDocSuccessStorageKey(applicationId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const DEFAULT_DASHBOARD_PAGE_COPY = {
  backToHomepageText: "Back to Homepage",
  overviewSubtitle: "Here's an overview of your visa applications.",
  myProfileButtonText: "My Profile",
  newApplicationButtonText: "New Application",
  signOutButtonText: "Sign Out",

  yourAccountTitle: "YOUR ACCOUNT",
  emailLabel: "Email",
  phoneLabel: "Phone",
  emptyAccountPlaceholder: "—",

  totalApplicationsLabel: "Total Applications",
  approvedLabel: "Approved",
  underReviewLabel: "Under Review",
  pendingActionLabel: "Pending Action",

  receivedVisaFilesTitle: "Received Visa Files",
  receivedVisaFilesEmptyText: "Approved visa files sent by admin will appear here.",
  openFileButtonText: "Open File",

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

const UserDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, sessionAuthMethod, logout } = useAuthStore();
  const { bookings, fetchUserApplications } = useDataStore();
  const { showToast } = useUIStore();

  const [dashCopy, setDashCopy] = useState(DEFAULT_DASHBOARD_PAGE_COPY);

  useEffect(() => {
    let alive = true;
    const fetchDashCopy = async () => {
      try {
        const { data } = await api.get("/config/dashboard-copy");
        if (alive && data?.success && data?.copy) {
          setDashCopy((prev) => ({ ...prev, ...data.copy }));
        }
      } catch {
        try {
          const { data } = await api.get("/config/destination-content");
          if (alive && data?.config?.userDashboardPageCopy) {
            setDashCopy((prev) => ({ ...prev, ...data.config.userDashboardPageCopy }));
          }
        } catch {}
      }
    };
    fetchDashCopy();
    return () => {
      alive = false;
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("travel");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  const [travelRange, setTravelRange] = useState({ from: "", to: "" });
  const [dateModal, setDateModal] = useState({
    open: false,
    booking: null,
    from: "",
    to: "",
    notice: "",
    openPayAfterSave: false,
  });
  const [dateUpdating, setDateUpdating] = useState(false);
  const [payModalBooking, setPayModalBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashContactOpen, setDashContactOpen] = useState(false);
  const [dashContactMode, setDashContactMode] = useState("phone");
  const [uploadSettings, setUploadSettings] = useState({
    enableGDriveUpload: true,
    enableFileUpload: true,
    showTravelerDetails: true,
  });
  const [requiredDocsByCountry, setRequiredDocsByCountry] = useState({});
  const [travelers, setTravelers] = useState([]);
  const [travelersLoading, setTravelersLoading] = useState(true);
  const [travelerModalOpen, setTravelerModalOpen] = useState(false);
  const [editingTravelerId, setEditingTravelerId] = useState("");
  const [travelerForm, setTravelerForm] = useState({ ...travelerFormDefaults });
  const [travelerSubmitting, setTravelerSubmitting] = useState(false);
  const [travelerDeletingId, setTravelerDeletingId] = useState("");
  const [documentPreview, setDocumentPreview] = useState(null);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setTravelersLoading(true);
      try {
        const { data: configData } = await api.get("/config/upload-settings");
        if (configData?.success && configData.config) {
          setUploadSettings(configData.config);
        }
        const shouldShowTravelerDetails = configData?.config?.showTravelerDetails !== false;
        if (shouldShowTravelerDetails) {
          const travelersRes = await api.get("/travelers");
          setTravelers(Array.isArray(travelersRes?.data?.travelers) ? travelersRes.data.travelers : []);
        } else {
          setTravelers([]);
        }
        await fetchUserApplications();
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
        setTravelersLoading(false);
      }
    };

    if (user) loadData();
    else setLoading(false);
  }, [user, fetchUserApplications]);

  useEffect(() => {
    if (loading || !user) return;
    if (sessionStorage.getItem("vb_skip_contact_prompt") === "1") return;
    if (!localStorage.getItem("token")) return;
    const method = sessionAuthMethod ?? useAuthStore.getState().sessionAuthMethod;
    if (needsPhoneContactGate(method, user)) {
      setDashContactMode("phone");
      setDashContactOpen(true);
      return;
    }
    if (needsEmailContactGate(method, user)) {
      setDashContactMode("email");
      setDashContactOpen(true);
    }
  }, [user, loading, sessionAuthMethod]);

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    if (!paymentState && searchParams.get("paid") !== "1") return;

    (async () => {
      try {
        await fetchUserApplications();
      } catch (e) {
        console.error(e);
      }
    })();

    if (paymentState === "success" || searchParams.get("paid") === "1") {
      showToast("Payment received. Your application is now in the dashboard.", "success");
    } else if (paymentState === "cancelled") {
      showToast("Payment was cancelled. Your application draft is saved and waiting for payment.", "info");
    } else if (paymentState === "failed") {
      showToast("Payment failed. Your application draft is saved and you can retry from the dashboard.", "error");
    }

    navigate("/dashboard", { replace: true });
  }, [searchParams, navigate, showToast, fetchUserApplications]);

  useEffect(() => {
    const countryIdsToLoad = Array.from(
      new Set(
        (Array.isArray(bookings) ? bookings : [])
          .filter((booking) => booking && typeof booking === "object")
          .map((booking) => String(booking.countryId || "").trim())
          .filter(Boolean)
      )
    ).filter((countryId) => !requiredDocsByCountry[countryId]);

    if (!countryIdsToLoad.length) return;

    let cancelled = false;

    const loadCountryRequirements = async () => {
      const entries = await Promise.all(
        countryIdsToLoad.map(async (countryId) => {
          try {
            const { data } = await api.get(`/countries/${countryId}`);
            const docs = Array.isArray(data?.country?.requiredDocuments)
              ? data.country.requiredDocuments.filter(Boolean)
              : [];
            return [countryId, docs];
          } catch (error) {
            console.error(`Failed to load required documents for ${countryId}:`, error);
            return [countryId, []];
          }
        })
      );

      if (cancelled) return;

      setRequiredDocsByCountry((prev) => {
        const next = { ...prev };
        entries.forEach(([countryId, docs]) => {
          next[countryId] = docs;
        });
        return next;
      });
    };

    loadCountryRequirements();

    return () => {
      cancelled = true;
    };
  }, [bookings, requiredDocsByCountry]);

  useEffect(() => {
    if (!user) return;

    const refreshApplications = async () => {
      try {
        await fetchUserApplications();
      } catch {
        /* background refresh only */
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshApplications();
      }
    };

    window.addEventListener("focus", refreshApplications);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshApplications);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchUserApplications, user]);

  const safeBookings = Array.isArray(bookings)
    ? bookings.filter((booking) => booking && typeof booking === "object")
    : [];

  const getBookingRequiredDocuments = (booking) => {
    const countryId = String(booking?.countryId || "").trim();
    if (countryId && Array.isArray(requiredDocsByCountry[countryId]) && requiredDocsByCountry[countryId].length) {
      return requiredDocsByCountry[countryId];
    }
    if (Array.isArray(booking?.requiredDocuments) && booking.requiredDocuments.length) {
      return booking.requiredDocuments;
    }
    return undefined;
  };

  const getBookingCategory = (booking, resolvedStatus) => {
    if (booking.status === "approved" || resolvedStatus === "approved") return "approved";
    if (booking.status === "rejected" || resolvedStatus === "rejected") return "rejected";
    if (resolvedStatus === "review") return "review";
    return "pending";
  };

  const getTravelDaysDelta = (iso) => {
    if (!iso) return Number.POSITIVE_INFINITY;
    const target = new Date(iso);
    if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  };

  const getTravelCountdownText = (iso) => {
    const delta = getTravelDaysDelta(iso);
    if (!Number.isFinite(delta)) return "";
    if (delta < 0) return "Travel date passed";
    if (delta === 0) return "Today";
    if (delta === 1) return "In 1 day";
    return `In ${delta} days`;
  };

  const enrichedBookings = safeBookings.map((booking) => {
    const uploadedDocSuccesses = getStoredUploadSuccesses(booking);
    const derivedProgress = getDerivedApplicationProgress(
      booking,
      getBookingRequiredDocuments(booking),
      uploadSettings,
      uploadedDocSuccesses
    );
    const resolvedStatus = resolveApplicationStatus(booking, derivedProgress);
    const category = getBookingCategory(booking, resolvedStatus);
    return { booking, derivedProgress, resolvedStatus, category };
  });

  const toYmdString = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const filteredBookings = enrichedBookings
    .filter(({ booking, category }) => {
      const q = searchQuery.toLowerCase();
      const countryName = String(booking.countryName || "").toLowerCase();
      const professionalId = String(booking.applicationId || "").toLowerCase();
      const matchSearch = countryName.includes(q) || professionalId.includes(q);
      const matchStatus = statusFilter === "all" || category === statusFilter;

      let matchTravelRange = true;
      if (travelRange.from || travelRange.to) {
        const travelYmd = toYmdString(booking.travelDate);
        if (!travelYmd) {
          matchTravelRange = false;
        } else {
          if (travelRange.from && travelYmd < travelRange.from) matchTravelRange = false;
          if (travelRange.to && travelYmd > travelRange.to) matchTravelRange = false;
        }
      }

      return matchSearch && matchStatus && matchTravelRange;
    })
    .sort((a, b) => {
      if (sortBy === "travel") {
        return getTravelDaysDelta(a.booking.travelDate) - getTravelDaysDelta(b.booking.travelDate);
      }
      return new Date(b.booking.createdAt || 0) - new Date(a.booking.createdAt || 0);
    });

  const stats = {
    total: enrichedBookings.length,
    approved: enrichedBookings.filter((item) => item.category === "approved").length,
    pending: enrichedBookings.filter((item) => item.category === "pending").length,
    review: enrichedBookings.filter((item) => item.category === "review").length,
    rejected: enrichedBookings.filter((item) => item.category === "rejected").length,
  };

  const urgentBookingItem = enrichedBookings
    .filter((item) => item.category === "pending")
    .sort((a, b) => getTravelDaysDelta(a.booking.travelDate) - getTravelDaysDelta(b.booking.travelDate))[0];

  const openTravelerModal = (traveler = null) => {
    setEditingTravelerId(traveler?._id || "");
    setTravelerForm(
      traveler
        ? {
            fullName: traveler.fullName || "",
            dateOfBirth: traveler.dateOfBirth ? String(traveler.dateOfBirth).slice(0, 10) : "",
            gender: traveler.gender || "",
            passportNumber: traveler.passportNumber || "",
            passportExpiryDate: traveler.passportExpiryDate ? String(traveler.passportExpiryDate).slice(0, 10) : "",
            nationality: traveler.nationality || "",
            mobileNumber: traveler.mobileNumber || "",
            email: traveler.email || "",
            relationship: traveler.relationship || "Self",
            isDefault: traveler.isDefault === true,
          }
        : { ...travelerFormDefaults }
    );
    setTravelerModalOpen(true);
  };

  const closeTravelerModal = () => {
    setTravelerModalOpen(false);
    setEditingTravelerId("");
    setTravelerForm({ ...travelerFormDefaults });
    setTravelerSubmitting(false);
  };

  const refreshTravelers = async () => {
    if (uploadSettings.showTravelerDetails === false) {
      setTravelers([]);
      return;
    }
    const { data } = await api.get("/travelers");
    setTravelers(Array.isArray(data?.travelers) ? data.travelers : []);
  };

  const handleTravelerSubmit = async () => {
    const requiredFields = [
      ["fullName", "Traveler full name is required"],
      ["dateOfBirth", "Traveler date of birth is required"],
      ["gender", "Traveler gender is required"],
      ["passportNumber", "Traveler passport number is required"],
      ["passportExpiryDate", "Traveler passport expiry date is required"],
      ["nationality", "Traveler nationality is required"],
      ["mobileNumber", "Traveler mobile number is required"],
      ["email", "Traveler email is required"],
      ["relationship", "Traveler relationship is required"],
    ];

    for (const [key, message] of requiredFields) {
      if (!String(travelerForm[key] || "").trim()) {
        showToast(message, "error");
        return;
      }
    }

    setTravelerSubmitting(true);
    try {
      const payload = {
        ...travelerForm,
        passportNumber: String(travelerForm.passportNumber || "").toUpperCase(),
      };
      if (editingTravelerId) {
        await api.put(`/travelers/${editingTravelerId}`, payload);
        showToast("Traveler updated successfully.", "success");
      } else {
        await api.post("/travelers", payload);
        showToast("Traveler saved successfully.", "success");
      }
      await refreshTravelers();
      closeTravelerModal();
    } catch (error) {
      showToast(error.response?.data?.message || "Could not save traveler.", "error");
      setTravelerSubmitting(false);
    }
  };

  const handleDeleteTraveler = async (travelerId) => {
    setTravelerDeletingId(travelerId);
    try {
      await api.delete(`/travelers/${travelerId}`);
      await refreshTravelers();
      showToast("Traveler removed successfully.", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Could not delete traveler.", "error");
    } finally {
      setTravelerDeletingId("");
    }
  };

  const handleSetDefaultTraveler = async (travelerId) => {
    try {
      await api.patch(`/travelers/${travelerId}/default`);
      await refreshTravelers();
      showToast("Default traveler updated.", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Could not update default traveler.", "error");
    }
  };

  const openChangeDateModal = (booking, options = {}) => {
    const todayYmd = toYmdString(new Date());
    const existingFrom = toYmdString(booking.travelDate);
    const existingTo = toYmdString(booking.returnDate);
    setDateModal({
      open: true,
      booking,
      from: existingFrom && existingFrom >= todayYmd ? existingFrom : "",
      to: existingTo && existingTo >= todayYmd ? existingTo : "",
      notice:
        options.notice ||
        `Your selected travel date (${fmtDate(booking.travelDate)}) has already passed. Please select a future travel date to continue with payment.`,
      openPayAfterSave: Boolean(options.openPayAfterSave),
    });
  };

  const handlePayClick = (booking) => {
    if (!booking) return;
    if (getTravelDaysDelta(booking.travelDate) < 0) {
      openChangeDateModal(booking, {
        openPayAfterSave: true,
        notice: `Your selected travel date (${fmtDate(booking.travelDate)}) has already passed. Please select a future travel date to continue with payment.`,
      });
      return;
    }
    setPayModalBooking(booking);
  };

  const closeChangeDateModal = () => {
    if (dateUpdating) return;
    setDateModal({ open: false, booking: null, from: "", to: "", notice: "", openPayAfterSave: false });
  };

  const handleSaveTravelDate = async () => {
    const booking = dateModal.booking;
    const bookingId = booking?._id || booking?.id;
    if (!bookingId) return;
    if (!dateModal.from) {
      showToast("Please select a new departure date.", "error");
      return;
    }

    const shouldOpenPay = dateModal.openPayAfterSave;
    setDateUpdating(true);
    try {
      const { data } = await api.put(`/users/applications/${bookingId}`, {
        travelDate: dateModal.from,
        returnDate: dateModal.to || null,
      });
      await fetchUserApplications();
      showToast("Travel date updated! You can proceed with payment now.", "success");
      setDateModal({ open: false, booking: null, from: "", to: "", notice: "", openPayAfterSave: false });
      if (shouldOpenPay) {
        const updatedBooking = data?.application || {
          ...booking,
          travelDate: dateModal.from,
          returnDate: dateModal.to || null,
        };
        setPayModalBooking(updatedBooking);
      }
    } catch (error) {
      showToast(error.response?.data?.message || "Could not update travel date.", "error");
    } finally {
      setDateUpdating(false);
    }
  };

  if (loading) {
    return <AtlasLoader />;
  }



  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      <Navbar />
      <div className="fixed bottom-6 left-6 z-50 hidden md:block">
        <button
          onClick={() => {
            logout();
            navigate("/", { replace: true });
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--bg)] text-red-400 hover:bg-red-500/10 active:translate-y-[1px] transition-all"
          style={{ boxShadow: "var(--master-btn-outer-drop-shadow)" }}
          title={dashCopy.signOutButtonText || "Sign Out"}
        >
          <LogOut size={18} />
          {dashCopy.signOutButtonText || "Sign Out"}
        </button>
      </div>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="ud-bp-wrap"
          >
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="ud-back"
              id="back-to-home-btn"
            >
              <ArrowLeft size={16} />
              {dashCopy.backToHomepageText || "Back to homepage"}
            </button>

            <section className="ud-hero">
              <div>
                <h1>Your visa applications</h1>
                <p className="ud-hero-sub">
                  {dashCopy.overviewSubtitle || "Track every application and finish what's pending."}
                </p>
              </div>
              <div className="ud-hero-actions">
                <button
                  type="button"
                  className="ud-btn sec"
                  onClick={() => navigate("/dashboard/profile")}
                >
                  <User size={16} />
                  {dashCopy.myProfileButtonText || "My profile"}
                </button>
                <button
                  type="button"
                  className="ud-btn pri"
                  onClick={() => navigate("/", { replace: true })}
                  id="new-application-btn"
                >
                  <PlusCircle size={16} />
                  {dashCopy.newApplicationButtonText || "New application"}
                </button>
              </div>
            </section>
          </motion.div>

          {false && uploadSettings.showTravelerDetails !== false && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mb-8 rounded-3xl border border-border bg-surface p-5 sm:p-6"
            >
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">My Travelers</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Save traveler details once and reuse them in future visa applications.
                  </p>
                </div>
                <Button variant="primary" leftIcon={<PlusCircle size={16} />} onClick={() => openTravelerModal()}>
                  Add Traveler
                </Button>
              </div>

              {travelersLoading ? (
                <Card className="flex items-center justify-center gap-3 py-8 text-text-secondary">
                  <div className="h-5 w-5 rounded-full border-2 border-cyan/20 border-t-cyan animate-spin" />
                  Loading saved travelers...
                </Card>
              ) : travelers.length === 0 ? (
                <Card className="border-dashed text-center py-10">
                  <Users size={38} className="mx-auto mb-3 text-cyan" />
                  <p className="text-base font-semibold text-text-primary">No traveler profiles saved yet</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Add yourself, family members, or friends here so future applications start faster.
                  </p>
                  <Button variant="secondary" className="mt-4" onClick={() => openTravelerModal()}>
                    Create First Traveler
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {travelers.map((traveler) => (
                    <Card key={traveler._id} className="relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan via-blue-500 to-emerald-400" />
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-text-primary">{traveler.fullName}</h3>
                            {traveler.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                                <Star size={12} /> Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-text-secondary">{traveler.relationship}</p>
                        </div>
                        <span className="rounded-2xl bg-cyan/10 p-2 text-cyan">
                          <ShieldCheck size={18} />
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-text-secondary">
                        <p><span className="text-text-primary font-medium">Passport:</span> {traveler.passportNumber}</p>
                        <p><span className="text-text-primary font-medium">Expiry:</span> {fmtDate(traveler.passportExpiryDate)}</p>
                        <p><span className="text-text-primary font-medium">Nationality:</span> {traveler.nationality}</p>
                        <p className="break-all"><span className="text-text-primary font-medium">Email:</span> {traveler.email}</p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {!traveler.isDefault && (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Star size={14} />}
                            onClick={() => handleSetDefaultTraveler(traveler._id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Pencil size={14} />}
                          onClick={() => openTravelerModal(traveler)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 size={14} />}
                          onClick={() => handleDeleteTraveler(traveler._id)}
                          disabled={travelerDeletingId === traveler._id}
                          className="text-red-400 hover:text-red-300"
                        >
                          {travelerDeletingId === traveler._id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <div className="ud-bp-wrap">
            {/* Segmented Filter Tabs */}
            <div className="ud-tabs-wrap">
              <div className="ud-tabs" role="group" aria-label="Filter applications by status">
                {[
                  { key: "pending", label: dashCopy.pendingActionLabel || "Pending", count: stats.pending },
                  { key: "review", label: dashCopy.underReviewLabel || "Under Review", count: stats.review },
                  { key: "approved", label: dashCopy.approvedLabel || "Approved", count: stats.approved },
                  { key: "rejected", label: dashCopy.rejectedFilterLabel || "Rejected", count: stats.rejected },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={statusFilter === tab.key}
                    onClick={() => setStatusFilter((prev) => (prev === tab.key ? "all" : tab.key))}
                  >
                    {tab.label} <span>{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgent Action Alert Banner */}
            {urgentBookingItem ? (
              <div className="ud-alert">
                <div className="ud-alert-ic">
                  <AlertTriangle size={20} />
                </div>
                <div className="ud-alert-body">
                  <strong>
                    {stats.pending} {stats.pending === 1 ? "application needs" : "applications need"} your action
                  </strong>
                  <p>
                    Most urgent: {urgentBookingItem.booking.countryName || "Visa Application"}, travel{" "}
                    {fmtDate(urgentBookingItem.booking.travelDate)}.
                  </p>
                </div>
                <button
                  type="button"
                  className="ud-alert-btn"
                  onClick={() => {
                    if (urgentBookingItem.booking.paymentStatus !== "completed") {
                      handlePayClick(urgentBookingItem.booking);
                    } else {
                      navigate(`/dashboard/application/${urgentBookingItem.booking._id || urgentBookingItem.booking.id}`);
                    }
                  }}
                >
                  {urgentBookingItem.booking.paymentStatus !== "completed"
                    ? `Pay ₹${Number(urgentBookingItem.booking.totalAmount ?? urgentBookingItem.booking.fee ?? 0).toLocaleString("en-IN")}`
                    : "Upload docs"}
                </button>
              </div>
            ) : (
              <div className="ud-alert is-clear">
                <div className="ud-alert-ic">
                  <CheckCircle size={20} />
                </div>
                <div className="ud-alert-body">
                  <strong>You are all caught up</strong>
                  <p>No pending payments or missing documents right now.</p>
                </div>
              </div>
            )}

            {/* My Applications Toolbar & Boarding Pass Cards */}
            <div className="mb-8">
              <div className="ud-sec-h">
                <h2 className="text-lg font-semibold text-text-primary">
                  {dashCopy.myApplicationsTitle || "My Applications"}
                </h2>

                <div className="ud-tools">
                  <label className="ud-field">
                    <Search size={15} />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder={dashCopy.searchCountryPlaceholder || "Search country..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search applications"
                      id="dashboard-search"
                    />
                  </label>
                  <CompactDateRangePicker
                    departureDate={travelRange.from}
                    returnDate={travelRange.to}
                    allowPastDates
                    singleTriggerMode
                    singleTriggerPlaceholder="Travel date range"
                    fromStatusLabel="From"
                    toStatusLabel="To"
                    popoverAlign="right"
                    onDateChange={(field, val) =>
                      setTravelRange((prev) => ({
                        ...prev,
                        [field === "departure" ? "from" : "to"]: val,
                      }))
                    }
                  />
                  <div className="ud-sort-wrap" ref={sortMenuRef}>
                    <button
                      type="button"
                      id="dashboard-sort"
                      className={`ud-field ud-sort-btn ${sortMenuOpen ? "is-open" : ""}`}
                      onClick={() => setSortMenuOpen((prev) => !prev)}
                      aria-haspopup="listbox"
                      aria-expanded={sortMenuOpen}
                      aria-label="Sort applications"
                    >
                      <ArrowUpDown size={15} />
                      <span>{sortBy === "travel" ? "Travel date" : "Recently applied"}</span>
                      <ChevronDown size={15} className="ud-sort-chevron" />
                    </button>

                    {sortMenuOpen && (
                      <div className="ud-sort-menu" role="listbox" aria-label="Sort options">
                        {[
                          { value: "travel", label: "Travel date" },
                          { value: "applied", label: "Recently applied" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={sortBy === opt.value}
                            className={`ud-sort-option ${sortBy === opt.value ? "is-active" : ""}`}
                            onClick={() => {
                              setSortBy(opt.value);
                              setSortMenuOpen(false);
                            }}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.value && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <Card className="text-center py-12">
                  <Globe size={40} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">
                    {dashCopy.noApplicationsFoundText || "No applications found."}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate("/", { replace: true })}
                  >
                    {dashCopy.startNewApplicationButtonText || "Start New Application"}
                  </Button>
                </Card>
              ) : (
                filteredBookings.map(({ booking, derivedProgress, resolvedStatus, category }, i) => {
                  const bookingId = booking._id || booking.id;
                  const amount = Number(booking.totalAmount ?? booking.fee ?? 0);
                  const isPaid = booking.paymentStatus === "completed";
                  const rootDrive = String(booking?.gdriveLink || "").trim();
                  const travellers = Array.isArray(booking?.travellerDocuments) ? booking.travellerDocuments : [];
                  const hasDrive = Boolean(rootDrive) || travellers.some((entry) => String(entry?.gdriveLink || "").trim());
                  const countdown = getTravelCountdownText(booking.travelDate);

                  const isDocsDone =
                    category === "review" ||
                    category === "approved" ||
                    Boolean(booking.visaFilePath) ||
                    (uploadSettings.enableFileUpload
                      ? Boolean(derivedProgress.allDocumentsUploaded)
                      : Boolean(derivedProgress.allPassportsUploaded));
                  const isApproved = category === "approved";
                  const stepDone = [true, isPaid, isDocsDone, isApproved, isApproved];
                  const currentStepIndex = category === "rejected" ? -2 : stepDone.indexOf(false);
                  const stepLabels = ["Applied", "Payment", "Documents", "Review", "Visa"];

                  const statusChip =
                    category === "approved"
                      ? { cls: "c-ok", text: dashCopy.approvedLabel || "Approved" }
                      : category === "rejected"
                        ? { cls: "c-rej", text: dashCopy.rejectedFilterLabel || "Rejected" }
                        : category === "review"
                          ? { cls: "c-rev", text: dashCopy.underReviewLabel || "Under Review" }
                          : !isPaid
                            ? { cls: "c-pend", text: "Pending payment" }
                            : { cls: "c-pend", text: "Documents pending" };

                  return (
                    <motion.article
                      key={bookingId || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      className="ud-bp"
                      onClick={() => navigate(`/dashboard/application/${bookingId}`)}
                    >
                      {/* Left: Flag, Country & Status Chips */}
                      <div className="ud-bl">
                        <CountryFlagBadge
                          countryName={booking.countryName}
                          flagEmoji={booking.flagEmoji}
                          sizeClass="h-16 w-16"
                          className="text-4xl"
                        />
                        <h3>{booking.countryName || "Unknown Country"}</h3>
                        <div className="ud-chips">
                          <span className={`ud-chip ${statusChip.cls}`}>{statusChip.text}</span>
                        </div>
                      </div>

                      {/* Middle: 2-col Boarding Pass Metadata */}
                      <div className="ud-bm">
                        <span className="ud-ii mono">
                          <span>App ID: {booking.applicationId || bookingId}</span>
                        </span>
                        <span className="ud-ii">
                          <span>{booking.visaType || "Visa Application"}</span>
                        </span>
                        <span className="ud-ii">
                          <Calendar size={16} />
                          <span>Applied: {fmtDate(booking.createdAt)}</span>
                        </span>
                        <span className="ud-ii">
                          <Plane size={16} />
                          <span>Travel: {fmtDate(booking.travelDate)}</span>
                        </span>

                        {uploadSettings.enableFileUpload ? (
                          <span className={`ud-ii ${derivedProgress.allDocumentsUploaded ? "ok" : "no"}`}>
                            <Upload size={16} />
                            <span>
                              {derivedProgress.allDocumentsUploaded ? "Documents uploaded" : "No documents"}
                            </span>
                          </span>
                        ) : (
                          <span className={`ud-ii ${derivedProgress.allPassportsUploaded ? "ok" : "no"}`}>
                            <Upload size={16} />
                            <span>
                              {derivedProgress.allPassportsUploaded ? "Passport uploaded" : "No passport"}
                            </span>
                          </span>
                        )}

                        {uploadSettings.enableGDriveUpload && (
                          <span className={`ud-ii ${hasDrive ? "ok" : "no"}`}>
                            <ExternalLink size={16} />
                            <span>{hasDrive ? "Drive link added" : "No drive link"}</span>
                          </span>
                        )}
                      </div>

                      {/* Right: Price, Countdown & CTAs */}
                      <div className="ud-br">
                        <div
                          className="group relative inline-flex flex-col items-end z-10 hover:z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="ud-price cursor-default">
                            ₹{amount.toLocaleString("en-IN")}
                          </div>
                          <div className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-64 translate-y-1 rounded-2xl border border-cyan/20 bg-surface px-3 py-3 text-left opacity-0 shadow-[0_18px_40px_-20px_rgba(0,212,255,0.28)] transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between gap-3 text-text-secondary">
                                <span>
                                  Government Fee
                                  {Number(booking.travellerCount || 1) > 1 ? ` x${Number(booking.travellerCount || 1)}` : ""}
                                </span>
                                <span className="font-semibold text-text-primary">
                                  ₹{Number(booking.governmentFeeTotal || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-text-secondary">
                                <span>
                                  Our Service Fee
                                  {Number(booking.travellerCount || 1) > 1 ? ` x${Number(booking.travellerCount || 1)}` : ""}
                                </span>
                                <span className="font-semibold text-text-primary">
                                  ₹{Number(booking.serviceFeeTotal || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-text-secondary">
                                <span>GST</span>
                                <span className="font-semibold text-text-primary">
                                  ₹{Number(booking.gstAmount || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="border-t border-border pt-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-semibold text-text-primary">Total Amount</span>
                                  <span className="font-bold text-cyan">
                                    ₹{amount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!isPaid && getTravelDaysDelta(booking.travelDate) < 0 ? (
                          <span className="ud-expired-pill">Travel date passed</span>
                        ) : (
                          countdown && <span className="ud-countdown">{countdown}</span>
                        )}

                        <div className="ud-cta" onClick={(e) => e.stopPropagation()}>
                          {!isPaid ? (
                            <button
                              type="button"
                              className="ud-btn pri"
                              onClick={() => handlePayClick(booking)}
                            >
                              Pay ₹{amount.toLocaleString("en-IN")}
                            </button>
                          ) : category === "pending" ? (
                            <button
                              type="button"
                              className="ud-btn pri"
                              onClick={() => navigate(`/dashboard/application/${bookingId}`)}
                            >
                              Upload documents
                            </button>
                          ) : category === "approved" && booking.visaFilePath ? (
                            <button
                              type="button"
                              className="ud-btn pri"
                              onClick={() =>
                                setDocumentPreview({
                                  url: getFileUrl(booking.visaFilePath),
                                  fileName: booking.visaFileName || "Visa File",
                                  type: "application/pdf",
                                })
                              }
                            >
                              <Download size={16} />
                              Download visa
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="ud-btn sec"
                            onClick={() => navigate(`/dashboard/application/${bookingId}`)}
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </div>
                      </div>

                      {/* Prominent Expired Travel Date Banner for Unpaid Applications */}
                      {!isPaid && getTravelDaysDelta(booking.travelDate) < 0 && (
                        <div className="ud-expired-banner" onClick={(e) => e.stopPropagation()}>
                          <div className="ud-expired-info">
                            <span className="ud-expired-ic" aria-hidden="true">
                              <AlertTriangle size={17} />
                            </span>
                            <div className="ud-expired-text">
                              <strong>Travel date passed ({fmtDate(booking.travelDate)})</strong>
                              <span>Update your travel date before completing payment.</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="ud-change-date-btn"
                            onClick={() => openChangeDateModal(booking)}
                          >
                            <Calendar size={15} />
                            Update travel date
                          </button>
                        </div>
                      )}

                      {/* Bottom: 5-step Boarding Pass Stepper */}
                      <div className="ud-bst">
                        <div className="ud-steps">
                          {stepLabels.map((label, idx) => {
                            const isDone = Boolean(stepDone[idx]);
                            const isNow = currentStepIndex === idx;
                            const isBarDone = idx > 0 && Boolean(stepDone[idx - 1] && stepDone[idx]);
                            return (
                              <div key={label} className="contents">
                                {idx > 0 && <div className={`ud-bar ${isBarDone ? "done" : ""}`} />}
                                <div className={`ud-step ${isDone ? "done" : isNow ? "now" : ""}`}>
                                  <i />
                                  <span>{label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.article>
                  );
                })
              )}
            </div>

            {/* Received Visa Files */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <h2 className="text-lg font-semibold text-text-primary flex-1">
                  {dashCopy.receivedVisaFilesTitle || "Received Visa Files"}
                </h2>
              </div>
              <div className="space-y-3">
                {safeBookings.filter((booking) => booking.visaFilePath).length === 0 ? (
                  <Card className="text-sm text-text-muted">
                    {dashCopy.receivedVisaFilesEmptyText || "Approved visa files sent by admin will appear here."}
                  </Card>
                ) : (
                  safeBookings
                    .filter((booking) => Boolean(booking?.visaFilePath))
                    .map((booking) => (
                      <Card key={`visa-file-${booking._id || booking.id}`} className="flex flex-wrap items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                          <FileText size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary">
                            {booking.countryName || "Visa File"}
                          </p>
                          <p className="text-xs text-text-muted break-all">
                            {booking.visaFileName || booking.visaFilePath.split("/").pop()}
                          </p>
                          {booking.visaFileUploadedAt && (
                            <p className="text-xs text-text-muted mt-1">
                              Sent on {fmtDate(booking.visaFileUploadedAt)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="ud-btn sec"
                          onClick={() => setDocumentPreview({ url: getFileUrl(booking.visaFilePath), fileName: booking.visaFileName || "Visa File", type: "application/pdf" })}
                        >
                          <Download size={16} />
                          {dashCopy.openFileButtonText || "Open File"}
                        </button>
                      </Card>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ContactVerificationModal
        isOpen={dashContactOpen}
        mode={dashContactMode}
        allowSkip
        onSkip={() => {
          sessionStorage.setItem("vb_skip_contact_prompt", "1");
          setDashContactOpen(false);
        }}
        onClose={() => setDashContactOpen(false)}
        onCompleted={() => setDashContactOpen(false)}
      />

      <Modal
        isOpen={travelerModalOpen}
        onClose={closeTravelerModal}
        title={editingTravelerId ? "Edit Traveler" : "Add Traveler"}
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={closeTravelerModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleTravelerSubmit} disabled={travelerSubmitting}>
              {travelerSubmitting ? "Saving..." : editingTravelerId ? "Save Changes" : "Save Traveler"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-text-muted">Full Name</label>
            <input
              type="text"
              value={travelerForm.fullName}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Date of Birth</label>
            <input
              type="date"
              value={travelerForm.dateOfBirth}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Gender</label>
            <select
              value={travelerForm.gender}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, gender: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Passport Number</label>
            <input
              type="text"
              value={travelerForm.passportNumber}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, passportNumber: e.target.value.toUpperCase() }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Passport Expiry Date</label>
            <input
              type="date"
              value={travelerForm.passportExpiryDate}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, passportExpiryDate: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Nationality</label>
            <input
              type="text"
              value={travelerForm.nationality}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, nationality: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Relationship</label>
            <select
              value={travelerForm.relationship}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, relationship: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            >
              <option value="Self">Self</option>
              <option value="Family member">Family member</option>
              <option value="Friend/Other">Friend/Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Mobile Number</label>
            <input
              type="text"
              value={travelerForm.mobileNumber}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, mobileNumber: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-text-muted">Email</label>
            <input
              type="email"
              value={travelerForm.email}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-cyan/50"
            />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={travelerForm.isDefault}
              onChange={(e) => setTravelerForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-border text-cyan focus:ring-cyan/40"
            />
            Set as my default traveler
          </label>
        </div>
      </Modal>

      {dateModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={closeChangeDateModal}
          role="dialog"
          aria-modal="true"
          aria-label="Update travel date"
        >
          <div
            className="ud-bp-wrap ud-cal-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {dateModal.notice && (
              <div className="ud-cal-top-notice" role="alert">
                <AlertTriangle size={17} />
                <span>{dateModal.notice}</span>
              </div>
            )}
            <CompactDateRangePicker
              key={dateModal.booking?._id || dateModal.booking?.id || "update-travel-date"}
              inlineCalendarOnly
              departureDate={dateModal.from}
              returnDate={dateModal.to}
              fromStatusLabel="From"
              toStatusLabel="To"
              doneLabel={dateUpdating ? "Saving..." : "Save Date"}
              onDone={handleSaveTravelDate}
              onCancel={closeChangeDateModal}
              onDateChange={(field, val) =>
                setDateModal((prev) => ({
                  ...prev,
                  [field === "departure" ? "from" : "to"]: val,
                }))
              }
            />
          </div>
        </div>
      )}

      <DashboardPaySummaryModal
        booking={payModalBooking}
        isOpen={Boolean(payModalBooking)}
        onClose={() => setPayModalBooking(null)}
        onPaymentSuccess={fetchUserApplications}
      />

      <FilePreviewModal
        isOpen={Boolean(documentPreview)}
        onClose={() => setDocumentPreview(null)}
        previewFile={documentPreview}
      />
      <Footer />
    </div>
  );
};

export default UserDashboard;
