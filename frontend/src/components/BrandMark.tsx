type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`spacemap-brand ${compact ? "spacemap-brand-compact" : ""}`}>
      <svg
        className="spacemap-brand-lockup"
        viewBox="0 0 520 96"
        role="img"
        aria-label="SpaceMap"
      >
        <defs>
          <linearGradient id="spacemap-s" x1="18" y1="10" x2="86" y2="86" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9fe8ff" />
            <stop offset="100%" stopColor="#4da3ff" />
          </linearGradient>
        </defs>
        <g transform="translate(6 8)">
          <circle cx="42" cy="41" r="34" fill="none" stroke="#1a2a3e" strokeWidth="1.5" opacity="0.65" />
          <path
            d="M63 16C56 10 47 7 36 7C21 7 11 16 11 28C11 42 23 47 38 50C51 53 59 56 59 66C59 77 49 85 34 85C23 85 14 81 8 74"
            fill="none"
            stroke="url(#spacemap-s)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M58 20C68 26 74 35 74 45C74 57 65 66 51 70"
            fill="none"
            stroke="#f0b85b"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <circle cx="73" cy="45" r="4" fill="#f0b85b" />
          <circle cx="74" cy="45" r="10" fill="none" stroke="#f0b85b" strokeWidth="1.4" opacity="0.45" />
        </g>
        <text x="106" y="60" className="spacemap-wordmark-text spacemap-wordmark-main">
          Space
        </text>
        <text x="310" y="60" className="spacemap-wordmark-text spacemap-wordmark-map">
          Map
        </text>
        <text x="107" y="80" className="spacemap-wordmark-subtext">
          LIVE ORBITAL INTELLIGENCE
        </text>
      </svg>
    </div>
  );
}
