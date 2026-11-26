import { useRef } from "react";
import { AlertCircle, CheckCircle, FileText } from "lucide-react";

const PassportUploadRow = ({
  inputId,
  label = "Passport Upload",
  file,
  error,
  uploading = false,
  optimizing = false,
  saved = false,
  disabled = false,
  helperText = "",
  fileSizeText = "",
  savedText = "Passport uploaded",
  uploadLabel = "Upload",
  reuploadLabel = "Re-upload",
  onChange,
  onReupload,
  onPreview,
  previewEnabled = true,
  onRemove,
  removeLabel = "Remove",
  className = "",
  accept = "image/jpeg,image/png",
}) => {
  const inputRef = useRef(null);
  const normalizeHelperText = (text) => String(text || "")
    .replace(/Ãƒ”šÃ‚Â·/g, " - ")
    .replace(/Ã‚Â·/g, " - ")
    .replace(/Â·/g, " - ");

  const statusText = normalizeHelperText(
    file
      ? helperText
      : saved && helperText
        ? helperText
        : saved
          ? savedText
          : helperText
  );
  const normalizedFileSizeText = normalizeHelperText(fileSizeText);
  const canPreview = Boolean(onPreview && previewEnabled);

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div
        role={canPreview ? "button" : undefined}
        tabIndex={canPreview ? 0 : undefined}
        onClick={canPreview ? () => onPreview?.() : undefined}
        onKeyDown={canPreview ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPreview?.();
          }
        } : undefined}
        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-[inset_2px_3px_6px_rgba(45,43,34,0.18),inset_0_1px_2px_rgba(45,43,34,0.1)] transition-all ${
          error
            ? "border-[#b91c1c]/60 bg-[#dfd2bc]"
            : saved
              ? "border-[#607938]/40 bg-[#dfd2bc]"
              : "border-[#2D2B22]/15 bg-[#dfd2bc]"
        } ${canPreview ? "cursor-pointer hover:border-[#607938]/60 focus:outline-none focus:ring-2 focus:ring-[#607938]/25" : ""}`}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#607938]/20 bg-[#EEDFC7] text-[#607938] shadow-[1px_2px_4px_rgba(45,43,34,0.12)]"
          >
            <FileText size={15} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#2D2B22]">{label}</p>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#6E6A59]">{statusText}</p>
              {normalizedFileSizeText ? (
                <span className="shrink-0 text-[11px] font-semibold text-[#607938]">{normalizedFileSizeText}</span>
              ) : null}
            </div>
          </div>
        </div>
        {saved ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 shrink-0 rounded-full bg-[#607938] px-2.5 py-1 text-[10.5px] font-bold text-white shadow-sm">
              <CheckCircle size={11} /> Uploaded
            </span>
            {onRemove && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
                className="rounded-lg border border-[#b91c1c]/25 bg-[#EEDFC7] px-2.5 py-1 text-[11px] font-bold text-[#b91c1c] shadow-[1px_2px_4px_rgba(45,43,34,0.14)] transition-all hover:bg-[#b91c1c]/10 active:translate-y-[1px]"
              >
                {removeLabel}
              </button>
            )}
            {onReupload && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReupload?.();
                  inputRef.current?.click();
                }}
                className="rounded-lg border border-[#2D2B22]/15 bg-[#EEDFC7] px-2.5 py-1 text-[11px] font-bold text-[#2D2B22] shadow-[1px_2px_4px_rgba(45,43,34,0.14)] transition-all hover:text-[#607938] active:translate-y-[1px]"
              >
                {reuploadLabel}
              </button>
            )}
          </div>
        ) : file && optimizing ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#607938]/30 bg-[#EEDFC7] px-2.5 py-1.5 text-[11px] font-bold text-[#607938] shrink-0 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-[#607938] animate-ping" />
            Optimizing…
          </div>
        ) : file && uploading ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#607938]/30 bg-[#EEDFC7] px-2.5 py-1.5 text-[11px] font-bold text-[#607938] shrink-0 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-[#607938] animate-ping" />
            Uploading…
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {onRemove && file && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
                className="rounded-lg border border-[#b91c1c]/25 bg-[#EEDFC7] px-2.5 py-1.5 text-[11px] font-bold text-[#b91c1c] shadow-[1px_2px_4px_rgba(45,43,34,0.14)] transition-all hover:bg-[#b91c1c]/10 active:translate-y-[1px]"
              >
                {removeLabel}
              </button>
            )}
            <label
              htmlFor={inputId}
              onClick={(e) => e.stopPropagation()}
              className={`shrink-0 rounded-lg border border-[#2D2B22]/15 bg-[#EEDFC7] px-3 py-1.5 text-xs font-bold text-[#2D2B22] shadow-[2px_3px_6px_rgba(45,43,34,0.16)] transition-all ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:text-[#607938] active:translate-y-[1px] active:bg-[#dfd2bc] active:shadow-[inset_1px_2px_4px_rgba(45,43,34,0.24)]"
              }`}
            >
              {file ? (reuploadLabel || "Replace") : (uploadLabel || "Upload")}
            </label>
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onChange?.(e.target.files?.[0] || null);
            e.target.value = "";
          }}
        />
      </div>
      {saved && <p className="text-xs font-medium text-emerald-400">{savedText}</p>}
      {error && (
        <p className="flex items-center gap-1 px-0.5 text-xs font-medium text-red-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

export default PassportUploadRow;
