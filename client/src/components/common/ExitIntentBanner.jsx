import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, X } from "lucide-react";

const EXIT_INTENT_STORAGE_KEY = "exitIntentShown";
const EXIT_INTENT_PENDING_KEY = "exitIntentPendingContext";
const REVISIT_THRESHOLD_MS = 5 * 60 * 1000;
const REVISIT_BANNER_DELAY_MS = 1200;

const buildPendingContext = (pathname, search = "") => {
  const fullPath = `${pathname}${search || ""}`;
  const applyMatch = pathname.match(/^\/apply\/([^/]+)/);
  if (applyMatch) {
    return {
      type: "apply",
      targetPath: fullPath,
      updatedAt: Date.now(),
    };
  }

  const detailsMatch = pathname.match(/^\/dashboard\/application\/([^/]+)$/);
  if (detailsMatch) {
    return {
      type: "application-details",
      targetPath: `/dashboard/application/${detailsMatch[1]}#document-upload-section`,
      updatedAt: Date.now(),
    };
  }

  const destinationApplyMatch = pathname.match(/^\/destination\/([^/]+)\/apply$/);
  if (destinationApplyMatch) {
    return {
      type: "destination-apply",
      targetPath: fullPath,
      updatedAt: Date.now(),
    };
  }

  const summaryMatch = pathname.match(/^\/destination\/([^/]+)\/summary$/);
  if (summaryMatch) {
    return {
      type: "payment-summary",
      targetPath: fullPath,
      updatedAt: Date.now(),
    };
  }

  const destinationMatch = pathname.match(/^\/destination\/([^/]+)$/);
  if (destinationMatch) {
    return {
      type: "destination",
      targetPath: fullPath,
      updatedAt: Date.now(),
    };
  }

  return null;
};

const readPendingContext = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EXIT_INTENT_PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writePendingContext = (context) => {
  if (typeof window === "undefined" || !context) return;
  try {
    localStorage.setItem(EXIT_INTENT_PENDING_KEY, JSON.stringify(context));
  } catch {
    /* ignore storage errors */
  }
};

const getLeaveWarningMessage = () =>
  "Are you leaving the website? You have a pending visa application. If you leave now, your progress may not be completed.";

const ExitIntentBanner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const pendingVisibilityTriggerRef = useRef(false);
  const revisitTimeoutRef = useRef(null);

  const alreadyShown = useMemo(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(EXIT_INTENT_STORAGE_KEY) === "true";
  }, []);

  useEffect(() => {
    const context = buildPendingContext(location.pathname, location.search);
    if (context) {
      writePendingContext(context);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentFlowContext = buildPendingContext(location.pathname, location.search);
    if (!currentFlowContext) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = getLeaveWarningMessage();
      return getLeaveWarningMessage();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || alreadyShown) return;

    const showBanner = () => {
      if (sessionStorage.getItem(EXIT_INTENT_STORAGE_KEY) === "true") return;
      sessionStorage.setItem(EXIT_INTENT_STORAGE_KEY, "true");
      setVisible(true);
    };

    const handleMouseLeave = (event) => {
      if (event.clientY <= 0) showBanner();
    };

    const handleVisibilityChange = () => {
      if (document.hidden === true) {
        pendingVisibilityTriggerRef.current = true;
        return;
      }

      if (pendingVisibilityTriggerRef.current) {
        pendingVisibilityTriggerRef.current = false;
        showBanner();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [alreadyShown]);

  useEffect(() => {
    if (typeof window === "undefined" || alreadyShown) return;

    const pendingContext = readPendingContext();
    if (!pendingContext?.targetPath) return;

    const currentPathWithoutHash = `${location.pathname}${location.search || ""}`;
    const pendingPathWithoutHash = String(pendingContext.targetPath).split("#")[0];
    if (currentPathWithoutHash === pendingPathWithoutHash) return;

    const shouldPromptOnRevisit =
      Date.now() - Number(pendingContext.updatedAt || 0) >= REVISIT_THRESHOLD_MS;
    if (!shouldPromptOnRevisit) return;

    revisitTimeoutRef.current = window.setTimeout(() => {
      if (sessionStorage.getItem(EXIT_INTENT_STORAGE_KEY) === "true") return;
      sessionStorage.setItem(EXIT_INTENT_STORAGE_KEY, "true");
      setVisible(true);
    }, REVISIT_BANNER_DELAY_MS);

    return () => {
      if (revisitTimeoutRef.current) {
        window.clearTimeout(revisitTimeoutRef.current);
      }
    };
  }, [alreadyShown, location.pathname, location.search]);

  const closeBanner = () => {
    setVisible(false);
  };

  const handleContinue = () => {
    setVisible(false);

    const pendingContext = readPendingContext();
    const currentFull = `${location.pathname}${location.search || ""}`;
    if (pendingContext && pendingContext.targetPath) {
      const targetWithoutHash = String(pendingContext.targetPath).split("#")[0];
      if (targetWithoutHash === currentFull || targetWithoutHash === location.pathname) {
        // Already on the exact page — dismissing preserves unsaved form state.
        return;
      }
      navigate(pendingContext.targetPath, {
        state: { resumedFromExitIntent: true },
      });
      return;
    }

    const lastCountryId = localStorage.getItem("lastActiveCountryId");
    if (lastCountryId) {
      navigate(`/destination/${lastCountryId}/apply`, {
        state: { resumedFromExitIntent: true },
      });
      return;
    }

    // Default fallback if no context exists
    navigate(-1);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex justify-center px-4 pt-4 sm:px-6">
      <div
        className={`w-full max-w-xl transform transition-all duration-300 ease-out ${
          visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-6 opacity-0"
        }`}
        inert={visible ? undefined : ""}
      >
        <div className="overflow-hidden rounded-[20px] border border-[#2D2B22]/15 bg-[#EEDFC7]/95 text-[#2D2B22] shadow-[0_22px_54px_rgba(45,43,34,0.32),0_4px_12px_rgba(45,43,34,0.14)] backdrop-blur-md">
          <div className="flex items-start gap-3.5 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#607938]/25 bg-[#dfd2bc] text-[#607938] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.14)]">
              <ShieldCheck size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-[#2D2B22]">Leaving already?</p>
              <p className="mt-1 text-sm leading-6 text-[#6E6A59]">
                Complete your visa application now and save your progress.
              </p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#607938] px-4 py-2.5 text-sm font-bold text-white shadow-[1px_3px_8px_rgba(45,43,34,0.32)] transition-all hover:bg-[#536930] active:translate-y-[1px] active:shadow-[inset_2px_3px_7px_rgba(0,0,0,0.5),inset_0_1px_3px_rgba(0,0,0,0.35)]"
                >
                  Continue Application
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={closeBanner}
                  className="inline-flex items-center justify-center rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc]/80 px-4 py-2.5 text-sm font-bold text-[#2D2B22] shadow-[2px_3px_6px_rgba(45,43,34,0.14),0_1px_2px_rgba(45,43,34,0.08)] transition-all hover:bg-[#dfd2bc] active:translate-y-[1px] active:bg-[#d5c5ab] active:shadow-[inset_2px_3px_6px_rgba(45,43,34,0.24)]"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={closeBanner}
              aria-label="Close exit intent banner"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfd2bc]/70 text-[#2D2B22] shadow-[1px_2px_4px_rgba(45,43,34,0.12)] transition-all hover:bg-[#dfd2bc] active:translate-y-[1px] active:shadow-[inset_1px_2px_4px_rgba(45,43,34,0.24)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentBanner;
