import type { CSSProperties, ComponentType, ReactNode, SVGProps } from 'react';

type SystemPillTone = 'live' | 'accent' | 'warn' | 'neutral';
type PillIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: string | number }>;

const TONE_STYLES: Record<SystemPillTone, string> = {
  live: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  accent: 'border-space-accent/30 bg-space-accent/10 text-space-accent',
  warn: 'border-[#ffd166]/25 bg-[#ffd166]/10 text-[#ffe19a]',
  neutral: 'border-white/10 bg-white/5 text-space-dim',
};

export function SystemPill({
  children,
  tone = 'neutral',
  icon: Icon,
  pulse = false,
  className = '',
  style,
}: {
  children: ReactNode;
  tone?: SystemPillTone;
  icon?: PillIcon;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${TONE_STYLES[tone]} ${className}`.trim()}
    >
      {pulse && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
      {Icon && <Icon size={13} className="shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
