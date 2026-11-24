import { useEffect, useState } from "react";
import { api, SERVER_URL } from "../store/authStore";
import defaultLogo from "../assets/visa-voyage-logo.webp";

const DEFAULT_SITE_LOGO = defaultLogo;

const getStoredLogo = () => {
  try {
    localStorage.removeItem("vv_cached_logo");
    localStorage.removeItem("vv_cached_logo_v2");
    return localStorage.getItem("vv_cached_logo_v3") || "";
  } catch {
    return "";
  }
};

let cachedSiteLogo = getStoredLogo();

const resolveLogoUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("data:image/webp;base64,UklGRg4o")) return "";
  if (/^(?:https?:\/\/|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

export const useSiteLogo = () => {
  const [siteLogo, setSiteLogo] = useState(cachedSiteLogo || DEFAULT_SITE_LOGO);

  useEffect(() => {
    let active = true;

    const loadSiteLogo = async () => {
      try {
        const { data } = await api.get("/config/footer");
        if (!active) return;
        const nextLogo = resolveLogoUrl(data?.config?.logo) || DEFAULT_SITE_LOGO;
        cachedSiteLogo = nextLogo;
        try {
          localStorage.setItem("vv_cached_logo_v3", nextLogo);
        } catch {}
        setSiteLogo(nextLogo);
      } catch {
        if (!active) return;
        setSiteLogo(cachedSiteLogo || DEFAULT_SITE_LOGO);
      }
    };

    loadSiteLogo();
    return () => {
      active = false;
    };
  }, []);

  return siteLogo || DEFAULT_SITE_LOGO;
};
