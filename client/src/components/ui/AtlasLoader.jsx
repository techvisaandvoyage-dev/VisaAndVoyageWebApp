import { Plane } from "lucide-react";
import "./atlasLoader.css";

const ContinentPaths = () => (
  <svg viewBox="0 0 120 100" preserveAspectRatio="none" aria-hidden="true">
    <g fill="color-mix(in srgb, var(--bg) 82%, #ffffff)" opacity="0.88">
      {/* Americas */}
      <path d="M12 18c5-4 14-3 18 2 3 4 1 9-3 12-4 3-2 7 2 10 5 3 8 9 5 16-2 6-6 14-9 19-3 4-7 1-8-4-1-6 1-11-3-16-4-5-8-11-7-18 1-7 1-16 5-21z" />
      {/* Europe & Africa */}
      <path d="M54 15c7-3 16-2 20 3 3 4 1 8-4 10-4 2-6 5-2 8 6 4 11 9 9 17-2 8-5 19-10 25-4 4-9 1-10-5-1-6 1-12-2-17-4-6-8-10-6-17 1-6-1-20 5-24z" />
      {/* Asia & Australia */}
      <path d="M84 18c8-4 20-3 26 4 5 6 4 15-1 20-4 4-9 4-13 8-4 4-8 1-11-3-3-5-6-10-5-16 0-5-1-10 4-13z" />
      <path d="M96 58c5-3 12-1 14 4 2 5-1 11-6 12-5 1-10-2-11-7-1-4 0-7 3-9z" />
    </g>
  </svg>
);

export default function AtlasLoader({
  label = "",
  subtitle = "",
}) {
  return (
    <div className="atlas-loader-screen" role="status" aria-live="polite" aria-label={label || "Loading"}>
      <div className="atlas-loader-stage">
        <div className="atlas-orbit-ring">
          <div className="atlas-orbit-track">
            <span className="atlas-orbit-plane" aria-hidden="true">
              <Plane size={12} />
            </span>
          </div>
          <div className="atlas-globe-well">
            <div className="atlas-globe">
              <div className="atlas-continents">
                <ContinentPaths />
                <ContinentPaths />
              </div>
              <div className="atlas-grid-overlay" />
              <div className="atlas-gloss" />
            </div>
          </div>
        </div>
      </div>

      <div className="atlas-loader-text-wrap">
        {label && <p className="atlas-loader-label">{label}</p>}
        {subtitle && <p className="atlas-loader-sub">{subtitle}</p>}
        <div className="atlas-progress-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
