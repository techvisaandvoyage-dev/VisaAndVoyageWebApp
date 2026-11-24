// remixicon CSS — loaded here (not globally) since it is only used on this page
import "remixicon/fonts/remixicon.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CircleCheck,
  ShieldCheck,
  HelpCircle,
  BadgeCheck,
  CalendarDays,
  Plus,
  X,
  Trash2,
  ListChecks,
  ScrollText,
  FileText,
  CreditCard,
  Image as ImageIcon,
  Plane,
  Building2,
  Briefcase,
  Banknote,
  GraduationCap,
  Stethoscope,
  Stamp,
  Receipt,
  Home,
  Car,
  MapPin,
  HeartHandshake,
  Info,
  Link2,
  Users,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ImageWithShimmer from "../components/ui/ImageWithShimmer";
import DateRangePicker from "../components/ui/DateRangePicker";
import { useDataStore } from "../store/dataStore";
import { useAuthStore, api, SERVER_URL } from "../store/authStore";
import { getAdminAppUrl } from "../utils/adminAppUrl";
import AuthModal from "../components/auth/AuthModal";
import { useUIStore } from "../store/uiStore";
import { useCountries, useMergedCountry } from "../hooks/useCountries";
import {
  openRazorpayForApplication,
  validateRazorpayCheckoutReadiness,
} from "../utils/razorpayCheckout";
import ContactVerificationModal from "../components/account/ContactVerificationModal";
import PassportUploadRow from "../components/application/PassportUploadRow";
import {
  optimizeUploadFile,
  PASSPORT_UPLOAD_MAX_BYTES,
  RAW_UPLOAD_LIMIT_BYTES,
} from "../utils/optimizeUploadFile";
import { getFileValidationRules } from "../utils/fileValidation";
import VisaInformationSection from "../components/country/VisaInformationSection";
import CountryFeeSummaryCard from "../components/country/CountryFeeSummaryCard";
import DeepPressCountryDetails from "../components/country/DeepPressCountryDetails";
import CompactApplication from "../components/application/CompactApplication";
import "../components/country/deepPressCountryDetails.css";
import {
  needsPhoneContactGate,
  needsEmailContactGate,
} from "../utils/contactVerificationGate";
import { clearTravelDraft, loadTravelDraft, saveTravelDraft } from "../utils/travelDraftStorage";
import { getLocalDateYmd } from "../utils/dateInput";
import { matchesCountryRouteId, getCountryRouteId } from "../utils/countryRouting";
import { getCountryFlagEmoji, getIsoAlpha2FromCountryName } from "../utils/countrySearch";
import { formatOrdinalDate } from "../utils/dateUtils";
import { trackEvent } from "../hooks/useVisitorTracking";

import FilePreviewModal from "../components/ui/FilePreviewModal";
import { getFileUrl } from "../utils/fileUrl";

const ease = [0.16, 1, 0.3, 1];
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

function CountryHeroFlag({ country, sizeClass = "h-9 w-9" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const iso = getIsoAlpha2FromCountryName(country?.name);
  const emoji = getCountryFlagEmoji(country?.name, country?.flagEmoji);

  if (iso && !imgFailed) {
    return (
      <img
        src={`https://flagcdn.com/${iso.toLowerCase()}.svg`}
        alt={`${country?.name} flag`}
        className={`${sizeClass} rounded-full object-cover shadow-lg`}
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span className="text-3xl" role="img" aria-label={`${country?.name} flag`}>
      {emoji}
    </span>
  );
}

const getCountryVisibilityIdCandidates = (country) =>
  [
    country?._id,
    country?.id,
    country?.slug,
    country?.name,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

const isGlobalItemVisibleForCountry = (item, country) => {
  if (!item || item.showInAllActiveCountries !== false) return true;
  const selected = Array.isArray(item.selectedCountries)
    ? item.selectedCountries.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];
  if (!selected.length) return false;
  const candidates = new Set(getCountryVisibilityIdCandidates(country));
  return selected.some((value) => candidates.has(value));
};

const normalizeProcessingDays = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const matches = String(value || "").match(/\d+/g);
  if (!matches?.length) return 0;
  return Number(matches[matches.length - 1]);
};

const ALLOWED_PASSPORT_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const INVALID_PASSPORT_TYPE_ERROR = "Only JPG, JPEG and PNG files are allowed.";
const PASSPORT_FILE_SIZE_ERROR = "File size exceeds 300KB limit. Please upload a smaller file.";
const PAYMENT_CONFIG_CACHE_KEY = "vb_payment_config_v1";
const COUNTRY_VISIT_STORAGE_PREFIX = "visited_country_";
const COUNTRY_VISIT_TTL_MS = 24 * 60 * 60 * 1000;
const isReusableUnpaidApplication = (application) => {
  const paymentStatus = String(application?.paymentStatus || "").trim().toLowerCase();
  return ["pending_payment", "failed", "cancelled"].includes(paymentStatus);
};

const loadCachedPaymentConfig = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PAYMENT_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      gstEnabled: typeof parsed.gstEnabled === "boolean" ? parsed.gstEnabled : null,
      gstRate: Number.isFinite(Number(parsed.gstRate)) ? Number(parsed.gstRate) : 18,
    };
  } catch {
    return null;
  }
};

const saveCachedPaymentConfig = (config) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAYMENT_CONFIG_CACHE_KEY, JSON.stringify({
      gstEnabled: typeof config?.gstEnabled === "boolean" ? config.gstEnabled : null,
      gstRate: Number.isFinite(Number(config?.gstRate)) ? Number(config.gstRate) : 18,
    }));
  } catch {
    /* ignore storage issues */
  }
};

const formatFileSize = (size = 0) => {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getApplicationDocSuccessStorageKey = (applicationId) =>
  applicationId ? `application-doc-successes:${applicationId}` : "";



const getTravelerPassportDetail = (application, travelerNo) => {
  const traveler = Array.isArray(application?.travellerDocuments)
    ? application.travellerDocuments.find((entry) => Number(entry?.travelerNo) === Number(travelerNo))
    : null;
  if (!traveler) return null;

  const docs = traveler.documents;
  const url =
    docs instanceof Map
      ? docs.get("passport")
      : typeof docs?.get === "function"
        ? docs.get("passport")
        : docs?.passport;
  if (!url) return null;

  const details = traveler.documentDetails;
  const detail =
    details instanceof Map
      ? details.get("passport")
      : typeof details?.get === "function"
        ? details.get("passport")
        : details?.passport;
  return {
    url,
    fileName: detail?.fileName || String(url).split("/").pop() || "Passport",
    fileSize: Number(detail?.fileSize || 0),
    mimeType: detail?.mimeType || "",
  };
};

const getTravelerDocumentDetail = (application, travelerNo, docKey) => {
  const traveler = Array.isArray(application?.travellerDocuments)
    ? application.travellerDocuments.find((entry) => Number(entry?.travelerNo) === Number(travelerNo))
    : null;
  if (!traveler) return null;

  const docs = traveler.documents;
  const url =
    docs instanceof Map
      ? docs.get(docKey)
      : typeof docs?.get === "function"
        ? docs.get(docKey)
        : docs?.[docKey];
  if (!url) return null;

  const details = traveler.documentDetails;
  const detail =
    details instanceof Map
      ? details.get(docKey)
      : typeof details?.get === "function"
        ? details.get(docKey)
        : details?.[docKey];
  return {
    url,
    fileName: detail?.fileName || String(url).split("/").pop() || docKey,
    fileSize: Number(detail?.fileSize || 0),
    mimeType: detail?.mimeType || "",
  };
};

/**
 * Per-document icon mapping shared with the admin Controls panel + the upload
 * pages. Any unknown key (e.g. an admin-added custom document) falls back to
 * a generic `FileText` icon.
 */
const DOCUMENT_ICONS = {
  passport: FileText,
  oldPassport: FileText,
  photo: ImageIcon,
  idCard: CreditCard,
  panCard: CreditCard,
  drivingLicense: Car,
  birthCertificate: FileText,
  dobCertificate: FileText,
  marriageCertificate: HeartHandshake,
  educationCertificate: GraduationCap,
  employmentLetter: Briefcase,
  offerLetter: Briefcase,
  salarySlip: Receipt,
  form16: Receipt,
  taxReturn: Receipt,
  bankStatement: Banknote,
  bankCertificate: Banknote,
  propertyDocuments: Home,
  travelInsurance: ShieldCheck,
  healthInsurance: ShieldCheck,
  flightTicket: Plane,
  hotelBooking: Building2,
  itinerary: MapPin,
  coverLetter: FileText,
  invitationLetter: FileText,
  sponsorLetter: FileText,
  policeClearance: ScrollText,
  noObjectionCertificate: ScrollText,
  yellowFever: Stethoscope,
  covidVaccination: Stethoscope,
  visaApplicationForm: Stamp,
  businessLicense: Briefcase,
  companyRegistration: Briefcase,
};
const getDocumentIcon = (key) => DOCUMENT_ICONS[key] || FileText;

const getVisaRequirementRemixIcon = (title, description = "") => {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes("passport")) return "ri-passport-line";
  if (text.includes("photo") || text.includes("photograph")) return "ri-camera-lens-line";
  if (text.includes("application form") || text.includes("form")) return "ri-file-edit-line";
  if (text.includes("travel itinerary") || text.includes("itinerary")) return "ri-route-line";
  if (text.includes("flight")) return "ri-flight-takeoff-line";
  if (text.includes("hotel") || text.includes("accommodation")) return "ri-hotel-line";
  if (text.includes("insurance")) return "ri-shield-check-line";
  if (text.includes("bank") || text.includes("statement")) return "ri-bank-card-line";
  if (text.includes("employment") || text.includes("offer letter")) return "ri-briefcase-4-line";
  if (text.includes("invitation")) return "ri-mail-open-line";
  if (text.includes("identity") || text.includes("id card") || text.includes("aadhaar")) {
    return "ri-id-card-line";
  }
  if (text.includes("certificate")) return "ri-award-line";
  if (text.includes("ticket")) return "ri-ticket-2-line";
  return "ri-file-list-3-line";
};

// Built-in label fallbacks shown on the public destination page when the live
// catalog hasn't been fetched yet (and for any built-in key the server might
// emit). Custom admin docs are resolved via `documentCatalog` from useCountries.
const DOCUMENT_LABELS = {
  passport: "Passport",
  oldPassport: "Old / Previous Passport",
  photo: "Passport Photo",
  idCard: "Aadhaar / ID Card",
  panCard: "PAN Card",
  drivingLicense: "Driving License",
  birthCertificate: "Birth Certificate",
  dobCertificate: "DOB Certificate",
  marriageCertificate: "Marriage Certificate",
  educationCertificate: "Education / Academic Records",
  employmentLetter: "Employment Letter",
  offerLetter: "Offer Letter",
  salarySlip: "Salary Slip / Pay Stub",
  form16: "Form 16",
  taxReturn: "ITR / Tax Return",
  bankStatement: "Bank Statement",
  bankCertificate: "Bank Solvency Certificate",
  propertyDocuments: "Property Documents",
  travelInsurance: "Travel Insurance",
  healthInsurance: "Health Insurance",
  flightTicket: "Flight Ticket",
  hotelBooking: "Hotel Booking",
  itinerary: "Travel Itinerary",
  coverLetter: "Cover Letter",
  invitationLetter: "Invitation Letter",
  sponsorLetter: "Sponsor / Affidavit Letter",
  policeClearance: "Police Clearance Certificate",
  noObjectionCertificate: "No Objection Certificate (NOC)",
  yellowFever: "Yellow Fever Certificate",
  covidVaccination: "COVID Vaccination Certificate",
  visaApplicationForm: "Visa Application Form",
  businessLicense: "Business License",
  companyRegistration: "Company Registration Certificate",
};

const DOCUMENT_DESCRIPTIONS = {
  passport: "Valid passport with minimum 6 months validity.",
  oldPassport: "Previous passport copies for travel and visa history review.",
  photo: "Recent passport-size photo matching embassy specifications.",
  idCard: "Government-issued identity proof for applicant verification.",
  panCard: "PAN card copy for identity and financial record support.",
  drivingLicense: "Driving license copy when accepted as supporting ID proof.",
  birthCertificate: "Birth certificate copy for age and identity confirmation.",
  dobCertificate: "Proof of date of birth as required by the application.",
  marriageCertificate: "Marriage certificate for spouse-linked visa applications.",
  educationCertificate: "Educational documents and academic transcripts.",
  employmentLetter: "Employment confirmation letter from your current employer.",
  offerLetter: "Offer or admission letter supporting the purpose of travel.",
  salarySlip: "Recent salary slips to support employment and finances.",
  form16: "Form 16 or equivalent tax proof where applicable.",
  taxReturn: "Income tax return documents to support financial eligibility.",
  bankStatement: "Recent bank statements showing stable financial capacity.",
  bankCertificate: "Bank solvency or balance certificate from your bank.",
  propertyDocuments: "Property ownership proof to strengthen home-ties evidence.",
  travelInsurance: "Travel insurance covering your planned stay and duration.",
  healthInsurance: "Health insurance proof if the destination requires it.",
  flightTicket: "Confirmed flight itinerary or flight reservation.",
  hotelBooking: "Confirmed hotel reservation for your stay.",
  itinerary: "Planned day-wise itinerary covering major travel details.",
  coverLetter: "Cover letter explaining the purpose and plan of travel.",
  invitationLetter: "Invitation letter from host, company, or family member.",
  sponsorLetter: "Sponsor letter with relationship and funding confirmation.",
  policeClearance: "Police clearance certificate for background verification.",
  noObjectionCertificate: "NOC from employer or institution when required.",
  yellowFever: "Yellow fever vaccination certificate for eligible destinations.",
  covidVaccination: "COVID vaccination proof if the embassy asks for it.",
  visaApplicationForm: "Completed visa application form signed where needed.",
  businessLicense: "Business license copy for business or self-employed applicants.",
  companyRegistration: "Company registration proof for business documentation.",
};

const getDocumentDisplayName = (label = "") =>
  String(label || "").replace(/\s*Upload\s*$/i, "").trim();

const DOCUMENT_HELPER_COPY = {
  passport: "Mandatory",
  oldPassport: "If available",
  photo: "Recent white background",
  bankStatement: "Last 6 months",
  idCard: "Aadhaar Card",
  panCard: "Optional",
  taxReturn: "Last 1 year",
  itinerary: "Optional",
  salarySlip: "Optional",
  hotelBooking: "Optional",
  flightTicket: "Optional",
  marriageCertificate: "If applicable",
  birthCertificate: "Required for minors",
  employmentLetter: "Letter from employer",
  offerLetter: "If newly employed",
  bankCertificate: "Optional",
  propertyDocuments: "Optional",
  sponsorLetter: "If sponsored",
  invitationLetter: "If invited",
  travelInsurance: "Recommended",
  healthInsurance: "If required",
  policeClearance: "If applicable",
  noObjectionCertificate: "If employed",
  educationCertificate: "If student",
  businessLicense: "For business owners",
  companyRegistration: "For company-sponsored travel",
};

const OTHER_DOCUMENT_LIBRARY_KEYS = [
  "oldPassport",
  "photo",
  "idCard",
  "panCard",
  "drivingLicense",
  "birthCertificate",
  "dobCertificate",
  "marriageCertificate",
  "educationCertificate",
  "employmentLetter",
  "offerLetter",
  "salarySlip",
  "form16",
  "taxReturn",
  "bankStatement",
  "bankCertificate",
  "propertyDocuments",
  "travelInsurance",
  "healthInsurance",
  "flightTicket",
  "hotelBooking",
  "itinerary",
  "coverLetter",
  "invitationLetter",
  "sponsorLetter",
  "policeClearance",
  "noObjectionCertificate",
  "yellowFever",
  "covidVaccination",
  "visaApplicationForm",
  "businessLicense",
  "companyRegistration",
];







