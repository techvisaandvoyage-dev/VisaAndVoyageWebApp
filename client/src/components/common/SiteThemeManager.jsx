import { useEffect } from "react";
import { api } from "../../store/authStore";

const STORAGE_KEY = "visavo_frontend_theme";
const DEFAULT_THEME = {
  preset: "deep-press",
  bg: "#EEDFC7",
  surfaceBg: "#D9CCB4",
  ink: "#2D2B22",
  muted: "#6E6A59",
  accent: "#607938",
  buttonText: "#FFFFFF",
};

const isDefaultTheme = (theme) =>
  !theme ||
  (theme.bg?.toUpperCase() === DEFAULT_THEME.bg &&
    theme.surfaceBg?.toUpperCase() === DEFAULT_THEME.surfaceBg &&
    theme.ink?.toUpperCase() === DEFAULT_THEME.ink &&
    theme.muted?.toUpperCase() === DEFAULT_THEME.muted &&
    theme.accent?.toUpperCase() === DEFAULT_THEME.accent &&
    theme.buttonText?.toUpperCase() === DEFAULT_THEME.buttonText);

const CSS_VAR_KEYS = [
  "--bg",
  "--pbg",
  "--cd",
  "--color-background",
  "--color-surface",
  "--surface-bg",
  "--surface-2",
  "--surface-3",
  "--nb",
  "--fb",
  "--color-surface-2",
  "--color-surface-3",
  "--ink",
  "--nt",
  "--fth",
  "--color-text-primary",
  "--mu",
  "--ftt",
  "--color-text-secondary",
  "--ac",
  "--acr",
  "--bb",
  "--na",
  "--color-cyan",
  "--color-cyan-dim",
  "--bf",
  "--hi",
  "--lo",
  "--nl",
  "--dp-bg",
  "--dp-header-bg",
  "--dp-ink",
  "--dp-muted",
  "--dp-accent",
  "--dp-light",
  "--dp-dark",
];

