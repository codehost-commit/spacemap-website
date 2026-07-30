import { Link } from 'react-router-dom';
import { Satellite, ArrowRight } from 'lucide-react';
import { SystemPill } from '../components/SystemPill.js';

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-6 pt-24">
      <div className="mx-auto max-w-lg text-center">
        {/* Floating satellite icon */}
        <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          <Satellite
            size={40}
            className="text-space-accent animate-[spin_12s_linear_infinite]"
            style={{ animationDirection: 'reverse' }}
          />
        </div>

        <div className="flex justify-center">
          <SystemPill tone="warn">Signal lost</SystemPill>
        </div>

        <h1 className="mt-6 text-7xl font-bold tracking-tight text-white md:text-8xl">
          4
          <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
            0
          </span>
          4
        </h1>

        <p className="mt-4 text-base leading-relaxed text-space-dim">
          This page drifted out of orbit. It may have decayed, been reclassified,
          or never existed in the catalog.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-[1.02]"
          >
            Back to home
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/tracker/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-space-accent/30 hover:bg-white/10"
          >
            Open the tracker
          </Link>
        </div>
      </div>
    </div>
  );
}
