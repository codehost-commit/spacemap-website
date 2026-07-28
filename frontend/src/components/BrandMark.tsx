import wordmarkSrc from "../assets/brand-wordmark.png";
import emblemSrc from "../assets/brand-emblem.png";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={`spacemap-brand ${compact ? "spacemap-brand-compact" : ""}`}>
      <img
        className="spacemap-wordmark-image"
        src={wordmarkSrc}
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
      src={emblemSrc}
      alt="SpaceMap emblem"
      draggable={false}
    />
  );
}
