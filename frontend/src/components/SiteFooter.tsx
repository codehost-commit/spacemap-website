import { Link } from "react-router-dom";
import emblemSrc from "../assets/brand-emblem.png";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={emblemSrc} alt="SpaceMap" className="h-10 w-10" draggable={false} />
              <span className="text-lg font-semibold text-white font-sans">SpaceMap</span>
            </Link>
            <p className="text-sm text-space-dim leading-relaxed">
              Real-time orbital intelligence, running entirely in your browser. Track every object above Earth.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              <li><Link to="/tracker" className="text-sm text-space-dim hover:text-white transition-colors">Tracker</Link></li>
              <li><Link to="/#features" className="text-sm text-space-dim hover:text-white transition-colors">Features</Link></li>
              <li><a href="https://github.com" target="_blank" rel="noopener" className="text-sm text-space-dim hover:text-white transition-colors">GitHub</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-sm text-space-dim hover:text-white transition-colors">About</Link></li>
              <li><a href="mailto:hello@spacemap.earth" className="text-sm text-space-dim hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-space-dim hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="text-sm text-space-dim hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-space-dim">
            &copy; {new Date().getFullYear()} SpaceMap. All rights reserved.
          </p>
          <p className="text-xs text-space-dim">
            spacemap.earth
          </p>
        </div>
      </div>
    </footer>
  );
}
