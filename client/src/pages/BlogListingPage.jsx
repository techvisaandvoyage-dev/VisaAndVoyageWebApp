// ============================================================
//  Blog Listing Page
//  Public visa blog. Hero banner + dynamic category navbar +
//  responsive card grid backed by /api/blog (server pagination).
//  Design inspired by reference "Blog & Article" layout: full-
//  width hero with overlay title, then a 3-column grid of
//  rounded cards with date badges, title, excerpt and CTA.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Heart, Loader2, MessageCircle, Search } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { formatOrdinalDate } from "../utils/dateUtils";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import ImageWithShimmer from "../components/ui/ImageWithShimmer";
import { api, SERVER_URL } from "../store/authStore";

/** Hero image — uses a stock travel photo so the page works even without a
 *  Cloudinary/Firebase upload yet. Admin can override later via Settings. */
const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=70";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=70";

/** Convert relative `/uploads/...` URLs into absolute API URLs so the <img/>
 *  tag works regardless of where the API origin lives. */
const resolveAssetUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

const formatDay = (iso) => {
  if (!iso) return { day: "", month: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "", month: "" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatOrdinalDate(d);
};


/**
 * One card in the grid — matches the reference layout (image with date badge,
 * title, short copy, and a "Learn more" arrow link).
 */
const BlogCard = ({ post, index }) => {
  const dateBits = formatDay(post.publishedAt || post.createdAt);
  const thumbSrc = resolveAssetUrl(post.thumbnail) || FALLBACK_THUMB;
  const categoryLabel = post.category?.name;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: "easeOut" }}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-[#2D2B22]/10 bg-[#EEDFC7] shadow-[6px_6px_18px_#948a7b,-6px_-6px_18px_#d6c9b3] transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_10px_24px_#8c8273,-6px_-6px_18px_#d6c9b3]"
    >
      <Link to={`/blog/${post.slug}`} className="relative block overflow-hidden bg-[#dfd2bc]">
        <ImageWithShimmer
          src={thumbSrc}
          alt={post.title}
          className="w-full aspect-[16/10] sm:aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.03]"
          width={640}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          priority={index < 3}
        />
        {dateBits.day ? (
          <div className="absolute top-3.5 left-3.5 z-30 flex h-14 w-12 flex-col items-center justify-center rounded-2xl border border-[#EEDFC7]/30 bg-[#2D2B22]/85 text-[#EEDFC7] leading-none shadow-md backdrop-blur-sm">
            <span className="text-lg font-extrabold">{dateBits.day}</span>
            <span className="mt-0.5 text-[10px] font-bold tracking-wider text-[#dfd2bc]">{dateBits.month}</span>
          </div>
        ) : null}
        {categoryLabel ? (
          <span className="absolute top-3.5 right-3.5 z-30 rounded-full border border-white/20 bg-[#607938]/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm">
            {categoryLabel}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-base sm:text-lg font-extrabold text-[#2D2B22] line-clamp-2 transition-colors group-hover:text-[#607938]">
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#6E6A59]">
          {post.shortDescription || ""}
        </p>

        <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-[#6E6A59]">
          <span className="inline-flex items-center gap-1.5">
            <Heart size={14} className="text-[#607938]" /> {post.likesCount || 0}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle size={14} className="text-[#607938]" /> {post.commentsCount || 0}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Calendar size={14} className="text-[#607938]" />
            {formatDate(post.publishedAt || post.createdAt)}
          </span>
        </div>

        <div className="mt-4 border-t border-[#2D2B22]/10 pt-4">
          <Link
            to={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#607938] transition-colors hover:text-[#4e632d]"
          >
            Learn more
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

const SkeletonCard = () => (
  <div className="overflow-hidden rounded-[24px] border border-[#2D2B22]/10 bg-[#EEDFC7] shadow-[6px_6px_18px_#948a7b,-6px_-6px_18px_#d6c9b3]">
    <div className="aspect-[4/3] animate-pulse bg-[#dfd2bc]" />
    <div className="space-y-3 p-6">
      <div className="h-4 w-3/4 animate-pulse rounded-lg bg-[#dfd2bc]" />
      <div className="h-3 w-full animate-pulse rounded-lg bg-[#dfd2bc]" />
      <div className="h-3 w-5/6 animate-pulse rounded-lg bg-[#dfd2bc]" />
      <div className="mt-4 h-3 w-1/2 animate-pulse rounded-lg bg-[#dfd2bc]" />
    </div>
  </div>
);

const BlogListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const sortKey = searchParams.get("sort") || "latest";
  const searchTerm = searchParams.get("q") || "";

  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchDraft, setSearchDraft] = useState(searchTerm);

  useEffect(() => {
    let active = true;
    api
      .get("/blog/categories")
      .then(({ data }) => {
        if (active && data.success) setCategories(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadPosts = useCallback(
    async (targetPage, append = false) => {
      const setBusy = append ? setLoadingMore : setLoading;
      setBusy(true);
      try {
        const params = { page: targetPage, limit: 9 };
        if (activeCategory && activeCategory !== "all") params.category = activeCategory;
        if (sortKey && sortKey !== "latest") params.sort = sortKey;
        if (searchTerm) params.search = searchTerm;
        const { data } = await api.get("/blog", { params });
        if (data.success) {
          const items = Array.isArray(data.data) ? data.data : [];
          setPosts((prev) => (append ? [...prev, ...items] : items));
          setPagination(data.pagination || { page: targetPage, pages: 1, total: items.length });
        }
      } catch (err) {
        if (!append) setPosts([]);
        console.error("Failed to load blog posts:", err?.response?.data?.message || err);
      } finally {
        setBusy(false);
      }
    },
    [activeCategory, sortKey, searchTerm]
  );

  useEffect(() => {
    setPage(1);
    loadPosts(1, false);
  }, [loadPosts]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    document.title = "Visa Blog | visavo.in";
  }, []);

  const navItems = useMemo(
    () => [
      { _id: "all", name: "Home", slug: "all" },
      ...categories.map((c) => ({ _id: String(c._id), name: c.name, slug: c.slug })),
    ],
    [categories]
  );

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all" && value !== "latest" && value !== "") next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setParam("q", searchDraft.trim());
  };

  const hasMore = pagination.page < pagination.pages;

  return (
    <div className="min-h-screen bg-[#EEDFC7] text-[#2D2B22] flex flex-col">
      <Navbar />

      {/* ── Hero banner ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={DEFAULT_HERO_IMAGE}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2D2B22]/85 via-[#2D2B22]/72 to-[#4e632d]/80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6 sm:pt-36 sm:pb-24 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="mb-3 inline-flex items-center rounded-full border border-[#EEDFC7]/25 bg-[#EEDFC7]/10 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#EEDFC7] backdrop-blur-sm">
              Visa &amp; Voyage Journal
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#EEDFC7] sm:text-5xl lg:text-6xl">
              Blog <span className="italic font-light text-[#dfd2bc]">&amp; Articles</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#EEDFC7]/85 sm:text-base">
              Visa updates, country guides, and travel tips from our team — handpicked to help you
              plan smarter and travel further.
            </p>
          </motion.div>

          {/* Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-[#2D2B22]/15 bg-[#EEDFC7]/95 p-1.5 shadow-[0_14px_36px_rgba(25,24,18,0.35)] backdrop-blur"
          >
            <span className="pl-3 text-[#607938]">
              <Search size={18} />
            </span>
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search articles, countries, visa types…"
              className="flex-1 border-none bg-transparent px-2 py-2.5 text-sm font-medium text-[#2D2B22] placeholder-[#6E6A59] outline-none"
              aria-label="Search blog posts"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#607938] px-5 py-2.5 text-sm font-bold text-white shadow-[2px_3px_6px_rgba(45,43,34,0.22)] transition-all hover:bg-[#536930] active:translate-y-[1px]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Soft separator under hero */}
        <div className="absolute -bottom-px left-0 right-0 h-8 bg-[#EEDFC7] [clip-path:polygon(0_70%,25%_30%,50%_70%,75%_30%,100%_70%,100%_100%,0_100%)]" />
      </section>

      {/* ── Category bar ────────────────────────────────────── */}
      <div className="sticky top-[72px] z-30 bg-[#dfd2bc] shadow-[0_10px_20px_-6px_rgba(45,43,34,0.14)]">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeCategory === item.slug || activeCategory === item._id;
            return (
              <button
                key={item._id}
                onClick={() => setParam("category", item.slug)}
                className={`flex-none whitespace-nowrap h-[44px] px-[18px] rounded-[14px] text-[15px] transition-all duration-200 ${
                  isActive
                    ? "bg-[#EEDFC7] font-semibold text-[#607938] shadow-[inset_2px_3px_6px_rgba(45,43,34,0.28),inset_-1px_-1px_3px_rgba(110,106,89,0.25)]"
                    : "bg-transparent font-medium text-[#6E6A59] hover:text-[#2D2B22]"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#2D2B22]">
                Latest News &amp; Articles
              </h2>
              <p className="mt-1 text-sm font-medium text-[#6E6A59]">
                {pagination.total ? `${pagination.total} stories` : "Curated travel & visa stories"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-[24px] border border-[#2D2B22]/10 bg-[#EEDFC7] py-20 text-center shadow-[6px_6px_18px_#948a7b,-6px_-6px_18px_#d6c9b3]">
              <p className="text-base font-extrabold text-[#2D2B22]">No articles yet.</p>
              <p className="mt-1 text-sm text-[#6E6A59]">
                Check back soon or try a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <BlogCard key={post._id} post={post} index={i} />
              ))}
            </div>
          )}

          {hasMore && !loading ? (
            <div className="mt-10 flex justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleLoadMore}
                loading={loadingMore}
                className="rounded-xl bg-[#607938] px-8 text-white shadow-[2px_3px_8px_rgba(45,43,34,0.22)] hover:bg-[#536930]"
              >
                Load more
              </Button>
            </div>
          ) : null}

          {loadingMore && !hasMore ? (
            <div className="mt-10 flex justify-center text-[#607938]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogListingPage;
