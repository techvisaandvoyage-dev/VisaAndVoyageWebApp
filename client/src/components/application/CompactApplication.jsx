import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronDown, Eye, FileText, Info, Link2, Loader2, Minus, Plus, RefreshCw, ShieldCheck, Trash2, UploadCloud, Users } from "lucide-react";
import { getFileValidationRules } from "../../utils/fileValidation";
import { getUploadLimitForDocType, FINAL_UPLOAD_TARGET_BYTES } from "../../utils/optimizeUploadFile";
import CompactDateRangePicker from "./CompactDateRangePicker";
import "./compactApplication.css";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const displayName = (field, copy = {}, isFileUploadOn = false) => {
  if (field.key === "passport") {
    return copy?.passportUploadLabel || (isFileUploadOn ? (field.label || "Passport") : "Passport photo");
  }
  return (field.label || "").replace(/\s*Upload\s*$/i, "").trim() || field.label || field.key;
};

function CompactFeeTooltipRow({
  label,
  serviceAmount,
  gstAmount,
  hasGst,
  money,
}) {
  const [hovered, setHovered] = useState(false);
  const totalAmount = (serviceAmount || 0) + (gstAmount || 0);

  if (!hasGst) {
    return (
      <div>
        <span>{label}</span>
        <b>{money(serviceAmount)}</b>
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      className="ca-fee-tooltip-trigger group relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => setHovered((v) => !v)}
      aria-haspopup="true"
    >
      <span className="flex items-center gap-1.5">
        {label}
        <Info size={13} className="opacity-60 transition-opacity hover:opacity-100" />
      </span>
      <b>{money(totalAmount)}</b>

      <div
        className={`ca-fee-tooltip ${hovered ? "is-visible" : ""}`}
        role="tooltip"
      >
        <div className="ca-fee-tooltip-row">
          <span>Our Service Fee</span>
          <b>{money(serviceAmount)}</b>
        </div>
        <div className="ca-fee-tooltip-row">
          <span>GST</span>
          <b>{money(gstAmount)}</b>
        </div>
        <div className="ca-fee-tooltip-divider" />
        <div className="ca-fee-tooltip-row ca-fee-tooltip-total">
          <span>Total</span>
          <b>{money(totalAmount)}</b>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, optional, optionalText = "Optional", optionalTooltip, className = "" }) {
  return (
    <section className={`ca-card ${className}`}>
      <h2>
        <Icon size={20} />
        <span>{title}</span>
        {optional && (
          <span className="ca-tag-wrap">
            <span className="ca-tag">{optionalText}</span>
            {optionalTooltip && (
              <span className="ca-info-wrap">
                <span className="ca-info-btn" role="button" tabIndex={0} aria-label="Optional info">
                  <Info size={14} />
                </span>
                <span className="ca-tooltip">{optionalTooltip}</span>
              </span>
            )}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function UploadField({
  field,
  index,
  traveler,
  settings,
  successes,
  details,
  errors,
  uploading,
  optimizing,
  onUpload,
  onPreview,
  copy = {},
  isFileUploadOn = false,
}) {
  const input = useRef(null);
  const key = `${index}-${field.key}`;
  const detail = details[`${index + 1}-${field.key}`];
  const file = traveler.documents?.[field.key];
  const saved = successes[`${index + 1}-${field.key}`];
  const rules = getFileValidationRules(settings?.allowedFileFormats);
  const busy = uploading[key] || optimizing[key];
  const disabled = busy;
  const labelText = displayName(field, copy, isFileUploadOn);

  // A file is only considered uploaded if an actual file object exists OR
  // backend/detail has a file name or url
  const hasFile = Boolean(
    (file && (file instanceof File || file?.name)) ||
    (saved && detail && (detail.url || detail.fileName)) ||
    (file && typeof file === "string")
  );

  const filename = file?.name || detail?.fileName || (hasFile ? labelText : "");
  const uploadButtonLabel = copy?.uploadButtonText || "Upload";

  const handlePreview = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (detail?.url && onPreview) {
      onPreview(index + 1, field.key);
    } else if (file instanceof File || file instanceof Blob) {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
    } else if (onPreview) {
      onPreview(index + 1, field.key);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onUpload(index, field.key, null);
    if (input.current) {
      input.current.value = "";
    }
  };

  return (
    <div className="ca-field">
      <label htmlFor={`ca-upload-${key}`}>{labelText}</label>
      <div className={`ca-upload ${busy ? "is-uploading" : ""} ${hasFile ? "has-file" : ""}`}>
        {/* Animated smooth progress bar when uploading or optimizing */}
        {busy && (
          <div className="ca-upload-progress">
            <div className="ca-upload-progress-bar" />
          </div>
        )}

        {/* Content area: Busy state, Uploaded file state, or Empty state */}
        {busy ? (
          <div className="ca-upload-busy-info">
            <Loader2 size={17} className="ca-upload-spinner animate-spin" />
            <span className="ca-upload-busy-text">
              {optimizing[key] ? "Compressing file…" : "Uploading file…"}
            </span>
          </div>
        ) : hasFile ? (
          <div className="ca-file-info" title={filename}>
            <field.Icon size={18} className="ca-file-icon" />
            <span className="ca-file-check-pill">
              <Check size={12} strokeWidth={2.5} />
            </span>
            <span className="ca-filename-text">{filename}</span>
          </div>
        ) : (
          <div className="ca-upload-empty-info">
            <field.Icon size={18} className="ca-file-icon" />
            <small title={`${labelText} · max ${getUploadLimitForDocType(field.key).label}`}>
              {labelText} · max ${getUploadLimitForDocType(field.key).label}
            </small>
          </div>
        )}

        {/* Actions when not busy */}
        {!busy && (
          hasFile ? (
            <div className="ca-upload-actions">
              <button
                type="button"
                className="ca-small-btn ca-btn-preview"
                title="Preview document"
                onClick={handlePreview}
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
              <button
                type="button"
                className="ca-small-btn ca-btn-replace"
                title="Replace file"
                onClick={() => input.current?.click()}
              >
                <RefreshCw size={12} />
                <span>Replace</span>
              </button>
              <button
                type="button"
                className="ca-small-btn ca-btn-remove"
                title="Remove file"
                onClick={handleRemove}
              >
                <Trash2 size={12} />
                <span>Remove</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ca-small-button ca-upload-action-btn"
              disabled={disabled}
              onClick={() => input.current?.click()}
            >
              <UploadCloud size={14} />
              <span>{uploadButtonLabel}</span>
            </button>
          )
        )}

        <input
          ref={input}
          id={`ca-upload-${key}`}
          type="file"
          hidden
          accept={rules.acceptString}
          disabled={disabled}
          onChange={(event) => {
            onUpload(index, field.key, event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
      </div>
      {errors[key] && <p role="alert" className="ca-error">{errors[key]}</p>}
    </div>
  );
}

export default function CompactApplication({
  startAppCopy = {},
  country,
  travelers,
  enabledDocs = [],
  requiredDocs = [],
  uploadSettings = {},
  uploadedDocSuccesses = {},
  uploadedDocDetails = {},
  docErrors = {},
  docUploading = {},
  docOptimizing = {},
  onUpload,
  onPreview,
  onName,
  nameRefs,
  onAdd,
  onRemove,
  sharedDriveLink = "",
  onDriveLink,
  onOtherDocs,
  onRemoveOtherDoc,
  renderProfileDetails,
  onBack,
  onContinue,
  checkoutStarting,
  flowDateFrom,
  flowDateTo,
  summaryVisaType,
  onFlowChange,
  payableNowAmount,
  governmentFeeTotal,
  serviceFeeTotal,
  gstAmount,
  effectiveGstEnabled,
  overallTotal,
  summaryTravelRange,
  visaTypeOptions,
  minDepartureDate,
  optionalDocs = [],
  onDriveFocus,
  driveInputRef,
}) {
  const [open, setOpen] = useState(0);
  const [visaDropdownOpen, setVisaDropdownOpen] = useState(false);
  const visaDropdownRef = useRef(null);
  const cards = useRef([]);

  useEffect(() => {
    if (!visaDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (visaDropdownRef.current && !visaDropdownRef.current.contains(event.target)) {
        setVisaDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setVisaDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [visaDropdownOpen]);
  const busy = checkoutStarting || Object.values(docUploading).some(Boolean) || Object.values(docOptimizing).some(Boolean);
  const today = minDepartureDate || new Date().toLocaleDateString("en-CA");
  const destination = /^(us|usa|united states( of america)?)$/i.test(country?.name || "") ? "US" : (country?.name || "");
  const visaOptions = visaTypeOptions?.length ? visaTypeOptions : [...new Set([summaryVisaType, country?.visaType].filter(Boolean))];

  const replaceCountry = (text, fallback = "") => {
    const raw = text || fallback;
    return raw.replace(/{country}/gi, destination);
  };

  const isFileUploadOn = Boolean(uploadSettings?.enableFileUpload);
  const showPassport = startAppCopy?.showPassportUpload !== false;
  const passportField = enabledDocs.find((d) => d.key === "passport") || {
    key: "passport",
    label: "Passport",
    description: "Passport bio page",
    Icon: FileText,
  };

  const rawRequiredDocs = (requiredDocs && requiredDocs.length > 0)
    ? requiredDocs
    : enabledDocs.filter((field) => field.key !== "passport" || !showPassport);
  const finalRequiredDocs = rawRequiredDocs.length > 0 ? rawRequiredDocs : enabledDocs;

  const remove = (index) => {
    if (onRemove(index) === false) return;
    setOpen((current) => (current === index ? Math.min(index, travelers.length - 2) : current > index ? current - 1 : current));
  };

  const upload = (traveler, index, field) => (
    <UploadField
      key={field.key}
      traveler={traveler}
      index={index}
      field={field}
      onUpload={onUpload}
      onPreview={onPreview}
      settings={uploadSettings}
      successes={uploadedDocSuccesses}
      details={uploadedDocDetails}
      errors={docErrors}
      uploading={docUploading}
      optimizing={docOptimizing}
      copy={startAppCopy}
      isFileUploadOn={isFileUploadOn}
    />
  );

  const travelerPrefix = startAppCopy?.travelerPrefix || "Traveler";

  const nameInput = (traveler, index, inline = false) => (
    <input
      id={`ca-name-${index}`}
      ref={(el) => {
        if (nameRefs?.current) nameRefs.current[index] = el;
      }}
      className={inline ? "ca-inline-name" : "ca-input"}
      aria-label={inline ? `${travelerPrefix} ${index + 1} full name` : undefined}
      value={traveler.name}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onName(index, event.target.value)}
      placeholder={inline ? `${travelerPrefix} ${index + 1} – full name` : (startAppCopy?.fullNamePlaceholder || "e.g. Rahul Sharma")}
    />
  );

  return (
    <main className="ca-page">
      <div className="ca-layout">
        <div className="ca-form">
          <div className="ca-back-row">
            <button type="button" className="ca-back" onClick={onBack}>
              <ArrowLeft size={18} />Back
            </button>
          </div>
          <header className="ca-heading">
            {Boolean(startAppCopy?.badgeText) && (
              <div className="ca-badge">{startAppCopy.badgeText}</div>
            )}
            <h1>{startAppCopy?.title || startAppCopy?.mainHeading || `Start your application`}</h1>
            <p>{replaceCountry(startAppCopy?.subtitle, "Fill travel details below to continue with your {country} visa process.")}</p>
          </header>

          <div className="ca-top-row">
            <Card title={startAppCopy?.visaTypeCardTitle || startAppCopy?.visaTypeLabel || "Which visa do you need?"} icon={FileText}>
              <div className="ca-field">
                <label id="ca-visa-label" htmlFor="ca-visa">{startAppCopy?.visaTypeLabel || "Type of Visa"}</label>
                <div className="ca-select-wrap" ref={visaDropdownRef}>
                  <button
                    type="button"
                    id="ca-visa"
                    className={`ca-input ca-select-trigger ${visaDropdownOpen ? "is-open" : ""}`}
                    aria-haspopup="listbox"
                    aria-expanded={visaDropdownOpen}
                    aria-labelledby="ca-visa-label"
                    onClick={() => setVisaDropdownOpen((prev) => !prev)}
                  >
                    <span>{summaryVisaType || visaOptions[0] || "Select visa type"}</span>
                    <ChevronDown size={18} className={`ca-select-chevron ${visaDropdownOpen ? "is-open" : ""}`} />
                  </button>
                  {visaDropdownOpen && (
                    <div className="ca-select-menu" role="listbox" aria-labelledby="ca-visa-label">
                      {visaOptions.map((visa) => {
                        const isSelected = visa === summaryVisaType;
                        return (
                          <div
                            key={visa}
                            role="option"
                            aria-selected={isSelected}
                            className={`ca-select-option ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                              onFlowChange("visaOption", visa);
                              setVisaDropdownOpen(false);
                            }}
                          >
                            <span>{visa}</span>
                            {isSelected && <Check size={16} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card title={startAppCopy?.calendarHeading || "Select Travel Date"} icon={CalendarDays}>
              <CompactDateRangePicker
                departureDate={flowDateFrom || ""}
                returnDate={flowDateTo || ""}
                minDate={today}
                departureLabel={startAppCopy?.departureLabel || "DEPARTURE"}
                returnLabel={startAppCopy?.returnLabel || "RETURN"}
                departurePlaceholder={startAppCopy?.departurePlaceholder || "dd-mm-yyyy"}
                returnPlaceholder={startAppCopy?.returnPlaceholder || "dd-mm-yyyy"}
                onDateChange={(field, value) => {
                  onFlowChange(field === "departure" ? "travelDateFrom" : "travelDateTo", value);
                }}
              />
            </Card>
          </div>

          <div className="ca-stack" id="document-upload-section">
            <Card title={startAppCopy?.travelerSectionHeading || "Who is travelling?"} icon={Users}>
              <div className="ca-stepper">
                <div>
                  <b>{startAppCopy?.stepperHeading || "How many people are applying?"}</b>
                </div>
                <button
                  type="button"
                  aria-label="Fewer travelers"
                  disabled={travelers.length <= 1 || busy}
                  onClick={() => remove(travelers.length - 1)}
                >
                  <Minus size={18} />
                </button>
                <b aria-live="polite">{travelers.length}</b>
                <button
                  type="button"
                  aria-label="More travelers"
                  disabled={busy}
                  onClick={() => {
                    onAdd();
                    if (isFileUploadOn) {
                      setOpen(travelers.length);
                    }
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Toggle ON: Accordion view showing all documents per traveler (Image 3) */}
              {isFileUploadOn ? (
                <div className="ca-accordions">
                  {travelers.map((traveler, index) => {
                    const count = enabledDocs.filter(
                      (field) =>
                        uploadedDocSuccesses[`${index + 1}-${field.key}`] ||
                        uploadedDocDetails[`${index + 1}-${field.key}`]?.url ||
                        (traveler.documents?.[field.key] &&
                          !docErrors[`${index}-${field.key}`] &&
                          !docUploading[`${index}-${field.key}`])
                    ).length;
                    const complete = Boolean(traveler.name.trim()) && count === enabledDocs.length;
                    const travelerLabel = `${travelerPrefix} ${index + 1}`;

                    return (
                      <article
                        key={index}
                        ref={(el) => {
                          cards.current[index] = el;
                        }}
                        className={`ca-accordion ${open === index ? "is-open" : ""}`}
                      >
                        <div
                          className="ca-accordion-header"
                          onClick={(event) => {
                            if (!event.target.closest("button,input")) {
                              setOpen(open === index ? -1 : index);
                            }
                          }}
                        >
                          {nameInput(traveler, index, true)}
                          <span className="ca-pill">
                            {count} of {enabledDocs.length} uploaded
                          </span>
                          <span
                            className={`ca-status ${complete ? "is-complete" : ""}`}
                            role="img"
                            aria-label={complete ? "Complete" : "Incomplete"}
                          >
                            {complete && <Check size={16} />}
                          </span>
                          {open === index && travelers.length > 1 && (
                            <button
                              type="button"
                              className="ca-icon-button"
                              disabled={busy}
                              aria-label={`Remove ${travelerLabel}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(index);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="ca-icon-button"
                            aria-expanded={open === index}
                            aria-controls={`ca-panel-${index}`}
                            aria-label={`${open === index ? "Hide" : "Show"} documents for ${travelerLabel}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(open === index ? -1 : index);
                            }}
                          >
                            <ChevronDown size={18} />
                          </button>
                        </div>
                        <div
                          id={`ca-panel-${index}`}
                          role="region"
                          aria-label={`${travelerLabel} documents`}
                          hidden={open !== index}
                          className="ca-accordion-body"
                        >
                          <h3>Upload documents</h3>
                          <div className="ca-doc-grid">
                            {enabledDocs.map((field) => upload(traveler, index, field))}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* Toggle OFF: Card grid view showing ONLY active Passport upload (Image 2) */
                <div className={`ca-travelers ${travelers.length === 1 ? "ca-single" : ""}`}>
                  {travelers.map((traveler, index) => {
                    const travelerLabel = `${travelerPrefix} ${index + 1}`;
                    return (
                      <article className="ca-traveler" key={index}>
                        <div className="ca-traveler-header">
                          <h3>{travelerLabel}</h3>
                          {travelers.length > 1 && (
                            <div className="ca-traveler-header-actions">
                              <button
                                type="button"
                                className="ca-icon-button"
                                disabled={busy}
                                aria-label={`Remove ${travelerLabel}`}
                                onClick={() => remove(index)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="ca-field">
                          <label htmlFor={`ca-name-${index}`}>
                            {startAppCopy?.fullNameLabel || "Full name (same as in passport)"}
                          </label>
                          {nameInput(traveler, index)}
                        </div>
                        {upload(traveler, index, passportField)}
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  className="ca-add-traveler-btn"
                  disabled={busy}
                  onClick={() => {
                    onAdd();
                    if (isFileUploadOn) {
                      setOpen(travelers.length);
                    }
                  }}
                >
                  <Plus size={16} />
                  {startAppCopy?.addTravelerButtonText || "Add traveler"}
                </button>
              </div>
            </Card>

            {uploadSettings?.enableGDriveUpload && startAppCopy?.showGDriveUpload !== false && (
              <Card
                title={startAppCopy?.driveCardTitle || "Document Drive Link (for all travelers)"}
                icon={Link2}
                optional={Boolean(startAppCopy?.driveCardBadge || "Optional")}
                optionalText={startAppCopy?.driveCardBadge || "Optional"}
                optionalTooltip={startAppCopy?.driveCardTooltip || "You can continue to payment now and share the Google Drive link later from your application dashboard."}
              >
                <p>
                  {startAppCopy?.driveCardDescription || "Upload all required and optional documents to Google Drive and share the folder link here. This link will be applicable for all travelers."}
                </p>
                <div className="ca-field">
                  <div className="ca-label-row">
                    <label htmlFor="ca-drive">
                      {startAppCopy?.driveInputLabel || "Google Drive Link"}
                    </label>
                    <div className="ca-info-wrap">
                      <button
                        type="button"
                        className="ca-info-btn"
                        aria-label="Google Drive sharing guide"
                      >
                        <Info size={14} />
                      </button>
                      <div className="ca-guide-popover">
                        <div className="ca-guide-head">
                          <span className="ca-guide-badge">GD</span>
                          <h5>{startAppCopy?.driveGuideTitle || "How to Share Folder Link"}</h5>
                        </div>
                        <ol>
                          <li>{startAppCopy?.driveGuideStep1 || "Upload all required documents to your Google Drive folder."}</li>
                          <li>
                            {startAppCopy?.driveGuideStep2 ? (
                              startAppCopy.driveGuideStep2
                            ) : (
                              <>Right-click the folder and select <b>Share &gt; Share</b>.</>
                            )}
                          </li>
                          <li>
                            {startAppCopy?.driveGuideStep3 ? (
                              startAppCopy.driveGuideStep3
                            ) : (
                              <>Under <b>General access</b>, change <b>Restricted</b> to <b>Anyone with the link</b>.</>
                            )}
                          </li>
                          <li>
                            {startAppCopy?.driveGuideStep4 ? (
                              startAppCopy.driveGuideStep4
                            ) : (
                              <>Make sure the role is set to <b>Viewer</b>.</>
                            )}
                          </li>
                          <li>
                            {startAppCopy?.driveGuideStep5 ? (
                              startAppCopy.driveGuideStep5
                            ) : (
                              <>Click <b>Copy link</b> and paste it in the field below.</>
                            )}
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  <input
                    className="ca-input"
                    id="ca-drive"
                    ref={driveInputRef}
                    onFocus={onDriveFocus}
                    type="url"
                    value={sharedDriveLink}
                    onChange={(event) => onDriveLink(event.target.value)}
                    placeholder={startAppCopy?.driveInputPlaceholder || "https://drive.google.com/your-folder-link"}
                  />
                </div>
              </Card>
            )}

            {startAppCopy?.showRequiredDocs !== false && finalRequiredDocs.length > 0 && (
              <Card
                title={startAppCopy?.requiredDocsHeading || "Documents Required"}
                icon={ShieldCheck}
              >
                <p>
                  {startAppCopy?.requiredDocsDescription || "These are the country documents required for this application."}
                </p>
                <div className="ca-doc-grid ca-required">
                  {finalRequiredDocs.map((field) => (
                    <div key={field.key}>
                      <field.Icon size={22} />
                      <div>
                        <b>{displayName(field, startAppCopy, isFileUploadOn)}</b>
                        <small>{field.description}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {startAppCopy?.showOptionalDocs !== false && (optionalDocs.length > 0 || (uploadSettings?.enableFileUpload && onOtherDocs)) && (
              <Card
                title={startAppCopy?.optionalDocsHeading || "Optional Documents"}
                icon={FileText}
              >
                <p>
                  {startAppCopy?.optionalDocsDescription || "You can also attach other documents in the same Drive link."}
                </p>
                {uploadSettings?.enableFileUpload && onOtherDocs && travelers.map((traveler, index) => (
                  <div className="ca-extra" key={index}>
                    <label htmlFor={`ca-other-${index}`}>
                      {traveler.name.trim() || `${travelerPrefix} ${index + 1}`} · Other documents
                    </label>
                    <input
                      id={`ca-other-${index}`}
                      type="file"
                      multiple
                      accept={getFileValidationRules(uploadSettings?.allowedFileFormats).acceptString}
                      onChange={(event) => {
                        onOtherDocs(index, event.target.files || []);
                        event.target.value = "";
                      }}
                    />
                    <small>Max {Math.round(FINAL_UPLOAD_TARGET_BYTES / 1024)} KB each after optimization</small>
                    {traveler.otherDocuments?.map((file, docIndex) => (
                      <div className="ca-extra-file" key={docIndex}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => onRemoveOtherDoc(index, docIndex)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
                {optionalDocs.length > 0 && (
                  <div className="ca-doc-grid ca-required">
                    {optionalDocs.map((field) => (
                      <div key={field.key}>
                        <field.Icon size={22} />
                        <div>
                          <b>{displayName(field, startAppCopy, isFileUploadOn)}</b>
                          <small>{field.description}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {renderProfileDetails && (
                  <details className="ca-profile">
                    <summary>Saved travelers and additional traveler details</summary>
                    {travelers.map((traveler, index) => (
                      <div key={index}>
                        <h3>{travelerPrefix} {index + 1}</h3>
                        {renderProfileDetails(traveler, index)}
                      </div>
                    ))}
                  </details>
                )}
              </Card>
            )}
          </div>

          <button
            type="button"
            className="ca-continue"
            disabled={checkoutStarting}
            onClick={onContinue}
          >
            {checkoutStarting ? "Continuing…" : (startAppCopy?.proceedButtonText || "Proceed to Summary")}
          </button>
        </div>

        <aside className="ca-card ca-summary">
          <h2>{replaceCountry(startAppCopy?.applyForTitle, "Apply for {country}")}</h2>
          <div className="ca-amount">
            <small>{startAppCopy?.amountToPayLabel || "AMOUNT TO BE PAID NOW"}</small>
            <strong>{money(payableNowAmount)}</strong>
            <span>
              {travelers.length} {travelers.length === 1 ? (startAppCopy?.travelerPrefix || "traveller").toLowerCase() : `${(startAppCopy?.travelerPrefix || "traveller").toLowerCase()}s`}
            </span>
          </div>
          <dl className="ca-summary-details">
            <div>
              <dt>{startAppCopy?.summaryVisaTypeLabel || "VISA TYPE"}</dt>
              <dd>{summaryVisaType}</dd>
            </div>
            <div>
              <dt>{startAppCopy?.summaryTravelDatesLabel || "TRAVEL DATES"}</dt>
              <dd>{flowDateFrom && flowDateTo ? summaryTravelRange : "—"}</dd>
            </div>
            <div>
              <dt>{startAppCopy?.summaryTravelerNamesLabel || "TRAVELER NAMES"}</dt>
              <dd className="ca-chips">
                {travelers.map((traveler, index) => (
                  <span key={index}>{traveler.name.trim() || `${travelerPrefix} ${index + 1}`}</span>
                ))}
              </dd>
            </div>
          </dl>
          <div className="ca-fees">
            <div>
              <span>{startAppCopy?.summaryGovFeeLabel || "Government Fee"}</span>
              <b>{money(governmentFeeTotal)}</b>
            </div>
            <CompactFeeTooltipRow
              label={startAppCopy?.summaryServiceFeeLabel || "Our Service Fee"}
              serviceAmount={serviceFeeTotal}
              gstAmount={gstAmount}
              hasGst={Boolean(effectiveGstEnabled && gstAmount > 0)}
              money={money}
            />
            <div className="ca-total">
              <span>Total to pay</span>
              <b>{money(overallTotal)}</b>
            </div>
          </div>
          <p className="ca-security">
            <ShieldCheck size={20} />
            <span>Your payment is safe and fully encrypted.</span>
          </p>
        </aside>
      </div>
    </main>
  );
}
