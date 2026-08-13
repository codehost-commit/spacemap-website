import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from './SiteHeader.js';
import { SiteFooter } from './SiteFooter.js';
import { ShaderBackground } from './ui/shader-r.js';

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

  if (isTracker) {
    // Tracker gets its own full-screen layout (the original app)
    return <Outlet />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Shader background behind everything */}
      <div className="fixed inset-0 z-0">
        <ShaderBackground className="h-full w-full" />
        {/* Dark overlay so content is readable */}
        <div className="absolute inset-0 bg-[#06101a]/60" />
      </div>

      {/* Page content */}
      <div className="relative z-10">
        <SiteHeader />
        <main>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
