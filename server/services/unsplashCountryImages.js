/**
 * Unsplash → MongoDB country banner URLs (shared by CLI + admin API).
 * @see https://unsplash.com/documentation
 */

const https = require('https');
const Country = require('../models/Country');
const Settings = require('../models/Settings');
const { buildCountryImageSearchQueries } = require('../data/countryImageSearchHints');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function delayMs() {
  return Math.max(300, parseInt(process.env.UNSPLASH_DELAY_MS || '900', 10) || 900);
}

async function resolveUnsplashAccessKey() {
  const fromEnv = String(
    process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_API_KEY || '',
  ).trim();
  try {
    const doc = await Settings.findOne({ singleton: 'global' }).lean();
    const fromDb = String(doc?.unsplashAccessKey || '').trim();
    return fromDb || fromEnv;
  } catch {
    return fromEnv;
  }
}

/**
 * Search Unsplash for one photo (first hit). Omits orientation by default so results match
 * unsplash.com when you type the country name; set UNSPLASH_ORIENTATION=portrait|landscape|squarish to filter.
 */
function unsplashSearch(query, accessKey) {
  return new Promise((resolve) => {
    const params = {
      query,
      per_page: '1',
      content_filter: 'high',
    };
    const o = String(process.env.UNSPLASH_ORIENTATION || '').trim().toLowerCase();
    if (o === 'portrait' || o === 'landscape' || o === 'squarish') {
      params.orientation = o;
    }
    const qs = new URLSearchParams(params);
    const path = `/search/photos?${qs.toString()}`;
    const req = https.request(
      {
        hostname: 'api.unsplash.com',
        path,
        method: 'GET',
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
          'User-Agent': 'VisaVoyageCountrySeeder/1.0',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const photo = json?.results?.[0];
            const url =
              photo?.urls?.regular ||
              photo?.urls?.small ||
              photo?.urls?.full ||
              null;
            resolve(url);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.setTimeout(20000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

/**
 * @param {{ name?: string, slug?: string }} country
 * @param {string} accessKey
 */
async function getUnsplashPhoto(country, accessKey) {
  const queries = buildCountryImageSearchQueries(country);
  for (const q of queries) {
    const url = await unsplashSearch(q, accessKey);
    if (url) return url;
    await sleep(400);
  }
  return null;
}

function buildCountryFilter(onlyMissing, onlyTrending, onlyActive) {
  const parts = [];
  if (onlyActive) parts.push({ isActive: { $ne: false } });
  if (onlyTrending) parts.push({ trending: true });
  if (onlyMissing) {
    parts.push({
      $or: [{ imageUrl: '' }, { imageUrl: { $exists: false } }, { imageUrl: null }],
    });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

/**
 * Process up to `limit` countries starting at `skip`.
 * When `onlyTrending` is false, sorts with `trending: true` first so featured landing countries refresh before the rest.
 * @returns {Promise<{ success: boolean, message?: string, onlyMissing?: boolean, onlyTrending?: boolean, skip?: number, limit?: number, processed?: number, updated?: number, failed?: number, nextSkip?: number, hasMore?: boolean, totalMatching?: number }>}
 */
async function processUnsplashCountryImageBatch({
  onlyMissing = false,
  onlyTrending = false,
  onlyActive = false,
  skip = 0,
  limit = 25,
  accessKeyOverride = '',
}) {
  const override = String(accessKeyOverride || '').trim();
  const accessKey = override || (await resolveUnsplashAccessKey());
  if (!accessKey) {
    return {
      success: false,
      message:
        'Unsplash Access Key is missing. Save it in Admin → Settings → Country images (Unsplash), or set UNSPLASH_ACCESS_KEY in server/.env',
    };
  }

  const filter = buildCountryFilter(onlyMissing, onlyTrending, onlyActive);
  const totalMatching = await Country.countDocuments(filter);
  const sort = onlyTrending ? { name: 1 } : { trending: -1, name: 1 };
  const countries = await Country.find(filter).sort(sort).skip(skip).limit(limit);

  let updated = 0;
  let failed = 0;
  const wait = delayMs();

  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const photoUrl = await getUnsplashPhoto(
      { name: country.name, slug: country.slug },
      accessKey,
    );
    if (photoUrl) {
      await Country.findByIdAndUpdate(country._id, { imageUrl: photoUrl });
      updated++;
    } else {
      failed++;
    }
    if (i < countries.length - 1) await sleep(wait);
  }

  const processed = countries.length;
  const nextSkip = skip + processed;
  const hasMore = nextSkip < totalMatching;

  return {
    success: true,
    onlyMissing,
    onlyTrending,
    onlyActive,
    skip,
    limit,
    processed,
    updated,
    failed,
    nextSkip,
    hasMore,
    totalMatching,
  };
}

module.exports = {
  resolveUnsplashAccessKey,
  getUnsplashPhoto,
  processUnsplashCountryImageBatch,
};
