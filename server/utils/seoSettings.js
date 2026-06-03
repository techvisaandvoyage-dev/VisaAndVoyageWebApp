const DEFAULT_SITE_URL = 'https://visavo.in';

const normalizeUrl = (value, fallback = '') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return raw;
};

const normalizeText = (value, fallback = '') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const getRequestOrigin = (req) => {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req?.protocol || 'https';
  const host = String(req?.get?.('host') || '').trim();
  return host ? `${protocol}://${host}` : '';
};

const toAbsoluteAssetUrl = (value, req) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) return raw.startsWith('/') ? raw : `/${raw}`;
  return raw.startsWith('/') ? `${requestOrigin}${raw}` : `${requestOrigin}/${raw}`;
};

const buildSeoPublicConfig = (settings, req) => {
  const siteUrl = normalizeUrl(settings?.seoCanonicalUrl, DEFAULT_SITE_URL) || DEFAULT_SITE_URL;
  const websiteTitle = normalizeText(settings?.seoWebsiteTitle, 'Visa & Voyage');
  const metaDescription = normalizeText(settings?.seoMetaDescription);
  const homepageTitle = normalizeText(settings?.seoHomepageTitle, websiteTitle);
  const homepageDescription = normalizeText(settings?.seoHomepageDescription, metaDescription);
  const twitterTitle = normalizeText(settings?.seoTwitterTitle, homepageTitle || websiteTitle);
  const twitterDescription = normalizeText(settings?.seoTwitterDescription, homepageDescription || metaDescription);
  const faviconUrl = toAbsoluteAssetUrl(settings?.seoFaviconUrl, req);
  const favicon32Url = toAbsoluteAssetUrl(settings?.seoFavicon32Url, req) || faviconUrl;
  const favicon192Url = toAbsoluteAssetUrl(settings?.seoFavicon192Url, req) || favicon32Url || faviconUrl;
  const appleTouchIconUrl = toAbsoluteAssetUrl(settings?.seoAppleTouchIconUrl, req) || favicon192Url || favicon32Url || faviconUrl;

  return {
    websiteTitle,
    metaDescription,
    metaKeywords: normalizeText(settings?.seoMetaKeywords),
    homepageTitle,
    homepageDescription,
    twitterTitle,
    twitterDescription,
    canonicalUrl: siteUrl,
    robotsIndex: settings?.seoRobotsIndex !== false,
    sitemapUrl: normalizeUrl(settings?.seoSitemapUrl, `${siteUrl}/sitemap.xml`) || `${siteUrl}/sitemap.xml`,
    faviconUrl,
    favicon32Url,
    favicon192Url,
    appleTouchIconUrl,
    organizationSchema: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: websiteTitle,
      url: siteUrl,
    },
    websiteSchema: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: siteUrl,
      name: websiteTitle,
    },
  };
};

module.exports = {
  DEFAULT_SITE_URL,
  normalizeUrl,
  normalizeText,
  toAbsoluteAssetUrl,
  buildSeoPublicConfig,
};
