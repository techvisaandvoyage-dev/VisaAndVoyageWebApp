const fs = require('fs');
const file = 'client/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Inject State Logic
const stateHookTarget = `  // Search bar state\n  const [searchDestination, setSearchDestination] = useState("");`;
const stateInjection = `  const [siteConfig, setSiteConfig] = useState(null);
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

  // Search bar state
  const [searchDestination, setSearchDestination] = useState("");`;
content = content.replace(stateHookTarget, stateInjection);

// 2. Inject filtering logic
const filterLogicRegex = /(const filteredCountries = useMemo\(\(\) => {[\s\S]*?return Array\.from\(byId\.values\(\)\);\n  }, \[.*?\]\);)/;
content = content.replace(filterLogicRegex, (match) => {
    let replaced = match.replace('const filteredCountries = useMemo(() => {', 'const filteredCountries = useMemo(() => {\n    let result = [];');
    replaced = replaced.replace('return popularCountryCards.map((country) => {', 'result = popularCountryCards.map((country) => {');
    replaced = replaced.replace('if (popularCountriesLoading) return [];', '');
    replaced = replaced.replace('return allCountries.length > 0 ? allCountries : trendingCountries;', 'result = allCountries.length > 0 ? allCountries : trendingCountries;');
    replaced = replaced.replace('return Array.from(byId.values());', 'result = Array.from(byId.values());');
    
    // Add the filter application
    replaced = replaced.replace(/}, \[(.*?)\]\);/, `
    if (selectedVisaType !== "All Visa Types") result = result.filter((c) => c.visaType === selectedVisaType);
    if (selectedValidity !== "Any Validity") result = result.filter((c) => c.validity === selectedValidity);
    if (selectedLengthOfStay !== "Any Length of Stay") result = result.filter((c) => c.lengthOfStay === selectedLengthOfStay);
    if (selectedEntryType !== "Any Entry Type") result = result.filter((c) => c.entryType === selectedEntryType);
    
    return result;
  }, [$1, selectedVisaType, selectedValidity, selectedLengthOfStay, selectedEntryType]);`);
    return replaced;
});

// 3. Inject Pinned Filters UI
const pinnedRegex = /(<\/form>\s*<\/div>\s*<\/div>)/;
const pinnedFilters = `
          {/* Pinned Filters (Below Navbar) */}
          {siteConfig?.landingPage?.hideFilter !== true && (
            <div
              className={\`fixed inset-x-0 top-[72px] z-[990] flex h-[64px] items-center justify-center transition-all duration-300 pointer-events-none \${
                isSearchPinned && !effectiveMobileSearchExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
              }\`}
            >
              <div className="hidden lg:flex items-center gap-3 filter-dropdown-container pointer-events-auto">
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedVisaType' ? null : 'pinnedVisaType')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition-colors hover:border-cyan hover:text-cyan">
                    {selectedVisaType} <ChevronDown size={14} className={\`transition-transform \${openDropdown === 'pinnedVisaType' ? "rotate-180" : ""}\`} />
                  </button>
                  {openDropdown === 'pinnedVisaType' && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {visaTypes.map((type) => (
                        <button key={type} onClick={() => { setSelectedVisaType(type); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedVisaType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedValidity' ? null : 'pinnedValidity')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition-colors hover:border-cyan hover:text-cyan">
                    {selectedValidity} <ChevronDown size={14} className={\`transition-transform \${openDropdown === 'pinnedValidity' ? "rotate-180" : ""}\`} />
                  </button>
                  {openDropdown === 'pinnedValidity' && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {validities.map((val) => (
                        <button key={val} onClick={() => { setSelectedValidity(val); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedValidity === val ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedLength' ? null : 'pinnedLength')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition-colors hover:border-cyan hover:text-cyan">
                    {selectedLengthOfStay} <ChevronDown size={14} className={\`transition-transform \${openDropdown === 'pinnedLength' ? "rotate-180" : ""}\`} />
                  </button>
                  {openDropdown === 'pinnedLength' && (
                    <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {lengthsOfStay.map((len) => (
                        <button key={len} onClick={() => { setSelectedLengthOfStay(len); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedLengthOfStay === len ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                          {len}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button type="button" onClick={() => setOpenDropdown(openDropdown === 'pinnedEntry' ? null : 'pinnedEntry')} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition-colors hover:border-cyan hover:text-cyan">
                    {selectedEntryType} <ChevronDown size={14} className={\`transition-transform \${openDropdown === 'pinnedEntry' ? "rotate-180" : ""}\`} />
                  </button>
                  {openDropdown === 'pinnedEntry' && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                      {entryTypes.map((type) => (
                        <button key={type} onClick={() => { setSelectedEntryType(type); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedEntryType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(selectedVisaType !== "All Visa Types" || selectedValidity !== "Any Validity" || selectedLengthOfStay !== "Any Length of Stay" || selectedEntryType !== "Any Entry Type") && (
                  <button onClick={clearFilters} className="text-sm font-medium text-[#0b1f45] transition-colors hover:text-cyan ml-2">Clear</button>
                )}
              </div>
            </div>
          )}`;
