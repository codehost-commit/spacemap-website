import { Link, useNavigate } from 'react-router-dom';
import emblemSrc from '../assets/brand-emblem.png';
import { ArrowRight, Eye, Globe } from 'lucide-react';

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
      className="text-sm text-[#93a9bd] transition-colors hover:text-[#e8f6ff]"
    >
      {children}
    </a>
  );
}

export function SiteFooter() {
  const footerBannerSrc = `${import.meta.env.BASE_URL || '/'}brand/footer-orbit-banner.png`;

  return (
    <footer className="relative z-10 mt-8">
      <div className="mx-auto max-w-[120rem] px-4 pb-4 md:px-6">
        <div className="overflow-hidden rounded-[2.35rem] bg-[#07111b] shadow-[0_28px_90px_rgba(7,17,27,0.26)]">
          <div className="p-4 md:p-5">
            <div className="relative min-h-[22rem] overflow-hidden rounded-[1.9rem] md:min-h-[28rem]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${footerBannerSrc})` }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(6, 16, 26, 0.92) 0%, rgba(6, 16, 26, 0.72) 35%, rgba(6, 16, 26, 0.16) 62%, rgba(6, 16, 26, 0.56) 100%)',
                }}
              />
              <div className="spacemap-grain absolute inset-0 opacity-30" />
              <div className="relative z-10 p-8 md:p-10 lg:p-12">
                <div className="max-w-[38rem]">
                  <h2 className="spacemap-heading-display max-w-[34rem] text-[3rem] leading-[0.9] text-[#f7f2ff] sm:text-[4rem] md:text-[5rem]">
                    See what&apos;s <span className="spacemap-heading-accent text-[#8ed8ff]">in orbit</span>.
                  </h2>
                  <p className="mt-5 max-w-[32rem] text-sm leading-relaxed text-[#d0c9de] md:text-base">
                    I built SpaceMap because I wanted a simpler way to see what is actually in
                    orbit. The tracker is where you can explore it.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to="/tracker/"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-colors hover:bg-[#b6e8ff]"
                    >
                      <Globe size={16} />
                      Open tracker
                    </Link>
                    <Link
                      to="/features"
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgba(142,216,255,0.16)] bg-[rgba(142,216,255,0.06)] px-6 py-3 text-sm font-semibold text-[#e8f6ff] transition-colors hover:bg-[rgba(142,216,255,0.12)]"
                    >
                      <Eye size={16} />
                      Explore Features
                    </Link>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <Link
                      to="/about"
                      className="rounded-[1.2rem] border border-[rgba(142,216,255,0.12)] bg-[rgba(6,16,26,0.48)] px-4 py-4 transition-colors hover:border-[rgba(142,216,255,0.28)] hover:bg-[rgba(6,16,26,0.62)]"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8ed8ff]">
                        Built by Rahul
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#f4efff]">
                        Why I built SpaceMap.
                      </div>
                    </Link>
                    <a
                      href="https://github.com/codehost-commit/spacemap-website"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[1.2rem] border border-[rgba(142,216,255,0.12)] bg-[rgba(6,16,26,0.48)] px-4 py-4 transition-colors hover:border-[rgba(142,216,255,0.28)] hover:bg-[rgba(6,16,26,0.62)]"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8ed8ff]">
                        Code and issues
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#f4efff]">
                        Browse the repo or file a bug.
                      </div>
                    </a>
                    <Link
                      to="/tracker/"
                      className="rounded-[1.2rem] border border-[rgba(142,216,255,0.12)] bg-[rgba(6,16,26,0.48)] px-4 py-4 transition-colors hover:border-[rgba(142,216,255,0.28)] hover:bg-[rgba(6,16,26,0.62)]"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8ed8ff]">
                        No account/install
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#f4efff]">
                        Open tracker now.
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 px-6 pb-10 pt-8 md:grid-cols-4 md:px-10">
            {/* Brand column */}
            <div className="md:col-span-1">
              <Link to="/" className="mb-4 flex items-center gap-3">
                <img src={emblemSrc} alt="SpaceMap" className="h-10 w-10" draggable={false} />
                <span className="text-lg font-semibold text-[#e8f6ff] font-sans">SpaceMap</span>
              </Link>
              <p className="text-sm leading-relaxed text-[#93a9bd]">
                Real-time orbital intelligence, running entirely in your browser. Track every object
                above Earth.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#8ed8ff]">
                Product
              </h4>
              <ul className="space-y-3">
                <li>
                  <FooterLink to="/tracker/">Tracker</FooterLink>
                </li>
                <li>
                  <FooterLink to="/features">Features</FooterLink>
                </li>
                <li>
                  <FooterLink to="/learn">Learn</FooterLink>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#8ed8ff]">
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
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#8ed8ff]">
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
                <li>
                  <FooterLink to="/legal#attributions">
                    Attributions
                  </FooterLink>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mx-6 flex flex-col items-center justify-between gap-4 border-t border-[rgba(142,216,255,0.1)] px-0 pb-8 pt-8 md:mx-10 md:flex-row">
            <div className="flex flex-col items-center gap-1 md:items-start">
              <p className="text-xs text-[#7f96aa]">
                &copy; {new Date().getFullYear()} SpaceMap. All rights reserved.
              </p>
              <a
                href="https://spacemap.earth"
                className="text-xs text-[#7f96aa] transition-colors hover:text-[#e8f6ff]"
              >
                spacemap.earth
              </a>
            </div>
            <Link
              to="/tracker/"
              className="inline-flex items-center gap-2 text-xs text-[#9fb8cc] transition-colors hover:text-[#e8f6ff]"
            >
              Enter live orbit
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
