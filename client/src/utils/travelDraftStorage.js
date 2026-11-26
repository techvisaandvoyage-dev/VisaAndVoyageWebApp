const KEY_PREFIX = "vb-travel-draft-";

export const travelDraftStorageKey = (countryId) =>
  countryId ? `${KEY_PREFIX}${countryId}` : "";

export function saveTravelDraft(countryId, draft) {
  if (!countryId || !draft) return;
  try {
    const existing = loadTravelDraft(countryId) || {};
    const merged = { ...existing, ...draft };
    const payload = JSON.stringify({
      applicationId: merged.applicationId ?? "",
      travelDateFrom: merged.travelDateFrom ?? "",
      travelDateTo: merged.travelDateTo ?? "",
      visaOption: merged.visaOption ?? "e-Visa",
      sharedDriveLink: merged.sharedDriveLink ?? "",
      travelers: Array.isArray(merged.travelers)
        ? merged.travelers.map((traveler) => ({
            ...traveler,
            name: traveler?.name ?? traveler?.fullName ?? "",
          }))
        : [],
      passportSuccesses: typeof merged.passportSuccesses === "object" && merged.passportSuccesses
        ? merged.passportSuccesses
        : {},
      passportDetails: typeof merged.passportDetails === "object" && merged.passportDetails
        ? merged.passportDetails
        : {},
      hiddenPassportTravelerNos: typeof merged.hiddenPassportTravelerNos === "object" && merged.hiddenPassportTravelerNos
        ? merged.hiddenPassportTravelerNos
        : {},
      uploadedDocSuccesses: typeof merged.uploadedDocSuccesses === "object" && merged.uploadedDocSuccesses
        ? merged.uploadedDocSuccesses
        : {},
      uploadedDocDetails: typeof merged.uploadedDocDetails === "object" && merged.uploadedDocDetails
        ? merged.uploadedDocDetails
        : {},
      showTravelDetails: merged.showTravelDetails !== false,
    });
    localStorage.setItem(travelDraftStorageKey(countryId), payload);
    sessionStorage.setItem(travelDraftStorageKey(countryId), payload);
  } catch {
    /* quota / private mode */
  }
}

export function loadTravelDraft(countryId) {
  if (!countryId) return null;
  try {
    const key = travelDraftStorageKey(countryId);
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTravelDraft(countryId) {
  if (!countryId) return;
  try {
    const key = travelDraftStorageKey(countryId);
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
