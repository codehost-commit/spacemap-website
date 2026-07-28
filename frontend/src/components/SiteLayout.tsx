import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader.js";
import { SiteFooter } from "./SiteFooter.js";
import { ShaderBackground } from "./ui/shader-r.js";

export function SiteLayout() {
  const { pathname } = useLocation();
  const isTracker = pathname === "/tracker";

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
