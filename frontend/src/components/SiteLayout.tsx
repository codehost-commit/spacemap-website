import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from './SiteHeader.js';
import { SiteFooter } from './SiteFooter.js';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/tracker': 'Tracker',
  '/about': 'About',
  '/features': 'Features',
  '/learn': 'Learn',
  '/contact': 'Contact',
  '/legal': 'Privacy, Terms & Attributions',
};

export function SiteLayout() {
  const { pathname, hash } = useLocation();
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/u, '') || '/' : pathname;
  const isTracker = normalizedPath === '/tracker';

  // Scroll to top on route change
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const targetId = hash.slice(1);
    const timeout = window.setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo({ top: 0 });
      }
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [pathname, hash]);

  useEffect(() => {
    document.title = `SpaceMap | ${PAGE_TITLES[normalizedPath] ?? 'Not Found'}`;
  }, [normalizedPath]);

  useEffect(() => {
    document.body.classList.toggle('site-mode', !isTracker);
    return () => document.body.classList.remove('site-mode');
  }, [isTracker]);

  if (isTracker) {
    // Tracker gets its own full-screen layout (the original app)
    return <Outlet />;
  }

  return (
    <div className="site-shell relative min-h-screen overflow-x-hidden bg-space-bg text-space-text">
      <div className="site-lite relative z-10">
        <SiteHeader />
        <main>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
