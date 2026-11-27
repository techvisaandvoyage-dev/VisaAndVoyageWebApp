import { lazy, Suspense, useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, LayoutDashboard, LogOut, Menu, X, BookOpen, Search, ChevronRight, BadgeCheck } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { getAdminAppUrl } from "../../utils/adminAppUrl";
import { useSiteLogo } from "../../hooks/useSiteLogo";
import { useCountries } from "../../hooks/useCountries";
import { matchesCountrySearch, getCountryFlagEmoji } from "../../utils/countrySearch";
import { getCountryRouteId } from "../../utils/countryRouting";
import { getFileUrl } from "../../utils/fileUrl";
import NotificationBell from "./NotificationBell";
import brandLogo from "../../assets/visa-voyage-logo.webp";

const AuthPageModal = lazy(() => import("../auth/AuthPageModal"));

const Navbar = ({ centerContent = null }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Zustand Store Fixes (Performance Optimized) ──────────
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const mobileMenuOpen = useUIStore((state) => state.mobileMenuOpen);
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu);
  const closeMobileMenu = useUIStore((state) => state.closeMobileMenu);
  const searchQuery = useUIStore((state) => state.searchQuery);
  const setSearchQuery = useUIStore((state) => state.setSearchQuery);
  const clearSearchQuery = useUIStore((state) => state.clearSearchQuery);

  const [scrolled, setScrolled] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const centerSearchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const siteLogo = useSiteLogo();
  const { countries = [] } = useCountries();

  const matchingCountries = useMemo(() => {
    const query = searchQuery.trim();
    if (!query || !countries.length) return [];
    return countries
      .filter((country) => matchesCountrySearch(country, query))
      .slice(0, 8);
  }, [searchQuery, countries]);

  const handleSelectCountry = (country) => {
    const routeId = getCountryRouteId(country);
    if (!routeId) return;
    setShowSearchDropdown(false);
    clearSearchQuery();
    closeMobileMenu();
    navigate(`/destination/${encodeURIComponent(routeId)}`);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inCompact = searchContainerRef.current && searchContainerRef.current.contains(event.target);
      const inCenter = centerSearchContainerRef.current && centerSearchContainerRef.current.contains(event.target);
      const inMobile = mobileSearchContainerRef.current && mobileSearchContainerRef.current.contains(event.target);
      if (!inCompact && !inCenter && !inMobile) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // ── Detect scroll to toggle navbar style ─────────────────
  useEffect(() => {
    const heroSbx = document.querySelector("#hero .sbx");
    if (!heroSbx) {
      const onScroll = () => setScrolled(window.scrollY > 40);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setScrolled(!entries[0].isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(heroSbx);
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowSearchDropdown(false);
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const isLanding = location.pathname === "/";
  const isTransientPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/apply") ||
    location.pathname.endsWith("/summary");

  const handleDashboardOpen = () => {
    if (user?.role === "admin") {
      window.location.href = getAdminAppUrl("/");
    } else {
      navigate("/dashboard", { replace: isTransientPage });
    }
  };

  const handleProfileIconClick = () => {
    if (isAuthenticated) {
      setProfileDropdownOpen((prev) => !prev);
    } else {
      closeMobileMenu();
      setAuthModalOpen(true);
    }
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    closeMobileMenu();
    clearSearchQuery();
    setShowSearchDropdown(false);

    if (location.pathname === "/") {
      window.dispatchEvent(new CustomEvent("vb:reset-home-search"));
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }

    navigate("/", {
      replace: isTransientPage,
      state: { resetSearch: true },
    });
  };

  const handleNavbarSearchSubmit = (e) => {
    e.preventDefault();
    const term = searchQuery.trim();
    if (!term) return;

    if (matchingCountries.length > 0) {
      handleSelectCountry(matchingCountries[0]);
      return;
    }

    setShowSearchDropdown(false);
    if (location.pathname !== "/") {
      navigate(`/?q=${encodeURIComponent(term)}`);
    } else {
      window.dispatchEvent(new CustomEvent("vb:submit-search", { detail: term }));
    }
  };

  const renderCountryDropdown = (placement = "compact") => {
    if (!showSearchDropdown || !searchQuery.trim()) return null;

    let positionClasses = "";
    if (placement === "compact") {
      positionClasses = "right-0 w-72 sm:w-80";
    } else if (placement === "center") {
      positionClasses = "left-0 right-0 w-full";
    } else if (placement === "mobile") {
      positionClasses = "left-0 right-0 w-full";
    }

    return (
      <div
        className={`nv-search-dropdown ${positionClasses}`}
        role="listbox"
        aria-label="Country suggestions"
      >
        <div className="nv-search-list">
          {matchingCountries.length > 0 ? (
            matchingCountries.map((country) => {
              const flag = getCountryFlagEmoji(country.name, country.flagEmoji);
              const routeId = getCountryRouteId(country);
              const visaInfo = country.visaType || country.continent || "Visa Available";
              return (
                <button
                  key={country.id || routeId || country.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectCountry(country)}
                  className="nv-search-item"
                  role="option"
                >
                  <span className="nv-search-flag" aria-hidden="true">
                    {flag || "🌐"}
                  </span>
                  <span className="nv-search-info">
                    <span className="nv-search-name">{country.name}</span>
                    <span className="nv-search-meta">{visaInfo}</span>
                  </span>
                  <ChevronRight size={15} className="nv-search-arrow" aria-hidden="true" />
                </button>
              );
            })
          ) : (
            <div className="nv-search-empty">
              <span>No countries found</span>
              <small>No destinations match &ldquo;{searchQuery.trim()}&rdquo;</small>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className={`nh ${scrolled ? "sc" : ""}`}>
        <nav className="nv w">
          {/* ── Logo ── */}
          <Link
            to="/"
            replace
            onClick={handleLogoClick}
            className="flex items-center shrink-0"
            aria-label="VISAANDVOYAGE Home"
          >
            <img
              src={brandLogo}
              alt="Visa &amp; Voyage"
              className="h-12 sm:h-14 w-auto object-contain"
              loading="eager"
            />
          </Link>

          {/* ── Center search box (ONLY on homepage, fades in on scroll, synced with hero search) ── */}
          {isLanding && (
            <div className="ns relative" ref={centerSearchContainerRef}>
              <form
                onSubmit={handleNavbarSearchSubmit}
                className="sbx"
                role="search"
                autoComplete="off"
              >
                <input
                  name="countrySearch"
                  type="search"
                  placeholder="Search country"
                  aria-label="Search country"
                  value={searchQuery}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowSearchDropdown(false);
                  }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearSearchQuery();
                      setShowSearchDropdown(false);
                    }}
                    className="sbx-clear"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <button type="submit" className="b rb sm" aria-label="Search">
                  <Search size={18} />
                </button>
              </form>
              {renderCountryDropdown("center")}
            </div>
          )}

          {/* ── Optional center slot for page-specific navigation (e.g. Country Details tabs) ── */}
          {!isLanding && centerContent && (
            <div className="nv-center">
              {centerContent}
            </div>
          )}

          {/* ── Right side: Blog + Notifications + Account ── */}
          <div className="nr">
            {!isLanding && (
              <div className="relative hidden sm:block" ref={searchContainerRef}>
                <form
                  onSubmit={handleNavbarSearchSubmit}
                  className="sbx sbx-compact"
                  role="search"
                  autoComplete="off"
                >
                  <input
                    name="countrySearch"
                    type="search"
                    placeholder="Search country"
                    aria-label="Search country"
                    value={searchQuery}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    onFocus={() => setShowSearchDropdown(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowSearchDropdown(false);
                    }}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        clearSearchQuery();
                        setShowSearchDropdown(false);
                      }}
                      className="sbx-clear"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                  <button type="submit" className="b rb sm" aria-label="Search">
                    <Search size={15} />
                  </button>
                </form>
                {renderCountryDropdown("compact")}
              </div>
            )}

            <Link
              to="/blog"
              replace={isTransientPage}
              className="nv-blog-btn"
            >
              <BookOpen size={18} />
              <span>Blog</span>
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NotificationBell />

                <div className="relative" ref={dropdownRef}>
                  <button
                    id="user-dashboard-btn"
                    onClick={handleProfileIconClick}
                    className="ib"
                    aria-label="Open account menu"
                    aria-haspopup="menu"
                  >
                    <User size={20} />
                  </button>

                  <div
                    className={`absolute right-0 top-full z-50 w-72 origin-top-right overflow-hidden rounded-[22px] border border-[#2D2B22]/15 bg-[#EEDFC7] text-[#2D2B22] shadow-[0_22px_54px_rgba(45,43,34,0.3),0_4px_12px_rgba(45,43,34,0.14)] transition-all duration-150 ${
                      profileDropdownOpen
                        ? "visible translate-y-3 scale-100 opacity-100"
                        : "pointer-events-none invisible translate-y-2 scale-95 opacity-0"
                    }`}
                    role="menu"
                  >
                    <div className="flex items-center gap-3 border-b border-[#2D2B22]/12 bg-[#e8d7bc]/70 px-4 py-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#EEDFC7] bg-[#dfd2bc] text-[#607938] shadow-[inset_1px_2px_5px_rgba(45,43,34,0.18),2px_3px_6px_rgba(45,43,34,0.14)]">
                        {user?.profileImage ? (
                          <img
                            src={getFileUrl(user.profileImage)}
                            alt={user?.name || "Profile"}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-extrabold uppercase text-[#607938]">
                            {(user?.name || "U").trim().charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-extrabold text-[#2D2B22]">
                            {user?.name || "User"}
                          </p>
                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#607938] text-white">
                            <BadgeCheck size={10} />
                          </span>
                        </div>
                        {user?.email && (
                          <p className="mt-0.5 truncate text-xs font-medium text-[#6E6A59]">
                            {user.email}
                          </p>
                        )}
                        {!user?.email && user?.phone && (
                          <p className="mt-0.5 truncate text-xs font-medium text-[#6E6A59]">
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 p-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          navigate("/dashboard/profile", {
                            replace: isTransientPage,
                            state:
                              location.pathname !== "/dashboard/profile"
                                ? { from: `${location.pathname}${location.search || ""}` }
                                : undefined,
                          });
                        }}
                        className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition-all active:translate-y-[1px] active:shadow-[inset_1px_2px_5px_rgba(45,43,34,0.18)] ${
                          location.pathname === "/dashboard/profile"
                            ? "bg-[#dfd2bc] text-[#4e632d] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.16)]"
                            : "text-[#2D2B22] hover:bg-[#dfd2bc]/75 hover:shadow-[2px_3px_8px_rgba(45,43,34,0.1)]"
                        }`}
                        role="menuitem"
                      >
                        <span
                          className={`nv-dd-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors shadow-[inset_1px_2px_4px_rgba(45,43,34,0.15)] ${
                            location.pathname === "/dashboard/profile"
                              ? "is-colored bg-[#607938] text-white"
                              : "bg-[#dfd2bc] text-[#607938] group-hover:bg-[#607938] group-hover:text-white"
                          }`}
                        >
                          <User size={15} />
                        </span>
                        <span className="flex-1">Profile</span>
                        <ChevronRight
                          size={14}
                          className="text-[#6E6A59] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:text-[#607938] group-hover:opacity-100"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          handleDashboardOpen();
                        }}
                        className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition-all active:translate-y-[1px] active:shadow-[inset_1px_2px_5px_rgba(45,43,34,0.18)] ${
                          location.pathname === "/dashboard"
                            ? "bg-[#dfd2bc] text-[#4e632d] shadow-[inset_1px_2px_4px_rgba(45,43,34,0.16)]"
                            : "text-[#2D2B22] hover:bg-[#dfd2bc]/75 hover:shadow-[2px_3px_8px_rgba(45,43,34,0.1)]"
                        }`}
                        role="menuitem"
                      >
                        <span
                          className={`nv-dd-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors shadow-[inset_1px_2px_4px_rgba(45,43,34,0.15)] ${
                            location.pathname === "/dashboard"
                              ? "is-colored bg-[#607938] text-white"
                              : "bg-[#dfd2bc] text-[#607938] group-hover:bg-[#607938] group-hover:text-white"
                          }`}
                        >
                          <LayoutDashboard size={15} />
                        </span>
                        <span className="flex-1">Dashboard</span>
                        <ChevronRight
                          size={14}
                          className="text-[#6E6A59] opacity-60 transition-all group-hover:translate-x-0.5 group-hover:text-[#607938] group-hover:opacity-100"
                        />
                      </button>

                      <div className="my-1 border-t border-[#2D2B22]/10 pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-[#9a3b2a] transition-all hover:bg-[#9a3b2a]/10 active:translate-y-[1px]"
                          role="menuitem"
                        >
                          <span className="nv-dd-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#9a3b2a]/12 text-[#9a3b2a] shadow-[inset_1px_2px_4px_rgba(154,59,42,0.12)] transition-colors group-hover:bg-[#9a3b2a] group-hover:text-white">
                            <LogOut size={15} />
                          </span>
                          <span className="flex-1">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setAuthModalOpen(true);
                }}
                className="nv-login-btn"
                aria-label="Log in"
              >
                Log in
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              id="mobile-menu-btn"
              onClick={toggleMobileMenu}
              className="ib md:hidden"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* ── Mobile menu drawer ── */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#2D2B22]/10 bg-[var(--nb)] p-4 space-y-3 animate-mobile-menu-in">
            <div className="relative w-full" ref={mobileSearchContainerRef}>
              <form
                onSubmit={(e) => {
                  closeMobileMenu();
                  handleNavbarSearchSubmit(e);
                }}
                className="sbx w-full"
                role="search"
                autoComplete="off"
              >
                <input
                  type="search"
                  placeholder="Search country"
                  aria-label="Search country"
                  value={searchQuery}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowSearchDropdown(false);
                  }}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearSearchQuery();
                      setShowSearchDropdown(false);
                    }}
                    className="sbx-clear"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <button type="submit" className="b rb sm" aria-label="Search">
                  <Search size={18} />
                </button>
              </form>
              {renderCountryDropdown("mobile")}
            </div>
            {isAuthenticated ? (
              <>
                <div className="px-2 py-2 border-b border-[#2D2B22]/10 text-center">
                  <p className="text-sm font-bold text-[var(--ink)] truncate">
                    {user?.name || "User"}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-[var(--mu)] truncate mt-0.5">
                      {user?.email}
                    </p>
                  )}
                </div>
                <Link
                  to="/blog"
                  replace={isTransientPage}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2 text-[var(--ink)] font-semibold p-2 rounded-xl hover:bg-[#607938]/10"
                >
                  <BookOpen size={16} />
                  Blog
                </Link>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    navigate("/dashboard/profile", {
                      replace: isTransientPage,
                      state:
                        location.pathname !== "/dashboard/profile"
                          ? { from: `${location.pathname}${location.search || ""}` }
                          : undefined,
                    });
                  }}
                  className="flex w-full items-center gap-2 text-[var(--ink)] font-semibold p-2 rounded-xl hover:bg-[#607938]/10"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    if (user?.role === "admin") {
                      window.location.href = getAdminAppUrl("/");
                    } else {
                      navigate("/dashboard", { replace: isTransientPage });
                    }
                  }}
                  className="flex w-full items-center gap-2 text-[var(--ink)] font-semibold p-2 rounded-xl hover:bg-[#607938]/10"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 text-red-700 font-semibold p-2 rounded-xl hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/blog"
                  replace={isTransientPage}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2 text-[var(--ink)] font-semibold p-2 rounded-xl hover:bg-[#607938]/10"
                >
                  <BookOpen size={16} />
                  Blog
                </Link>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      setAuthModalOpen(true);
                    }}
                    className="b rb w-full"
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <Suspense fallback={null}>
        <AuthPageModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </Suspense>
    </>
  );
};

export default Navbar;
