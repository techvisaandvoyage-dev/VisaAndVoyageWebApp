const fs = require('fs');
const file = 'client/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const heroHighlightsIndex = content.indexOf('className="mx-auto mt-6 w-full max-w-5xl rounded-2xl bg-white px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] sm:mt-8 sm:px-6 animate-home-enter [animation-delay:80ms]"');
if (heroHighlightsIndex !== -1) {
    const insertPoint = content.lastIndexOf('<div', heroHighlightsIndex);
    
    const standardFilters = `
          {/* Standard Filter Bar (In Hero) */}
          {siteConfig?.landingPage?.hideFilter !== true && (
            <div
              className="mx-auto mt-6 sm:mt-8 w-full max-w-5xl grid grid-cols-2 lg:flex items-center gap-2 sm:gap-3 rounded-2xl bg-white p-2 sm:p-3 shadow-xl transition-all duration-300 filter-dropdown-container animate-home-enter [animation-delay:40ms]"
            >
              {/* Visa Type */}
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'heroVisaType' ? null : 'heroVisaType')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5"
                >
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Visa Type</span>
                    <span className="truncate">{selectedVisaType}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroVisaType' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroVisaType' && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-56 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {visaTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => { setSelectedVisaType(type); setOpenDropdown(null); }}
                        className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${
                          selectedVisaType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }\`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Validity */}
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'heroValidity' ? null : 'heroValidity')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5"
                >
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Validity</span>
                    <span className="truncate">{selectedValidity}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroValidity' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroValidity' && (
                  <div className="absolute right-0 lg:left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-56 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {validities.map((val) => (
                      <button
                        key={val}
                        onClick={() => { setSelectedValidity(val); setOpenDropdown(null); }}
                        className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${
                          selectedValidity === val ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }\`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Length of Stay */}
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'heroLength' ? null : 'heroLength')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5"
                >
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Length of Stay</span>
                    <span className="truncate">{selectedLengthOfStay}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroLength' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroLength' && (
                  <div className="absolute left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-64 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {lengthsOfStay.map((len) => (
                      <button
                        key={len}
                        onClick={() => { setSelectedLengthOfStay(len); setOpenDropdown(null); }}
                        className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${
                          selectedLengthOfStay === len ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }\`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Entry Type */}
              <div className="relative w-full lg:w-auto lg:flex-1">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'heroEntry' ? null : 'heroEntry')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary transition-colors hover:border-cyan/30 hover:bg-cyan/5"
                >
                  <span className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-text-muted font-normal">Entry Type</span>
                    <span className="truncate">{selectedEntryType}</span>
                  </span>
                  <ChevronDown size={16} className={\`text-text-muted transition-transform \${openDropdown === 'heroEntry' ? "rotate-180 text-cyan" : ""}\`} />
                </button>
                {openDropdown === 'heroEntry' && (
                  <div className="absolute right-0 lg:left-0 top-full z-10 mt-2 w-[calc(100vw-3rem)] sm:w-56 lg:w-full rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                    {entryTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => { setSelectedEntryType(type); setOpenDropdown(null); }}
                        className={\`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors \${
                          selectedEntryType === type ? "bg-cyan/10 text-cyan font-semibold" : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                        }\`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2 lg:col-span-1 flex justify-center lg:justify-end mt-1 lg:mt-0">
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium text-[#0b1f45] transition-colors hover:text-cyan whitespace-nowrap"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}\n`;
    content = content.slice(0, insertPoint) + standardFilters + content.slice(insertPoint);
    console.log("Standard filters injected.");
}

fs.writeFileSync(file, content);