let travelerStateCounter = 0;

const createTravelerState = () => ({
  id: `traveler-${Date.now()}-${travelerStateCounter += 1}`,
  name: "",
  passportFile: null,
  documents: {},
});

const normalizeDriveLink = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const CountryDetails = () => {
  const { countryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchUserApplications, bookings } = useDataStore();
  const { isAuthenticated, user, sessionAuthMethod } = useAuthStore();
  const { showToast } = useUIStore();
  const { countries: allCountries, display: countryDisplay, documentCatalog, loading: countriesLoading } = useCountries();
  const listCountry = allCountries.find((c) => matchesCountryRouteId(c, countryId));
  const country = useMergedCountry(countryId, listCountry);

  useEffect(() => {
    if (country?.name) document.title = `${country.name} Visa`;
  }, [country?.name]);

  /**
   * Map document key → label using the universal catalog (built-in + admin's
   * custom additions). Falls back to the hardcoded built-in map and finally to
   * a humanised version of the key so an unknown doc never renders as garbage.
   */
  const getDocumentLabel = (key) => {
    const fromCatalog = documentCatalog?.find?.((d) => d.key === key)?.label;
    if (fromCatalog) return fromCatalog;
    if (DOCUMENT_LABELS[key]) return DOCUMENT_LABELS[key];
    return `${key.replace(/([A-Z])/g, " $1")} Upload`;
  };

  const getDocumentCatalogIcon = (key) => {
    const icon = documentCatalog?.find?.((d) => d.key === key)?.icon;
    return String(icon ?? "").trim();
  };

  const getDocumentDescription = (key) => {
    const fromCatalog = documentCatalog?.find?.((d) => d.key === key)?.description;
    if (String(fromCatalog ?? "").trim()) return String(fromCatalog).trim();
    return DOCUMENT_DESCRIPTIONS[key] || "Supporting document required for visa processing.";
  };

  const getInitialDraft = () => {
    if (!countryId) return null;
    try {
      return loadTravelDraft(countryId);
    } catch {
      return null;
    }
  };

  // ── All hooks must be called before any conditional return (Rules of Hooks) ──
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [showTravelDetails, setShowTravelDetails] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = (window.location.hash || "").replace(/^#/, "");
      return hash === "travel-details";
    }
    return false;
  });
  const [visaOption, setVisaOption] = useState(() => {
    const draft = getInitialDraft();
    return draft?.visaOption ? String(draft.visaOption) : "e-Visa";
  });
  const [activeVisaTypes, setActiveVisaTypes] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pendingAuthActionRef = useRef(null);

  const requireAuth = (actionFn) => {
    const authenticatedNow =
      isAuthenticated ||
      useAuthStore.getState().isAuthenticated ||
      Boolean(localStorage.getItem("token"));
    if (authenticatedNow) {
      if (actionFn) actionFn();
    } else {
      pendingAuthActionRef.current = actionFn;
      setAuthModalOpen(true);
    }
  };

  const handleAuthComplete = () => {
    setAuthModalOpen(false);
    if (pendingAuthActionRef.current) {
      pendingAuthActionRef.current();
      pendingAuthActionRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const countryId = country?._id || country?.slug || country?.id || "";
    api.get("/visa-types/active", { params: countryId ? { countryId, _ts: Date.now() } : { _ts: Date.now() } }).then(res => {
      if (mounted && res.data?.success) {
        setActiveVisaTypes(res.data.visaTypes);
        setVisaOption(prev => {
          const types = res.data.visaTypes;
          if (types.length > 0 && !types.some(t => t.name === prev)) {
            return types[0].name;
          }
          return prev;
        });
      }
    }).catch(err => console.error("Failed to fetch visa types", err));
    return () => { mounted = false; };
  }, [country?._id, country?.slug, country?.id]);

  useEffect(() => {
    const visitId = String(country?._id || country?.slug || country?.id || "").trim();
    if (!visitId || typeof window === "undefined") return undefined;

    const storageKey = `${COUNTRY_VISIT_STORAGE_PREFIX}${visitId}`;
    try {
      const lastVisitedRaw = window.localStorage.getItem(storageKey);
      if (lastVisitedRaw) {
        const lastVisitedAt = Number(lastVisitedRaw);
        if (Number.isFinite(lastVisitedAt) && Date.now() - lastVisitedAt < COUNTRY_VISIT_TTL_MS) {
          return undefined;
        }
      }
    } catch {
      /* ignore storage issues and continue tracking */
    }

    let cancelled = false;
    (async () => {
      try {
        await api.post(`/countries/${encodeURIComponent(visitId)}/visit`);
        if (!cancelled && country?.name) {
          trackEvent("country_selected", { country: country.name });
        }
        if (cancelled) return;
        try {
          window.localStorage.setItem(storageKey, String(Date.now()));
        } catch {
          /* ignore storage issues */
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to track country visit", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [country?._id, country?.slug, country?.id]);

  const [travelDateFrom, setTravelDateFrom] = useState(() => {
    const draft = getInitialDraft();
    const today = getLocalDateYmd();
    let from = draft?.travelDateFrom ? String(draft.travelDateFrom).trim() : "";
    if (from && from < today) from = "";
    return from;
  });
  const [travelDateTo, setTravelDateTo] = useState(() => {
    const draft = getInitialDraft();
    const today = getLocalDateYmd();
    let from = draft?.travelDateFrom ? String(draft.travelDateFrom).trim() : "";
    let to = draft?.travelDateTo ? String(draft.travelDateTo).trim() : "";
    if (from && from < today) from = "";
    if (to && to < today) to = "";
    if (!from) to = "";
    if (from && to && to < from) to = from;
    return to;
  });
  /** Open/closed state for the date-range calendar popup. */
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [travelers, setTravelers] = useState(() => {
    const draft = getInitialDraft();
    if (Array.isArray(draft?.travelers) && draft.travelers.length > 0) {
      return draft.travelers.map((t) => ({ ...createTravelerState(), name: String(t?.name || "") }));
    }
    return [createTravelerState()];
  });
  const [sharedDriveLink, setSharedDriveLink] = useState(() => {
    const draft = getInitialDraft();
    return draft?.sharedDriveLink ? String(draft.sharedDriveLink).trim() : "";
  });
  const [sharedDriveLinkVerified, setSharedDriveLinkVerified] = useState(() => {
    const draft = getInitialDraft();
    return Boolean(draft?.sharedDriveLink && String(draft.sharedDriveLink).trim());
  });
  const [paymentSummaryOpen, setPaymentSummaryOpen] = useState(false);
  const [visaTermsAccepted, setVisaTermsAccepted] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayCheckLoading, setRazorpayCheckLoading] = useState(false);
  const [razorpayReadyMessage, setRazorpayReadyMessage] = useState("");
  const [currentApplicationId, setCurrentApplicationId] = useState(() => {
    const draft = getInitialDraft();
    return draft?.applicationId ? String(draft.applicationId) : "";
  });
  const [uploadSettings, setUploadSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("vb-upload-settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch { /* ignore */ }
    return { enableFileUpload: true, enableGDriveUpload: true, allowedFileFormats: ["pdf", "jpg", "jpeg", "png"] };
  });
  const [draftCreating, setDraftCreating] = useState(false);
  const [travelValidationAttempted, setTravelValidationAttempted] = useState(false);
  const [passportUploading, setPassportUploading] = useState({});
  const [passportOptimizing, setPassportOptimizing] = useState({});
  const [passportErrors, setPassportErrors] = useState({});
  const [passportSuccesses, setPassportSuccesses] = useState(() => {
    const draft = getInitialDraft();
    return draft?.passportSuccesses && typeof draft.passportSuccesses === "object" ? draft.passportSuccesses : {};
  });
  const [passportDetails, setPassportDetails] = useState(() => {
    const draft = getInitialDraft();
    return draft?.passportDetails && typeof draft.passportDetails === "object" ? draft.passportDetails : {};
  });
  const [hiddenPassportTravelerNos, setHiddenPassportTravelerNos] = useState(() => {
    const draft = getInitialDraft();
    return draft?.hiddenPassportTravelerNos && typeof draft.hiddenPassportTravelerNos === "object" ? draft.hiddenPassportTravelerNos : {};
  });
  const [passportPreview, setPassportPreview] = useState(null);
  const [docUploading, setDocUploading] = useState({});
  const [docOptimizing, setDocOptimizing] = useState({});
  const [docErrors, setDocErrors] = useState({});
  const [uploadedDocSuccesses, setUploadedDocSuccesses] = useState(() => {
    const draft = getInitialDraft();
    return draft?.uploadedDocSuccesses && typeof draft.uploadedDocSuccesses === "object" ? draft.uploadedDocSuccesses : {};
  });
  const [uploadedDocDetails, setUploadedDocDetails] = useState(() => {
    const draft = getInitialDraft();
    return draft?.uploadedDocDetails && typeof draft.uploadedDocDetails === "object" ? draft.uploadedDocDetails : {};
  });
  const [documentPreview, setDocumentPreview] = useState(null);
  const travelerNameInputRefs = useRef({});
  const sharedDriveLinkInputRef = useRef(null);
  const startApplicationCardRef = useRef(null);
  const driveLinkSaveTimerRef = useRef(null);
  const startApplicationCardSeenRef = useRef(false);
  const [destinationPageContent, setDestinationPageContent] = useState(() => {
    try {
      const cached = localStorage.getItem("vb-destination-content");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const startAppCopy = destinationPageContent?.startApplicationPageCopy || {};
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactModalMode, setContactModalMode] = useState("phone");
  const [contactGateDismissed, setContactGateDismissed] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [activeSubNav, setActiveSubNav] = useState("how-it-works");
  const pendingContactAction = useRef(null);
  const [showStickyStartCta, setShowStickyStartCta] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!country?.name || !showTravelDetails) return;
      const nameEntered = travelers.map(t => String(t.name || "").trim()).filter(Boolean).join(", ");
      trackEvent('draft_updated', {
        draftDetails: {
          travelDate: travelDateFrom || undefined,
          returnDate: travelDateTo || undefined,
          travellerCount: travelers.length,
          nameEntered: nameEntered || undefined
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [travelDateFrom, travelDateTo, travelers, country?.name, showTravelDetails]);

  /**
   * When a guest hits an action that requires authentication ("Upload docs
   * first" / "Upload docs later"), we attach a `?postLoginAction=<key>` to the
   * redirect URL. The value is captured synchronously via the lazy `useState`
   * initialiser so the splash overlay shows on the very first render — no
   * flash of the destination page between the login redirect and the target
   * route. A separate effect strips the param from the URL so a refresh
   * doesn't keep re-triggering the same flow.
   */
  const [pendingPostLoginAction, setPendingPostLoginAction] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("postLoginAction") || null;
  });
  /**
   * Stable map of "post-login action key → handler". Populated below in the
   * render body (after the handlers are declared) so the dispatch effect can
   * reach them despite the early-return Rules-of-Hooks dance.
   */
  const postLoginHandlersRef = useRef({});

  const travellerCount = travelers.length;
  const [gstEnabled, setGstEnabled] = useState(() => loadCachedPaymentConfig()?.gstEnabled ?? null);
  const [gstRate, setGstRate] = useState(() => loadCachedPaymentConfig()?.gstRate ?? 18);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/config/payment");
        if (!alive || !data?.success) return;
        setGstEnabled(data.gstEnabled !== false);
        const serverRate = Number(data.gstRate);
        setGstRate(Number.isFinite(serverRate) && serverRate >= 0 ? serverRate : 18);
        saveCachedPaymentConfig({
          gstEnabled: data.gstEnabled !== false,
          gstRate: Number.isFinite(serverRate) && serverRate >= 0 ? serverRate : 18,
        });
      } catch {
        /* ignore */
      }
    })();
    (async () => {
      try {
        const { data } = await api.get("/config/upload-settings");
        if (alive && data?.success && data.config) {
          setUploadSettings(data.config);
          try {
            localStorage.setItem("vb-upload-settings", JSON.stringify(data.config));
          } catch { /* ignore */ }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const usesCountrySpecificGst = country?.useGlobalGst === false && typeof country?.gstEnabled === "boolean";
  const isGstResolved = usesCountrySpecificGst || typeof gstEnabled === "boolean";
  const effectiveGstEnabled = usesCountrySpecificGst ? country.gstEnabled : Boolean(gstEnabled);
  const effectiveGstRate = usesCountrySpecificGst && Number.isFinite(Number(country?.gstRate))
    ? Number(country.gstRate)
    : gstRate;

  const { serviceAmount, gstAmount, payableToUs } = useMemo(() => {
    const perTravelerFee = Number.isFinite(Number(country?.basePrice)) ? Number(country.basePrice) : 0;
    const service = perTravelerFee * travellerCount;
    const gst = isGstResolved && effectiveGstEnabled ? Math.round(service * (effectiveGstRate / 100)) : 0;
    return { serviceAmount: service, gstAmount: gst, payableToUs: service + gst };
  }, [country?.basePrice, travellerCount, effectiveGstEnabled, effectiveGstRate, isGstResolved]);

  const governmentFeePerTraveler = useMemo(() => {
    const candidates = [
      country?.governmentFee,
      country?.governmentFees,
      country?.govtFee,
      country?.govFee,
      country?.embassyFee,
      country?.visaFee,
    ];
    const matched = candidates.find((value) => Number.isFinite(Number(value)));
    return Number.isFinite(Number(matched)) ? Number(matched) : 0;
  }, [country]);

  const feeCardGstRate = effectiveGstEnabled
    ? (Number.isFinite(Number(effectiveGstRate)) ? Number(effectiveGstRate) : 18)
    : 0;
  const serviceFeePerTraveler = Number.isFinite(Number(country?.basePrice)) ? Number(country.basePrice) : 0;
  const gstPerTraveler = effectiveGstEnabled ? Math.round(serviceFeePerTraveler * (feeCardGstRate / 100)) : 0;
  const totalServiceFeePerTraveler = serviceFeePerTraveler + gstPerTraveler;
  const governmentFeeTotal = governmentFeePerTraveler * travellerCount;
  const totalServiceFeeTotal = totalServiceFeePerTraveler * travellerCount;
  const finalTotal = (governmentFeePerTraveler + totalServiceFeePerTraveler) * travellerCount;
  const serviceFeeTotal = serviceFeePerTraveler * travellerCount;
  const gstTotal = gstPerTraveler * travellerCount;

  /**
   * Destination-page copy:
   *   1. Global defaults from `/config/destination-content`, minus lines this country
   *      has opted out of (`excludeDestination*` arrays on the country document).
   *   2. Per-country additions (`whyBookNow` / `includedItems` / `faqs`) appended after.
   *   3. Hard-coded fallbacks only when the merged result would be empty.
   *
   * String lists are de-duplicated case-insensitively. FAQs de-dupe by question text.
   */
  const normKey = (s) => String(s ?? "").trim().toLowerCase();

  const mergeStringLists = (globalList, countryList) => {
    const seen = new Set();
    const out = [];
    const pushUnique = (raw) => {
      const text = String(raw ?? "").trim();
      if (!text) return;
      const key = normKey(text);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(text);
    };
    (Array.isArray(globalList) ? globalList : []).forEach(pushUnique);
    (Array.isArray(countryList) ? countryList : []).forEach(pushUnique);
    return out;
  };

  const mergeFaqLists = (globalList, countryList) => {
    const seen = new Set();
    const out = [];
    const pushUnique = (raw) => {
      const question = String(raw?.question ?? "").trim();
      const answer = String(raw?.answer ?? "").trim();
      if (!question || !answer) return;
      const key = normKey(question);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ _id: raw?._id, question, answer });
    };
    (Array.isArray(globalList) ? globalList : []).forEach(pushUnique);
    (Array.isArray(countryList) ? countryList : []).forEach(pushUnique);
    return out;
  };

  const mergeHowItWorksLists = (globalList, countryList) => {
    const seen = new Set();
    const out = [];
    const pushUnique = (raw) => {
      const title = String(raw?.title ?? "").trim();
      const description = String(raw?.description ?? "").trim();
      if (!title || !description) return;
      const key = normKey(title);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ _id: raw?._id, title, description });
    };
    (Array.isArray(globalList) ? globalList : []).forEach(pushUnique);
    (Array.isArray(countryList) ? countryList : []).forEach(pushUnique);
    return out;
  };

  const mergeIncludedItems = (globalList, countryList) => {
    const seen = new Set();
    const out = [];
    const pushUnique = (raw) => {
      let item;
      if (typeof raw === "string") {
        item = { title: raw.trim(), description: "", icon: "", color: "blue" };
      } else {
        item = {
          _id: raw?._id,
          title: String(raw?.title ?? "").trim(),
          description: String(raw?.description ?? "").trim(),
          icon: String(raw?.icon ?? "").trim(),
          color: String(raw?.color ?? "blue").trim(),
        };
      }
      if (!item.title) return;
      const key = normKey(item.title);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    };
    (Array.isArray(globalList) ? globalList : []).forEach(pushUnique);
    (Array.isArray(countryList) ? countryList : []).forEach(pushUnique);
    return out;
  };

  const whyBookNow = useMemo(() => {
    const useGlobal = country?.useGlobalWhyBookNow !== false;
    const ex = new Set(country?.excludeDestinationWhyBookNow || []);
    const g = useGlobal
      ? (destinationPageContent?.whyBookNow || [])
          .filter((item) => isGlobalItemVisibleForCountry(item, country))
          .map((item) => String(item?.text ?? item ?? "").trim())
          .filter((line) => line && !ex.has(normKey(line)))
      : [];
    const merged = mergeStringLists(g, country?.whyBookNow);
    return merged;
  }, [country, destinationPageContent]);

  const includedItems = useMemo(() => {
    const useGlobal = country?.useGlobalIncludedItems !== false;
    const ex = new Set(country?.excludeDestinationIncludedItems || []);
    const g = useGlobal 
      ? (destinationPageContent?.includedItems || destinationPageContent?.included || [])
          .filter((item) => isGlobalItemVisibleForCountry(item, country))
          .filter((line) => !ex.has(normKey(line?.title || line)))
      : [];
    
    const merged = mergeIncludedItems(g, country?.includedItems ?? country?.included);

    if (merged.length === 0) return [];

    return merged.map((item) => {
      return {
        ...item,
        description: item.description,
        Icon: null,
        color: item.color,
      };
    });
  }, [country, destinationPageContent]);

  const faqs = useMemo(() => {
    const useGlobal = country?.useGlobalFaqs !== false;
    const ex = new Set(country?.excludeDestinationFaqQuestions || []);
    const g = useGlobal
      ? (destinationPageContent?.faqs || [])
          .filter((item) => isGlobalItemVisibleForCountry(item, country))
          .filter((f) => !ex.has(normKey(f?.question)))
      : [];
    const merged = mergeFaqLists(g, country?.faqs);
    return merged;
  }, [country, destinationPageContent]);

  const howItWorks = useMemo(() => {
    const useGlobal = country?.useGlobalHowItWorks !== false;
    const ex = new Set(country?.excludeDestinationHowItWorksTitles || []);
    const g = useGlobal
      ? (destinationPageContent?.howItWorks || [])
          .filter((item) => isGlobalItemVisibleForCountry(item, country))
          .filter((s) => !ex.has(normKey(s?.title)))
      : [];
    const merged = mergeHowItWorksLists(g, country?.howItWorks);
    return merged;
  }, [country, destinationPageContent]);

  /**
   * Visa requirements = global defaults (with country exclusions applied) + the country's
   * free-text `requirements` array appended as country-specific extras. Duplicates skipped.
   */
  const visaRequirements = useMemo(() => {
    const useGlobal = country?.useGlobalVisaRequirements !== false;
    const ex = new Set(country?.excludeDestinationVisaRequirements || []);
    const g = useGlobal
      ? (destinationPageContent?.visaRequirements || [])
          .filter((item) => isGlobalItemVisibleForCountry(item, country))
          .map((item) => String(item?.text ?? item ?? "").trim())
          .filter((line) => line && !ex.has(normKey(line)))
      : [];
    const merged = mergeStringLists(g, country?.requirements);
    if (merged.length) return merged;
    return [
      "Original passport valid for at least 6 months with two blank pages",
      "Recent passport-size photograph on white background",
      "Confirmed return flight tickets",
      "Hotel booking or proof of accommodation for the entire stay",
      "Bank statements showing sufficient funds for the trip",
    ];
  }, [country, destinationPageContent]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/config/destination-content");
        if (alive && data?.success && data.config) {
          setDestinationPageContent(data.config);
          try {
            localStorage.setItem("vb-destination-content", JSON.stringify(data.config));
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* keep fallbacks below */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentSummaryOpen) return;
    let active = true;
    const checkReadiness = async () => {
      setRazorpayCheckLoading(true);
      const result = await validateRazorpayCheckoutReadiness();
      if (!active) return;
      setRazorpayReady(!!result.ok);
      setRazorpayReadyMessage(result.ok ? "" : result.message || "");
      setRazorpayCheckLoading(false);
    };
    checkReadiness();
    return () => { active = false; };
  }, [paymentSummaryOpen]);

  /**
   * Auto-focus the first empty traveler name input whenever the travel-details
   * panel opens or a new traveler row is added. This gives the user the
   * "blinking cursor ready to type" experience without an extra click. We do
   * NOT steal focus on every render — only when the empty-slot count grows or
   * the panel transitions from closed → open.
   */
  useEffect(() => {
    if (!showTravelDetails) return;
    const focusFirstEmpty = () => {
      const firstEmptyIndex = travelers.findIndex(
        (traveler) => !String(traveler?.name || "").trim()
      );
      if (firstEmptyIndex < 0) return;
      const node = travelerNameInputRefs.current[firstEmptyIndex];
      if (!node) return;
      // Skip if the user is already typing somewhere else (e.g. date pickers).
      const active = document.activeElement;
      if (active && active !== document.body && active.tagName !== "BUTTON") return;
      try {
        node.focus({ preventScroll: true });
        // Place caret at the end if there's any existing text.
        const len = node.value?.length || 0;
        if (len) node.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    };
    // Defer one frame so the panel's mount animation doesn't fight the focus.
    const raf = window.requestAnimationFrame(focusFirstEmpty);
    return () => window.cancelAnimationFrame(raf);
    // We intentionally key off the traveler count + panel state — re-running on
    // every keystroke would yank focus back from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTravelDetails, travelers.length]);

  useEffect(() => {
    const handleGlobalTypingForTravelerName = (event) => {
      if (!showTravelDetails) return;

      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isTypingInFormField = (
        activeElement?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
      if (isTypingInFormField) return;

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 && event.key !== "Backspace") return;

      const firstEmptyIndex = travelers.findIndex((traveler) => !String(traveler?.name || "").trim());
      const targetIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : 0;
      const targetInput = travelerNameInputRefs.current[targetIndex];
      if (!targetInput) return;

      event.preventDefault();
      targetInput.focus();

      setTravelers((prev) =>
        prev.map((traveler, i) => {
          if (i !== targetIndex) return traveler;
          const currentName = String(traveler?.name || "");
          if (event.key === "Backspace") {
            return { ...traveler, name: currentName.slice(0, -1) };
          }
          return { ...traveler, name: `${currentName}${event.key}` };
        })
      );
    };

    window.addEventListener("keydown", handleGlobalTypingForTravelerName);
    return () => window.removeEventListener("keydown", handleGlobalTypingForTravelerName);
  }, [showTravelDetails, travelers]);

  useEffect(() => {
    const handleGlobalClickToFocusName = (event) => {
      if (!showTravelDetails) return;

      const target = event.target;
      if (!target) return;

      const isInteractive = (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.tagName === "BUTTON" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest(".react-datepicker") ||
        target.closest(".date-picker-container")
      );

      if (isInteractive) return;

      const firstEmptyIndex = travelers.findIndex((traveler) => !String(traveler?.name || "").trim());
      const targetIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : 0;
      const targetInput = travelerNameInputRefs.current[targetIndex];
      
      if (targetInput) {
        // Use a short timeout so we don't steal focus from an ongoing browser native action
        setTimeout(() => {
          if (document.activeElement?.tagName !== "INPUT") {
            targetInput.focus({ preventScroll: true });
          }
        }, 10);
      }
    };

    window.addEventListener("click", handleGlobalClickToFocusName);
    return () => window.removeEventListener("click", handleGlobalClickToFocusName);
  }, [showTravelDetails, travelers]);

  useEffect(() => {
    if (showTravelDetails) {
      setShowStickyStartCta(false);
      startApplicationCardSeenRef.current = false;
      return;
    }

    const handleScroll = () => {
      setShowStickyStartCta(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [showTravelDetails]);

  /** Return date must stay on/after departure; both must be today or later. */
  useEffect(() => {
    if (!travelDateFrom || !travelDateTo) return;
    if (travelDateTo < travelDateFrom) {
      setTravelDateTo(travelDateFrom);
    }
  }, [travelDateFrom, travelDateTo]);

  useEffect(() => {
    if (!countryId) return;
    const isExplicitHash = typeof window !== "undefined" && (window.location.hash || "").replace(/^#/, "") === "travel-details";
    const isExplicitRestore = Boolean(location.state?.restoreTravelDetails || location.state?.openApplication);
    setShowTravelDetails(Boolean(isExplicitHash || isExplicitRestore));

    const draft = loadTravelDraft(countryId);
    if (!draft) {
      return;
    }
    const today = getLocalDateYmd();
    let from = draft.travelDateFrom != null && String(draft.travelDateFrom).length
      ? String(draft.travelDateFrom).trim()
      : "";
    let to = draft.travelDateTo != null && String(draft.travelDateTo).length
      ? String(draft.travelDateTo).trim()
      : "";
    if (from && from < today) from = "";
    if (to && to < today) to = "";
    if (!from) to = "";
    if (from && to && to < from) to = from;
    if (draft.travelDateFrom != null && String(draft.travelDateFrom).length) {
      setTravelDateFrom(from);
    }
    if (draft.travelDateTo != null && String(draft.travelDateTo).length) {
      setTravelDateTo(to);
    }
    if (draft.visaOption) setVisaOption(String(draft.visaOption));
    if (draft.sharedDriveLink != null) {
      const restoredLink = String(draft.sharedDriveLink || "").trim();
      setSharedDriveLink(restoredLink);
      setSharedDriveLinkVerified(Boolean(restoredLink));
    }
    if (Array.isArray(draft.travelers) && draft.travelers.length > 0) {
      setTravelers(draft.travelers.map((t) => ({ ...createTravelerState(), name: String(t?.name || "") })));
    }
    if (draft.applicationId) {
      setCurrentApplicationId(String(draft.applicationId));
    }
    if (draft.passportSuccesses && typeof draft.passportSuccesses === "object") {
      setPassportSuccesses(draft.passportSuccesses);
    }
    if (draft.passportDetails && typeof draft.passportDetails === "object") {
      setPassportDetails(draft.passportDetails);
    }
    if (draft.hiddenPassportTravelerNos && typeof draft.hiddenPassportTravelerNos === "object") {
      setHiddenPassportTravelerNos(draft.hiddenPassportTravelerNos);
    }
    if (draft.uploadedDocSuccesses && typeof draft.uploadedDocSuccesses === "object") {
      setUploadedDocSuccesses(draft.uploadedDocSuccesses);
    }
    if (draft.uploadedDocDetails && typeof draft.uploadedDocDetails === "object") {
      setUploadedDocDetails(draft.uploadedDocDetails);
    }

  }, [countryId]);

  useEffect(() => {
    const appId = currentApplicationId || localStorage.getItem(`lastAppId:${countryId}`) || "";
    if (!appId) return;
    try {
      const raw = localStorage.getItem(getApplicationDocSuccessStorageKey(appId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setUploadedDocSuccesses((prev) => ({ ...prev, ...parsed }));
        }
      }
      const detailsKey = `application-doc-details:${appId}`;
      const detailsRaw = localStorage.getItem(detailsKey);
      if (detailsRaw) {
        const parsed = JSON.parse(detailsRaw);
        if (parsed && typeof parsed === "object") {
          setUploadedDocDetails((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch { /* ignore storage errors */ }
  }, [currentApplicationId, countryId]);

  useEffect(() => {
    if (currentApplicationId && countryId) {
      localStorage.setItem(`lastAppId:${countryId}`, currentApplicationId);
    }
  }, [currentApplicationId, countryId]);

  useEffect(() => {
    if (location.state?.restoreTravelDetails) {
      const restore = location.state.restoreTravelDetails;
      if (restore.travelDateFrom) setTravelDateFrom(restore.travelDateFrom);
      if (restore.travelDateTo) setTravelDateTo(restore.travelDateTo);
      if (restore.visaOption) setVisaOption(restore.visaOption);
      if (restore.sharedDriveLink != null) {
        const restoredLink = String(restore.sharedDriveLink || "").trim();
        setSharedDriveLink(restoredLink);
        setSharedDriveLinkVerified(Boolean(restoredLink));
      }
      if (Array.isArray(restore.travelers)) {
        setTravelers(restore.travelers.map((t) => ({ ...createTravelerState(), name: String(t.name || "") })));
      }
      if (restore.passportSuccesses && typeof restore.passportSuccesses === "object") {
        setPassportSuccesses(restore.passportSuccesses);
      }
      if (restore.passportDetails && typeof restore.passportDetails === "object") {
        setPassportDetails(restore.passportDetails);
      }
      if (restore.hiddenPassportTravelerNos && typeof restore.hiddenPassportTravelerNos === "object") {
        setHiddenPassportTravelerNos(restore.hiddenPassportTravelerNos);
      }
      if (location.state?.applicationDraftId || restore.applicationDraftId) {
        setCurrentApplicationId(String(location.state?.applicationDraftId || restore.applicationDraftId));
      }
      setShowTravelDetails(true);
      window.setTimeout(() => {
        const node = document.getElementById("travel-details");
        if (node) {
          const stickyOffset = 150;
          const targetTop = window.scrollY + node.getBoundingClientRect().top - stickyOffset;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        }
      }, 180);
    }
  }, [location.state]);

  useEffect(() => {
    if (!currentApplicationId || !localStorage.getItem("token")) return;
    let cancelled = false;

    const loadPassportState = async () => {
      try {
        const { data } = await api.get(`/users/applications/${currentApplicationId}`);
        if (cancelled || !data?.success || !data.application) return;

        const nextSuccesses = {};
        const nextDetails = {};
        const count = Math.max(1, Number(data.application?.travellerCount || travelers.length || 1));
        for (let index = 0; index < count; index += 1) {
          const travelerNo = index + 1;
          if (hiddenPassportTravelerNos?.[travelerNo]) continue;
          const detail = getTravelerPassportDetail(data.application, travelerNo);
          if (!detail) continue;
          nextSuccesses[travelerNo] = true;
          nextDetails[travelerNo] = detail;
        }

        const nextSharedDriveLink = String(data.application?.gdriveLink || "").trim();
        setPassportSuccesses((prev) => ({ ...prev, ...nextSuccesses }));
        setPassportDetails((prev) => ({ ...prev, ...nextDetails }));
        if (nextSharedDriveLink) {
          setSharedDriveLink(nextSharedDriveLink);
          setSharedDriveLinkVerified(true);
        }
      } catch {
        /* Restoring upload status should not block the travel form. */
      }
    };

    loadPassportState();
    return () => {
      cancelled = true;
    };
  }, [currentApplicationId, travelers.length, hiddenPassportTravelerNos]);

  useEffect(() => {
    if (!currentApplicationId || !localStorage.getItem("token")) return;
    let cancelled = false;

    const refreshTravelDetailsState = async () => {
      try {
        const { data } = await api.get(`/users/applications/${currentApplicationId}`);
        if (cancelled || !data?.success || !data.application) return;

        const nextSuccesses = {};
        const nextDetails = {};
        const count = Math.max(1, Number(data.application?.travellerCount || travelers.length || 1));
        for (let index = 0; index < count; index += 1) {
          const travelerNo = index + 1;
          if (hiddenPassportTravelerNos?.[travelerNo]) continue;
          const detail = getTravelerPassportDetail(data.application, travelerNo);
          if (!detail) continue;
          nextSuccesses[travelerNo] = true;
          nextDetails[travelerNo] = detail;
        }

        const nextSharedDriveLink = String(data.application?.gdriveLink || "").trim();
        setPassportSuccesses((prev) => ({ ...prev, ...nextSuccesses }));
        setPassportDetails((prev) => ({ ...prev, ...nextDetails }));
        setSharedDriveLink(nextSharedDriveLink);
        setSharedDriveLinkVerified(Boolean(nextSharedDriveLink));

        saveTravelDraft(countryId, {
          applicationId: data.application?._id || currentApplicationId,
          travelDateFrom,
          travelDateTo,
          visaOption,
          sharedDriveLink: nextSharedDriveLink,
          travelers: travelers.map((t) => ({ name: String(t.name || "") })),
          passportSuccesses: { ...passportSuccesses, ...nextSuccesses },
          passportDetails: { ...passportDetails, ...nextDetails },
          hiddenPassportTravelerNos,
          uploadedDocSuccesses,
          uploadedDocDetails,
          showTravelDetails: false,
        });
      } catch {
        /* non-blocking background refresh */
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshTravelDetailsState();
      }
    };

    window.addEventListener("focus", refreshTravelDetailsState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshTravelDetailsState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    countryId,
    currentApplicationId,
    hiddenPassportTravelerNos,
    passportDetails,
    passportSuccesses,
    travelDateFrom,
    travelDateTo,
    travelers,
    travelers.length,
    visaOption,
  ]);

  useEffect(() => {
    const raw = (location.hash || "").replace(/^#/, "");
    if (raw !== "travel-details") return;
    setShowTravelDetails(true);
    const timer = window.setTimeout(() => {
      const node = document.getElementById("travel-details");
      if (!node) return;
      const stickyOffset = 150;
      const targetTop = window.scrollY + node.getBoundingClientRect().top - stickyOffset;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname]);

  // Read `?postLoginAction=...` once on mount, then strip it from the URL so
  // a manual refresh doesn't keep re-triggering the resumed flow. The actual
  // dispatch happens in the next effect once everything is hydrated.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("postLoginAction");
    if (!action) return;
    setPendingPostLoginAction(action);
    params.delete("postLoginAction");
    const cleaned = params.toString();
    navigate(`${location.pathname}${cleaned ? `?${cleaned}` : ""}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Freeze body scroll while the post-login resume splash is on top so the
  // user can't accidentally interact with the destination page underneath.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!pendingPostLoginAction) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [pendingPostLoginAction]);

  // Dispatch the saved action once the page has hydrated:
  //   1. countries fetched (country becomes truthy),
  //   2. user is authenticated,
  //   3. travel draft has been read into state (dates + every traveler name).
  // Looking everything up via the ref means we don't have to worry about the
  // handler definitions living below the early return.
  useEffect(() => {
    if (!pendingPostLoginAction) return;
    if (!country || !isAuthenticated) return;
    if (!travelDateFrom || !travelDateTo) return;
    if (!travelers.every((t) => String(t.name || "").trim())) return;
    const fn = postLoginHandlersRef.current[pendingPostLoginAction];
    if (typeof fn !== "function") return;
    setPendingPostLoginAction(null);
    const id = window.setTimeout(() => fn(), 60);
    return () => window.clearTimeout(id);
  }, [pendingPostLoginAction, country, isAuthenticated, travelDateFrom, travelDateTo, travelers]);

  // Safety timeout: if the post-login splash is still showing after 8 seconds
  // (e.g. draft restore failed, dates missing), dismiss it gracefully so the
  // user is never permanently stuck on the loading overlay.
  useEffect(() => {
    if (!pendingPostLoginAction) return;
    const safetyTimer = window.setTimeout(() => {
      setPendingPostLoginAction(null);
      showToast("Couldn't resume automatically. Please re-enter your travel details.", "info");
    }, 8000);
    return () => window.clearTimeout(safetyTimer);
  }, [pendingPostLoginAction]);

  // ── Safe to early-return after all hooks ──
  if (!country && countriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-label="Loading country details">
        <div className="h-10 w-10 rounded-full border-4 border-cyan/25 border-t-cyan animate-spin" />
      </div>
    );
  }

  if (!country) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-text-primary">Destination not found</h1>
        <Button onClick={() => navigate("/")} className="mt-4">Return Home</Button>
      </div>
    );
  }

  const minDepartureYmd = getLocalDateYmd();

  const countryRequiredDocumentKeys = Array.isArray(country.requiredDocuments)
    ? country.requiredDocuments
        .map((key) => {
          if (!key) return "";
          if (typeof key === "string") return key.trim();
          if (typeof key === "object") return String(key.key || key.name || key.id || "").trim();
          return String(key).trim();
        })
        .filter((key) => key && key !== "[object Object]")
    : [];
  const baseRequiredDocumentKeys = countryRequiredDocumentKeys.length
    ? countryRequiredDocumentKeys
    : ["passport"];
  const requiredDocumentKeys = baseRequiredDocumentKeys;
  const requiredDocumentFields = requiredDocumentKeys.map((key) => ({
    key,
    label: getDocumentLabel(key),
    description: getDocumentDescription(key),
    iconClass: getDocumentCatalogIcon(key),
    Icon: getDocumentIcon(key),
    featured: false,
  }));
  const documentSectionCopy = {
    requiredHeading: String(startAppCopy?.requiredDocsHeading || country?.documentSectionCopy?.requiredHeading || "Documents Required").trim() || "Documents Required",
    requiredDescription:
      String(startAppCopy?.requiredDocsDescription || country?.documentSectionCopy?.requiredDescription || "These are the country documents required for this application.").trim() ||
      "These are the country documents required for this application.",
    optionalHeading: String(startAppCopy?.optionalDocsHeading || country?.documentSectionCopy?.optionalHeading || "Optional Documents").trim() || "Optional Documents",
    optionalDescription:
      String(startAppCopy?.optionalDocsDescription || country?.documentSectionCopy?.optionalDescription || "You can also attach other documents in the same Drive link.").trim() ||
      "You can also attach other documents in the same Drive link.",
  };
  const travelDetailsRequiredDocumentFields = requiredDocumentKeys.map((key) => ({
    key,
    label: getDocumentLabel(key),
    description: getDocumentDescription(key),
    iconClass: getDocumentCatalogIcon(key),
    Icon: getDocumentIcon(key),
  }));
  const travelDetailsOtherDocumentFields = (() => {
    const requiredKeys = new Set(requiredDocumentKeys);
    const hasConfiguredOptionalDocuments = Array.isArray(country?.optionalDocuments);
    const configuredOptionalKeys = hasConfiguredOptionalDocuments
      ? country.optionalDocuments
          .map((key) => String(key ?? "").trim())
          .filter((key) => key && key !== "passport" && !requiredKeys.has(key))
      : [];
    const catalogKeys = Array.isArray(documentCatalog)
      ? documentCatalog
          .filter((d) => !d.deleted)
          .map((item) => String(item?.key ?? "").trim())
          .filter((key) => key && key !== "passport" && !requiredKeys.has(key))
      : [];
    const preferredKeys = hasConfiguredOptionalDocuments
      ? configuredOptionalKeys
      : (Array.isArray(documentCatalog) && documentCatalog.length > 0)
        ? catalogKeys
        : OTHER_DOCUMENT_LIBRARY_KEYS.filter((key) => !requiredKeys.has(key));

    return preferredKeys.map((key) => ({
      key,
      label: getDocumentLabel(key),
      description: getDocumentDescription(key),
      iconClass: getDocumentCatalogIcon(key),
      Icon: getDocumentIcon(key),
    }));
  })();

  const renderTravelDetailsDocumentSections = () => (
    <div className="space-y-6">
      {startAppCopy?.showRequiredDocs !== false && countryDisplay?.showDestinationRequiredDocs !== false && (
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col sm:flex-row items-start gap-4 px-5 py-6 sm:px-7">
          <span className="self-center sm:self-start flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[24px] bg-sky-50 text-cyan shadow-inner shadow-sky-100/60">
            <ShieldCheck size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[26px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">{documentSectionCopy.requiredHeading}</h3>
            <p className="mt-2 text-sm text-slate-500 sm:text-[15px]">
              {documentSectionCopy.requiredDescription}
            </p>
          </div>
        </div>

        {travelDetailsRequiredDocumentFields.length ? (
          <div className="grid gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-7 sm:pb-7 xl:grid-cols-3">
            {travelDetailsRequiredDocumentFields.map((doc) => {
              const Icon = doc.Icon;
              return (
                <div
                  key={`travel-doc-required-${doc.key}`}
                  className="group relative flex items-center gap-3 rounded-[1.5rem] bg-white px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:px-4 sm:py-4"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan/8 text-cyan">
                    {doc.iconClass ? (
                      <i className={`${doc.iconClass} text-lg leading-none`} aria-hidden="true" />
                    ) : (
                      <Icon size={16} strokeWidth={2.1} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-normal leading-tight text-text-primary">
                      {getDocumentDisplayName(doc.label)}
                    </p>
                    {doc.description ? (
                      <p className="mt-1 text-xs leading-snug text-text-muted">
                        {doc.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-5 pb-6 text-sm text-slate-500 sm:px-7 sm:pb-7">No document requirements added yet.</p>
        )}
      </div>
      )}

      {startAppCopy?.showOptionalDocs !== false && countryDisplay?.showDestinationOptionalDocs !== false && travelDetailsOtherDocumentFields.length > 0 ? (
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_24px_70px_-42px_rgba(15,23,42,0.24)]">
          <div className="flex flex-col sm:flex-row items-start gap-4 px-5 py-6 sm:px-7">
            <span className="self-center sm:self-start flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[24px] bg-sky-50 text-cyan shadow-inner shadow-sky-100/60">
              <FileText size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[26px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">{documentSectionCopy.optionalHeading}</h3>
              <p className="mt-2 text-sm text-slate-500 sm:text-[15px]">
                {documentSectionCopy.optionalDescription}
            </p>
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-7 sm:pb-7">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {travelDetailsOtherDocumentFields.map((doc) => {
              const Icon = doc.Icon;
              return (
                <div
                  key={`travel-doc-other-${doc.key}`}
                  className="group relative flex items-center gap-3 rounded-[1.5rem] bg-white px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:px-4 sm:py-4"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan/8 text-cyan">
                    {doc.iconClass ? (
                      <i className={`${doc.iconClass} text-lg leading-none`} aria-hidden="true" />
                    ) : (
                      <Icon size={16} strokeWidth={2.1} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-normal leading-tight text-text-primary">
                      {getDocumentDisplayName(doc.label)}
                    </p>
                    {doc.description ? (
                      <p className="mt-1 text-xs leading-snug text-text-muted">
                        {doc.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const handleBack = () => {
    if (showTravelDetails) {
      setShowTravelDetails(false);
      try {
        if (typeof window !== "undefined" && window.location.hash === "#travel-details") {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
      } catch {}
      saveTravelDraft(countryId, {
        applicationId: currentApplicationId,
        travelDateFrom,
        travelDateTo,
        visaOption,
        sharedDriveLink,
        travelers: travelers.map((t) => ({ name: String(t.name || "") })),
        passportSuccesses,
        passportDetails,
        hiddenPassportTravelerNos,
        uploadedDocSuccesses,
        uploadedDocDetails,
        showTravelDetails: false,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate("/", { replace: false });
  };

  const addTraveler = () => {
    setTravelers((prev) => [...prev, createTravelerState()]);
  };

  const incrementTravelerCount = () => {
    addTraveler();
  };

  const removeTravelerAt = (indexToRemove) => {
    setTravelers((prev) => (prev.length > 1
      ? prev.filter((_, index) => index !== indexToRemove)
      : prev));
    setPassportUploading((prev) => {
      const next = { ...prev };
      delete next[indexToRemove + 1];
      return next;
    });
    setPassportErrors((prev) => {
      const next = { ...prev };
      delete next[indexToRemove + 1];
      return next;
    });
    setPassportSuccesses((prev) => {
      const next = { ...prev };
      delete next[indexToRemove + 1];
      return next;
    });
    setPassportDetails((prev) => {
      const next = { ...prev };
      delete next[indexToRemove + 1];
      return next;
    });
    setHiddenPassportTravelerNos((prev) => {
      const next = { ...prev };
      delete next[indexToRemove + 1];
      return next;
    });
  };

  const decrementTravelerCount = () => {
    if (travelers.length <= 1) return;
    removeTravelerAt(travelers.length - 1);
  };

  const updateTravelerName = (index, name) => {
    setTravelers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, name } : t))
    );
  };

  const updateTravelerPassportFile = (index, passportFile) => {
    setTravelers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, passportFile: passportFile || null } : t))
    );
  };

  const handleTravelerPassportFile = async (index, rawFile) => {
    const travelerNo = index + 1;
    const zoneKey = `${travelerNo}-passport`;

    if (!rawFile) {
      updateTravelerPassportFile(index, null);
      setPassportErrors((prev) => {
        const next = { ...prev };
        delete next[travelerNo];
        return next;
      });
      setPassportSuccesses((prev) => {
        const next = { ...prev };
        delete next[travelerNo];
        return next;
      });
      setPassportDetails((prev) => {
        const next = { ...prev };
        delete next[travelerNo];
        return next;
      });
      setUploadedDocSuccesses((prev) => {
        const next = { ...prev };
        delete next[zoneKey];
        return next;
      });
      setUploadedDocDetails((prev) => {
        const next = { ...prev };
        delete next[zoneKey];
        return next;
      });
      try {
        saveTravelDraft(countryId, {
          passportSuccesses: Object.fromEntries(
            Object.entries(passportSuccesses || {}).filter(([k]) => Number(k) !== Number(travelerNo))
          ),
          passportDetails: Object.fromEntries(
            Object.entries(passportDetails || {}).filter(([k]) => Number(k) !== Number(travelerNo))
          ),
          uploadedDocSuccesses: Object.fromEntries(
            Object.entries(uploadedDocSuccesses || {}).filter(([k]) => k !== zoneKey)
          ),
          uploadedDocDetails: Object.fromEntries(
            Object.entries(uploadedDocDetails || {}).filter(([k]) => k !== zoneKey)
          ),
        });
      } catch {}
      return;
    }

    if (!isAuthenticated) {
      requireAuth(() => handleTravelerPassportFile(index, rawFile));
      return;
    }
    const rules = getFileValidationRules(uploadSettings?.allowedFileFormats);
    if (!rules.isValidFile(rawFile)) {
      const err = `Only ${rules.displayLabel} files are allowed.`;
      setPassportErrors((prev) => ({ ...prev, [travelerNo]: err }));
      showToast(err, "error");
      return;
    }
    if (rawFile.size > RAW_UPLOAD_LIMIT_BYTES) {
      const message = "File must be below 20 MB.";
      setPassportErrors((prev) => ({ ...prev, [travelerNo]: message }));
      showToast(message, "error");
      return;
    }
    setPassportOptimizing((prev) => ({ ...prev, [travelerNo]: true }));
    const { file: optimizedFile, error } = await optimizeUploadFile(rawFile, {
      targetBytes: PASSPORT_UPLOAD_MAX_BYTES,
    });
    setPassportOptimizing((prev) => {
      const next = { ...prev };
      delete next[travelerNo];
      return next;
    });
    if (error || !optimizedFile) {
      const message = error || "Could not prepare passport file for upload.";
      setPassportErrors((prev) => ({ ...prev, [travelerNo]: message }));
      showToast(message, "error");
      return;
    }
    if (optimizedFile.size > PASSPORT_UPLOAD_MAX_BYTES) {
      const sizeError = "Document is too large. Please upload a smaller file.";
      setPassportErrors((prev) => ({ ...prev, [travelerNo]: sizeError }));
      showToast(sizeError, "error");
      return;
    }
    updateTravelerPassportFile(index, optimizedFile);
    setHiddenPassportTravelerNos((prev) => {
      const next = { ...prev };
      delete next[travelerNo];
      return next;
    });
    setPassportErrors((prev) => {
      const next = { ...prev };
      delete next[travelerNo];
      return next;
    });
    setPassportUploading((prev) => ({ ...prev, [travelerNo]: true }));

    try {
      const appId = await createCheckoutDraftAndSetId();
      if (!appId) throw new Error("Could not create application draft.");

      const travelerName = String(travelers[index]?.name || "").trim() || `Traveler ${travelerNo}`;
      const formData = new FormData();
      const ext = (optimizedFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = ext ? `.${ext}` : "";
      formData.append(
        "documents",
        new File([optimizedFile], `traveler-${travelerNo}_passport${safeExt}`, { type: optimizedFile.type })
      );
      formData.append("travelerNo", String(travelerNo));
      formData.append("travelerName", travelerName);
      if (String(sharedDriveLink || "").trim()) {
        formData.append("gdriveLink", String(sharedDriveLink || "").trim());
      }
      formData.append("documentsMeta", JSON.stringify([{ docType: "passport", kind: "required" }]));

      const { data } = await api.post(`/users/applications/${appId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data?.success || !data.application) {
        throw new Error(data?.message || "Could not upload passport.");
      }

      const detail = getTravelerPassportDetail(data.application, travelerNo) || {
        fileName: optimizedFile.name,
        fileSize: optimizedFile.size,
        mimeType: optimizedFile.type,
      };
      const nextPassportSuccesses = { ...passportSuccesses, [travelerNo]: true };
      const nextPassportDetails = { ...passportDetails, [travelerNo]: detail };
      const zoneKey = `${travelerNo}-passport`;
      const nextDocSuccesses = { ...uploadedDocSuccesses, [zoneKey]: true };
      const nextDocDetails = {
        ...uploadedDocDetails,
        [zoneKey]: { fileName: detail.fileName, fileSize: detail.fileSize, mimeType: detail.mimeType, url: detail.url },
      };
      setPassportSuccesses(nextPassportSuccesses);
      setPassportDetails(nextPassportDetails);
      setUploadedDocSuccesses(nextDocSuccesses);
      setUploadedDocDetails(nextDocDetails);
      updateTravelerPassportFile(index, null);
      saveTravelDraft(countryId, {
        applicationId: appId,
        travelDateFrom,
        travelDateTo,
        visaOption,
        sharedDriveLink,
        travelers: travelers.map((t) => ({ name: String(t.name || "") })),
        passportSuccesses: nextPassportSuccesses,
        passportDetails: nextPassportDetails,
        hiddenPassportTravelerNos: {
          ...hiddenPassportTravelerNos,
          [travelerNo]: false,
        },
        uploadedDocSuccesses: nextDocSuccesses,
        uploadedDocDetails: nextDocDetails,
        showTravelDetails: false,
      });
      // Sync to application doc successes local storage key used by summary page
      try {
        const docSuccessKey = `application-doc-successes:${appId}`;
        const existingDocSuccesses = (() => {
          try {
            const raw = localStorage.getItem(docSuccessKey);
            return raw ? JSON.parse(raw) : {};
          } catch {
            return {};
          }
        })();
        localStorage.setItem(
          docSuccessKey,
          JSON.stringify({
            ...existingDocSuccesses,
            [zoneKey]: true,
          })
        );
        const docDetailsKey = `application-doc-details:${appId}`;
        const existingDetails = (() => {
          try {
            const raw = localStorage.getItem(docDetailsKey);
            return raw ? JSON.parse(raw) : {};
          } catch {
            return {};
          }
        })();
        localStorage.setItem(
          docDetailsKey,
          JSON.stringify({
            ...existingDetails,
            [zoneKey]: { fileName: detail.fileName, fileSize: detail.fileSize, mimeType: detail.mimeType, url: detail.url },
          })
        );
      } catch (err) {
        console.error("Failed to write application-doc-successes key", err);
      }

      await fetchUserApplications();
      showToast("Passport uploaded successfully.", "success");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Could not upload passport.";
      setPassportErrors((prev) => ({ ...prev, [travelerNo]: message }));
      showToast(message, "error");
    } finally {
      setPassportUploading((prev) => {
        const next = { ...prev };
        delete next[travelerNo];
        return next;
      });
    }
  };

  const handleTravelerDocumentFile = async (index, docKey, rawFile) => {
    if (!isAuthenticated) {
      requireAuth(() => handleTravelerDocumentFile(index, docKey, rawFile));
      return;
    }
    const travelerNo = index + 1;
    const zoneKey = `${travelerNo}-${docKey}`;
    if (!rawFile) {
      setTravelers((prev) =>
        prev.map((t, i) => (i === index ? { ...t, documents: { ...(t.documents || {}), [docKey]: null } } : t))
      );
      setDocErrors((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
      setUploadedDocSuccesses((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
      setUploadedDocDetails((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
      return;
    }
    const rules = getFileValidationRules(uploadSettings?.allowedFileFormats);
    if (!rules.isValidFile(rawFile)) {
      const err = `Only ${rules.displayLabel} files are allowed.`;
      setDocErrors((prev) => ({ ...prev, [zoneKey]: err }));
      showToast(err, "error");
      return;
    }
    setDocOptimizing((prev) => ({ ...prev, [zoneKey]: true }));
    const { file: optimizedFile, error } = await optimizeUploadFile(rawFile);
    setDocOptimizing((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
    if (error || !optimizedFile) {
      const message = error || "Could not prepare file for upload.";
      setDocErrors((prev) => ({ ...prev, [zoneKey]: message }));
      showToast(message, "error");
      return;
    }
    setTravelers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, documents: { ...(t.documents || {}), [docKey]: optimizedFile } } : t))
    );
    setDocErrors((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
    setDocUploading((prev) => ({ ...prev, [zoneKey]: true }));

    try {
      const appId = await createCheckoutDraftAndSetId();
      if (!appId) throw new Error("Could not create application draft.");

      const travelerName = String(travelers[index]?.name || "").trim() || `Traveler ${travelerNo}`;
      const formData = new FormData();
      const ext = (optimizedFile.name.split(".").pop() || "").toLowerCase();
      const safeExt = ext ? `.${ext}` : "";
      formData.append(
        "documents",
        new File([optimizedFile], `traveler-${travelerNo}_${docKey}${safeExt}`, { type: optimizedFile.type })
      );
      formData.append("travelerNo", String(travelerNo));
      formData.append("travelerName", travelerName);
      if (String(sharedDriveLink || "").trim()) {
        formData.append("gdriveLink", String(sharedDriveLink || "").trim());
      }
      formData.append("documentsMeta", JSON.stringify([{ docType: docKey, kind: "required" }]));

      const { data } = await api.post(`/users/applications/${appId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data?.success || !data.application) {
        throw new Error(data?.message || "Could not upload document.");
      }

      const docDetail = getTravelerDocumentDetail(data.application, travelerNo, docKey) || {
        url: null,
        fileName: optimizedFile.name,
        fileSize: optimizedFile.size,
        mimeType: optimizedFile.type,
      };

      setTravelers((prev) =>
        prev.map((t, i) => (i === index ? { ...t, documents: { ...(t.documents || {}), [docKey]: null } } : t))
      );
      setUploadedDocSuccesses((prev) => {
        const next = { ...prev, [zoneKey]: true };
        try {
          const docSuccessKey = `application-doc-successes:${appId}`;
          const raw = localStorage.getItem(docSuccessKey);
          const existing = raw ? JSON.parse(raw) : {};
          localStorage.setItem(docSuccessKey, JSON.stringify({ ...existing, [zoneKey]: true }));
          const docDetailsKey = `application-doc-details:${appId}`;
          const detailsRaw = localStorage.getItem(docDetailsKey);
          const existingDetails = detailsRaw ? JSON.parse(detailsRaw) : {};
          localStorage.setItem(
            docDetailsKey,
            JSON.stringify({
              ...existingDetails,
              [zoneKey]: { fileName: docDetail.fileName, fileSize: docDetail.fileSize, mimeType: docDetail.mimeType, url: docDetail.url },
            })
          );
        } catch { /* ignore */ }
        return next;
      });
      setUploadedDocDetails((prev) => ({
        ...prev,
        [zoneKey]: { fileName: docDetail.fileName, fileSize: docDetail.fileSize, mimeType: docDetail.mimeType, url: docDetail.url },
      }));
      const nextDocSuccesses = { ...uploadedDocSuccesses, [zoneKey]: true };
      const nextDocDetails = {
        ...uploadedDocDetails,
        [zoneKey]: { fileName: docDetail.fileName, fileSize: docDetail.fileSize, mimeType: docDetail.mimeType, url: docDetail.url },
      };
      setUploadedDocSuccesses(nextDocSuccesses);
      setUploadedDocDetails(nextDocDetails);
      saveTravelDraft(countryId, {
        applicationId: appId,
        travelDateFrom,
        travelDateTo,
        visaOption,
        sharedDriveLink,
        travelers: travelers.map((t) => ({ name: String(t.name || "") })),
        passportSuccesses,
        passportDetails,
        hiddenPassportTravelerNos,
        uploadedDocSuccesses: nextDocSuccesses,
        uploadedDocDetails: nextDocDetails,
        showTravelDetails: false,
      });
      await fetchUserApplications();
      showToast("Document uploaded successfully.", "success");
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Could not upload document.";
      setDocErrors((prev) => ({ ...prev, [zoneKey]: message }));
      showToast(message, "error");
    } finally {
      setDocUploading((prev) => { const n = { ...prev }; delete n[zoneKey]; return n; });
    }
  };

  const handleSharedDriveLinkChange = (value) => {
    setSharedDriveLink(value);
    setSharedDriveLinkVerified(false);

    if (driveLinkSaveTimerRef.current) {
      window.clearTimeout(driveLinkSaveTimerRef.current);
      driveLinkSaveTimerRef.current = null;
    }

    const trimmed = String(value || "").trim();
    driveLinkSaveTimerRef.current = window.setTimeout(() => {
      const persist = async () => {
        const normalized = trimmed ? normalizeDriveLink(trimmed) : "";
        setSharedDriveLink(normalized);
        
        if (!normalized) {
          setSharedDriveLinkVerified(false);
          return;
        }

        requireAuth(async () => {
          try {
            const appId = await createCheckoutDraftAndSetId();
            if (appId) {
              const { data } = await api.put(`/users/applications/${appId}`, {
                gdriveLink: normalized,
              });
              if (data?.success && data.application) {
                setCurrentApplicationId(data.application._id || appId);
                await fetchUserApplications();
              }
            }
            setSharedDriveLinkVerified(Boolean(normalized));
            showToast("Google Drive link saved.", "success");
          } catch (err) {
            showToast(err?.response?.data?.message || "Could not save Google Drive link.", "error");
          } finally {
            driveLinkSaveTimerRef.current = null;
          }
        });
      };

      persist();
    }, 1000);
  };

  useEffect(() => () => {
    if (driveLinkSaveTimerRef.current) {
      window.clearTimeout(driveLinkSaveTimerRef.current);
    }
  }, []);

  const formatTravelRange = () => {
    if (!travelDateFrom && !travelDateTo) return "—";
    try {
      const from = travelDateFrom
        ? formatOrdinalDate(new Date(`${travelDateFrom}T12:00:00`))
        : "—";
      const to = travelDateTo
        ? formatOrdinalDate(new Date(`${travelDateTo}T12:00:00`))
        : "—";
      if (travelDateFrom && travelDateTo) return `${from} – ${to}`;
      return travelDateFrom ? `${from}` : to;
    } catch {
      return "—";
    }
  };

  /** Show the actual admin-set visa type on the country basics card (no 3-bucket collapse). */
  const getCardVisaTypeLabel = (visaTypeValue) => {
    const value = String(visaTypeValue || "").trim();
    return value || "Tourist Visa";
  };

  const parsedVisaRequirements = useMemo(() => {
    const splitRequirement = (raw) => {
      const text = String(raw || "").trim();
      if (!text) return null;
      if (/^note\s*:/i.test(text)) {
        return {
          type: "note",
          content: text.replace(/^note\s*:/i, "").trim(),
        };
      }

      const separators = ["::", " — ", " – ", " - ", ":"];
      for (const separator of separators) {
        const index = text.indexOf(separator);
        if (index > 0) {
          const title = text.slice(0, index).trim();
          const description = text.slice(index + separator.length).trim();
          if (title && description) {
            return { type: "item", title, description };
          }
        }
      }

      return {
        type: "item",
        title: text,
        description: "",
      };
    };

    const parsed = visaRequirements.map(splitRequirement).filter(Boolean);
    const items = parsed.filter((entry) => entry.type === "item");
    const note = parsed.find((entry) => entry.type === "note");

    return {
      items,
      note:
        note?.content ||
        "Additional documents may be required depending on your visa type, travel purpose, and embassy guidelines.",
    };
  }, [visaRequirements]);

  const isVisaRequirementsVisible = useMemo(() => {
    const isEnabled =
      destinationPageContent?.showVisaRequirements !== undefined
        ? destinationPageContent.showVisaRequirements
        : countryDisplay?.showVisaRequirements !== false;
    return isEnabled && (parsedVisaRequirements.items.length > 0);
  }, [destinationPageContent?.showVisaRequirements, countryDisplay?.showVisaRequirements, parsedVisaRequirements.items.length]);

  const SUB_NAV = useMemo(() => showTravelDetails
    ? [{ id: "travel-details", label: "Travel Details" }]
    : [
        { id: "info", label: "Info" },
        ...(countryDisplay?.showHowItWorks !== false ? [{ id: "how-it-works", label: destinationPageContent?.destinationSectionHeadings?.howItWorksHeading || "How it works" }] : []),
        ...(isVisaRequirementsVisible ? [{ id: "visa-requirements", label: destinationPageContent?.destinationSectionHeadings?.visaRequirementsHeading || "Visa Requirements" }] : []),
        ...(countryDisplay?.showWhyBookNow !== false ? [{ id: "why-book-now", label: destinationPageContent?.destinationSectionHeadings?.whyBookNowHeading ? `${destinationPageContent.destinationSectionHeadings.whyBookNowHeading}?` : "Why book now?" }] : []),
        ...(countryDisplay?.showDestinationDocuments !== false
          ? [{ id: "document-requirements", label: destinationPageContent?.destinationSectionHeadings?.documentsHeading || "Document Requirements" }]
          : []),
        ...(countryDisplay?.showWhatsIncluded !== false ? [{ id: "whats-included", label: destinationPageContent?.destinationSectionHeadings?.whatsIncludedHeading || "What's Included" }] : []),
        ...(countryDisplay?.showFaqs !== false ? [{ id: "faqs", label: destinationPageContent?.destinationSectionHeadings?.faqsHeading || "FAQs" }] : []),
      ], [showTravelDetails, countryDisplay?.showHowItWorks, isVisaRequirementsVisible, countryDisplay?.showWhyBookNow, countryDisplay?.showDestinationDocuments, countryDisplay?.showWhatsIncluded, countryDisplay?.showFaqs, destinationPageContent?.destinationSectionHeadings]);

  useEffect(() => {
    setActiveSubNav(SUB_NAV[0]?.id || "");
  }, [SUB_NAV]);

  useEffect(() => {
    if (typeof window === "undefined" || !SUB_NAV.length) return;

    const updateActiveSubNav = () => {
      const scrollAnchor = window.scrollY + 190;
      let nextActive = SUB_NAV[0]?.id || "";

      for (const tab of SUB_NAV) {
        const section = document.getElementById(tab.id);
        if (!section) continue;
        if (section.offsetTop <= scrollAnchor) {
          nextActive = tab.id;
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        nextActive = SUB_NAV[SUB_NAV.length - 1]?.id || nextActive;
      }

      setActiveSubNav((prev) => (prev === nextActive ? prev : nextActive));
    };

    updateActiveSubNav();
    window.addEventListener("scroll", updateActiveSubNav, { passive: true });
    window.addEventListener("resize", updateActiveSubNav);

    return () => {
      window.removeEventListener("scroll", updateActiveSubNav);
      window.removeEventListener("resize", updateActiveSubNav);
    };
  }, [SUB_NAV]);

  const scrollToSection = (sectionId) => {
    const node = document.getElementById(sectionId);
    if (!node) return;
    setActiveSubNav(sectionId);
    const stickyOffset = 150;
    const targetTop = window.scrollY + node.getBoundingClientRect().top - stickyOffset;
    window.scrollTo({ top: targetTop, behavior: "smooth" });
  };

  const clearContactGate = () => {
    pendingContactAction.current = null;
    setContactGateDismissed(true);
    setContactModalOpen(false);
  };

  const skipContactGate = () => {
    const fn = pendingContactAction.current;
    pendingContactAction.current = null;
    setContactGateDismissed(true);
    setContactModalOpen(false);
    fn?.();
  };

  const openContactGate = (mode, after) => {
    pendingContactAction.current = after;
    setContactModalMode(mode);
    setContactModalOpen(true);
  };

  const completeContactGate = () => {
    const fn = pendingContactAction.current;
    pendingContactAction.current = null;
    setContactModalOpen(false);
    fn?.();
  };

  /** If a gate opens, runs `after` only after the user saves phone/email in the modal. */
  const gateContactOrRun = (after) => {
    const token = localStorage.getItem("token");
    if (!isAuthenticated || !token || !user) {
      after();
      return;
    }
    if (contactGateDismissed) {
      after();
      return;
    }
    const method = sessionAuthMethod ?? useAuthStore.getState().sessionAuthMethod;
    if (needsPhoneContactGate(method, user)) {
      openContactGate("phone", after);
      return;
    }
    if (needsEmailContactGate(method, user)) {
      openContactGate("email", after);
      return;
    }
    after();
  };

  const openTravelDetails = () => {
    setShowTravelDetails(true);
    trackEvent('start_application', { country: country?.name });
    try {
      if (typeof window !== "undefined" && window.location.hash !== "#travel-details") {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#travel-details`);
      }
    } catch {}
    persistCurrentTravelDraft();
    setTimeout(() => scrollToSection("travel-details"), 100);
  };

  const handleStartApplication = () => {
    gateContactOrRun(() => openTravelDetails());
  };

  /**
   * Persist whatever the guest has typed into the travel-details panel so the
   * form is restored after they bounce through /login. Called from BOTH the
   * "Upload docs now" / "Upload docs later" entry points before any auth
   * redirect can swallow the state.
   */
  const persistCurrentTravelDraft = () => {
    saveTravelDraft(countryId, {
      applicationId: currentApplicationId,
      travelDateFrom,
      travelDateTo,
      visaOption,
      sharedDriveLink,
      travelers: travelers.map((t) => ({ name: String(t.name || "") })),
      passportSuccesses,
      passportDetails,
      hiddenPassportTravelerNos,
      uploadedDocSuccesses,
      uploadedDocDetails,
      showTravelDetails: false,
    });
    localStorage.setItem("lastActiveCountryId", countryId);
    if (country?.name) {
      localStorage.setItem("lastActiveCountryName", country.name);
    }
  };

  // Auto-save draft as user fills the form to prevent data loss on refresh
  useEffect(() => {
    if (showTravelDetails && countryId) {
      const timer = setTimeout(() => {
        persistCurrentTravelDraft();
      }, 500); // Debounce save to avoid hammering storage on every keystroke
      return () => clearTimeout(timer);
    }
  }, [
    showTravelDetails,
    countryId,
    currentApplicationId,
    travelDateFrom,
    travelDateTo,
    visaOption,
    sharedDriveLink,
    travelers,
    passportSuccesses,
    passportDetails,
    hiddenPassportTravelerNos,
    uploadedDocSuccesses,
    uploadedDocDetails,
  ]);

  /** Build the `redirect=` value used when a guest needs to log in mid-flow. */
  const buildLoginRedirect = (postAction) => {
    const params = new URLSearchParams();
    if (postAction) params.set("postLoginAction", postAction);
    const qs = params.toString();
    return `${location.pathname}${qs ? `?${qs}` : ""}`;
  };

  const handleUploadDocsNow = () => {
    if (!validateTravelDetails("Upload documents now")) return;
    const token = localStorage.getItem("token");
    // Save the form ALWAYS — even when bouncing through login — so the user
    // returns to a fully-filled travel-details panel.
    persistCurrentTravelDraft();
    if (!isAuthenticated && !token) {
      const next = buildLoginRedirect("upload-now");
      navigate(`/login?redirect=${encodeURIComponent(next)}`);
      return;
    }
    gateContactOrRun(() => {
      navigate(`/apply/${country.id}`, {
        state: {
          applicationDraftId: String(currentApplicationId || "").trim() || undefined,
          travelerNames: getTravelerNames(),
          travellerCount,
          travelDateFrom,
          travelDateTo,
          visaOption,
          sharedDriveLink,
        },
        replace: true,
      });
    });
  };

  const handleUploadDocsLater = async () => {
    if (!validateTravelDetails("Proceed to Summary")) return;
    const travelerNames = getTravelerNames();

    const token = localStorage.getItem("token");
    persistCurrentTravelDraft();
    if (!isAuthenticated && !token) {
      requireAuth(handleUploadDocsLater);
      return;
    }

    gateContactOrRun(async () => {
      const appId = await createCheckoutDraftAndSetId();
      // null means auth-redirect or handled error — don't double-toast
      if (!appId) return;
      const routeId = getCountryRouteId(country);
      const sourceMeta = {
        from: "travel-details",
        backTo: `/destination/${routeId}`,
        applicationDraftId: appId,
        preserveForm: true,
      };
      try {
        sessionStorage.setItem("paymentSummarySource", JSON.stringify(sourceMeta));
      } catch {
        /* ignore storage errors */
      }
      // Travel draft is already saved by `persistCurrentTravelDraft()` above —
      // just navigate forward.
      navigate(`/destination/${routeId}/summary`, {
        state: {
          ...sourceMeta,
          docsSkipped: true,
          summaryData: {
            applicationId: appId,
            countryId: country.id,
            countryName: country.name,
            flagEmoji: country.flagEmoji || "🛂",
            visaType: visaOption || country.visaType || "e-Visa",
            travellerCount,
            fee: payableToUs,
            baseFee: serviceAmount,
            gstAmount,
            gstRate: effectiveGstRate,
            gstEnabled: effectiveGstEnabled,
            travelerNames,
            docsUploaded: false,
            uploadedDocSuccesses: Object.fromEntries(
              Object.entries(passportSuccesses || {}).map(([travelerNo, success]) => [`${travelerNo}-passport`, success])
            ),
            uploadedDocDetails: passportDetails,
            hiddenPassportTravelerNos,
            travelDateFrom: travelDateFrom || null,
            travelDateTo: travelDateTo || null,
            sharedDriveLink: sharedDriveLink || "",
          },
          applicationPrev: {
            path: `/destination/${routeId}`,
            state: {
              restoreTravelDetails: {
                travelDateFrom: travelDateFrom || null,
                travelDateTo: travelDateTo || null,
                visaOption: visaOption || country.visaType || "e-Visa",
                sharedDriveLink: sharedDriveLink || "",
                travelers: travelers.map((t) => ({ name: String(t.name || "") })),
                hiddenPassportTravelerNos,
              },
            },
          },
        },
        replace: true,
      });
    });
  };

  // Bridge for the post-login resume effect (defined above the early return).
  // Updating the ref each render keeps the resumed handler closure fresh.
  postLoginHandlersRef.current = {
    "upload-now": handleUploadDocsNow,
    "upload-later": handleUploadDocsLater,
  };

  const closePaymentSummaryModal = () => {
    setPaymentSummaryOpen(false);
    setVisaTermsAccepted(false);
  };

  const openPassportPreview = (travelerNo) => {
    const detail = passportDetails?.[travelerNo];
    const previewUrl = getFileUrl(detail?.url);
    if (!detail || !previewUrl) {
      showToast("Preview is not available for this file yet.", "error");
      return;
    }
    setPassportPreview({
      url: previewUrl,
      fileName: detail.fileName || `Traveler ${travelerNo} Passport`,
      mimeType: String(detail.mimeType || "").toLowerCase(),
    });
  };

  const closePassportPreview = () => {
    setPassportPreview(null);
  };

  const openDocumentPreview = (travelerNo, docKey) => {
    const zoneKey = `${travelerNo}-${docKey}`;
    const detail = uploadedDocDetails?.[zoneKey];
    const previewUrl = getFileUrl(detail?.url);
    if (!detail || !previewUrl) {
      showToast("Preview is not available for this file yet.", "error");
      return;
    }
    setDocumentPreview({
      url: previewUrl,
      fileName: detail.fileName || `Traveler ${travelerNo} ${docKey}`,
      mimeType: String(detail.mimeType || "").toLowerCase(),
    });
  };

  const closeDocumentPreview = () => {
    setDocumentPreview(null);
  };

  const hideTravelerPassportLocally = (travelerNo, index) => {
    const removePassport = async () => {
      try {
        const appId = await createCheckoutDraftAndSetId();
        if (!appId) throw new Error("Application draft not found.");

        const { data } = await api.put(`/users/applications/${appId}`, {
          travelerUpdate: {
            travelerNo: String(travelerNo),
            removeDocumentTypes: ["passport"],
          },
        });
        if (!data?.success || !data.application) {
          throw new Error(data?.message || "Could not remove passport.");
        }

        updateTravelerPassportFile(index, null);
        setCurrentApplicationId(data.application._id || appId);
        setPassportSuccesses((prev) => {
          const next = { ...prev };
          delete next[travelerNo];
          return next;
        });
        setPassportDetails((prev) => {
          const next = { ...prev };
          delete next[travelerNo];
          return next;
        });
        setPassportErrors((prev) => {
          const next = { ...prev };
          delete next[travelerNo];
          return next;
        });
        setHiddenPassportTravelerNos((prev) => {
          const next = { ...prev };
          delete next[travelerNo];
          return next;
        });
        try {
          const key = getApplicationDocSuccessStorageKey(appId);
          const raw = localStorage.getItem(key);
          const parsed = raw ? JSON.parse(raw) : {};
          if (parsed && typeof parsed === "object") {
            delete parsed[`${travelerNo}-passport`];
            localStorage.setItem(key, JSON.stringify(parsed));
          }
          const detailsKey = `application-doc-details:${appId}`;
          const rawDetails = localStorage.getItem(detailsKey);
          if (rawDetails) {
            const parsedDetails = JSON.parse(rawDetails);
            delete parsedDetails[`${travelerNo}-passport`];
            localStorage.setItem(detailsKey, JSON.stringify(parsedDetails));
          }
        } catch {
          /* ignore storage errors */
        }
        saveTravelDraft(countryId, {
          applicationId: appId,
          travelDateFrom,
          travelDateTo,
          visaOption,
          sharedDriveLink,
          travelers: travelers.map((t) => ({ name: String(t.name || "") })),
          passportSuccesses: Object.fromEntries(
            Object.entries(passportSuccesses || {}).filter(([key]) => Number(key) !== Number(travelerNo))
          ),
          passportDetails: Object.fromEntries(
            Object.entries(passportDetails || {}).filter(([key]) => Number(key) !== Number(travelerNo))
          ),
          hiddenPassportTravelerNos: Object.fromEntries(
            Object.entries(hiddenPassportTravelerNos || {}).filter(([key]) => Number(key) !== Number(travelerNo))
          ),
          showTravelDetails: false,
        });
        if (passportPreview) {
          closePassportPreview();
        }
        await fetchUserApplications();
        showToast("Passport removed successfully.", "success");
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || "Could not remove passport.", "error");
      }
    };

    void removePassport();
  };

  const passportPreviewIsPdf = passportPreview?.mimeType.includes("pdf")
    || /\.pdf($|\?)/i.test(String(passportPreview?.url || ""));
  const passportPreviewIsImage = /^image\//i.test(String(passportPreview?.mimeType || ""))
    || /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(String(passportPreview?.url || ""));

  const getTravelerNames = () => travelers.map((t) => String(t.name || "").trim());

  const validateTravelDetails = (actionLabel) => {
    setTravelValidationAttempted(true);

    if (!travelDateFrom || !travelDateTo) {
      showToast(`Please select both travel dates before choosing ${actionLabel}.`, "error");
      return false;
    }

    const missingName = travelers.findIndex((t) => !String(t.name || "").trim());
    if (missingName >= 0) {
      showToast(`Please enter traveler ${missingName + 1} name before choosing ${actionLabel}.`, "error");
      return false;
    }
    return true;
  };

  const dateWarning = travelValidationAttempted && (!travelDateFrom || !travelDateTo);


  const createCheckoutDraftAndSetId = async () => {
    const token = localStorage.getItem("token");
    if (!isAuthenticated && !token) {
      // Pull the draft persistence + post-login resume forward here too — this
      // path is reached when the token silently expires mid-flow.
      persistCurrentTravelDraft();
      requireAuth(handleUploadDocsLater);
      showToast("Please log in to continue with your application.", "info");
      return null;
    }

    const travelerNames = travelers.map((t, i) => String(t.name || "").trim() || `Traveler ${i + 1}`);

    setDraftCreating(true);
    try {
      const { data } = await api.post("/users/application/checkout-draft", {
        applicationDraftId: String(currentApplicationId || "").trim() || undefined,
        countryId: country.id,
        countryName: country.name,
        flagEmoji: country.flagEmoji || "🛂",
        visaType: visaOption,
        travelDateFrom: travelDateFrom || null,
        travelDateTo: travelDateTo || null,
        travellerCount,
        travelerNames,
        processingDays: normalizeProcessingDays(country.processingDays),
      });

      if (!data?.success || !data.application?._id) {
        showToast(data?.message || "Could not start application.", "error");
        return null;
      }

      setCurrentApplicationId(data.application._id);
      return data.application._id;
    } catch (err) {
      // Frontend fallback: if draft API fails, reuse latest application for same country
      let candidateBookings = Array.isArray(bookings) ? bookings : [];
      try {
        const listRes = await api.get("/users/applications");
        if (listRes?.data?.success && Array.isArray(listRes.data.applications)) {
          candidateBookings = listRes.data.applications;
        }
      } catch {
        // Keep existing local bookings fallback
      }

      const fallback = candidateBookings
        .filter((b) => ((b?.countryId && b.countryId === country.id) || b?.countryName === country.name))
        .filter((b) => isReusableUnpaidApplication(b))
        .sort((a, b) => {
          const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
          const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
          return tb - ta;
        })[0];

      if (fallback?._id || fallback?.id) {
        const reuseId = fallback._id || fallback.id;
        setCurrentApplicationId(reuseId);
        showToast("Using your latest application draft.", "info");
        return reuseId;
      }

      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        persistCurrentTravelDraft();
        requireAuth(handleUploadDocsLater);
        showToast("Session expired. Please log in again.", "info");
        return null;
      }

      console.error("Draft creation failed:", err);
      showToast(err.response?.data?.message || err.message || "Could not create application draft.", "error");
      return null;
    } finally {
      setDraftCreating(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!isAuthenticated) {
      requireAuth(handleProceedToPayment);
      return;
    }
    if (!visaTermsAccepted || paymentSubmitting) return;
    if (!razorpayReady) {
      showToast(
        razorpayReadyMessage || "Razorpay is not ready yet. Please try again.",
        "error"
      );
      return;
    }

    if (!currentApplicationId) {
      showToast("Application draft is missing. Reopen and try again.", "error");
      return;
    }

    setPaymentSubmitting(true);
    try {
      const fee = payableToUs;

      const result = await openRazorpayForApplication({
        applicationId: currentApplicationId,
        amountRupees: fee,
        description: `${country.name} visa — service fee`,
        applicantName: user.name || "Applicant",
        applicantEmail: user.email || "",
        onSuccess: async () => {
          clearTravelDraft(countryId);
          await fetchUserApplications();
          closePaymentSummaryModal();
          showToast("Payment successful! Complete your application on the dashboard.", "success");
          navigate(`/dashboard/application/${encodeURIComponent(currentApplicationId)}`, { replace: true });
        },
        onDismiss: () => {
          showToast("Payment was not completed. Your application draft is still saved here.", "info");
        },
        onFailure: (message) => {
          showToast(message || "Payment could not be started. Check Razorpay keys in admin settings.", "error");
          navigate(`/dashboard?payment=failed&applicationId=${encodeURIComponent(currentApplicationId)}`, { replace: true });
        },
      });

      if (!result.success && !result.dismissed) {
        /* toasts handled in callbacks */
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || "Something went wrong.", "error");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const destinationInfoSections = (
    <>
      {countryDisplay?.showHowItWorks !== false && (
      <motion.section
        id="how-it-works"
        initial="initial"
        animate="animate"
        variants={fadeUp}
        className="rounded-[2rem] bg-white p-4 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-center gap-2">
          <ListChecks size={18} className="text-cyan" />
          <h2 className="font-playfair text-3xl sm:text-5xl font-bold tracking-tight text-text-primary text-center">
            {destinationPageContent?.destinationSectionHeadings?.howItWorksHeading || "How it works"}
          </h2>
        </div>
        <ol className="space-y-4">
          {howItWorks.map((step, idx) => (
            <motion.li
              key={`${step.title}-${idx}`}
              whileHover={{ scale: 1.012, y: -3 }}
              transition={{ type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="group flex items-start gap-4 rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:bg-[#f8fcff] hover:shadow-[0_24px_55px_rgba(34,211,238,0.08)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan/20 bg-cyan/10 text-cyan font-bold text-sm transition-transform duration-300 ease-out group-hover:scale-105">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-text-primary text-sm sm:text-base transition-colors duration-300 ease-out group-hover:text-cyan">
                  {step.title}
                </p>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{step.description}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </motion.section>
      )}

      {isVisaRequirementsVisible && (
        <motion.section
          id="visa-requirements"
          initial="initial"
          animate="animate"
          variants={fadeUp}
          className="overflow-hidden rounded-[2rem] bg-white px-4 py-6 sm:px-8 sm:py-10"
        >
          <div className="w-full lg:mx-auto lg:max-w-6xl">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                <ScrollText size={34} strokeWidth={2} />
              </div>
              <h2 className="mt-5 font-playfair text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">
                {destinationPageContent?.destinationSectionHeadings?.visaRequirementsHeading || "Visa Requirements"}
              </h2>
              <div className="mx-auto mt-4 flex w-full max-w-xs items-center justify-center gap-4 text-cyan">
                <span className="h-px flex-1 bg-cyan/40" />
                <ShieldCheck size={18} />
                <span className="h-px flex-1 bg-cyan/40" />
              </div>
              <p className="mx-auto mt-5 max-w-3xl text-base sm:text-xl text-text-secondary">
                {destinationPageContent?.destinationSectionHeadings?.visaRequirementsSubtitle || "Please ensure you have the following documents ready for a smooth visa application process."}
              </p>
            </div>

            <div className="mt-10 rounded-[1.75rem] bg-white p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {parsedVisaRequirements.items.map((item, idx) => (
                  <motion.div
                    key={`${item.title}-${idx}`}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ duration: 0.24, ease }}
                    className="flex items-start gap-4 rounded-[1.4rem] bg-white p-4 sm:p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-cyan/8 text-cyan sm:h-20 sm:w-20">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan text-background shadow-[0_14px_28px_rgba(34,211,238,0.22)] sm:h-12 sm:w-12">
                        <i
                          className={`${getVisaRequirementRemixIcon(item.title, item.description)} text-xl leading-none sm:text-2xl`}
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <div className="flex-1 border-l border-dashed border-cyan/35 pl-4">
                      <h3 className="text-sm sm:text-base font-semibold leading-tight text-text-primary">
                        {item.title}
                      </h3>
                      {item.description ? (
                        <p className="mt-2 text-xs sm:text-sm leading-6 text-text-secondary">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.35rem] bg-gradient-to-r from-cyan/10 via-amber-50 to-cyan/5 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
                    <span className="text-2xl font-semibold leading-none">i</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm sm:text-base font-semibold text-amber-700">Please Note</p>
                    <p className="mt-1 text-xs sm:text-sm leading-6 text-text-secondary">
                      {destinationPageContent?.destinationSectionHeadings?.visaRequirementsNote || parsedVisaRequirements.note}
                    </p>
                  </div>
                  <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-amber-500">
                    <ShieldCheck size={24} strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>
          </div>
      </motion.section>
      )}

      {countryDisplay?.showWhyBookNow !== false && (
      <motion.section id="why-book-now" initial="initial" animate="animate" variants={fadeUp} className="mx-auto max-w-4xl rounded-[2rem] bg-white px-3 py-5 sm:px-6 sm:py-7 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-playfair text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">
            {destinationPageContent?.destinationSectionHeadings?.whyBookNowHeading || "Why book now"}
          </h2>
        </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_70px_70px] sm:grid-cols-[minmax(0,1.2fr)_120px_120px] md:grid-cols-[minmax(0,1.5fr)_190px_160px] items-end">
              <div className="px-2 sm:px-5 py-2 sm:py-3" />
              <div className="px-2 sm:px-5 py-2 sm:py-3 text-center">
                <span className="text-xs sm:text-sm md:text-xl font-bold tracking-tight text-cyan">
                  {destinationPageContent?.destinationSectionHeadings?.whyBookNowColWeProvides || "We Provides"}
                </span>
              </div>
              <div className="px-2 sm:px-5 py-2 sm:py-3 text-center">
                <span className="text-xs sm:text-sm md:text-lg font-semibold text-text-muted">
                  {destinationPageContent?.destinationSectionHeadings?.whyBookNowColOthers || "Others"}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200/80">
              {whyBookNow.map((item, idx) => (
                <div
                  key={`${item}-${idx}`}
                  className="grid items-center grid-cols-[minmax(0,1fr)_70px_70px] sm:grid-cols-[minmax(0,1.2fr)_120px_120px] md:grid-cols-[minmax(0,1.5fr)_190px_160px]"
                >
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm md:text-base font-medium text-text-primary">
                    {item}
                  </div>
                  <div className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="mx-auto flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-cyan text-background shadow-[0_10px_20px_rgba(34,211,238,0.18)]">
                      <CircleCheck size={14} strokeWidth={2.4} className="sm:hidden" />
                      <CircleCheck size={16} strokeWidth={2.4} className="hidden sm:block" />
                    </div>
                  </div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4">
                    <div className="mx-auto flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-red-300/70 bg-red-100/70 text-red-400">
                      <X size={14} strokeWidth={2.2} className="sm:hidden" />
                      <X size={18} strokeWidth={2.2} className="hidden sm:block" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </motion.section>
      )}

      {countryDisplay?.showDestinationDocuments !== false && (
        <motion.section
          id="document-requirements"
          initial="initial"
          animate="animate"
          variants={fadeUp}
          className="overflow-hidden rounded-[2rem] bg-white px-4 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:px-6 sm:py-10 lg:px-8"
        >
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle at 15% 35%, rgba(2,132,199,0.12) 0, transparent 18%), radial-gradient(circle at 82% 18%, rgba(59,130,246,0.12) 0, transparent 22%)",
              }}
            />
            <div
              className="pointer-events-none absolute left-[-4%] top-20 hidden h-48 w-48 opacity-35 lg:block"
              aria-hidden="true"
              style={{
                backgroundImage: "radial-gradient(rgba(59,130,246,0.22) 1.2px, transparent 1.2px)",
                backgroundSize: "9px 9px",
                maskImage: "linear-gradient(90deg, black 60%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(90deg, black 60%, transparent 100%)",
              }}
            />
            <div className="pointer-events-none absolute right-6 top-24 hidden text-cyan/35 lg:block" aria-hidden="true">
              <Plane size={44} strokeWidth={2} />
            </div>

            <div className="relative mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan/15 bg-cyan/5 px-4 py-2 text-cyan shadow-[0_12px_30px_rgba(2,132,199,0.08)]">
                <ShieldCheck size={18} strokeWidth={2.2} />
                <span className="text-sm font-medium">
                  {destinationPageContent?.destinationSectionHeadings?.documentsBadge || "Verified & Secure"}
                </span>
              </div>
              <h2 className="font-playfair text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">
                {destinationPageContent?.destinationSectionHeadings?.documentsHeading || "Documents Required"}
                <span className="block text-cyan">for {country.name} Visa</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary sm:text-base">
                {destinationPageContent?.destinationSectionHeadings?.documentsSubtitle || "To proceed with the application immediately"}
              </p>
            </div>

            <div className="relative mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {requiredDocumentFields.length ? requiredDocumentFields.map((doc) => {
              const Icon = doc.Icon;
              return (
                <motion.div
                  key={doc.key}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ duration: 0.2, ease }}
                  className="group relative flex items-center gap-3 rounded-[1.5rem] bg-white px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:px-4 sm:py-4"
                >

                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan/8 text-cyan">
                    {doc.iconClass ? (
                      <i className={`${doc.iconClass} text-xl leading-none`} aria-hidden="true" />
                    ) : (
                      <Icon size={18} strokeWidth={2.1} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <h3 className="text-sm font-normal leading-tight text-text-primary sm:text-sm">
                      {doc.label}
                    </h3>
                    {doc.description ? (
                      <p className="mt-1 text-xs leading-snug text-text-muted">
                        {doc.description}
                      </p>
                    ) : null}
                  </div>

                </motion.div>
              );
            }) : (
              <p className="col-span-full text-sm text-text-muted text-center">
                No requirements configured yet.
              </p>
            )}
            </div>
          </div>
      </motion.section>
      )}

      {countryDisplay?.showWhatsIncluded !== false && (
      <motion.section
        id="whats-included"
        initial="initial"
        animate="animate"
        variants={fadeUp}
        className="relative overflow-hidden rounded-[2.5rem] border border-border bg-white px-4 py-10 sm:px-10 sm:py-16 shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
      >
        <div className="flex flex-col items-center text-center gap-4 mb-12 relative z-10">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-[0_10px_30px_rgba(37,99,235,0.1)] ring-1 ring-blue-100">
            <ShieldCheck size={40} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-playfair text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">
              {destinationPageContent?.destinationSectionHeadings?.whatsIncludedHeading || "What's Included"}
            </h2>
            <p className="text-text-secondary mt-2 text-base sm:text-lg max-w-xl mx-auto">
              {destinationPageContent?.destinationSectionHeadings?.whatsIncludedSubtitle || "Everything you need for a smooth and hassle-free visa process."}
            </p>
          </div>

          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none">
             <Plane size={300} className="rotate-[-15deg]" />
          </div>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-6 relative z-10 pb-4">
          {includedItems.map((item, idx) => {
            const Icon = item.Icon;
            const colorClasses = {
              blue: {
                bg: "bg-blue-50",
                icon: "text-blue-600",
                ring: "ring-blue-100",
                shadow: "shadow-[0_15px_40px_rgba(37,99,235,0.12)]"
              },
              green: {
                bg: "bg-emerald-50",
                icon: "text-emerald-600",
                ring: "ring-emerald-100",
                shadow: "shadow-[0_15px_40px_rgba(16,185,129,0.12)]"
              },
              purple: {
                bg: "bg-purple-50",
                icon: "text-purple-600",
                ring: "ring-purple-100",
                shadow: "shadow-[0_15px_40px_rgba(147,51,234,0.12)]"
              }
            }[item.color] || {
              bg: "bg-gray-50",
              icon: "text-gray-600",
              ring: "ring-gray-100",
              shadow: "shadow-md"
            };

            return (
              <motion.div
                key={`${item.title}-${idx}`}
                whileHover={{ y: -8 }}
                className={`relative flex flex-col items-center text-center p-8 rounded-[2rem] border border-border bg-white shadow-[0_10px_30px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden w-full md:w-[calc(33.333%-16px)] shrink-0 snap-center`}
              >
                {/* Dots pattern overlay */}
                <div className="absolute bottom-0 right-0 w-24 h-24 opacity-[0.05] pointer-events-none">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <defs>
                      <pattern id={`dots-${idx}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill={`url(#dots-${idx})`} />
                  </svg>
                </div>

                <div className={`flex h-24 w-24 items-center justify-center rounded-full ${colorClasses.bg} ${colorClasses.icon} ${colorClasses.shadow} ring-1 ${colorClasses.ring} mb-8`}>
                  {item.Icon ? (
                    <item.Icon size={36} strokeWidth={1.5} />
                  ) : (
                    <i className={`${item.icon || 'ri-shield-check-line'} text-[42px]`} />
                  )}
                </div>

                <h3 className="font-playfair text-xl sm:text-2xl font-bold text-text-primary leading-tight mb-3">
                  {item.title}
                </h3>
                
                {/* Accent line */}
                <div className="w-10 h-1 bg-blue-500 rounded-full mb-6 mx-auto opacity-80" />

                <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
      )}

      {countryDisplay?.showFaqs !== false && (
      <motion.section
        id="faqs"
        initial="initial"
        animate="animate"
        variants={fadeUp}
        className="bg-surface border border-border rounded-2xl p-4 sm:p-6"
      >
        <div className="mb-6 text-center">
          <h2 className="font-playfair text-3xl sm:text-5xl font-bold tracking-tight text-text-primary text-center">
            {destinationPageContent?.destinationSectionHeadings?.faqsHeading || "Frequently Asked Questions"}
          </h2>
        </div>
        <div className="divide-y divide-border/70">
          {faqs.map((faq, idx) => (
            <div key={`${faq.question}-${idx}`} className="py-5 sm:py-6">
              <button
                type="button"
                onClick={() => setOpenFaqIndex((prev) => (prev === idx ? -1 : idx))}
                className="flex w-full items-start justify-between gap-4 text-left"
                aria-expanded={openFaqIndex === idx}
              >
                <span className="pr-4 text-lg sm:text-xl font-normal leading-tight text-text-primary">
                  {faq.question}
                </span>
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text-primary transition-colors">
                  {openFaqIndex === idx ? <X size={20} /> : <Plus size={22} />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openFaqIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease }}
                    className="overflow-hidden"
                  >
                    <motion.p
                      initial={{ y: -8 }}
                      animate={{ y: 0 }}
                      exit={{ y: -8 }}
                      transition={{ duration: 0.22, ease }}
                      className="max-w-5xl pt-4 text-base leading-8 text-text-secondary"
                    >
                      {faq.answer}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.section>
      )}
    </>
  );

  if (!showTravelDetails) {
    return (
      <>
        {pendingPostLoginAction && (
          <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6">
            <div className="h-12 w-12 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin mb-5" />
            <h2 className="text-lg font-semibold text-text-primary text-center">
              Resuming your {country.name} application
            </h2>
            <p className="mt-2 text-sm text-text-muted text-center max-w-md">
              {pendingPostLoginAction === "upload-now"
                ? "Taking you to the document upload page…"
                : "Preparing your application summary…"}
            </p>
            <button
              type="button"
              onClick={() => setPendingPostLoginAction(null)}
              className="mt-6 text-sm text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <DeepPressCountryDetails
          key={countryId}
          country={country}
          display={countryDisplay}
          requiredDocuments={requiredDocumentFields}
          howItWorks={howItWorks}
          whyBookNow={whyBookNow}
          includedItems={includedItems}
          faqs={faqs}
          visaRequirements={parsedVisaRequirements}
          isVisaRequirementsVisible={isVisaRequirementsVisible}
          sectionHeadings={destinationPageContent?.destinationSectionHeadings}
          travelerCount={travellerCount}
          onIncrementTraveler={incrementTravelerCount}
          onDecrementTraveler={decrementTravelerCount}
          governmentFeeTotal={governmentFeeTotal}
          serviceFeeTotal={serviceFeeTotal}
          gstTotal={gstTotal}
          effectiveGstEnabled={effectiveGstEnabled}
          totalServiceFeeTotal={totalServiceFeeTotal}
          finalTotal={finalTotal}
          onStartApplication={handleStartApplication}
        />

        <ContactVerificationModal
          isOpen={contactModalOpen}
          mode={contactModalMode}
          allowSkip
          skipLabel="Add it later"
          onSkip={skipContactGate}
          onClose={clearContactGate}
          onCompleted={completeContactGate}
        />

        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          onComplete={handleAuthComplete} 
        />
      </>
    );
  }

  return (
    <div className="compact-application relative isolate min-h-screen flex flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-transparent" />
      </div>
      {/* Post-login resume splash — full-screen overlay shown when we're about
          to forward the user to /apply/:id or the summary page. Sits on top of
          everything (z-[100]) and matches the page background, so the user
          never visibly returns to the destination page between login and the
          target route. The dispatch effect (above) clears
          `pendingPostLoginAction` once navigation kicks off. */}
      {/* Post-login resume splash — shown after login redirect back to this page */}
      {pendingPostLoginAction && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6">
          <div className="h-12 w-12 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin mb-5" />
          <h2 className="text-lg font-semibold text-text-primary text-center">
            Resuming your {country.name} application
          </h2>
          <p className="mt-2 text-sm text-text-muted text-center max-w-md">
            {pendingPostLoginAction === "upload-now"
              ? "Taking you to the document upload page…"
              : "Preparing your application summary…"}
          </p>
          <button
            type="button"
            onClick={() => setPendingPostLoginAction(null)}
            className="mt-6 text-sm text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <Navbar />

      {!showTravelDetails && (
        <motion.div id="info" initial="initial" animate="animate" variants={fadeUp} className="w-full pt-6 lg:pt-8">
          <div className="relative mx-auto w-full max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-border sm:max-w-[calc(100vw-3rem)] lg:max-w-[calc(100vw-4rem)]">
            <ImageWithShimmer
              src={country.imageUrl}
              alt={country.name}
              className="h-[450px] w-full object-cover object-center sm:h-[520px] md:h-[79vh]"
              priority
              width={1280}
              height={900}
              sizes="100vw"
              interactiveOverlay
            >
              <div className="absolute inset-0 bg-black/55" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center sm:p-8">
                <div className="mb-2 flex justify-center">
                  <CountryHeroFlag country={country} sizeClass="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
                <h1 className="mt-3 text-3xl sm:text-6xl font-bold text-white leading-tight">{country.name} Visa</h1>

                <div className="mx-auto mt-8 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-white/65 uppercase tracking-[0.18em] mb-2">Type</p>
                    <p className="text-base font-semibold text-white">{getCardVisaTypeLabel(country.visaType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/65 uppercase tracking-[0.18em] mb-2">Validity</p>
                    <p className="text-sm font-semibold text-white">{country.validity || "—"}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs text-white/65 uppercase tracking-[0.18em] mb-2">Processing</p>
                    <p className="text-base font-semibold text-white">
                      {country.processingDays
                        ? /^\d+(\s*-\s*\d+)?$/.test(String(country.processingDays).trim())
                          ? `${String(country.processingDays).trim()} days`
                          : String(country.processingDays).trim()
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mx-auto mt-8 w-full max-w-lg">
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={handleStartApplication}
                    className="bg-white text-black shadow-none hover:bg-white/90 hover:shadow-none"
                    id="country-details-hero-start-application-btn"
                  >
                    Start Application
                  </Button>
                </div>
              </div>
            </ImageWithShimmer>
          </div>
        </motion.div>
      )}

      {!showTravelDetails && (
        <div className="sticky top-0 z-40 bg-background/100 border-b border-border/50 shadow-sm hidden sm:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex min-h-18 items-center text-center justify-between gap-4">
            <motion.ul
              layout="position"
              transition={{ duration: 0.42, ease }}
              className="flex min-w-0 flex-1 items-center justify-center gap-8 overflow-x-auto no-scrollbar"
            >
              {SUB_NAV.map((tab) => (
                <motion.li
                  key={tab.id}
                  layout="position"
                  transition={{ duration: 0.42, ease }}
                >
                  <button
                    onClick={() => scrollToSection(tab.id)}
                    className={`relative py-6 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeSubNav === tab.id
                        ? "text-text-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tab.label}
                    {activeSubNav === tab.id ? (
                      <motion.span
                        layoutId="country-details-subnav-underline"
                        className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-cyan"
                        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                      />
                    ) : null}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
            <AnimatePresence initial={false}>
              {!showTravelDetails && showStickyStartCta && (
                <motion.div
                  key="sticky-start-application-cta"
                  className="shrink-0 overflow-hidden"
                  initial={{ opacity: 0, width: 0, x: 24, scale: 0.95 }}
                  animate={{ opacity: 1, width: "auto", x: 0, scale: 1 }}
                  exit={{ opacity: 0, width: 0, x: 24, scale: 0.95 }}
                  transition={{
                    width: { duration: 0.42, ease },
                    x: { duration: 0.42, ease },
                    scale: { duration: 0.38, ease },
                    opacity: { duration: 0.3, ease: "easeOut" },
                  }}
                >
                  <div className="py-4 pl-4 whitespace-nowrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStartApplication}
                      id="country-details-sticky-start-application-btn"
                    >
                      Start Application
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      )}

      <CompactApplication
        startAppCopy={startAppCopy}
        country={country}
        travelers={travelers.map((traveler) => ({ ...traveler, documents: { ...traveler.documents, passport: traveler.passportFile } }))}
        enabledDocs={[
          ...(requiredDocumentFields.some((field) => field.key === "passport") ? [] : [{ key: "passport", label: getDocumentLabel("passport"), description: getDocumentDescription("passport"), Icon: getDocumentIcon("passport") }]),
          ...requiredDocumentFields,
        ]}
        requiredDocs={travelDetailsRequiredDocumentFields.filter((doc) => doc.key !== "passport")}
        uploadSettings={{ ...uploadSettings, enableGDriveUpload: uploadSettings.enableGDriveUpload && startAppCopy?.showGDriveUpload !== false }}
        uploadedDocSuccesses={{ ...uploadedDocSuccesses, ...Object.fromEntries(Object.entries(passportSuccesses).map(([number, value]) => [`${number}-passport`, value && !hiddenPassportTravelerNos[number]])) }}
        uploadedDocDetails={{ ...uploadedDocDetails, ...Object.fromEntries(Object.entries(passportDetails).map(([number, value]) => [`${number}-passport`, hiddenPassportTravelerNos[number] ? null : value])) }}
        docErrors={Object.fromEntries(travelers.flatMap((_, index) => [
          [`${index}-passport`, passportErrors[index + 1]],
          ...requiredDocumentFields.map((field) => [`${index}-${field.key}`, docErrors[`${index + 1}-${field.key}`]])
        ]))}
        docUploading={Object.fromEntries(travelers.flatMap((_, index) => [
          [`${index}-passport`, Boolean(passportUploading[index + 1])],
          ...requiredDocumentFields.map((field) => [`${index}-${field.key}`, Boolean(docUploading[`${index + 1}-${field.key}`])])
        ]))}
        docOptimizing={Object.fromEntries(travelers.flatMap((_, index) => [
          [`${index}-passport`, Boolean(passportOptimizing[index + 1])],
          ...requiredDocumentFields.map((field) => [`${index}-${field.key}`, Boolean(docOptimizing[`${index + 1}-${field.key}`])])
        ]))}
        onUpload={(index, key, file) => key === "passport" ? handleTravelerPassportFile(index, file) : handleTravelerDocumentFile(index, key, file)}
        onPreview={(number, key) => key === "passport" ? openPassportPreview(number) : openDocumentPreview(number, key)}
        onName={updateTravelerName} nameRefs={travelerNameInputRefs}
        onAdd={addTraveler} onRemove={removeTravelerAt}
        sharedDriveLink={sharedDriveLink} onDriveLink={handleSharedDriveLinkChange}
        driveInputRef={sharedDriveLinkInputRef}
        onDriveFocus={(event) => {
          if (!isAuthenticated) {
            event.target.blur();
            requireAuth(() => setTimeout(() => sharedDriveLinkInputRef.current?.focus(), 100));
          }
        }}
        optionalDocs={startAppCopy?.showOptionalDocs !== false && countryDisplay?.showDestinationOptionalDocs !== false ? travelDetailsOtherDocumentFields : []}
        onBack={handleBack} onContinue={handleUploadDocsLater} checkoutStarting={draftCreating}
        flowDateFrom={travelDateFrom} flowDateTo={travelDateTo} minDepartureDate={minDepartureYmd}
        summaryVisaType={visaOption}
        visaTypeOptions={activeVisaTypes.length ? activeVisaTypes.map((type) => type.name) : ["e-Visa", "Sticker Visa"]}
        onFlowChange={(field, value) => {
          if (field === "visaOption") setVisaOption(value);
          else if (field === "travelDateFrom") setTravelDateFrom(value);
          else if (field === "travelDateTo") setTravelDateTo(value);
        }}
        payableNowAmount={payableToUs} governmentFeeTotal={governmentFeeTotal}
        serviceFeeTotal={serviceAmount} gstAmount={gstAmount} effectiveGstEnabled={effectiveGstEnabled}
        overallTotal={finalTotal} summaryTravelRange={formatTravelRange()}
      />

      {paymentSummaryOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="visa-payment-summary-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close"
            onClick={closePaymentSummaryModal}
          />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-modal p-4 sm:p-8">
            <button
              type="button"
              onClick={closePaymentSummaryModal}
              className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            <p className="text-xs uppercase tracking-wider text-cyan font-semibold mb-1">
              Start Your Visa Process
            </p>
            <h2 id="visa-payment-summary-title" className="text-2xl font-bold text-text-primary mb-6 pr-8">
              Payment Summary
            </h2>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-text-muted shrink-0">Visa</span>
                <span className="font-semibold text-text-primary text-right">{country.name} Visa</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-text-muted shrink-0">Visa type</span>
                <span className="font-semibold text-text-primary text-right">{visaOption}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-text-muted shrink-0">Travel date</span>
                <span className="font-semibold text-text-primary text-right">{formatTravelRange()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Travellers</span>
                <span className="font-semibold text-text-primary">{travellerCount}</span>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="text-xs text-text-muted mb-2">Traveler names</p>
                <div className="space-y-1">
                  {travelers.map((t, idx) => (
                    <div key={`pay-name-${idx}`} className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">Traveler {idx + 1}</span>
                      <span className="text-text-primary font-medium">
                        {t.name?.trim() || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-3 mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">
                    Service Fee {travellerCount > 1 ? `(${travellerCount} x ₹${Number(country?.basePrice || 0).toLocaleString("en-IN")})` : ""}
                  </span>
                  <span className="font-medium text-text-primary">
                    ₹{serviceAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                {isGstResolved && effectiveGstEnabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">GST</span>
                    <span className="font-medium text-text-primary">
                      ₹{gstAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <span className="font-semibold text-text-primary">Payable to us</span>
                  <span className="font-bold text-cyan">₹{payableToUs.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <p className="text-xs text-text-muted pt-1">
                Government / embassy fees (if any) are shown separately at payment.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group mb-6">
              <input
                type="checkbox"
                checked={visaTermsAccepted}
                onChange={(e) => setVisaTermsAccepted(e.target.checked)}
                className="mt-1 rounded border-border text-cyan focus:ring-cyan/30"
              />
              <span className="text-sm text-text-secondary leading-snug">
                I agree to the{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener"
                  className="text-cyan hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  terms and conditions
                </Link>{" "}
                and understand the fees above are service charges only.
              </span>
            </label>

            {!razorpayReady && (
              <p className="text-xs text-amber-400 mb-3">
                {razorpayCheckLoading
                  ? "Checking Razorpay setup..."
                  : razorpayReadyMessage || "Razorpay is not ready."}
              </p>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!visaTermsAccepted || !razorpayReady || razorpayCheckLoading}
              loading={paymentSubmitting}
              onClick={handleProceedToPayment}
            >
              Proceed to payment
            </Button>
          </div>
        </div>
      )}

      <FilePreviewModal
        isOpen={Boolean(passportPreview)}
        onClose={closePassportPreview}
        previewFile={passportPreview ? {
          url: passportPreview.url,
          name: passportPreview.fileName,
          type: passportPreview.type || passportPreview.mimeType
        } : null}
      />

      <FilePreviewModal
        isOpen={Boolean(documentPreview)}
        onClose={closeDocumentPreview}
        previewFile={documentPreview ? {
          url: documentPreview.url,
          name: documentPreview.fileName,
          type: documentPreview.type || documentPreview.mimeType
        } : null}
      />

      <ContactVerificationModal
        isOpen={contactModalOpen}
        mode={contactModalMode}
        allowSkip
        skipLabel="Add it later"
        onSkip={skipContactGate}
        onClose={clearContactGate}
        onCompleted={completeContactGate}
      />

      <AnimatePresence>
        {!showTravelDetails && showStickyStartCta && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-border bg-background/80 px-4 py-3 backdrop-blur-xl"
          >
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleStartApplication}
              className="shadow-xl shadow-cyan/20"
              id="country-details-sticky-bottom-start-application-btn"
            >
              Start Application
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onComplete={handleAuthComplete} 
      />
      <Footer />
    </div>
  );
};

export default CountryDetails;