content = content.replace(pinnedRegex, '$1' + pinnedFilters);

// 4. Inject Standard Filters UI
const heroRegex = /(<div\s+className="mx-auto mt-6 w-full max-w-5xl rounded-2xl bg-white px-4 py-3 shadow-\[0_4px_12px_rgba\(0,0,0,0\.03\)\] sm:mt-8 sm:px-6 animate-home-enter \[animation-delay:80ms\]">)/;
const standardFilters = `
          {/* Standard Filter Bar (In Hero) */}
          {siteConfig?.landingPage?.hideFilter !== true && (
            <div className="mx-auto mt-6 sm:mt-8 w-full max-w-5xl grid grid-cols-2 lg:flex items-center gap-2 sm:gap-3 rounded-2xl bg-white p-2 sm:p-3 shadow-xl transition-all duration-300 filter-dropdown-container animate-home-enter [animation-delay:40ms]">
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroVisaType' ? null : 'heroVisaType')} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5">
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Visa Type</span>
                    <span className="truncate">{selectedVisaType}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroVisaType' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroVisaType' && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-56 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {visaTypes.map((type) => (
                      <button key={type} onClick={() => { setSelectedVisaType(type); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedVisaType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroValidity' ? null : 'heroValidity')} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5">
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Validity</span>
                    <span className="truncate">{selectedValidity}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroValidity' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroValidity' && (
                  <div className="absolute right-0 lg:left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-56 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {validities.map((val) => (
                      <button key={val} onClick={() => { setSelectedValidity(val); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedValidity === val ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroLength' ? null : 'heroLength')} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5">
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Length of Stay</span>
                    <span className="truncate">{selectedLengthOfStay}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroLength' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroLength' && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-64 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {lengthsOfStay.map((len) => (
                      <button key={len} onClick={() => { setSelectedLengthOfStay(len); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedLengthOfStay === len ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                        {len}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button type="button" onClick={() => setOpenDropdown(openDropdown === 'heroEntry' ? null : 'heroEntry')} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5">
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Entry Type</span>
                    <span className="truncate">{selectedEntryType}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroEntry' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroEntry' && (
                  <div className="absolute right-0 lg:left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-56 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {entryTypes.map((type) => (
                      <button key={type} onClick={() => { setSelectedEntryType(type); setOpenDropdown(null); }} className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${selectedEntryType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"}\`}>
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2 lg:col-span-1 flex justify-center lg:justify-end mt-1 lg:mt-0">
                <button onClick={clearFilters} className="text-sm font-medium text-[#0b1f45] transition-colors hover:text-cyan whitespace-nowrap">
                  Clear all filters
                </button>
              </div>
            </div>
          )}\n`;
content = content.replace(heroRegex, standardFilters + '$1');

// 5. Update Padding
content = content.replace('isAuthenticated ? "pr-[104px]" : "pr-[62px]"', 'isAuthenticated ? "pr-[108px]" : "pr-[62px]"');

fs.writeFileSync(file, content);
console.log('All changes applied successfully.');
