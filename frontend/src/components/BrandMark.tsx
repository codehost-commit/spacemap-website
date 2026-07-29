import wordmarkSrc from '../assets/brand-wordmark.png';
import emblemSrc from '../assets/brand-emblem.png';

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  if (compact) {
    return (
      <div className="spacemap-brand spacemap-brand-compact justify-center">
        <img
          className="w-[13rem] h-auto block user-select-none"
          src={wordmarkSrc}
          alt="SpaceMap"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="spacemap-brand gap-4">
      <img
        className="spacemap-brand-emblem"
        src={emblemSrc}
        alt="SpaceMap emblem"
        draggable={false}
      />
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
