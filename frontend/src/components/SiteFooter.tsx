import { Link, useNavigate } from "react-router-dom";
import emblemSrc from "../assets/brand-emblem.png";

/** Scroll to top then navigate */
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
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
              <li><FooterLink to="/tracker">Tracker</FooterLink></li>
              <li><FooterLink to="/#features">Features</FooterLink></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-space-accent mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              <li><FooterLink to="/about">About</FooterLink></li>
              <li><FooterLink to="/contact">Contact</FooterLink></li>
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
