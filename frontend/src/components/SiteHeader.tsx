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
  const useDarkHeroHeader = normalizedPath === '/' && !scrolled;

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

  const desktopLinkClass = (isActive: boolean) => {
    if (isActive) {
      return useDarkHeroHeader
        ? 'rounded-xl bg-black/35 px-4 py-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]'
        : 'rounded-xl bg-[#ece6dc] px-4 py-2 text-[#1f2a36] shadow-[inset_0_0_0_1px_rgba(216,210,200,0.96)]';
    }

    return useDarkHeroHeader
      ? 'px-4 py-2 text-white/78 hover:text-white'
      : 'px-4 py-2 text-[#716a60] hover:text-[#1f2a36]';
  };

  const mobileLinkClass = (isActive: boolean) =>
    isActive
      ? 'rounded-xl bg-[#ece6dc] px-4 py-3 text-[#1f2a36] shadow-[inset_0_0_0_1px_rgba(216,210,200,0.96)]'
      : 'px-4 py-3 text-[#716a60] hover:text-[#1f2a36]';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'liquid-glass' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3 transition-all">
          <img
            src={emblemSrc}
            alt="SpaceMap"
            className="h-10 w-10 transition-transform group-hover:scale-110"
            draggable={false}
          />
          <span
            className={`text-xl font-semibold tracking-tight font-sans ${
              useDarkHeroHeader ? 'text-white' : 'text-[#1f2a36]'
            }`}
          >
            SpaceMap
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${desktopLinkClass(
                normalizedPath === link.to,
              )}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/tracker/"
            className="ml-3 rounded-lg bg-[#8ed8ff] px-5 py-2 text-sm font-semibold text-[#06101a] transition-colors hover:bg-[#b6e8ff]"
          >
            Open tracker
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className={`md:hidden p-2 ${useDarkHeroHeader ? 'text-white' : 'text-space-text'}`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-space-border liquid-glass">
          <nav className="flex flex-col px-6 py-4 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium ${mobileLinkClass(normalizedPath === link.to)}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/tracker/"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-lg bg-[#8ed8ff] px-5 py-3 text-center text-sm font-semibold text-[#06101a] transition-colors hover:bg-[#b6e8ff]"
            >
              Open tracker
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
