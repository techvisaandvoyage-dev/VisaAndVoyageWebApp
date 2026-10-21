// ============================================================
//  Badge Component
//  Displays status labels with color-coded styles.
//  Variants map to BOOKING_STATUS values.
// ============================================================

/**
 * @param {"pending"|"approved"|"review"|"rejected"|"submitted"|"easy"|"moderate"|"hard"} variant
 * @param {boolean} dot  — show animated status dot
 * @param {"sm"|"md"} size
 */
const Badge = ({ children, variant = "pending", dot = false, size = "md", className = "" }) => {
  // ── Variant color map ────────────────────────────────────
  const variants = {
    // Booking statuses
    pending:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
    approved:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    review:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
    rejected:  "bg-red-500/15 text-red-400 border-red-500/30",
    submitted: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    pending_payment: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    doc_pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    drive_link_pending: "bg-cyan/10 text-cyan border-cyan/30",

    // Difficulty levels
    easy:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    moderate:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
    hard:      "bg-red-500/15 text-red-400 border-red-500/30",

    // Neutral / general
    default:   "bg-surface-3 text-text-secondary border-border",
    cyan:      "bg-cyan/10 text-cyan border-cyan/30",
    gold:      "bg-gold/10 text-gold border-gold/30",
  };

  // Dot color matches badge color
  const dotColors = {
    pending:   "bg-amber-400",
    approved:  "bg-emerald-400",
    review:    "bg-blue-400",
    rejected:  "bg-red-400",
    submitted: "bg-purple-400",
    cancelled: "bg-zinc-400",
    pending_payment: "bg-orange-400",
    doc_pending: "bg-amber-400",
    drive_link_pending: "bg-cyan",
    easy:      "bg-emerald-400",
    moderate:  "bg-amber-400",
    hard:      "bg-red-400",
    default:   "bg-text-muted",
    cyan:      "bg-cyan",
    gold:      "bg-gold",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-2xs",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${variants[variant] || variants.default}
        ${sizes[size]}
        ${className}
      `}
    >
      {/* Optional animated dot */}
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full flex-shrink-0 status-dot-pulse
            ${dotColors[variant] || "bg-text-muted"}
          `}
        />
      )}
      {children}
    </span>
  );
};

// ── Convenience exports for specific statuses ──────────────
export const StatusBadge = ({ status, ...props }) => {
  if (status === "dash") {
    return <span className="text-text-muted px-2 py-1">-</span>;
  }

  const labels = {
    pending:   "Pending",
    approved:  "Approved",
    review:    "Under Review",
    rejected:  "Rejected",
    submitted: "Submitted",
    cancelled: "Cancelled",
    pending_payment: "Pending Payment",
    doc_pending: "Missing Documents",
    drive_link_pending: "Upload Drive Link",
  };
  return (
    <Badge variant={status} dot {...props}>
      {labels[status] || status}
    </Badge>
  );
};

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const StatusDropdown = ({ currentStatus, onChange, disabled, options = ["pending", "review", "submitted", "approved", "rejected"] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 focus:outline-none disabled:opacity-50 transition-opacity hover:opacity-80 rounded-full border border-transparent hover:border-cyan/30 p-0.5"
      >
        <StatusBadge status={currentStatus || "pending"} />
        <svg className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 min-w-[140px] bg-surface border border-border rounded-xl shadow-xl z-[100] p-1.5 flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`flex items-center px-2 py-1.5 rounded-lg text-left text-sm transition-colors hover:bg-surface-2 ${currentStatus === opt ? "bg-surface-3" : ""}`}
              >
                <StatusBadge status={opt} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Badge;
