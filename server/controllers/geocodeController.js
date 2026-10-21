const Country = require('../models/Country');
const {
  isoAlpha2ToCountryName,
  nominatimCountryLabelToCanonical,
} = require('../utils/countryIsoLookup');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** OpenStreetMap Nominatim usage policy: identify the application; max ~1 req/s. */
let lastNominatimAt = 0;
const MIN_INTERVAL_MS = 1100;

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveCanonicalFromAddr(addr) {
  const code = String(addr.country_code || '')
    .trim()
    .toUpperCase();
  const nominatimCountry = addr.country;
  let canonicalName =
    code.length === 2 ? isoAlpha2ToCountryName(code) : null;
  if (!canonicalName && nominatimCountry) {
    canonicalName = nominatimCountryLabelToCanonical(nominatimCountry);
  }
  return { code, nominatimCountry, canonicalName };
}

/** Human-readable place title (city / town / region row). */
function buildPrimaryLabel(addr, item) {
  const a = addr || {};
  const fromAddr =
    a.city ||
    a.town ||
    a.village ||
    a.municipality ||
    a.hamlet ||
    a.suburb ||
    a.neighbourhood ||
    a.county ||
    a.state_district ||
    a.state ||
    '';
  if (fromAddr) return fromAddr;
  const d = String(item.display_name || '');
  const first = d.split(',').map((s) => s.trim())[0];
  return first || d.slice(0, 96) || 'Place';
}

/** Secondary line: region · country */
function buildDetailLabel(addr, countryName, primaryLabel) {
  const state = addr.state || addr.region;
  const parts = [];
  if (state && state !== primaryLabel) parts.push(state);
  parts.push(countryName);
  return parts.join(' · ');
}

/**
 * GET /api/geocode/places?q=paris&limit=30
 * Proxies Nominatim; returns every matching place (cities, towns, regions) that maps to a Country in our DB.
 *
 * Response:
 * - `places` — one row per distinct OSM hit (deep search / city list)
 * - `matches` — unique countries derived from `places` (for simpler filters e.g. admin grid)
 */
exports.searchPlaces = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 1) {
    return res.json({ success: true, places: [], matches: [] });
  }

  const rawLimit = Number.parseInt(String(req.query.limit || ''), 10);
  const nominatimLimit = Number.isFinite(rawLimit)
    ? Math.min(50, Math.max(5, rawLimit))
    : 30;
  const capEnv = Number.parseInt(process.env.GEOCODE_PLACES_CAP || '25', 10);
  const maxPlaces = Math.min(40, Number.isFinite(capEnv) && capEnv > 0 ? capEnv : 25);

  const userAgent =
    process.env.NOMINATIM_USER_AGENT ||
    'VisaVoyage/1.0 (destination search; contact via site support)';

  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastNominatimAt));
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastNominatimAt = Date.now();

  let rows;
  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      addressdetails: '1',
      limit: String(nominatimLimit),
    });
    const url = `${NOMINATIM_URL}?${params.toString()}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    const r = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      throw new Error(`Nominatim HTTP ${r.status}`);
    }
    const payload = await r.json();
    rows = Array.isArray(payload) ? payload : [];
  } catch (err) {
    console.error('geocodeController.searchPlaces:', err.message);
    return res.status(502).json({
      success: false,
      places: [],
      matches: [],
      message: 'Place search is temporarily unavailable.',
    });
  }

  const pending = rows.map((item) => {
    const addr = item.address || {};
    const { canonicalName, nominatimCountry } = resolveCanonicalFromAddr(addr);
    return { item, addr, canonicalName, nominatimCountry };
  });

  const nameSet = new Set();
  for (const p of pending) {
    if (p.canonicalName) nameSet.add(p.canonicalName);
  }

  /** @type {Map<string, { slug: string, name: string }>} */
  let dbByName = new Map();
  if (nameSet.size > 0) {
    try {
      const docs = await Country.find({ name: { $in: [...nameSet] } })
        .select('slug name')
        .lean();
      dbByName = new Map(docs.map((d) => [d.name, d]));
    } catch {
      dbByName = new Map();
    }
  }

  const places = [];
  const seenPlace = new Set();

  for (const p of pending) {
    if (places.length >= maxPlaces) break;

    let doc = p.canonicalName ? dbByName.get(p.canonicalName) : null;
    if (!doc && p.nominatimCountry) {
      try {
        doc = await Country.findOne({
          name: new RegExp(`^${escapeRegex(p.nominatimCountry.trim())}$`, 'i'),
        })
          .select('slug name')
          .lean();
      } catch {
        doc = null;
      }
    }

    const returnAll = req.query.all === 'true';
    if (!doc && !returnAll) continue;

    const pk = String(p.item.place_id ?? `${p.item.lat},${p.item.lon}`);
    if (seenPlace.has(pk)) continue;
    seenPlace.add(pk);

    const countryName = doc ? doc.name : (p.nominatimCountry || p.canonicalName || p.addr.country || p.addr.continent || '');
    const countrySlug = doc ? doc.slug : countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const primaryLabel = buildPrimaryLabel(p.addr, p.item);
    const detailLabel = buildDetailLabel(p.addr, countryName, primaryLabel).replace(/ · $/, '');

    places.push({
      placeKey: pk,
      primaryLabel,
      detailLabel,
      countrySlug: countrySlug,
      countryName: countryName,
      displayName: p.item.display_name || '',
    });
  }

  /** Unique countries for filters that only need destination coverage */
  const seenCountry = new Map();
  for (const pl of places) {
    if (!seenCountry.has(pl.countrySlug)) {
      seenCountry.set(pl.countrySlug, {
        id: pl.countrySlug,
        name: pl.countryName,
        hint: pl.primaryLabel ? `Includes ${pl.primaryLabel}` : undefined,
      });
    }
  }
  const matches = [...seenCountry.values()];

  return res.json({ success: true, places, matches });
};
