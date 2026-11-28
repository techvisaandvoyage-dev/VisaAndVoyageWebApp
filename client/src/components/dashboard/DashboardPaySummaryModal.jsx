import { useEffect, useState } from "react";
import { Calendar, Info, Plane, ShieldCheck } from "lucide-react";
import Modal from "../ui/Modal";
import CountryFlagBadge from "../ui/CountryFlagBadge";
import { api, useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { openRazorpayForApplication, validateRazorpayCheckoutReadiness } from "../../utils/razorpayCheckout";
import { formatOrdinalDate } from "../../utils/dateUtils";

const TERMS_CMS_SLUG = "terms-and-conditions";

const fmtDate = (iso) => {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "N/A" : formatOrdinalDate(d);
};

export default function DashboardPaySummaryModal({
  booking,
  isOpen,
  onClose,
  onPaymentSuccess,
}) {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsPopupOpen, setTermsPopupOpen] = useState(false);
  const [termsPage, setTermsPage] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(true);
  const [razorpayMessage, setRazorpayMessage] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTermsAccepted(false);
      setTermsPopupOpen(false);
      setPaying(false);
      return;
    }

    let alive = true;
    validateRazorpayCheckoutReadiness().then((res) => {
      if (!alive) return;
      setRazorpayReady(Boolean(res?.ok));
      setRazorpayMessage(res?.ok ? "" : res?.message || "Payment is currently unavailable.");
    });

    if (!termsPage) {
      setTermsLoading(true);
      setTermsError("");
      api
        .get(`/pages/${TERMS_CMS_SLUG}`)
        .then(({ data }) => {
          if (!alive) return;
          if (data?.page) setTermsPage(data.page);
          else setTermsError(data?.message || "Terms & Conditions are not available.");
        })
        .catch((err) => {
          if (!alive) return;
          setTermsError(err.response?.data?.message || "Could not load Terms & Conditions.");
        })
        .finally(() => {
          if (alive) setTermsLoading(false);
        });
    }

    return () => {
      alive = false;
    };
  }, [isOpen, termsPage]);

  if (!booking) return null;

  const appId = booking._id || booking.id;
  const amount = Number(booking.totalAmount ?? booking.fee ?? 0);
  const govFee = Number(booking.governmentFeeTotal || 0);
  const serviceFee = Number(booking.serviceFeeTotal || 0);
  const gst = Number(booking.gstAmount || 0);
  const travellerCount = Math.max(1, Number(booking.travellerCount || 1));
  const serviceWithGst = serviceFee + gst;

  const handlePayNow = async () => {
    if (!termsAccepted) {
      showToast("Please accept the Terms & Conditions.", "error");
      return;
    }
    if (!razorpayReady) {
      showToast(razorpayMessage || "Payment is not available right now.", "error");
      return;
    }

    setPaying(true);
    try {
      await openRazorpayForApplication({
        applicationId: appId,
        amountRupees: amount,
        description: `${booking.countryName || "Visa"} - service fee`,
        applicantName: user?.name || "Applicant",
        applicantEmail: user?.email || "",
        onSuccess: async () => {
          showToast("Payment successful!", "success");
          await onPaymentSuccess?.();
          onClose?.();
        },
        onDismiss: () => {
          showToast("Payment was not completed. You can retry anytime.", "info");
        },
        onFailure: (message) => {
          showToast(message || "Payment could not be started.", "error");
        },
      });
    } catch (err) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : "");
      showToast(serverMessage || err?.message || "Could not start payment.", "error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={paying ? undefined : onClose}
        title="Application Summary"
        size="xl"
        footer={
          <div className="ud-bp-wrap flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="ud-btn sec"
              onClick={onClose}
              disabled={paying}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ud-btn pri disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePayNow}
              disabled={!termsAccepted || paying}
            >
              {paying ? "Opening Payment..." : `Proceed to Pay ₹${amount.toLocaleString("en-IN")}`}
            </button>
          </div>
        }
      >
        <div className="ud-bp-wrap space-y-5">
          {/* Application Summary Header */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
            style={{ background: "var(--bg)", boxShadow: "var(--master-inner-drop-shadow)" }}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <CountryFlagBadge
                countryName={booking.countryName}
                flagEmoji={booking.flagEmoji}
                sizeClass="h-12 w-12"
              />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text-primary truncate">
                  {booking.countryName || "Visa Application"}
                </h3>
                <p className="text-xs text-text-muted truncate">
                  {booking.visaType || "Visa"} · ID {booking.applicationId || appId}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> Applied: {fmtDate(booking.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Plane size={12} /> Travel: {fmtDate(booking.travelDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-text-muted">Total Payable</div>
              <div className="text-xl font-bold text-[var(--ac)]">
                ₹{amount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div
            className="rounded-2xl p-4 sm:p-5 space-y-3 text-sm relative"
            style={{ background: "var(--bg)", boxShadow: "var(--master-inner-drop-shadow)" }}
          >
            <div className="flex items-center justify-between text-text-secondary">
              <span>Government Fee{travellerCount > 1 ? ` × ${travellerCount}` : ""}</span>
              <span className="font-semibold text-text-primary">₹{govFee.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex items-center justify-between text-text-secondary">
              <div className="group relative inline-flex items-center gap-1.5">
                <span>Our Service Fee{travellerCount > 1 ? ` × ${travellerCount}` : ""}</span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center text-text-muted hover:text-text-primary focus:outline-none"
                  aria-label="Service fee breakdown"
                >
                  <Info size={14} />
                </button>
                <div
                  className="pointer-events-none invisible absolute left-0 top-full z-40 mt-2 w-60 translate-y-1 rounded-2xl border border-[var(--nl)] p-3.5 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                  style={{ background: "var(--bg)", boxShadow: "var(--master-outer-drop-shadow)" }}
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Our Service Fee</span>
                      <span className="font-semibold text-text-primary">₹{serviceFee.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>GST</span>
                      <span className="font-semibold text-text-primary">₹{gst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="border-t border-[var(--nl)] pt-2 flex items-center justify-between font-semibold text-text-primary">
                      <span>Total</span>
                      <span>₹{serviceWithGst.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
              <span className="font-semibold text-text-primary">₹{serviceWithGst.toLocaleString("en-IN")}</span>
            </div>

            <div className="border-t border-[var(--nl)] pt-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                TOTAL TO PAY
              </span>
              <span className="text-2xl font-bold text-text-primary">
                ₹{amount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Compact Terms & Conditions Agreement Box */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--bg)", boxShadow: "var(--master-inner-drop-shadow)" }}
          >
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-text-secondary select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded accent-[var(--ac)] cursor-pointer"
              />
              <span>
                I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTermsPopupOpen(true);
                  }}
                  className="font-semibold text-[var(--ac)] underline-offset-2 hover:underline"
                >
                  terms and conditions
                </button>{" "}
                and understand that the amount above is the total payment shown in this summary.
              </span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Terms & Conditions Popup with Accept / Deny */}
      <Modal
        isOpen={termsPopupOpen}
        onClose={() => setTermsPopupOpen(false)}
        title={termsPage?.title || "Terms and Conditions"}
        size="xl"
        zIndexClass="z-[60]"
        footer={
          <div className="ud-bp-wrap flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="ud-btn sec"
              onClick={() => {
                setTermsAccepted(false);
                setTermsPopupOpen(false);
              }}
            >
              Deny
            </button>
            <button
              type="button"
              className="ud-btn pri"
              onClick={() => {
                setTermsAccepted(true);
                setTermsPopupOpen(false);
              }}
            >
              Accept
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <ShieldCheck size={16} className="text-[var(--ac)]" />
            <span>{termsPage?.title || "Terms and Conditions"}</span>
          </div>
          <div
            className="max-h-[52vh] overflow-y-auto rounded-2xl p-4 text-xs sm:text-sm leading-relaxed text-text-secondary"
            style={{ background: "var(--bg)", boxShadow: "var(--master-inner-drop-shadow)" }}
          >
            {termsLoading ? (
              <p className="text-text-muted">Loading terms and conditions...</p>
            ) : termsPage?.content ? (
              <div
                className="prose prose-sm max-w-none text-text-secondary"
                dangerouslySetInnerHTML={{ __html: termsPage.content }}
              />
            ) : (
              <p className="text-text-muted">
                {termsError || "By proceeding with payment, you confirm that all submitted details and documents are accurate and agree to our visa processing terms and refund policy."}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
