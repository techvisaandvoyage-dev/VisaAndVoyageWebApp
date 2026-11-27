import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  FileCheck,
  FileText,
  Info as InfoIcon,
  Minus,
  Plus,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import Navbar from "../layout/Navbar";
import Footer from "../layout/Footer";
import "./deepPressCountryDetails.css";

const inr = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const text = (item) => String(typeof item === "object" ? item?.text ?? item?.value ?? "" : item ?? "").trim();
const key = (item, fallback) => String(item?._id || item?.id || fallback);

function FeeTooltipRow({ label, totalAmount, serviceAmount, gstAmount, totalLabel = "Our Service + GST" }) {
  const [hovered, setHovered] = useState(false);
  const hasGst = Boolean(gstAmount && Number(gstAmount) > 0);

  return (
    <div
      tabIndex={hasGst ? 0 : undefined}
      className={`dp-line ${hasGst ? "dp-fee-tooltip-trigger group relative cursor-pointer" : ""}`}
      onMouseEnter={() => hasGst && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => hasGst && setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => hasGst && setHovered((v) => !v)}
      aria-haspopup={hasGst ? "true" : undefined}
    >
      <span className="flex items-center gap-1.5">
        {label}
        {hasGst && (
          <InfoIcon size={13} className="opacity-60 transition-opacity hover:opacity-100" />
        )}
      </span>
      <b>{inr(totalAmount)}</b>

      {hasGst && (
        <div
          className={`dp-fee-tooltip ${hovered ? "is-visible" : ""}`}
          role="tooltip"
        >
          <div className="dp-fee-tooltip-row">
            <span>Our Service Fee</span>
            <b>{inr(serviceAmount)}</b>
          </div>
          <div className="dp-fee-tooltip-row">
            <span>GST</span>
            <b>{inr(gstAmount)}</b>
          </div>
          <div className="dp-fee-tooltip-divider" />
          <div className="dp-fee-tooltip-row dp-fee-tooltip-total">
            <span>{totalLabel}</span>
            <b>{inr(totalAmount)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCard({
  country,
  travelerCount,
  onIncrement,
  onDecrement,
  governmentFeeTotal,
  serviceFeeTotal,
  gstTotal,
  effectiveGstEnabled,
  totalServiceFeeTotal,
  finalTotal,
  onStart,
}) {
  const baseServiceFee = serviceFeeTotal ?? (totalServiceFeeTotal - (gstTotal || 0));

  return (
    <aside className="dp-price-card" aria-label={`Apply for ${country.name}`}>
      <h2>Apply for {country.name}</h2>
      <div className="dp-stepper">
        <span><Users size={17} /> Travellers</span>
        <span className="dp-controls">
          <button type="button" onClick={onDecrement} disabled={travelerCount <= 1} aria-label="Decrease travellers"><Minus size={16} /></button>
          <b>{travelerCount}</b>
          <button type="button" onClick={onIncrement} aria-label="Increase travellers"><Plus size={16} /></button>
        </span>
      </div>
      <div className="dp-total">
        <small>To be paid now</small>
        <strong>{inr(finalTotal)}</strong>
      </div>
      <div className="dp-line"><span>Government fee</span><b>{inr(governmentFeeTotal)}</b></div>
      <FeeTooltipRow
        label="Our fee"
        totalAmount={totalServiceFeeTotal}
        serviceAmount={baseServiceFee}
        gstAmount={gstTotal}
        totalLabel="Our Service + GST"
      />
      <button
        type="button"
        id="country-details-start-application-btn"
        className="dp-primary"
        onClick={onStart}
      >
        Start your application
      </button>
    </aside>
  );
}

const Section = ({ id, title, children, className }) => (
  <>
    <div className="dp-section-start" aria-hidden="true" />
    <section id={id} className={`dp-section ${className || ""}`}>
      <h2>{title}</h2>
      <div className="dp-section-body" tabIndex={0} role="region" aria-label={title}>
        <div className="dp-section-inner">{children}</div>
      </div>
    </section>
    <div className="dp-scroll-distance" aria-hidden="true" />
  </>
);

export default function DeepPressCountryDetails(props) {
  const {
    country,
    display,
    requiredDocuments = [],
    howItWorks = [],
    whyBookNow = [],
    includedItems = [],
    faqs = [],
    visaRequirements,
    isVisaRequirementsVisible: propIsVisaRequirementsVisible,
    sectionHeadings = {},
    travelerCount,
    onIncrementTraveler,
    onDecrementTraveler,
    governmentFeeTotal,
    serviceFeeTotal,
    gstTotal,
    effectiveGstEnabled,
    totalServiceFeeTotal,
    finalTotal,
    onStartApplication,
  } = props;

  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state?.idx > 0 || window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const [active, setActive] = useState("info");
  const [openFaqs, setOpenFaqs] = useState({});
  const toggleFaq = (faqKey) => {
    setOpenFaqs((prev) => ({ ...prev, [faqKey]: !prev[faqKey] }));
  };
  const activeRef = useRef("info");
  const targetTabRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const tabButtonsRef = useRef({});
  const refs = useRef({});
  const heroRef = useRef(null);
  const info = (country?.visaInformation?.items || []).filter((item) => item?.enabled !== false && item?.value);
  const why = whyBookNow.map(text).filter(Boolean);

  const visaReqItems = Array.isArray(visaRequirements?.items)
    ? visaRequirements.items
    : Array.isArray(visaRequirements)
    ? visaRequirements
    : [];
  const visaReqNote = visaRequirements?.note || "";
  const isVisaReqVisible = propIsVisaRequirementsVisible !== undefined
    ? propIsVisaRequirementsVisible
    : (display?.showVisaRequirements !== false && visaReqItems.length > 0);

  // Tab order requested: Info -> How it works -> Why book now -> Visa Requirements -> Documents Required -> What's included -> FAQs
  const tabs = useMemo(() => [
    ["info", sectionHeadings?.infoHeading || "Info", info.length > 0],
    ["how-it-works", sectionHeadings?.howItWorksHeading || "How it works", display?.showHowItWorks !== false && howItWorks.length > 0],
    ["why-book-now", sectionHeadings?.whyBookNowHeading || "Why book now?", display?.showWhyBookNow !== false && why.length > 0],
    ["visa-requirements", sectionHeadings?.visaRequirementsHeading || "Visa Requirements", isVisaReqVisible && visaReqItems.length > 0],
    ["documents", sectionHeadings?.documentsHeading || "Documents Required", display?.showDestinationDocuments !== false && requiredDocuments.length > 0],
    ["included", sectionHeadings?.whatsIncludedHeading || "What's included", display?.showWhatsIncluded !== false && includedItems.length > 0],
    ["faqs", sectionHeadings?.faqsHeading || "FAQs", display?.showFaqs !== false && faqs.length > 0],
  ].filter(([, , visible]) => visible), [
    display,
    faqs.length,
    howItWorks.length,
    includedItems.length,
    info.length,
    isVisaReqVisible,
    requiredDocuments.length,
    sectionHeadings,
    visaReqItems.length,
    why.length,
  ]);

  useEffect(() => {
    const nodes = tabs.map(([id]) => refs.current[id]).filter(Boolean);
    const cards = [heroRef.current, ...nodes].filter(Boolean);
    const layout = heroRef.current?.parentElement?.parentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateFade = (body) => {
      const remaining = Math.max(0, body.scrollHeight - body.clientHeight - body.scrollTop);
      const overflows = body.scrollHeight > body.clientHeight + 1 && !reducedMotion.matches;
      body.classList.toggle("dp-body-overflow", overflows);
      body.style.setProperty("--dp-fade-bottom", `${overflows ? Math.min(40, remaining) : 0}px`);
      body.style.setProperty("--dp-fade-top", `${overflows ? Math.min(20, body.scrollTop) : 0}px`);
    };

    const getStackBaseTop = () => (window.innerWidth >= 1200 ? 94 : 157);

    const measure = () => {
      const baseStackTop = getStackBaseTop();
      const bottomSpace = window.innerWidth <= 1000 ? 112 : 24;
      cards.forEach((node, index) => {
        const top = baseStackTop + index * 14;
        node.style.setProperty("--dp-stack-top", `${top}px`);
        node.style.zIndex = index + 1;
        const available = Math.max(180, window.innerHeight - top - bottomSpace);
        if (node === heroRef.current) {
          return;
        }
        const body = node.children[1];
        const inner = body.firstElementChild;
        const style = window.getComputedStyle(node);
        const heading = node.firstElementChild;
        const headingStyle = window.getComputedStyle(heading);
        const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
          + heading.offsetHeight + parseFloat(headingStyle.marginBottom);
        const bodyHeight = Math.max(80, available - chrome);
        body.style.height = "auto";
        body.style.maxHeight = reducedMotion.matches ? "none" : `${bodyHeight}px`;
        const overflow = reducedMotion.matches ? 0 : Math.max(0, inner.offsetHeight - body.clientHeight);
        node.nextElementSibling.style.height = `${overflow}px`;
        node.dataset.scrollDistance = overflow;
        updateFade(body);
      });

      // Synchronize the price rail height and last card minHeight so the right card
      // never extends below the left column or behind the footer.
      const last = nodes[nodes.length - 1];
      const rail = layout?.lastElementChild;
      const priceCard = rail?.firstElementChild;
      if (rail && last) {
        if (window.innerWidth > 1000 && !reducedMotion.matches) {
          const priceCardHeight = priceCard ? priceCard.offsetHeight : 0;
          const minLastHeight = Math.max(0, priceCardHeight - nodes.length * 14);
          const nextLastMinHeight = minLastHeight > 0 ? `${minLastHeight}px` : "";
          if (last.style.minHeight !== nextLastMinHeight) {
            last.style.minHeight = nextLastMinHeight;
          }
          const nextRailMinHeight = `${Math.max(last.offsetHeight, minLastHeight) + nodes.length * 14}px`;
          if (rail.style.minHeight !== nextRailMinHeight) {
            rail.style.minHeight = nextRailMinHeight;
          }
        } else {
          last.style.minHeight = "";
          rail.style.minHeight = "";
        }
      }

      const content = heroRef.current?.parentElement;
      if (content) {
        content.style.paddingBottom = "";
      }
    };

    const appliedOffsets = new WeakMap();
    const appliedClips = new WeakMap();

    const updateActive = () => {
      frame = 0;
      const baseStackTop = getStackBaseTop();

      // 1. Batch ALL DOM reads first (zero forced synchronous reflow)
      const startTops = nodes.map((node) => node.previousElementSibling.getBoundingClientRect().top);
      const last = nodes[nodes.length - 1];
      const rail = layout?.lastElementChild;
      const geometry = new Map([...cards, rail].filter(Boolean).map((node) => {
        const rect = node.getBoundingClientRect();
        const translation = appliedOffsets.get(node) || 0;
        return [node, { top: rect.top - translation, height: rect.height }];
      }));

      // 2. Compute active tab & scroll distances
      let next = tabs[0]?.[0] || "";
      const bodyScrollTargets = nodes.map((node, index) => {
        const top = baseStackTop + (index + 1) * 14;
        const start = startTops[index];
        const distance = Number(node.dataset.scrollDistance || 0);
        if (start <= top + 24) next = node.id;
        return Math.min(distance, Math.max(0, top - start));
      });

      const lastGeometry = geometry.get(last);
      const lastRect = lastGeometry && {
        top: lastGeometry.top,
        bottom: lastGeometry.top + lastGeometry.height,
      };
      const lastTargetTop = baseStackTop + nodes.length * 14;
      const commonShift = lastRect ? Math.min(0, lastRect.top - lastTargetTop) : 0;

      // 3. Batch ALL DOM writes after reads
      nodes.forEach((node, index) => {
        const body = node.children[1];
        const targetScroll = bodyScrollTargets[index];
        if (Math.abs(body.scrollTop - targetScroll) > 0.25) {
          body.scrollTop = targetScroll;
          updateFade(body);
        }
      });

      const cardPositions = cards.map((node, index) => {
        const naturalTop = geometry.get(node).top;
        const height = geometry.get(node).height;

        let rawOffset = 0;
        if (node === last) {
          rawOffset = 0;
        } else if (commonShift < 0) {
          rawOffset = (baseStackTop + index * 14 + commonShift) - naturalTop;
        } else {
          rawOffset = Math.max(0, (baseStackTop + index * 14 + commonShift) - naturalTop);
        }
        const offset = Math.abs(rawOffset) < 0.05 ? 0 : Number(rawOffset.toFixed(2));
        return {
          node,
          offset,
          top: naturalTop + offset,
          bottom: naturalTop + offset + height,
        };
      });

      cardPositions.forEach(({ node, offset, top: currentTop, bottom: cardBottom }, index) => {
        if (reducedMotion.matches) {
          if (appliedOffsets.has(node)) {
            node.style.transform = "";
            appliedOffsets.delete(node);
          }
          if (appliedClips.has(node)) {
            node.style.clipPath = "";
            appliedClips.delete(node);
          }
          return;
        }

        const prevOffset = appliedOffsets.get(node);
        if (prevOffset !== offset) {
          node.style.transform = `translate3d(0, ${offset}px, 0)`;
          appliedOffsets.set(node, offset);
        }

        // Clip the bottom of earlier cards smoothly against any later card stacked on top of them
        // so taller earlier cards never poke out behind shorter cards (e.g. What's Included or FAQs).
        let coverBottom = Infinity;
        let isCoveredInStack = false;
        for (let j = index + 1; j < cardPositions.length; j += 1) {
          const later = cardPositions[j];
          if (later.top <= currentTop + 48) {
            isCoveredInStack = true;
          }
          if (later.top < cardBottom && later.bottom < cardBottom) {
            coverBottom = Math.min(coverBottom, later.bottom);
          }
        }
        node.classList.toggle("dp-card-behind", isCoveredInStack);
        const rawHiddenBottom = Number.isFinite(coverBottom) && cardBottom > coverBottom
          ? cardBottom - coverBottom
          : 0;
        const hiddenBottom = rawHiddenBottom > 0.5 ? Math.ceil(rawHiddenBottom) : 0;
        const prevClip = appliedClips.get(node) || 0;
        if (prevClip !== hiddenBottom) {
          node.style.clipPath = hiddenBottom > 0 ? `inset(0 0 ${hiddenBottom}px 0 round 26px)` : "";
          appliedClips.set(node, hiddenBottom);
        }
      });

      // Synchronize the right-side price card rail and keep its bottom aligned with the left column
      if (rail && !reducedMotion.matches && window.innerWidth > 1000) {
        const railNaturalTop = geometry.get(rail).top;
        const priceCardHeight = rail.firstElementChild?.getBoundingClientRect().height || geometry.get(rail).height;
        let railTargetTop = commonShift < 0 ? baseStackTop + commonShift : railNaturalTop;
        if (lastRect && railTargetTop + priceCardHeight > lastRect.bottom) {
          railTargetTop = Math.min(railTargetTop, lastRect.bottom - priceCardHeight);
        }
        const railOffset = Number((railTargetTop - railNaturalTop).toFixed(2));
        if (Math.abs(railOffset) > 0.05) {
          if (appliedOffsets.get(rail) !== railOffset) {
            rail.style.transform = `translate3d(0, ${railOffset}px, 0)`;
            appliedOffsets.set(rail, railOffset);
          }
        } else if (appliedOffsets.get(rail)) {
          rail.style.transform = "translate3d(0, 0, 0)";
          appliedOffsets.set(rail, 0);
        }
      } else if (rail && appliedOffsets.get(rail)) {
        rail.style.transform = "";
        appliedOffsets.set(rail, 0);
      }

      // Smooth tab activation: if a tab was clicked, hold that tab active during the smooth scroll
      // so it never flickers across intermediate sections.
      if (!targetTabRef.current) {
        if (next && next !== activeRef.current) {
          activeRef.current = next;
          setActive(next);
        }
      } else {
        const targetNode = refs.current[targetTabRef.current];
        if (targetNode) {
          const targetTop = parseFloat(targetNode.style.getPropertyValue("--dp-stack-top")) || 157;
          const targetStart = targetNode.previousElementSibling?.getBoundingClientRect().top;
          if (targetStart !== undefined && Math.abs(targetStart - targetTop) < 14) {
            targetTabRef.current = null;
          }
        }
      }
    };

    const onScroll = () => {
      updateActive();
    };

    const onUserInterrupt = () => {
      targetTabRef.current = null;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };

    const resize = new ResizeObserver(() => { measure(); onScroll(); });
    const onBodyScroll = (event) => updateFade(event.currentTarget);
    nodes.forEach((node) => node.children[1].addEventListener("scroll", onBodyScroll, { passive: true }));
    cards.forEach((node) => resize.observe(node));
    nodes.forEach((node) => resize.observe(node.children[1].firstElementChild));
    measure();
    onScroll();

    const onResize = () => { measure(); onScroll(); };
    window.addEventListener("resize", onResize);
    reducedMotion.addEventListener("change", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onUserInterrupt, { passive: true });
    window.addEventListener("touchstart", onUserInterrupt, { passive: true });

    return () => {
      cards.forEach((node) => {
        node.style.transform = "";
        node.style.clipPath = "";
        node.style.minHeight = "";
        node.classList.remove("dp-card-behind");
      });
      const rail = layout?.lastElementChild;
      if (rail) {
        rail.style.transform = "";
        rail.style.minHeight = "";
      }
      const content = heroRef.current?.parentElement;
      if (content) content.style.paddingBottom = "";
      resize.disconnect();
      nodes.forEach((node) => node.children[1].removeEventListener("scroll", onBodyScroll));
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      reducedMotion.removeEventListener("change", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onUserInterrupt);
      window.removeEventListener("touchstart", onUserInterrupt);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [tabs]);

  const visit = (id) => {
    const node = refs.current[id];
    if (!node) return;
    targetTabRef.current = id;
    activeRef.current = id;
    setActive(id);

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      targetTabRef.current = null;
    }, 850);

    const btn = tabButtonsRef.current?.[id];
    if (btn && btn.offsetParent !== null && btn.scrollIntoView) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    const fallbackTop = window.innerWidth >= 1200 ? 94 : 157;
    const top = parseFloat(node.style.getPropertyValue("--dp-stack-top")) || fallbackTop;
    const startEl = node.previousElementSibling;
    const targetY = window.scrollY + (startEl ? startEl.getBoundingClientRect().top : 0) - top;

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const anchor = (id) => (
    <div
      ref={(node) => {
        refs.current[id] = node?.parentElement?.parentElement?.parentElement || null;
      }}
      className="dp-anchor"
      aria-hidden="true"
    />
  );

  const getInlineTabLabel = (id, label) => {
    if (id === "faqs" || String(label).toLowerCase() === "frequently asked questions") {
      return "FAQs";
    }
    return label;
  };

  const inlineTabsNav = (
    <nav className="dp-tabs-inline" aria-label="Country detail sections">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={active === id ? "is-active" : ""}
          onClick={() => visit(id)}
        >
          {getInlineTabLabel(id, label)}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="deep-press-country">
      <Navbar centerContent={inlineTabsNav} />
      <nav className="dp-tabs" aria-label="Country detail sections">
        <div>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              ref={(el) => { tabButtonsRef.current[id] = el; }}
              type="button"
              className={active === id ? "is-active" : ""}
              onClick={() => visit(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="dp-main">
        <div className="dp-back-row">
          <button
            type="button"
            onClick={handleBack}
            className="dp-back-btn"
            aria-label="Go back"
          >
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span>Back</span>
          </button>
        </div>
        <div className="dp-content">
          <header ref={heroRef} className="dp-hero">
            <div>
              <span className="dp-flag" role="img" aria-label={`${country.name} flag`}>
                {country.flagEmoji || "🌍"}
              </span>
              <span className="dp-chip">
                <BadgeCheck size={15} />100% online process
              </span>
            </div>
            <h1>{country.name} Visa</h1>
            <dl>
              {country.visaType && <div><dt>Type</dt><dd>{country.visaType}</dd></div>}
              {country.validity && <div><dt>Validity</dt><dd>{country.validity}</dd></div>}
              {country.processingDays && <div><dt>Processing</dt><dd>{country.processingDays}</dd></div>}
            </dl>
          </header>

          <div className="dp-stack">
            {/* 1. Visa Information */}
            {info.length > 0 && (
              <Section id="info" title={country.visaInformation?.title || sectionHeadings?.infoHeading || "Visa information"} className="dp-info">
                {anchor("info")}
                <div className="dp-info-grid">
                  {info.map((item) => (
                    <article key={key(item, item.label)}>
                      <CalendarDays size={21} />
                      <small>{item.label}</small>
                      <b>{item.value}</b>
                      {item.description && <p>{item.description}</p>}
                    </article>
                  ))}
                </div>
              </Section>
            )}

            {/* 2. How it works */}
            {howItWorks.length > 0 && display?.showHowItWorks !== false && (
              <Section id="how-it-works" title={sectionHeadings?.howItWorksHeading || "How it works"} className="dp-how">
                {anchor("how-it-works")}
                <ol>
                  {howItWorks.map((step, index) => (
                    <li key={key(step, step.title)}>
                      <span>{index + 1}</span>
                      <div>
                        <b>{step.title}</b>
                        <p>{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* 3. Why book now */}
            {why.length > 0 && display?.showWhyBookNow !== false && (
              <Section id="why-book-now" title={sectionHeadings?.whyBookNowHeading || "Why book now?"} className="dp-why">
                {anchor("why-book-now")}
                <div className="dp-why-head">
                  <span />
                  <span className="dp-why-col-we">We</span>
                  <span className="dp-why-col-others">Others</span>
                </div>
                {why.map((line, index) => (
                  <div key={key(whyBookNow[index], line)}>
                    <span>{line}</span>
                    <Check aria-label="Included" />
                    <X className="dp-why-x" aria-label="Not included" />
                  </div>
                ))}
              </Section>
            )}

            {/* 4. Visa Requirements */}
            {visaReqItems.length > 0 && isVisaReqVisible && (
              <Section
                id="visa-requirements"
                title={sectionHeadings?.visaRequirementsHeading || "Visa Requirements"}
                className="dp-requirements"
              >
                {anchor("visa-requirements")}
                {sectionHeadings?.visaRequirementsSubtitle && (
                  <p className="dp-subheading">{sectionHeadings.visaRequirementsSubtitle}</p>
                )}
                <div className="dp-req-grid">
                  {visaReqItems.map((item, index) => (
                    <article key={key(item, `${item.title}-${index}`)}>
                      <FileCheck size={23} />
                      <div>
                        <b>{item.title}</b>
                        {item.description && <p>{item.description}</p>}
                      </div>
                    </article>
                  ))}
                </div>
                {visaReqNote && (
                  <div className="dp-req-note">
                    <InfoIcon size={18} />
                    <div>
                      <b>Please Note</b>
                      <p>{sectionHeadings?.visaRequirementsNote || visaReqNote}</p>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* 5. Documents Required */}
            {requiredDocuments.length > 0 && display?.showDestinationDocuments !== false && (
              <Section id="documents" title={sectionHeadings?.documentsHeading || "Documents Required"} className="dp-documents">
                {anchor("documents")}
                <p className="dp-count">{requiredDocuments.length} document{requiredDocuments.length === 1 ? "" : "s"} required</p>
                <div className="dp-doc-grid">
                  {requiredDocuments.map((doc) => {
                    const Icon = doc.Icon || FileText;
                    return (
                      <article key={key(doc, doc.key)}>
                        <Icon size={23} />
                        <div>
                          <b>{doc.label}</b>
                          {doc.description && <p>{doc.description}</p>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* 6. What's included */}
            {includedItems.length > 0 && display?.showWhatsIncluded !== false && (
              <Section id="included" title={sectionHeadings?.whatsIncludedHeading || "What's included"} className="dp-included">
                {anchor("included")}
                <div>
                  {includedItems.map((item) => (
                    <article key={key(item, item.title)}>
                      <ShieldCheck size={25} />
                      <b>{item.title}</b>
                      {item.description && <p>{item.description}</p>}
                    </article>
                  ))}
                </div>
              </Section>
            )}

            {/* 7. FAQs */}
            {faqs.length > 0 && display?.showFaqs !== false && (
              <Section id="faqs" title={sectionHeadings?.faqsHeading || "FAQs"} className="dp-faq">
                {anchor("faqs")}
                {faqs.map((faq, idx) => {
                  const faqKey = key(faq, `${faq.question}-${idx}`);
                  const isOpen = Boolean(openFaqs[faqKey]);
                  return (
                    <div key={faqKey} className={`dp-faq-item ${isOpen ? "is-open" : ""}`}>
                      <button
                        type="button"
                        className="dp-faq-trigger"
                        aria-expanded={isOpen}
                        onClick={() => toggleFaq(faqKey)}
                      >
                        <span>{faq.question}</span>
                        <ChevronDown size={20} className="dp-faq-chevron" />
                      </button>
                      <div className="dp-faq-panel">
                        <div className="dp-faq-panel-inner">
                          <p>{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}
          </div>
        </div>

        <div className="dp-rail">
          <PriceCard
            country={country}
            travelerCount={travelerCount}
            onIncrement={onIncrementTraveler}
            onDecrement={onDecrementTraveler}
            governmentFeeTotal={governmentFeeTotal}
            serviceFeeTotal={serviceFeeTotal}
            gstTotal={gstTotal}
            effectiveGstEnabled={effectiveGstEnabled}
            totalServiceFeeTotal={totalServiceFeeTotal}
            finalTotal={finalTotal}
            onStart={onStartApplication}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
