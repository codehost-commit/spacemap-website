import { Link, useNavigate } from 'react-router-dom';
import emblemSrc from '../assets/brand-emblem.png';
import { ArrowRight, Eye, Globe, Radio, Shield } from 'lucide-react';
import { SystemPill } from './SystemPill.js';

/** Scroll to top then navigate */
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        if (to.includes('#')) {
          navigate(to);
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Small delay so scroll starts before route change
        setTimeout(() => navigate(to), 50);
      }}
      className="text-sm text-space-dim hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(8,15,25,0.96)_60%,rgba(77,150,232,0.14))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-10">
          <div className="absolute right-[-4rem] top-[-3rem] h-32 w-32 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
          <div className="absolute bottom-[-3rem] left-[-2rem] h-28 w-28 rounded-full bg-[#ff6b6b]/8 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-3">
                <SystemPill tone="live" icon={Radio} pulse>
                  Live orbital map
                </SystemPill>
                <SystemPill tone="accent" icon={Shield}>
                  Browser-side compute
                </SystemPill>
              </div>
              <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight text-white md:text-4xl">
                SpaceMap ends the same way it starts: with the live sky still in view.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-space-dim md:text-base">
                Track satellites, watch the ISS feed, monitor conjunctions, and move through time
                from one browser-based control surface built by Rahul Awasthi.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to="/tracker"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#4d96e8]/30"
              >
                <Globe size={16} />
                Open Tracker
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:border-space-accent/30 hover:bg-white/10"
              >
                <Eye size={16} />
                Explore Features
              </Link>
            </div>
          </div>

          <div className="relative mt-7 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-space-dim">
                Live stack
              </div>
              <div className="mt-2 text-sm font-semibold text-white">ISS feed, launches, risk, local sky</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-space-dim">
                Engine
              </div>
              <div className="mt-2 text-sm font-semibold text-white">3D globe plus browser-based propagation</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-space-dim">
                Surface
              </div>
              <div className="mt-2 text-sm font-semibold text-white">No install, no account, one tab</div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={emblemSrc} alt="SpaceMap" className="h-10 w-10" draggable={false} />
              <span className="text-lg font-semibold text-white font-sans">SpaceMap</span>
            </Link>
            <p className="text-sm text-space-dim leading-relaxed">
              Real-time orbital intelligence, running entirely in your browser. Track every object
              above Earth.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SystemPill tone="neutral" icon={Radio}>
                spacemap.earth
              </SystemPill>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <FooterLink to="/tracker">Tracker</FooterLink>
              </li>
              <li>
                <FooterLink to="/features">Features</FooterLink>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <FooterLink to="/about">About</FooterLink>
              </li>
              <li>
                <FooterLink to="/contact">Contact</FooterLink>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <FooterLink to="/legal#privacy">
                  Privacy
                </FooterLink>
              </li>
              <li>
                <FooterLink to="/legal#terms">
                  Terms
                </FooterLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-space-dim">
            &copy; {new Date().getFullYear()} SpaceMap. All rights reserved.
          </p>
          <Link
            to="/tracker"
            className="inline-flex items-center gap-2 text-xs text-space-dim transition-colors hover:text-white"
          >
            Enter live orbit
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
