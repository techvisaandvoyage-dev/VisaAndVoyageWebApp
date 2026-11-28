import { ExternalLink, Download, FileText } from "lucide-react";
import Modal from "./Modal";

export default function FilePreviewModal({ isOpen, onClose, previewFile }) {
  if (!previewFile) return null;

  const displayName = previewFile.fileName || previewFile.name || "Document Preview";
  const isPdf = previewFile.type?.includes("pdf") || /\.pdf($|\?)/i.test(String(previewFile.url || ""));
  const isImage = /^image\//i.test(String(previewFile.type || "")) || /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(String(previewFile.url || ""));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      size="4xl"
      bodyClassName="p-3 sm:p-4"
      headerActions={
        previewFile.url ? (
          <a
            href={previewFile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-xs sm:text-sm font-medium text-text-primary border border-border transition-colors hover:bg-surface-3"
          >
            <ExternalLink size={14} />
            Open Original
          </a>
        ) : null
      }
    >
      <div className="relative flex h-[74vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-background">
        {isPdf ? (
          <iframe
            src={previewFile.url}
            title={displayName}
            className="h-full w-full border-none bg-white"
          />
        ) : isImage ? (
          <div className="flex h-full w-full items-center justify-center p-4">
            <img
              src={previewFile.url}
              alt={displayName}
              className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-8 text-center text-text-muted">
            <div className="flex max-w-sm flex-col items-center gap-3">
              <FileText size={48} className="text-border" />
              <p className="text-sm">Preview is not available for this file type.</p>
              {previewFile.url && (
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[var(--ac,#607938)] px-4 py-2 text-sm font-medium text-[var(--bf,#fff)]"
                >
                  <Download size={14} />
                  Download to view
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
