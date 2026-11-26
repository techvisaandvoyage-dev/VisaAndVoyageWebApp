import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Check,
  Loader2,
  RefreshCw,
  RotateCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Button from "../ui/Button";
import {
  FINAL_UPLOAD_TARGET_BYTES,
  RAW_UPLOAD_LIMIT_BYTES,
  optimizeUploadFile,
} from "../../utils/optimizeUploadFile";

const CROP_VIEW_SIZE = 280;
const OUTPUT_SIZE = 800;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Modal popup for uploading, cropping (pan/zoom/rotate), and compressing
 * a user profile photo to <= 300 KB before upload.
 */
const ProfileImageUploadModal = ({ isOpen, onClose, onUpload, onRemove, currentImage }) => {
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const resetCropState = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setErrorMsg("");
    setStatusText("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl("");
      setNaturalSize({ width: 0, height: 0 });
      resetCropState();
      setIsProcessing(false);
      setIsDragOver(false);
    }
  }, [isOpen, previewUrl, resetCropState]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const { baseScale, maxOffsetX, maxOffsetY } = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) {
      return { baseScale: 1, maxOffsetX: 0, maxOffsetY: 0 };
    }
    const isQuarterTurn = rotation % 180 !== 0;
    const effW = isQuarterTurn ? naturalSize.height : naturalSize.width;
    const effH = isQuarterTurn ? naturalSize.width : naturalSize.height;
    const nextBaseScale = Math.max(CROP_VIEW_SIZE / effW, CROP_VIEW_SIZE / effH);
    const dispW = effW * nextBaseScale * zoom;
    const dispH = effH * nextBaseScale * zoom;
    return {
      baseScale: nextBaseScale,
      maxOffsetX: Math.max(0, (dispW - CROP_VIEW_SIZE) / 2),
      maxOffsetY: Math.max(0, (dispH - CROP_VIEW_SIZE) / 2),
    };
  }, [naturalSize.height, naturalSize.width, rotation, zoom]);

  const clampOffset = useCallback(
    (x, y, maxX = maxOffsetX, maxY = maxOffsetY) => ({
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }),
    [maxOffsetX, maxOffsetY]
  );

  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
  }, [clampOffset]);

  const handleSelectFile = (file) => {
    if (!file) return;
    setErrorMsg("");

    if (!ACCEPTED_TYPES.has(file.type)) {
      setErrorMsg("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > RAW_UPLOAD_LIMIT_BYTES) {
      setErrorMsg("Image must be below 20 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(nextUrl);
    setNaturalSize({ width: 0, height: 0 });
    resetCropState();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleSelectFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleSelectFile(file);
  };

  const handlePointerDown = (e) => {
    if (!previewUrl || isProcessing) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragStateRef.current.dragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setOffset(clampOffset(dragStateRef.current.baseX + dx, dragStateRef.current.baseY + dy));
  };

  const handlePointerUp = (e) => {
    if (!dragStateRef.current.dragging) return;
    dragStateRef.current.dragging = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const handleWheelZoom = (e) => {
    if (!previewUrl || isProcessing) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2)))));
  };

  const handleCropAndUpload = async () => {
    if (!selectedFile || !imageRef.current || !naturalSize.width) return;
    setErrorMsg("");
    setIsProcessing(true);
    setStatusText("Cropping & compressing under 300 KB...");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#EEDFC7";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const ratio = OUTPUT_SIZE / CROP_VIEW_SIZE;
      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2 + offset.x * ratio, OUTPUT_SIZE / 2 + offset.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(baseScale * zoom * ratio, baseScale * zoom * ratio);
      ctx.drawImage(
        imageRef.current,
        -naturalSize.width / 2,
        -naturalSize.height / 2,
        naturalSize.width,
        naturalSize.height
      );
      ctx.restore();

      const croppedBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );

      if (!croppedBlob) {
        setErrorMsg("Could not crop this image. Please try another photo.");
        setIsProcessing(false);
        setStatusText("");
        return;
      }

      const baseName = String(selectedFile.name || "profile").replace(/\.[^.]+$/, "");
      const croppedFile = new File([croppedBlob], `${baseName}-cropped.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      const optimized = await optimizeUploadFile(croppedFile, {
        targetBytes: FINAL_UPLOAD_TARGET_BYTES,
      });

      if (optimized?.error || !optimized?.file) {
        setErrorMsg(optimized?.error || "Could not compress this image.");
        setIsProcessing(false);
        setStatusText("");
        return;
      }

      if (optimized.file.size > FINAL_UPLOAD_TARGET_BYTES) {
        setErrorMsg("Compressed image still exceeds 300 KB. Please choose a different image.");
        setIsProcessing(false);
        setStatusText("");
        return;
      }

      setStatusText(`Uploading (${formatSize(optimized.file.size)})...`);
      const ok = await onUpload(optimized.file, {
        originalSize: selectedFile.size,
        compressedSize: optimized.file.size,
      });

      if (ok) {
        onClose();
      } else {
        setErrorMsg("Failed to upload image. Please try again.");
      }
    } catch {
      setErrorMsg("Something went wrong while processing the image.");
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  };

  const handleRemoveCurrent = async () => {
    if (!onRemove || isProcessing || isRemoving) return;
    setErrorMsg("");
    setIsRemoving(true);
    setStatusText("Removing profile photo...");
    try {
      const ok = await onRemove();
      if (ok) {
        onClose();
      } else {
        setErrorMsg("Failed to remove photo. Please try again.");
      }
    } catch {
      setErrorMsg("Something went wrong while removing the photo.");
    } finally {
      setIsRemoving(false);
      setStatusText("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2B22]/45 px-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[24px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_24px_64px_rgba(45,43,34,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-[#2D2B22]/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dfd2bc] text-[#607938] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.16)]">
              <Camera size={18} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-[#2D2B22]">Update Profile Photo</h3>
              <p className="text-[11px] font-medium text-[#6E6A59]">
                Crop &amp; auto-compress below 300 KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing || isRemoving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#6E6A59] transition-colors hover:bg-[#dfd2bc] hover:text-[#2D2B22] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileInputChange}
          />

          {!previewUrl ? (
            <div className="space-y-4">
              {currentImage && (
                <div className="flex items-center gap-4 rounded-2xl border border-[#2D2B22]/10 bg-[#dfd2bc]/75 p-4">
                  <img
                    src={currentImage}
                    alt="Current profile"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="h-16 w-16 shrink-0 rounded-full border-2 border-[#EEDFC7] object-cover shadow-[2px_3px_8px_rgba(45,43,34,0.18)]"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#6E6A59]">
                      Current Photo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#607938]/30 bg-[#607938]/15 px-3 py-1.5 text-xs font-bold text-[#4e632d] shadow-[1px_2px_4px_rgba(45,43,34,0.1)] transition-all hover:bg-[#607938]/25 active:translate-y-[1px] disabled:opacity-50"
                      >
                        <RefreshCw size={12} />
                        Replace
                      </button>
                      {onRemove && (
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={handleRemoveCurrent}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#9a3b2a]/30 bg-[#9a3b2a]/12 px-3 py-1.5 text-xs font-bold text-[#9a3b2a] shadow-[1px_2px_4px_rgba(45,43,34,0.1)] transition-all hover:bg-[#9a3b2a]/22 active:translate-y-[1px] disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isRemoving && fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
                  isDragOver
                    ? "border-[#607938] bg-[#607938]/10"
                    : "border-[#2D2B22]/20 bg-[#dfd2bc]/65 hover:border-[#607938]/60 hover:bg-[#dfd2bc]"
                }`}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEDFC7] text-[#607938] shadow-[2px_3px_8px_rgba(45,43,34,0.16)]">
                  <Upload size={22} />
                </div>
                <p className="text-sm font-bold text-[#2D2B22]">
                  {currentImage ? "Upload a new photo to replace" : "Click to choose a photo or drag & drop"}
                </p>
                <p className="mt-1 text-xs text-[#6E6A59]">
                  JPG, PNG or WebP (up to 20 MB • compressed under 300 KB)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheelZoom}
                  style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE }}
                  className="relative select-none overflow-hidden rounded-2xl border border-[#2D2B22]/20 bg-[#2D2B22] touch-none cursor-grab active:cursor-grabbing shadow-[inset_0_2px_10px_rgba(0,0,0,0.35)]"
                >
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Crop preview"
                    draggable={false}
                    onLoad={(e) => {
                      setNaturalSize({
                        width: e.currentTarget.naturalWidth,
                        height: e.currentTarget.naturalHeight,
                      });
                    }}
                    style={{
                      width: naturalSize.width || "auto",
                      height: naturalSize.height || "auto",
                      maxWidth: "none",
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transformOrigin: "center center",
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                    }}
                  />
                  {/* Circular crop mask overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/85"
                    style={{
                      boxShadow: "0 0 0 9999px rgba(45, 43, 34, 0.55)",
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-[#6E6A59]">
                  Drag to reposition • Scroll or use slider to zoom
                </p>
              </div>

              {/* Zoom & Rotate Controls */}
              <div className="rounded-2xl border border-[#2D2B22]/10 bg-[#dfd2bc]/75 p-3.5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isProcessing || zoom <= MIN_ZOOM}
                    onClick={() =>
                      setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.15).toFixed(2))))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEDFC7] text-[#2D2B22] shadow-sm hover:bg-white/60 disabled:opacity-40"
                    title="Zoom out"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.05}
                    value={zoom}
                    disabled={isProcessing}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="h-1.5 flex-1 cursor-pointer accent-[#607938]"
                  />
                  <button
                    type="button"
                    disabled={isProcessing || zoom >= MAX_ZOOM}
                    onClick={() =>
                      setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.15).toFixed(2))))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEDFC7] text-[#2D2B22] shadow-sm hover:bg-white/60 disabled:opacity-40"
                    title="Zoom in"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEDFC7] px-2.5 py-1.5 font-semibold text-[#2D2B22] shadow-sm hover:bg-white/60 disabled:opacity-50"
                    >
                      <RotateCw size={13} />
                      Rotate
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={resetCropState}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEDFC7] px-2.5 py-1.5 font-semibold text-[#6E6A59] shadow-sm hover:text-[#2D2B22] disabled:opacity-50"
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="font-bold text-[#607938] hover:underline disabled:opacity-50"
                  >
                    Change Photo
                  </button>
                </div>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between rounded-xl bg-[#dfd2bc]/55 px-3.5 py-2 text-xs text-[#6E6A59]">
                  <span className="truncate font-medium text-[#2D2B22] max-w-[60%]">
                    {selectedFile.name}
                  </span>
                  <span>
                    Original: <strong className="text-[#2D2B22]">{formatSize(selectedFile.size)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <p className="rounded-xl bg-[#9a3b2a]/10 px-3.5 py-2.5 text-xs font-semibold text-[#9a3b2a]">
              {errorMsg}
            </p>
          )}

          {statusText && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#607938]">
              <Loader2 size={14} className="animate-spin" />
              <span>{statusText}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={isProcessing || isRemoving}
              onClick={onClose}
              className="rounded-xl border border-[#2D2B22]/15 bg-[#dfd2bc] text-[#2D2B22] hover:bg-[#d5c5ab]"
            >
              Cancel
            </Button>
            {previewUrl && (
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={isProcessing}
                disabled={isProcessing || !naturalSize.width}
                onClick={handleCropAndUpload}
                className="rounded-xl bg-[#607938] text-white hover:bg-[#536930] disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Check size={16} />
                  Crop &amp; Upload
                </span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileImageUploadModal;
