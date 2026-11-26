export const getFileUrl = (filePath) => {
  if (!filePath) return "";

  if (typeof filePath === "object") {
    filePath =
      filePath.url ||
      filePath.path ||
      filePath.fileUrl ||
      filePath.documentUrl ||
      filePath.passportUrl ||
      filePath.previewUrl ||
      "";
  }

  if (!filePath) return "";
  
  // Clean up any double quotes if it was stringified
  filePath = String(filePath).replace(/^"|"$/g, "");

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  // If we are in dev or if VITE_API_URL is set, use it (strip trailing /api so static /uploads paths resolve at server root).
  const rawBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? "https://api.visavo.in" : "http://localhost:5000");

  // Remove any trailing slash or /api suffix from base url
  const baseUrl = String(rawBaseUrl).trim().replace(/\/+$/, "").replace(/\/api$/i, "");

  const normalizedPath = filePath.startsWith("/")
    ? filePath
    : `/${filePath}`;

  return `${baseUrl}${normalizedPath}`;
};
