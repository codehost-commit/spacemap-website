import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import emblemSrc from '../assets/brand-emblem.png';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/learn', label: 'Learn' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/u, '') || '/' : pathname;

  // On the tracker page, use no header (tracker has its own HUD)
  const isTracker = normalizedPath === '/tracker';

  useEffect(() => {
    if (isTracker) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isTracker]);

  if (isTracker) return null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'liquid-glass' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={emblemSrc}
            alt="SpaceMap"
            className="h-10 w-10 transition-transform group-hover:scale-110"
            draggable={false}
          />
          <span className="text-xl font-semibold tracking-tight text-white font-sans">
            SpaceMap
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                normalizedPath === link.to
                  ? 'text-space-accent bg-white/10'
                  : 'text-space-dim hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/tracker/"
            className="ml-3 rounded-lg bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-5 py-2 text-sm font-semibold text-[#06101a] transition-all hover:shadow-lg hover:shadow-[#4d96e8]/25 hover:scale-105"
          >
            Launch Tracker
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 liquid-glass">
          <nav className="flex flex-col px-6 py-4 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  normalizedPath === link.to
                    ? 'text-space-accent bg-white/10'
                    : 'text-space-dim hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/tracker/"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-lg bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-5 py-3 text-sm font-semibold text-[#06101a] text-center"
            >
              Launch Tracker
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
