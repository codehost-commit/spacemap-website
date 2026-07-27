type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`spacemap-brand ${compact ? "spacemap-brand-compact" : ""}`}>
      <BrandEmblem />
      <div className="spacemap-wordmark" aria-label="SpaceMap">
        <span className="spacemap-wordmark-space">pace</span>
        <span className="spacemap-wordmark-map">Map</span>
      </div>
    </div>
  );
}

export function BrandEmblem() {
  return (
    <svg
      className="spacemap-brand-emblem"
      viewBox="0 0 120 120"
      role="img"
      aria-label="SpaceMap emblem"
    >
      <defs>
        <linearGradient id="spacemap-orbit" x1="18" y1="18" x2="102" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ae7ff" />
          <stop offset="100%" stopColor="#25a8ff" />
        </linearGradient>
      </defs>
      <path
        d="M93 18C68 19 43 31 31 49C23 62 25 74 38 80C47 84 58 85 72 84C60 88 48 89 37 86C18 81 11 63 20 46C32 24 60 10 93 18Z"
        fill="url(#spacemap-orbit)"
      />
      <path
        d="M26 102C53 101 79 89 91 72C98 61 97 47 84 41C74 36 61 36 48 38C60 33 73 31 85 34C103 39 110 57 101 74C89 96 60 111 26 102Z"
        fill="url(#spacemap-orbit)"
      />
      <ellipse
        cx="59"
        cy="60"
        rx="40"
        ry="10"
        transform="rotate(-38 59 60)"
        fill="none"
        stroke="#d9f6ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="60" cy="59" r="10" fill="#ffd36b" />
      <path d="M97 15l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5Z" fill="#ffd36b" />
      <path d="M15 87l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#33cfff" />
    </svg>
  );
}
