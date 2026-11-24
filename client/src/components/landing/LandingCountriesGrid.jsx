import { memo, useCallback } from "react";
import DestinationCard from "../country/DestinationCard";
import { getCountryRouteId } from "../../utils/countryRouting";

const LandingCountryCardItem = memo(function LandingCountryCardItem({
  country,
  index,
  countryCardRefs,
  display,
  documentCatalog,
  showVisaRequirements,
  onNavigateDestination,
}) {
  const routeId = getCountryRouteId(country);
  const setCardRef = useCallback(
    (el) => {
      countryCardRefs.current[routeId] = el;
    },
    [countryCardRefs, routeId]
  );
  const handleClick = useCallback(() => {
    onNavigateDestination(country);
  }, [country, onNavigateDestination]);

  return (
    <DestinationCard
      id={`country-card-${routeId}`}
      cardRef={setCardRef}
      country={country}
      index={index}
      display={display}
      documentCatalog={documentCatalog}
      showVisaRequirements={showVisaRequirements}
      showTotalFee
      onClick={handleClick}
    />
  );
});

const LandingCountriesGrid = memo(
  function LandingCountriesGrid({
    countryIdsKey,
    filteredCountries,
    countryCardRefs,
    display,
    documentCatalog,
    heading = "",
    loading = false,
    showVisaRequirements = true,
    onNavigateDestination,
    hasMore = false,
    onLoadMore,
  }) {
    const skeletonItems = Array.from({ length: 10 }, (_, index) => index);
    const showHeading = String(heading || "").trim().length > 0;

    return (
      <div id="destinations" className="pb-16">
        {showHeading ? (
          <div className="w mb-8 text-center">
            <h2 className="text-3xl font-extrabold text-[var(--ink)]">{heading}</h2>
          </div>
        ) : null}

        {loading ? (
          <section className="grid w" id="grid">
            {skeletonItems.map((item) => (
              <div
                key={item}
                className="cc animate-pulse"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <div className="h-10 w-10 rounded-full bg-black/10" />
                <div className="space-y-3">
                  <div className="h-6 w-2/3 mx-auto rounded-full bg-black/10" />
                  <div className="cs" style={{ background: "rgba(0,0,0,0.08)" }}>
                    <div className="h-8 bg-black/10 rounded" />
                    <div className="h-8 bg-black/10 rounded" />
                    <div className="h-8 bg-black/10 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : filteredCountries.length === 0 ? (
          <p className="nores">No country found.</p>
        ) : (
          <section className="grid w" id="grid">
            {filteredCountries.map((country, i) => (
              <LandingCountryCardItem
                key={getCountryRouteId(country)}
                country={country}
                index={i}
                countryCardRefs={countryCardRefs}
                display={display}
                documentCatalog={documentCatalog}
                showVisaRequirements={showVisaRequirements}
                onNavigateDestination={onNavigateDestination}
              />
            ))}
          </section>
        )}

        {hasMore && !loading && (
          <div className="more">
            <button
              id="more"
              onClick={onLoadMore}
              className="b s"
            >
              Show More Destinations
            </button>
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.countryIdsKey === next.countryIdsKey &&
    prev.display === next.display &&
    prev.documentCatalog === next.documentCatalog &&
    prev.heading === next.heading &&
    prev.loading === next.loading &&
    prev.showVisaRequirements === next.showVisaRequirements &&
    prev.hasMore === next.hasMore
);

export default LandingCountriesGrid;
