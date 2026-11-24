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
  Users
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
          <button type="button" onClick={onIncrement} disabled={travelerCount >= 9} aria-label="Increase travellers"><Plus size={16} /></button>
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

    const measure = () => {
      const bottomSpace = window.innerWidth <= 1000 ? 112 : 24;
      cards.forEach((node, index) => {
        const top = 157 + index * 14;
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

      // Synchronize the price rail height with the content
      const last = nodes[nodes.length - 1];
      const rail = layout?.lastElementChild;
      if (rail && last) {
        rail.style.minHeight = window.innerWidth > 1000 && !reducedMotion.matches
          ? `${last.offsetHeight + nodes.length * 14}px`
          : "";
      }

      const content = heroRef.current?.parentElement;
      if (content) {
        content.style.paddingBottom = "";
      }
    };

    const updateActive = () => {
      frame = 0;
      let next = tabs[0]?.[0] || "";
      nodes.forEach((node, index) => {
        const top = 157 + (index + 1) * 14;
        const start = node.previousElementSibling.getBoundingClientRect().top;
        const distance = Number(node.dataset.scrollDistance || 0);
        node.children[1].scrollTop = Math.min(distance, Math.max(0, top - start));
        updateFade(node.children[1]);
        if (start <= top + 24) next = node.id;
      });

      const last = nodes[nodes.length - 1];
      const rail = layout?.lastElementChild;
      // Read every position before applying this frame's transforms. Use the
      // rendered translation, not the requested offset: fractional pixels and
      // browser zoom can otherwise feed a small error into the next frame.
      const geometry = new Map([...cards, rail].filter(Boolean).map((node) => {
        const rect = node.getBoundingClientRect();
        const transform = window.getComputedStyle(node).transform;
        const translation = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
        return [node, { top: rect.top - translation, height: rect.height }];
      }));
      const lastGeometry = geometry.get(last);
      const lastRect = lastGeometry && {
        top: lastGeometry.top,
        bottom: lastGeometry.top + lastGeometry.height,
      };
      const lastTargetTop = 157 + nodes.length * 14;
      // When the last card reaches its stack position and user continues scrolling,
      // commonShift becomes negative. Both the left cards stack AND the right rail
      // scroll up together in lockstep.
      const commonShift = lastRect ? Math.min(0, lastRect.top - lastTargetTop) : 0;

      cards.forEach((node, index) => {
        if (reducedMotion.matches) {
          node.style.transform = "";
          node.style.clipPath = "";
          return;
        }

        const baseTop = 157 + index * 14;
        const targetTop = baseTop + commonShift;
        const naturalTop = geometry.get(node).top;

        let offset = 0;
        if (node === last) {
          offset = 0;
        } else if (commonShift < 0) {
          // Last scroll / footer scroll: lock all cards into the stack moving together!
          // No card ever moves up ahead of another card or peeks out unexpectedly.
          offset = targetTop - naturalTop;
        } else {
          // Normal scroll: prevent any card from escaping upwards early
          offset = Math.max(0, targetTop - naturalTop);
        }

        node.style.transform = `translate3d(0, ${offset}px, 0)`;

        // Clip the bottom of earlier cards so they NEVER poke out below the last card (FAQ)
        const currentTop = naturalTop + offset;
        const cardBottom = currentTop + geometry.get(node).height;
        const hiddenBottom = lastRect && cardBottom > lastRect.bottom
          ? cardBottom - lastRect.bottom
          : 0;
        node.style.clipPath = hiddenBottom > 0 ? `inset(0 0 ${hiddenBottom}px 0 round 26px)` : "";
      });

      // Synchronize the right-side price card rail: once the last stack position is reached,
      // the right card scrolls up together with the stack into the footer.
      if (rail && !reducedMotion.matches && window.innerWidth > 1000) {
        if (commonShift < 0) {
          const railNaturalTop = geometry.get(rail).top;
          const railTargetTop = 157 + commonShift;
          const railOffset = railTargetTop - railNaturalTop;
          rail.style.transform = `translate3d(0, ${railOffset}px, 0)`;
        } else {
          rail.style.transform = "";
        }
      } else if (rail) {
        rail.style.transform = "";
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
      if (!frame) frame = window.requestAnimationFrame(updateActive);
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
      cards.forEach((node) => { node.style.transform = ""; node.style.clipPath = ""; });
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
    if (btn?.scrollIntoView) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    const top = parseFloat(node.style.getPropertyValue("--dp-stack-top")) || 157;
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

  return (
    <div className="deep-press-country">
      <Navbar />
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
                {why.map((line, index) => (
                  <div key={key(whyBookNow[index], line)}>
                    <span>{line}</span>
                    <Check aria-label="Included" />
                    <span className="dp-muted">—</span>
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
                {faqs.map((faq) => (
                  <details key={key(faq, faq.question)}>
                    <summary>
                      {faq.question}
                      <ChevronDown size={20} />
                    </summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
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
