type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`spacemap-brand ${compact ? "spacemap-brand-compact" : ""}`}>
      <svg
        className="spacemap-brand-lockup"
        viewBox="0 0 540 110"
        role="img"
        aria-label="SpaceMap"
      >
        <defs>
          <linearGradient id="spacemap-s" x1="12" y1="12" x2="100" y2="96" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#58d4ff" />
            <stop offset="100%" stopColor="#1b84ff" />
          </linearGradient>
        </defs>
        <g transform="translate(0 4)">
          <path
            d="M96 19C83 10 67 6 47 6C25 6 10 18 10 37C10 57 26 66 49 72C69 77 83 82 83 96C83 111 69 121 46 121C28 121 14 114 4 103"
            fill="none"
            stroke="url(#spacemap-s)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 86C36 61 55 42 93 18"
            fill="none"
            stroke="#dff7ff"
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <circle cx="54" cy="54" r="11" fill="#f3bd61" />
          <circle cx="54" cy="54" r="18" fill="none" stroke="#f3bd61" strokeWidth="1.6" opacity="0.35" />
          <circle cx="15" cy="100" r="2.5" fill="#58d4ff" />
          <circle cx="97" cy="17" r="3" fill="#f3bd61" />
        </g>
        <text x="118" y="67" className="spacemap-wordmark-text spacemap-wordmark-main">
          pace
        </text>
        <text x="290" y="67" className="spacemap-wordmark-text spacemap-wordmark-map">
          Map
        </text>
      </svg>
    </div>
  );
}
