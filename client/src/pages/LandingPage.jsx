// ============================================================
//  Landing Page
//  Sections:
//  1. Hero — search bar + animated background
//  2. Countries Grid — trending countries display
// ============================================================
import {
  useEffect,
  lazy,
  Suspense,
  useState,
  useRef,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search, MapPin, CheckCircle, Clock, Globe, Users, CreditCard, Plane, HeartHandshake, Smile,
  ShieldCheck, FileText, Lock, Zap, X, ChevronDown, CalendarDays,
} from "lucide-react";

const AVAILABLE_ICONS = {
  Zap, ShieldCheck, FileText, Lock, CheckCircle, Clock,
  Globe, Users, CreditCard, MapPin, Plane, HeartHandshake, Smile, Search
};
import Navbar from "../components/layout/Navbar";
import LandingCountriesGrid from "../components/landing/LandingCountriesGrid";
import { normalizeCountryFromApi, useCountries } from "../hooks/useCountries";
import { api, useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { getCountryFlagEmoji, getCountrySearchHint, matchesCountrySearch } from "../utils/countrySearch";
import { getCountryRouteId } from "../utils/countryRouting";

const GEOCODE_DEBOUNCE_MS = 680;
const GEOCODE_MIN_CHARS = 3;
const INITIAL_COUNTRY_CARD_COUNT = 10;
const Footer = lazy(() => import("../components/layout/Footer"));

const scheduleAfterPaint = (callback) => {
  if (typeof window === "undefined") return undefined;
  const frame = window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(callback, { timeout: 1800 });
      } else {
        window.setTimeout(callback, 600);
      }
    });
  });
  return () => window.cancelAnimationFrame(frame);
};

const DEFAULT_HERO_HIGHLIGHTS = [
  {
    icon: Zap,
    title: "Fast Processing",
    body: "Quick application flow and updates",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Guidance",
    body: "Accurate help for every step",
  },
  {
    icon: FileText,
    title: "All-in-One Platform",
    body: "Search, apply, track, and upload",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    body: "Your documents stay protected",
  },
];

const HERO_HIGHLIGHTS_CACHE_KEY = "vv_landing_hero_highlights_v1";

const loadCachedHeroHighlights = () => {
  if (typeof window === "undefined") return DEFAULT_HERO_HIGHLIGHTS;
  try {
    const raw = window.localStorage.getItem(HERO_HIGHLIGHTS_CACHE_KEY);
    if (!raw) return DEFAULT_HERO_HIGHLIGHTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return DEFAULT_HERO_HIGHLIGHTS.map((fallback, index) => {
        const item = parsed[index];
        if (!item) return fallback;
        const iconName = item.icon;
        return {
          ...fallback,
          icon: AVAILABLE_ICONS[iconName] || fallback.icon,
          title: String(item.title ?? "").trim() || fallback.title,
          body: String(item.body ?? "").trim() || fallback.body,
        };
      });
    }
  } catch {}
  return DEFAULT_HERO_HIGHLIGHTS;
};

