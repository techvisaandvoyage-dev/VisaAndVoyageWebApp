const fs = require('fs');
const file = 'client/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const stateRegex = /  \/\/ Search bar state\r?\n  const \[searchDestination, setSearchDestination\] = useState\(""\);/;

if (stateRegex.test(content)) {
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
    content = content.replace(stateRegex, stateInjection);
    fs.writeFileSync(file, content);
    console.log("State injected successfully.");
} else {
    console.log("State injection regex failed.");
}
