import { useEffect, useState, useRef } from "react";
import { CheckCircle, Info, Link2 } from "lucide-react";

const DriveShareGuidePopover = ({ showSkipHint = true }) => (
  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 bottom-full z-30 mb-2 hidden w-[260px] sm:w-80 rounded-2xl border border-border bg-surface p-4 text-[11px] font-normal leading-relaxed text-text-secondary shadow-xl group-hover:block">
    <p className="font-semibold text-text-primary text-sm mb-2">How to share your folder</p>
    <ol className="list-decimal list-inside space-y-2">
      <li>
        Upload your files to a <span className="font-medium text-text-primary">new folder</span> in Google Drive.
      </li>
      <li>
        Open the folder, click the <span className="font-medium text-text-primary">three dots (⋮)</span> →{" "}
        <span className="font-medium text-text-primary">Share</span> → set access to{" "}
        <span className="font-medium text-text-primary">Anyone with the link</span> (Viewer is fine).
      </li>
      <li>
        Click <span className="font-medium text-text-primary">Copy link</span> and paste it in the field below.
      </li>
    </ol>
    {showSkipHint ? (
      <p className="mt-2 text-text-muted">
        You can skip this now and add the link later from your dashboard.
      </p>
    ) : null}
  </span>
);

/**
 * Single Google Drive folder link for all travelers (apply flow, details, summary).
 */
export default function SharedGoogleDriveLinkSection({
  value,
  onChange,
  onSave,
  savedLink = "",
  loading = false,
  disabled = false,
  /** When false (e.g. fee already paid), hide “skip for now” in the info hover guide. */
  showSkipHint = true,
  className = "",
}) {
  const trimmedSaved = String(savedLink || "").trim();
  const [localSaving, setLocalSaving] = useState(false);
  const [localSuccess, setLocalSuccess] = useState(false);
  const timerRef = useRef(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (trimmedSaved && String(value || "").trim() === trimmedSaved) {
      setLocalSuccess(true);
    } else {
      setLocalSuccess(false);
    }
  }, [trimmedSaved, value]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (!onSave || disabled) return;

    const trimmedValue = String(value || "").trim();
    if (!trimmedValue || trimmedValue === trimmedSaved) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLocalSaving(false);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setLocalSaving(true);

    timerRef.current = setTimeout(async () => {
      try {
        await onSave();
        setLocalSuccess(true);
      } catch (err) {
        console.error("Auto-save Google Drive link failed:", err);
      } finally {
        setLocalSaving(false);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, onSave, disabled, trimmedSaved]);

  const showSaved = (trimmedSaved && String(value || "").trim() === trimmedSaved) || localSuccess;

  return (
    <div
      className={`rounded-[20px] border border-[#2D2B22]/12 bg-[#EEDFC7] p-5 shadow-[4px_4px_14px_#948a7b,-4px_-4px_14px_#d6c9b3] ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#607938]/25 bg-[#dfd2bc] text-[#607938] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.14)]">
          <Link2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold text-[#2D2B22]">Google Drive Link (for all travelers)</h4>
            <span className="group relative inline-flex align-middle">
              <button
                type="button"
                className="inline-flex rounded-full p-0.5 text-[#6E6A59] transition-all duration-150 hover:bg-[#607938]/12 hover:text-[#607938] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#607938]/40"
                aria-label="How to share your Google Drive folder"
              >
                <Info size={14} />
              </button>
              <DriveShareGuidePopover showSkipHint={showSkipHint} />
            </span>
          </div>
          <p className="mt-1 text-sm text-[#6E6A59]">
            Add a single Google Drive link containing all required documents.
          </p>

          {showSaved ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#607938]/25 bg-[#607938]/[0.08] px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#607938]/15 text-[#607938]">
                  <CheckCircle size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#2D2B22]">Google Drive link saved</p>
                  <a
                    href={trimmedSaved || value}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[11px] font-semibold text-[#607938] hover:underline truncate block max-w-full"
                  >
                    {trimmedSaved || value}
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://drive.google.com/your-folder-link"
            disabled={disabled || loading || localSaving}
            autoComplete="off"
            className="mt-4 w-full rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] px-4 py-3 text-sm font-medium text-[#2D2B22] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.2),inset_0_1px_2px_rgba(45,43,34,0.12)] outline-none transition-all placeholder:text-[#6E6A59] focus:border-[#607938] focus:ring-2 focus:ring-[#607938]/25 disabled:opacity-50"
          />

          {localSaving && !showSaved ? (
            <div className="mt-2 text-xs font-semibold text-[#607938] animate-pulse flex items-center gap-1.5 px-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#607938] inline-block animate-ping"></span>
              Auto-saving link...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
