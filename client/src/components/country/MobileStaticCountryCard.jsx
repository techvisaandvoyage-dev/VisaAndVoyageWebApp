import { memo, useMemo } from "react";
import CountryFlagBadge from "../ui/CountryFlagBadge";

function getCardVisaTypeLabel(visaTypeValue) {
  const value = String(visaTypeValue || "").trim();
  return value || "Tourist Visa";
}

function getProcessingDaysLabel(value) {
  const v = String(value ?? "").trim();
  if (!v) return "-";
  return /^\d+(\s*-\s*\d+)?$/.test(v) ? `${v} days` : v;
}

function getGovernmentFeeValue(country) {
  const candidates = [
    country?.governmentFee,
    country?.governmentFeeOverride,
    country?.governmentFees,
    country?.govtFee,
    country?.govFee,
    country?.embassyFee,
    country?.visaFee,
  ];
  const match = candidates.find((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
  return Number.isFinite(Number(match)) ? Number(match) : 0;
}

function getServiceFeeValue(country) {
  return Number.isFinite(Number(country?.basePrice)) && Number(country.basePrice) >= 0
    ? Number(country.basePrice)
    : 0;
}

function getCountryTotalFeeValue(country) {
  const serviceFee = getServiceFeeValue(country);
  const governmentFee = getGovernmentFeeValue(country);
  const gstEnabled = country?.gstEnabled !== false;
  const gstRate = Number.isFinite(Number(country?.gstRate)) ? Number(country.gstRate) : 18;
  const gstAmount = gstEnabled ? Math.round(serviceFee * (gstRate / 100)) : 0;
  return governmentFee + serviceFee + gstAmount;
}

const DOCUMENT_LABELS = {
  passport: "Passport",
  oldPassport: "Old Passport",
  photo: "Passport Photo",
  idCard: "Aadhaar / ID Card",
  panCard: "PAN Card",
  drivingLicense: "Driving License",
  birthCertificate: "Birth Certificate",
  dobCertificate: "DOB Certificate",
  marriageCertificate: "Marriage Certificate",
  educationCertificate: "Academic Records",
  employmentLetter: "Employment Letter",
  offerLetter: "Offer Letter",
  salarySlip: "Salary Slip",
  form16: "Form 16",
  taxReturn: "ITR / Tax Return",
  bankStatement: "Bank Statement",
  bankCertificate: "Bank Certificate",
  propertyDocuments: "Property Documents",
  travelInsurance: "Travel Insurance",
  healthInsurance: "Health Insurance",
  flightTicket: "Flight Ticket",
  hotelBooking: "Hotel Booking",
  itinerary: "Travel Itinerary",
  coverLetter: "Cover Letter",
  invitationLetter: "Invitation Letter",
  sponsorLetter: "Sponsor Letter",
  policeClearance: "Police Clearance",
  noObjectionCertificate: "NOC",
  yellowFever: "Yellow Fever",
  covidVaccination: "COVID Proof",
  visaApplicationForm: "Visa Form",
  businessLicense: "Business License",
  companyRegistration: "Company Registration",
};

function getCountryDocuments(country) {
  const docs =
    country?.documentRequirements ||
    country?.documentsRequired ||
    country?.requiredDocuments ||
    country?.documentChecklist ||
    country?.visaRequirements ||
    [];

  if (Array.isArray(docs)) {
    return docs.map((d) => (typeof d === "string" ? d : d.label || d.key || "")).filter(Boolean);
  }

  if (typeof docs === "string") {
    return docs
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getDocumentLabel(key, documentCatalog) {
  if (!key) return "";
  if (key.length > 20 || key.includes(" ")) return key;

  const fromCatalog = documentCatalog?.find?.((d) => d.key === key)?.label;
  if (fromCatalog) return fromCatalog;
  if (DOCUMENT_LABELS[key]) return DOCUMENT_LABELS[key];

  return key
    .replace(/^custom_/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
}

const MobileStaticCountryCard = memo(function MobileStaticCountryCard({
  country,
  display,
  documentCatalog = [],
  showVisaRequirements = true,
  showTotalFee = true,
  onClick,
  cardRef,
  id,
}) {
  const allDocs = useMemo(() => getCountryDocuments(country).slice(0, 2), [country]);
  const visaType = useMemo(() => getCardVisaTypeLabel(country.visaType), [country.visaType]);
  const validity = country.validity || "-";
  const fee = useMemo(() => {
    const val = showTotalFee ? getCountryTotalFeeValue(country) : getGovernmentFeeValue(country);
    return `₹${val.toLocaleString("en-IN")}`;
  }, [country, showTotalFee]);

  const bgStyle = useMemo(() => {
    if (country.imageUrl) {
      return { backgroundImage: `url("${country.imageUrl}")` };
    }
    return {
      background: "linear-gradient(135deg, #3d4a26, #242b17)",
    };
  }, [country.imageUrl]);

  return (
    <article
      ref={cardRef}
      id={id}
      className="cc"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={bgStyle}
      role="button"
      aria-label={`Visa for ${country.name}`}
    >
      <i className="cb" />
      <span className="cf">
        <CountryFlagBadge country={country} sizeClass="h-10 w-10" />
      </span>
      <div>
        <h3 className="cn">{country.name}</h3>
        <div className="cs">
          <div>
            <small>Visa type</small>
            <b>{visaType}</b>
          </div>
          <div>
            <small>Validity</small>
            <b>{validity}</b>
          </div>
          <div>
            <small>Total fee</small>
            <b>{fee}</b>
          </div>
        </div>

        {showVisaRequirements && (
          <div className="cx">
            <small className="dh">Documents required</small>
            {allDocs.map((key, idx) => (
              <span key={idx} className="dk">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {getDocumentLabel(key, documentCatalog)}
              </span>
            ))}
            <div className="cy">
              <span>Instant application</span>
              <b>
                Apply now
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </b>
            </div>
          </div>
        )}
      </div>
    </article>
  );
});

export default MobileStaticCountryCard;
