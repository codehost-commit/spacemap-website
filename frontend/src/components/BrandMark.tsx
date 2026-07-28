type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`spacemap-brand ${compact ? "spacemap-brand-compact" : ""}`}>
      <svg
        className="spacemap-brand-lockup"
        viewBox="0 0 420 80"
        role="img"
        aria-label="SpaceMap"
      >
        <defs>
          <linearGradient id="spacemap-sweep" x1="18" y1="12" x2="64" y2="66" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f6c56b" />
            <stop offset="100%" stopColor="#6dd6ff" />
          </linearGradient>
        </defs>
        <g transform="translate(4 5)">
          <path
            d="M58 11C52 5 43 2 33 2C20 2 10 10 10 21C10 33 19 38 33 41C44 43 50 46 50 53C50 61 43 67 31 67C21 67 13 63 6 56"
            fill="none"
            stroke="url(#spacemap-sweep)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M58 11C48 18 41 26 36 35"
            fill="none"
            stroke="#edf3fb"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="39" cy="29" r="4.5" fill="#f6c56b" />
        </g>
        <text x="80" y="50" className="spacemap-wordmark-text spacemap-wordmark-space">
          pace
        </text>
        <text x="211" y="50" className="spacemap-wordmark-text spacemap-wordmark-map">
          Map
        </text>
      </svg>
    </div>
  );
}