// ── Animation variants ─────────────────────────────────────
const POPULAR_COUNTRIES_CACHE_KEY = "vb_popular_countries_home_v3";
const POPULAR_COUNTRIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const loadPopularCountriesCache = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(POPULAR_COUNTRIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - Number(parsed.savedAt) > POPULAR_COUNTRIES_CACHE_TTL_MS) {
      return [];
    }
    return Array.isArray(parsed.countries)
      ? parsed.countries.map((country) => normalizeCountryFromApi(country)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const savePopularCountriesCache = (countries) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      POPULAR_COUNTRIES_CACHE_KEY,
      JSON.stringify({
        countries,
        savedAt: Date.now(),
      })
    );
  } catch {
    /* ignore storage failures */
  }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const countryCardRefs = useRef({});
  const scrollToCountry = useCallback((countryId) => {
    const card = countryCardRefs.current[countryId];
    if (card?.scrollIntoView) {
      card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, []);
  const searchInputRef = useRef(null);
  const searchAnchorRef = useRef(null);
  const filterAnchorRef = useRef(null);
  const searchFormRef = useRef(null);
  const geocodeAbortRef = useRef(null);
  const popularFetchStartedRef = useRef(false);
  const geocodeReqSeq = useRef(0);
  const homeExitGuardRef = useRef(false);
  const { countries: allCountries, trendingCountries, display: countryDisplay, documentCatalog } = useCountries();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Global requirements for merging logic on cards
  const [globalRequirements, setGlobalRequirements] = useState([]);
  const [showVisaRequirements, setShowVisaRequirements] = useState(false);
  const [heroHighlights, setHeroHighlights] = useState(() => loadCachedHeroHighlights());
  const [popularCountryCards, setPopularCountryCards] = useState(() => loadPopularCountriesCache());
  const [popularCountriesLoading, setPopularCountriesLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNTRY_CARD_COUNT);
  const [isSearchPinned, setIsSearchPinned] = useState(false);
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [showDeferredFooter, setShowDeferredFooter] = useState(false);

  // ── Filter state ──────────────────────────────────────────
  const [siteConfig, setSiteConfig] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get("/config/site-state").then(({ data }) => {
      if (alive && data?.config) setSiteConfig(data.config);
    }).catch(console.error);
    return () => { alive = false; };
  }, []);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [selectedVisaType, setSelectedVisaType] = useState("All Visa Types");
  const [selectedValidity, setSelectedValidity] = useState("Any Validity");
  const [selectedLengthOfStay, setSelectedLengthOfStay] = useState("Any Length of Stay");
  const [selectedEntryType, setSelectedEntryType] = useState("Any Entry Type");

  const visaTypes = useMemo(() => {
    const types = new Set(allCountries.map((c) => c.visaType).filter(Boolean));
    return ["All Visa Types", ...Array.from(types).sort()];
  }, [allCountries]);

  const validities = useMemo(() => {
    const vals = new Set(allCountries.map((c) => c.validity).filter(Boolean));
    return ["Any Validity", ...Array.from(vals).sort()];
  }, [allCountries]);

  const lengthsOfStay = useMemo(() => {
    const vals = new Set(allCountries.map((c) => c.lengthOfStay).filter(Boolean));
    return ["Any Length of Stay", ...Array.from(vals).sort()];
  }, [allCountries]);

  const entryTypes = useMemo(() => {
    const vals = new Set(allCountries.map((c) => c.entryType).filter(Boolean));
    return ["Any Entry Type", ...Array.from(vals).sort()];
  }, [allCountries]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-dropdown-container")) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const clearFilters = () => {
    setSelectedVisaType("All Visa Types");
    setSelectedValidity("Any Validity");
    setSelectedLengthOfStay("Any Length of Stay");
    setSelectedEntryType("Any Entry Type");
  };


  useEffect(() => {
    if (homeExitGuardRef.current) return undefined;
    homeExitGuardRef.current = true;

    const pushHomeGuardState = () => {
      window.history.pushState(
        { vbHomeExitGuard: true, time: Date.now() },
        "",
        window.location.href
      );
    };

    const handleHomeBackAttempt = () => {
      const shouldLeave = window.confirm("Do you want to close VISAANDVOYAGE?");

      if (!shouldLeave) {
        pushHomeGuardState();
        return;
      }

      window.removeEventListener("popstate", handleHomeBackAttempt);
      window.close();
    };

    pushHomeGuardState();
    window.addEventListener("popstate", handleHomeBackAttempt);

    return () => {
      window.removeEventListener("popstate", handleHomeBackAttempt);
      homeExitGuardRef.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchDestinationContent = async () => {
      try {
        const { data } = await api.get("/config/destination-content");
        if (alive && data?.success) {
          if (data.config?.visaRequirements) setGlobalRequirements(data.config.visaRequirements);
          if (data.config?.showVisaRequirements !== undefined) setShowVisaRequirements(data.config.showVisaRequirements);
          if (Array.isArray(data.config?.landingHeroHighlights) && data.config.landingHeroHighlights.length) {
            try {
              window.localStorage.setItem(
                HERO_HIGHLIGHTS_CACHE_KEY,
                JSON.stringify(data.config.landingHeroHighlights)
              );
            } catch {}
            setHeroHighlights(
              DEFAULT_HERO_HIGHLIGHTS.map((fallback, index) => {
                const iconName = data.config.landingHeroHighlights[index]?.icon;
                return {
                  ...fallback,
                  icon: AVAILABLE_ICONS[iconName] || fallback.icon,
                  title: String(data.config.landingHeroHighlights[index]?.title ?? "").trim() || fallback.title,
                  body: String(data.config.landingHeroHighlights[index]?.body ?? "").trim() || fallback.body,
                };
              })
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch global requirements:", err);
      }
    };
    fetchDestinationContent();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (popularFetchStartedRef.current) return undefined;
    popularFetchStartedRef.current = true;

    const fallbackCountries = (source = []) => source;

    const cancelSchedule = scheduleAfterPaint(async () => {
      if (popularCountryCards.length === 0 && allCountries.length === 0 && trendingCountries.length === 0) {
        setPopularCountriesLoading(true);
      }
      try {
        const { data } = await api.get("/countries/popular", { params: { limit: 250, _ts: Date.now() } });
        if (!alive) return;

        const normalized = Array.isArray(data?.countries)
          ? data.countries.map((country) => normalizeCountryFromApi(country)).filter(Boolean)
          : [];

        if (normalized.length > 0) {
          setPopularCountryCards(normalized);
          savePopularCountriesCache(data.countries);
        } else {
          const fallback = fallbackCountries(allCountries.length ? allCountries : trendingCountries);
          setPopularCountryCards(fallback);
        }
      } catch (err) {
        console.error("Failed to fetch popular countries:", err);
        if (!alive) return;
        const fallback = fallbackCountries(allCountries.length ? allCountries : trendingCountries);
        setPopularCountryCards(fallback);
      } finally {
        if (alive) setPopularCountriesLoading(false);
      }
    });

    return () => {
      alive = false;
      cancelSchedule?.();
    };
  }, [allCountries, trendingCountries, popularCountryCards.length]);

  // Search bar state (synchronized globally with Navbar search via uiStore)
  const searchDestination = useUIStore((state) => state.searchQuery);
  const setSearchDestination = useUIStore((state) => state.setSearchQuery);
  const clearSearchQuery = useUIStore((state) => state.clearSearchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  /** Full place list from Nominatim — updated in startTransition to keep typing smooth. */
  const [geocodePlaces, setGeocodePlaces] = useState([]);

  const searchTerm = searchDestination.trim().toLowerCase();

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNTRY_CARD_COUNT);
  }, [searchDestination]);

  // Sync URL ?q= parameter on initial load or navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) {
      setSearchDestination(q);
    }
  }, [location.search, setSearchDestination]);

  // Listen for search submissions triggered from Navbar
  useEffect(() => {
    const onNavbarSubmit = (e) => {
      const term = (e.detail || searchDestination).trim();
      if (!term) return;
      const localMatches = allCountries.filter((country) => matchesCountrySearch(country, term));
      if (localMatches.length >= 1) {
        scrollToCountry(getCountryRouteId(localMatches[0]));
      } else {
        const grid = document.getElementById("grid");
        if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("vb:submit-search", onNavbarSubmit);
    return () => window.removeEventListener("vb:submit-search", onNavbarSubmit);
  }, [allCountries, searchDestination, scrollToCountry]);

  useEffect(() => {
    const resetHomeSearch = () => {
      clearSearchQuery();
      setGeocodePlaces([]);
      setIsSearchFocused(false);
    };

    window.addEventListener("vb:reset-home-search", resetHomeSearch);
    return () => window.removeEventListener("vb:reset-home-search", resetHomeSearch);
  }, [clearSearchQuery]);

  useEffect(() => {
    if (!location.state?.resetSearch) return;
    clearSearchQuery();
    setGeocodePlaces([]);
    setIsSearchFocused(false);
    window.history.replaceState(
      { ...window.history.state, usr: { ...window.history.state?.usr, resetSearch: false } },
      "",
      window.location.href
    );
  }, [location.state]);

  useEffect(() => {
    const q = searchDestination.trim();
    if (q.length < GEOCODE_MIN_CHARS) {
      geocodeAbortRef.current?.abort();
      startTransition(() => setGeocodePlaces([]));
      return undefined;
    }

    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    const seq = ++geocodeReqSeq.current;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/geocode/places", {
          params: { q, limit: 24 },
          signal: controller.signal,
        });
        if (seq !== geocodeReqSeq.current) return;
        if (!data?.success) {
          startTransition(() => setGeocodePlaces([]));
          return;
        }
        const nextPlaces =
          Array.isArray(data.places) && data.places.length > 0
            ? data.places
            : Array.isArray(data.matches) && data.matches.length > 0
              ? data.matches.map((m) => ({
                  placeKey: `country-${m.id}`,
                  primaryLabel: m.name,
                  detailLabel: m.hint?.replace(/^Includes /, "") || m.name,
                  countrySlug: m.id,
                  countryName: m.name,
                }))
              : [];

        startTransition(() => setGeocodePlaces(nextPlaces));
      } catch (err) {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
        if (seq === geocodeReqSeq.current) startTransition(() => setGeocodePlaces([]));
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchDestination]);

  const suggestionRows = useMemo(() => {
    if (!searchTerm) return [];
    const localList = allCountries
      .filter((country) => matchesCountrySearch(country, searchTerm))
      .slice(0, 10);
    const rows = [];
    const seenPlace = new Set();
    for (const c of localList) {
      rows.push({
        kind: "country",
        key: `local-${c.id}`,
        country: c,
        hint: getCountrySearchHint(c, searchTerm),
      });
    }
    for (const p of geocodePlaces) {
      const pk = p.placeKey || `${p.countrySlug}-${p.primaryLabel}`;
      if (seenPlace.has(pk)) continue;
      seenPlace.add(pk);
      const country = allCountries.find(
        (c) => c.id === p.countrySlug || c.name === p.countryName
      );
      if (!country) continue;
      rows.push({
        kind: "place",
        key: `place-${pk}`,
        country,
        primaryLabel: p.primaryLabel,
        detailLabel: p.detailLabel || p.countryName,
      });
    }
    return rows.slice(0, 42);
  }, [searchTerm, allCountries, geocodePlaces]);

  const filteredCountries = useMemo(() => {
    let baseList = [];
    const term = searchDestination.trim();
    if (!term) {
      if (popularCountryCards.length > 0) {
        const freshById = new Map(
          [...allCountries, ...trendingCountries].map((country) => [getCountryRouteId(country), country])
        );
        baseList = popularCountryCards.map((country) => {
          const fresh = freshById.get(getCountryRouteId(country));
          if (!fresh) return country;
          return {
            ...country,
            ...fresh,
            imageUrl: fresh.imageUrl || country.imageUrl || "",
          };
        });
      } else if (popularCountriesLoading) {
        baseList = [];
      } else {
        baseList = allCountries.length > 0 ? allCountries : trendingCountries;
      }
    } else {
      const local = allCountries.filter((country) => matchesCountrySearch(country, term));
      const byId = new Map(local.map((c) => [getCountryRouteId(c), c]));
      for (const p of geocodePlaces) {
        const country = allCountries.find(
          (c) => c.id === p.countrySlug || c.name === p.countryName
        );
        const routeId = getCountryRouteId(country);
        if (country && !byId.has(routeId)) byId.set(routeId, country);
      }
      baseList = Array.from(byId.values());
    }

    // Apply dropdown filters
    if (selectedVisaType !== "All Visa Types") baseList = baseList.filter((c) => c.visaType === selectedVisaType);
    if (selectedValidity !== "Any Validity") baseList = baseList.filter((c) => c.validity === selectedValidity);
    if (selectedLengthOfStay !== "Any Length of Stay") baseList = baseList.filter((c) => c.lengthOfStay === selectedLengthOfStay);
    if (selectedEntryType !== "Any Entry Type") baseList = baseList.filter((c) => c.entryType === selectedEntryType);
    
    return baseList;
  }, [searchDestination, popularCountryCards, trendingCountries, allCountries, geocodePlaces, selectedVisaType, selectedValidity, selectedLengthOfStay, selectedEntryType, popularCountriesLoading]);

  const shouldShowPopularCountriesLoading =
    !searchDestination.trim() &&
    popularCountriesLoading &&
    popularCountryCards.length === 0;

  /** Stable key so the memoized grid skips unrelated ticks but still updates when card images arrive. */
  const displayedCountries = useMemo(() => {
    return filteredCountries.slice(0, visibleCount);
  }, [filteredCountries, visibleCount]);

  const countryIdsKey = useMemo(
    () => displayedCountries.map((c) => `${getCountryRouteId(c)}:${c.imageUrl || ""}`).join("|"),
    [displayedCountries]
  );

  useEffect(() => {
    const term = searchDestination.trim();
    if (!term || allCountries.length === 0) return;

    const merged = new Map();
    for (const c of allCountries.filter((country) => matchesCountrySearch(country, term))) {
      merged.set(getCountryRouteId(c), c);
    }
    for (const p of geocodePlaces) {
      const c = allCountries.find(
        (x) => x.id === p.countrySlug || x.name === p.countryName
      );
      if (c) merged.set(getCountryRouteId(c), c);
    }
    const list = Array.from(merged.values());
    if (list.length !== 1) return;

    const id = getCountryRouteId(list[0]);
    const timer = setTimeout(() => scrollToCountry(id), 240);
    return () => clearTimeout(timer);
  }, [searchDestination, allCountries, scrollToCountry, geocodePlaces]);

  const handleSuggestionRowClick = (row) => {
    setIsSearchFocused(false);
    if (row.kind === "country") {
      setSearchDestination(row.country.name);
      setTimeout(() => scrollToCountry(getCountryRouteId(row.country)), 150);
      return;
    }
    setSearchDestination(row.primaryLabel);
    setTimeout(() => scrollToCountry(getCountryRouteId(row.country)), 150);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearchFocused(false);
    const term = searchDestination.trim();
    if (!term) {
      return;
    }

    const localMatches = allCountries.filter((country) => matchesCountrySearch(country, term));
    if (localMatches.length >= 1) {
      setTimeout(() => scrollToCountry(getCountryRouteId(localMatches[0])), 150);
      return;
    }
    const p = geocodePlaces[0];
    if (p) {
      const c = allCountries.find(
        (x) => x.id === p.countrySlug || x.name === p.countryName
      );
      if (c) setTimeout(() => scrollToCountry(getCountryRouteId(c)), 150);
    }
  };

  const handleNavigateDestination = useCallback(
    (country) => navigate(`/destination/${encodeURIComponent(getCountryRouteId(country))}`),
    [navigate]
  );

  useEffect(() => {
    const handleGlobalTyping = (event) => {
      const input = searchInputRef.current;
      if (!input) return;

      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName?.toLowerCase();
      const isTypingInFormField = (
        activeElement?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
      if (isTypingInFormField) return;

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 && event.key !== "Backspace") return;

      event.preventDefault();
      input.focus();

      if (event.key === "Backspace") {
        setSearchDestination((prev) => prev.slice(0, -1));
        return;
      }

      setSearchDestination((prev) => `${prev}${event.key}`);
    };

    window.addEventListener("keydown", handleGlobalTyping);
    return () => window.removeEventListener("keydown", handleGlobalTyping);
  }, []);

  useEffect(() => {
    return scheduleAfterPaint(() => setShowDeferredFooter(true));
  }, []);

  useEffect(() => {
    let searchTriggerTop = 0;
    let filterTriggerTop = 0;
    let rafId = null;
    let resizeTimer = null;

    const measurePositions = () => {
      const searchAnchor = searchAnchorRef.current;
      const filterAnchor = filterAnchorRef.current;
      if (searchAnchor) searchTriggerTop = searchAnchor.getBoundingClientRect().top + window.scrollY;
      // Trigger when the bottom of the filter section goes past the bottom of the navbar (approx 72px)
      if (filterAnchor) filterTriggerTop = filterAnchor.getBoundingClientRect().bottom + window.scrollY - 72;
    };

    // rAF-throttled scroll: browser batches layout reads, no forced reflow per scroll px
    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!searchTriggerTop || !filterTriggerTop) measurePositions();
        const searchPinned = window.scrollY >= searchTriggerTop;
        const filterPinned = window.scrollY >= filterTriggerTop;
        setIsSearchPinned(searchPinned);
        setIsFilterPinned(filterPinned);
        if (!searchPinned) setMobileSearchExpanded(false);
      });
    };

    // Debounced resize: only re-measure after user stops resizing (150ms)
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measurePositions, 150);
    };

    measurePositions();
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const effectiveMobileSearchExpanded = mobileSearchExpanded || searchDestination.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Navbar />

      <section className="hero" id="hero">
        <div ref={searchAnchorRef} className="relative w-full">
          <form
            onSubmit={handleSearch}
            autoComplete="off"
            className="sbx"
            role="search"
            aria-label="Search visa destinations"
          >
            <input
              ref={searchInputRef}
              type="search"
              autoComplete="off"
              placeholder="Search country"
              value={searchDestination}
              onChange={(e) => setSearchDestination(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={(e) => {
                const nextFocused = e.relatedTarget;
                if (searchFormRef.current?.contains(nextFocused)) return;
                window.setTimeout(() => setIsSearchFocused(false), 120);
              }}
              aria-label="Search country"
              id="hero-destination-input"
              autoFocus
            />
            {searchDestination ? (
              <button
                type="button"
                onClick={() => {
                  clearSearchQuery();
                  searchInputRef.current?.focus();
                }}
                className="sbx-clear"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            ) : null}
            <button
              type="submit"
              className="b rb"
              aria-label="Search destinations"
            >
              <Search size={22} />
            </button>

            {searchTerm && isSearchFocused && (
              <div className="absolute left-0 right-0 top-[calc(100%+14px)] z-30 text-left">
                <div
                  ref={searchFormRef}
                  className="max-h-[min(70vh,520px)] overflow-hidden rounded-[var(--r)] bg-[var(--bg)] shadow-[var(--cs)]"
                >
                  {suggestionRows.length > 0 ? (
                    <div className="overflow-y-auto overscroll-contain">
                      {suggestionRows.map((row) => (
                        <button
                          type="button"
                          key={row.key}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSuggestionRowClick(row)}
                          className="w-full flex items-start justify-between gap-3 px-5 py-3.5 text-sm text-[var(--ink)] hover:bg-[#607938]/10 transition-colors text-left"
                        >
                          <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                            {row.kind === "country" ? (
                              <>
                                <span className="font-semibold truncate">{row.country.name}</span>
                                {row.hint ? (
                                  <span className="text-xs text-[var(--mu)]">{row.hint}</span>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-2 font-semibold text-[var(--ink)] min-w-0">
                                  <MapPin size={14} className="text-[var(--ac)] flex-shrink-0 mt-0.5" />
                                  <span className="truncate">{row.primaryLabel}</span>
                                </span>
                                <span className="text-xs text-[var(--mu)] pl-6 truncate">
                                  {row.detailLabel}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="w-9 h-9 rounded-full bg-[var(--bg)] flex items-center justify-center text-lg shadow-[var(--rs)] flex-shrink-0">
                            {getCountryFlagEmoji(row.country.name, row.country.flagEmoji)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-4 text-sm text-[var(--mu)]">
                      No matching destinations found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Feature strip matching reference */}
      <section className="fw">
        <div className="feat cd">
          {heroHighlights.map(({ icon: Icon, title, body }, idx) => (
            <div key={title || idx}>
              <Icon size={24} strokeWidth={1.8} />
              <p>
                <b>{title}</b>
                <span>{body}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Countries Grid */}
      <LandingCountriesGrid
        countryIdsKey={countryIdsKey}
        filteredCountries={displayedCountries}
        countryCardRefs={countryCardRefs}
        display={countryDisplay}
        documentCatalog={documentCatalog}
        heading=""
        loading={shouldShowPopularCountriesLoading}
        globalRequirements={globalRequirements}
        showVisaRequirements={countryDisplay?.showRequiredDocuments !== false}
        onNavigateDestination={handleNavigateDestination}
        hasMore={visibleCount < filteredCountries.length}
        onLoadMore={() => setVisibleCount((v) => v + 10)}
      />

      {showDeferredFooter ? (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      ) : null}
    </div>
  );
};

export default LandingPage;