const applyThemeToDom = (rawTheme) => {
  if (typeof document === "undefined") return;
  const theme = { ...DEFAULT_THEME, ...(rawTheme || {}) };
  const root = document.documentElement;
  const styleId = "visavo-dynamic-theme";
  let styleEl = document.getElementById(styleId);

  if (isDefaultTheme(theme)) {
    CSS_VAR_KEYS.forEach((key) => root.style.removeProperty(key));
    if (styleEl) styleEl.remove();
    return;
  }

  const hiColor = `color-mix(in srgb, ${theme.surfaceBg} 92%, ${theme.ink})`;
  const loColor = `color-mix(in srgb, ${theme.surfaceBg} 78%, ${theme.ink})`;
  const lineColor = `color-mix(in srgb, ${theme.ink} 16%, transparent)`;

  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--pbg", theme.bg);
  root.style.setProperty("--cd", theme.bg);
  root.style.setProperty("--color-background", theme.bg);
  root.style.setProperty("--color-surface", theme.bg);

  root.style.setProperty("--surface-bg", theme.surfaceBg);
  root.style.setProperty("--surface-2", theme.surfaceBg);
  root.style.setProperty("--surface-3", theme.surfaceBg);
  root.style.setProperty("--nb", theme.surfaceBg);
  root.style.setProperty("--fb", theme.surfaceBg);
  root.style.setProperty("--color-surface-2", theme.surfaceBg);
  root.style.setProperty("--color-surface-3", theme.surfaceBg);

  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--nt", theme.ink);
  root.style.setProperty("--fth", theme.ink);
  root.style.setProperty("--color-text-primary", theme.ink);

  root.style.setProperty("--mu", theme.muted);
  root.style.setProperty("--ftt", theme.muted);
  root.style.setProperty("--color-text-secondary", theme.muted);

  root.style.setProperty("--ac", theme.accent);
  root.style.setProperty("--acr", theme.accent);
  root.style.setProperty("--bb", theme.accent);
  root.style.setProperty("--na", theme.accent);
  root.style.setProperty("--color-cyan", theme.accent);
  root.style.setProperty("--color-cyan-dim", `color-mix(in srgb, ${theme.accent} 82%, #000000)`);

  root.style.setProperty("--bf", theme.buttonText);

  root.style.setProperty("--hi", hiColor);
  root.style.setProperty("--lo", loColor);
  root.style.setProperty("--nl", lineColor);

  root.style.setProperty("--dp-bg", theme.bg);
  root.style.setProperty("--dp-surface", theme.surfaceBg);
  root.style.setProperty("--dp-header-bg", theme.surfaceBg);
  root.style.setProperty("--dp-ink", theme.ink);
  root.style.setProperty("--dp-muted", theme.muted);
  root.style.setProperty("--dp-accent", theme.accent);
  root.style.setProperty("--dp-light", hiColor);
  root.style.setProperty("--dp-dark", loColor);

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    body { background-color: ${theme.bg} !important; color: ${theme.ink} !important; }
    .deep-press-country, .compact-application {
      --dp-bg: ${theme.bg} !important;
      --dp-surface: ${theme.surfaceBg} !important;
      --dp-header-bg: ${theme.surfaceBg} !important;
      --dp-ink: ${theme.ink} !important;
      --dp-muted: ${theme.muted} !important;
      --dp-accent: ${theme.accent} !important;
      --dp-light: ${hiColor} !important;
      --dp-dark: ${loColor} !important;
      --bg: ${theme.bg} !important;
      --ink: ${theme.ink} !important;
      --mu: ${theme.muted} !important;
      --ac: ${theme.accent} !important;
      --nb: ${theme.surfaceBg} !important;
      --nt: ${theme.ink} !important;
      --na: ${theme.accent} !important;
      --fb: ${theme.surfaceBg} !important;
      --fth: ${theme.ink} !important;
      --ftt: ${theme.muted} !important;
      --nl: ${lineColor} !important;
      background: ${theme.bg} !important;
      color: ${theme.ink} !important;
    }
    .dp-info, .dp-included, .dp-documents, .dp-why, .dp-how, .dp-faq { background: ${theme.bg} !important; }
    .dp-fee-tooltip { background: ${theme.bg} !important; border-color: ${lineColor} !important; }
    .dp-info-grid article, .dp-doc-grid article, .dp-included article,
    [class^="shadow-[inset_"], [class*=" shadow-[inset_"] {
      box-shadow: var(--is) !important;
    }
    html body .nv-dd-icon {
      box-shadow: var(--master-sm-inner-drop-shadow) !important;
    }
    html body .group:hover .nv-dd-icon,
    html body .nv-dd-icon.is-colored {
      box-shadow: var(--master-sm-colored-inner-drop-shadow) !important;
    }
    html body .b, html body .dp-primary {
      box-shadow: var(--master-btn-outer-drop-shadow) !important;
    }
    html body .b:hover, html body .dp-primary:hover {
      box-shadow: var(--master-btn-outer-drop-shadow) !important;
    }
    html body .b:active, html body .dp-primary:active {
      transform: translateY(1px) !important;
      box-shadow: var(--master-colored-btn-inner-drop-shadow) !important;
    }
    html body .b.s:active, html body .b.o:active {
      box-shadow: var(--master-inner-drop-shadow) !important;
    }
    .support-chat-widget > button {
      box-shadow: var(--master-btn-outer-drop-shadow) !important;
    }
    .support-chat-widget > button:active {
      box-shadow: var(--master-colored-btn-inner-drop-shadow) !important;
    }
    .dp-why > div:not(.dp-anchor), .dp-faq details { border-color: ${lineColor} !important; }
    .dp-hero, .dp-how li > span { color: ${theme.buttonText} !important; }
    .dp-hero .dp-chip { color: ${theme.accent} !important; }
    .ca-tab.is-active, .ca-nav-btn.is-active { background: ${theme.surfaceBg} !important; }
    .ca-cal-picking-status { background: color-mix(in srgb, ${theme.surfaceBg} 55%, transparent) !important; }
    .ca-cal-nav-btn { box-shadow: var(--master-btn-outer-drop-shadow) !important; }
    .ca-cal-nav-btn:active:not(:disabled) { box-shadow: var(--master-inner-drop-shadow) !important; }
    .from-\\[\\#607938\\].to-\\[\\#4e632d\\] {
      background-image: linear-gradient(to bottom right, ${theme.accent}, color-mix(in srgb, ${theme.accent} 82%, #000000)) !important;
      color: ${theme.buttonText} !important;
    }
    [class*="rgba(148,138,123"],
    [class*="shadow-"][class*="#948a7b"],
    [class*="shadow-"][class*="#d6c9b3"] {
      box-shadow: var(--master-outer-drop-shadow) !important;
    }
    [class*="shadow-"][class*="#8c8273"]:hover {
      box-shadow: 8px 10px 24px ${loColor}, -6px -6px 18px ${hiColor} !important;
    }
    .bg-\\[\\#EEDFC7\\], .bg-\\[\\#EEDFC7\\]\\/95, .bg-\\[\\#FAF3E8\\], .bg-\\[\\#F5ECD8\\], .hover\\:bg-\\[\\#EEDFC7\\]:hover, .hover\\:bg-\\[\\#f5ead8\\]:hover { background-color: ${theme.bg} !important; }
    .bg-\\[\\#EEDFC7\\]\\/10 { background-color: color-mix(in srgb, ${theme.bg} 12%, transparent) !important; }
    .border-\\[\\#EEDFC7\\] { border-color: ${theme.bg} !important; }
    .border-\\[\\#EEDFC7\\]\\/25, .border-\\[\\#EEDFC7\\]\\/30 { border-color: color-mix(in srgb, ${theme.bg} 30%, transparent) !important; }
    .text-\\[\\#dfd2bc\\], .text-\\[\\#EEDFC7\\], .text-\\[\\#EEDFC7\\]\\/85, .text-\\[\\#EEDFC7\\]\\/90 { color: ${theme.bg} !important; }
    .bg-\\[\\#dfd2bc\\], .bg-\\[\\#dfd2bc\\]\\/35, .bg-\\[\\#dfd2bc\\]\\/50, .bg-\\[\\#dfd2bc\\]\\/55, .bg-\\[\\#dfd2bc\\]\\/60, .bg-\\[\\#dfd2bc\\]\\/65, .bg-\\[\\#dfd2bc\\]\\/70, .bg-\\[\\#dfd2bc\\]\\/75, .bg-\\[\\#dfd2bc\\]\\/80, .bg-\\[\\#dfd2bc\\]\\/85, .bg-\\[\\#dfd0b6\\], .bg-\\[\\#d5c5ab\\], .bg-\\[\\#e6d5ba\\], .bg-\\[\\#e8d7bc\\], .bg-\\[\\#e8d7bc\\]\\/60, .bg-\\[\\#e8d7bc\\]\\/70, .bg-\\[\\#e8d7bc\\]\\/75, .bg-\\[\\#D9CCB4\\], .hover\\:bg-\\[\\#d5c5ab\\]:hover, .hover\\:bg-\\[\\#dfd2bc\\]:hover, .hover\\:bg-\\[\\#dfd2bc\\]\\/55:hover, .hover\\:bg-\\[\\#dfd2bc\\]\\/65:hover, .hover\\:bg-\\[\\#dfd2bc\\]\\/70:hover, .hover\\:bg-\\[\\#dfd2bc\\]\\/75:hover, .hover\\:bg-\\[\\#e5d9c5\\]:hover { background-color: ${theme.surfaceBg} !important; }
    .bg-\\[\\#607938\\], .bg-\\[\\#607938\\]\\/95, .bg-\\[\\#556832\\], .hover\\:bg-\\[\\#607938\\]:hover, .hover\\:bg-\\[\\#536930\\]:hover { background-color: ${theme.accent} !important; color: ${theme.buttonText} !important; }
    .bg-\\[\\#607938\\]\\/10, .bg-\\[\\#607938\\]\\/12, .bg-\\[\\#607938\\]\\/15, .hover\\:bg-\\[\\#607938\\]\\/10:hover, .hover\\:bg-\\[\\#607938\\]\\/12:hover, .hover\\:bg-\\[\\#607938\\]\\/15:hover {
      background-color: color-mix(in srgb, ${theme.accent} 13%, transparent) !important;
    }
    .hover\\:bg-\\[\\#607938\\]\\/25:hover {
      background-color: color-mix(in srgb, ${theme.accent} 25%, transparent) !important;
    }
    .bg-\\[\\#607938\\]\\/35, .bg-\\[\\#607938\\]\\/40, .bg-\\[\\#607938\\]\\/45, .bg-\\[\\#607938\\]\\/50 {
      background-color: color-mix(in srgb, ${theme.accent} 42%, transparent) !important;
    }
    .bg-\\[\\#607938\\]\\/60, .bg-\\[\\#607938\\]\\/65, .bg-\\[\\#607938\\]\\/70 {
      background-color: color-mix(in srgb, ${theme.accent} 65%, transparent) !important;
    }
    [class*="scrollbar-thumb"][class*="#607938"]::-webkit-scrollbar-thumb {
      background-color: color-mix(in srgb, ${theme.accent} 45%, transparent) !important;
    }
    [class*="scrollbar-thumb"][class*="#607938"]:hover::-webkit-scrollbar-thumb {
      background-color: color-mix(in srgb, ${theme.accent} 70%, transparent) !important;
    }
    .text-\\[\\#2D2B22\\] { color: ${theme.ink} !important; }
    .text-\\[\\#6E6A59\\], .placeholder\\:text-\\[\\#6E6A59\\]::placeholder { color: ${theme.muted} !important; }
    .text-\\[\\#607938\\], .text-\\[\\#4e632d\\], .text-\\[\\#556832\\], .hover\\:text-\\[\\#607938\\]:hover { color: ${theme.accent} !important; }
    .border-\\[\\#607938\\], .focus\\:border-\\[\\#607938\\]:focus { border-color: ${theme.accent} !important; }
    .border-\\[\\#607938\\]\\/20, .border-\\[\\#607938\\]\\/25, .border-\\[\\#607938\\]\\/30, .border-\\[\\#607938\\]\\/35, .border-\\[\\#607938\\]\\/40, .border-\\[\\#607938\\]\\/50, .border-\\[\\#607938\\]\\/60, .hover\\:border-\\[\\#607938\\]\\/50:hover { border-color: color-mix(in srgb, ${theme.accent} 45%, transparent) !important; }
    .ring-\\[\\#607938\\]\\/25, .focus\\:ring-\\[\\#607938\\]\\/25:focus { --tw-ring-color: color-mix(in srgb, ${theme.accent} 25%, transparent) !important; }
    .ring-\\[\\#607938\\]\\/40 { --tw-ring-color: color-mix(in srgb, ${theme.accent} 40%, transparent) !important; }
    .border-\\[\\#2D2B22\\]\\/15, .border-\\[\\#2D2B22\\]\\/10 { border-color: ${lineColor} !important; }
  `;
};

const SiteThemeManager = () => {
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        applyThemeToDom(JSON.parse(cached));
      }
    } catch {}

    let alive = true;
    api
      .get("/config/theme")
      .then(({ data }) => {
        if (!alive || !data?.success || !data?.theme) return;
        applyThemeToDom(data.theme);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.theme));
        } catch {}
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  return null;
};

export default SiteThemeManager;
