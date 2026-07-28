type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`spacemap-brand ${compact ? "spacemap-brand-compact" : ""}`}>
      <img
        className="spacemap-wordmark-image"
        src="/brand/wordmark-1.png"
        alt="SpaceMap"
        draggable={false}
      />
    </div>
  );
}

export function BrandEmblem() {
  return (
    <img
      className="spacemap-brand-emblem"
      src="/brand/emblem-2.png"
      alt="SpaceMap emblem"
      draggable={false}
    />
  );
}
