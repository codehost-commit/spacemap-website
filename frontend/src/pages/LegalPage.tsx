import { Link } from 'react-router-dom';

const UPDATED = 'August 13, 2026';

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8"
    >
      <h2 className="spacemap-heading-display text-2xl text-white md:text-3xl">{title}</h2>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-space-dim">{children}</div>
    </section>
  );
}

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}

export function LegalPage() {
  return (
    <div className="relative pt-24">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-space-accent">
          Privacy, Terms & Attributions
        </p>
        <h1 className="spacemap-heading-display max-w-4xl text-4xl text-white md:text-6xl">
          <AccentWord className="text-space-accent">Privacy</AccentWord> first. Terms that match how SpaceMap actually works.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-space-dim md:text-lg">
          This page combines SpaceMap&apos;s Privacy Policy, Terms of Use, and media
          attributions. It is written for the current product at{' '}
          <span className="text-white">spacemap.earth</span>, including the live tracker,
          overlays, saved lists, contact flow, and related site pages.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium">
          <a
            href="#privacy"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
          >
            Privacy
          </a>
          <a
            href="#terms"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
          >
            Terms
          </a>
          <a
            href="#attributions"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-space-dim transition-colors hover:border-space-accent/30 hover:text-white"
          >
            Attributions
          </a>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-space-dim">
            Last updated {UPDATED}
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-6 rounded-[2rem] border border-space-accent/20 bg-[linear-gradient(135deg,rgba(77,150,232,0.12),rgba(255,255,255,0.04))] p-6 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-space-dim">
            <span className="font-semibold text-white">Operator.</span> SpaceMap is operated by{' '}
            <span className="text-white">Rahul Awasthi</span> as a sole proprietorship. SpaceMap is
            not a corporation or limited liability company. Questions about this page can be sent
            to{' '}
            <a
              href="mailto:hello@spacemap.earth"
              className="text-space-accent transition-colors hover:text-white"
            >
              hello@spacemap.earth
            </a>
            .
          </p>
        </div>

        <div className="space-y-8">
          <Section id="privacy" title="Privacy Policy">
            <Clause title="1. What this policy covers">
              <p>
                This Privacy Policy explains what information SpaceMap may collect, how it may be
                used, how it may be shared, and what choices you have when you use the website,
                tracker, related overlays, and any associated communications.
              </p>
              <p>
                SpaceMap is designed to do a substantial amount of work directly in your browser.
                That means many calculations, render steps, and saved preferences can remain on
                your device instead of being transmitted to a SpaceMap-operated backend.
              </p>
            </Clause>

            <Clause title="2. Information we collect">
              <p>SpaceMap may collect or process the following categories of information:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Information you provide directly, such as your name, email address, and message
                  if you contact SpaceMap.
                </li>
                <li>
                  Device, browser, network, and usage information, such as IP address, user agent,
                  approximate location inferred from network data, page views, navigation events,
                  performance diagnostics, crash information, and security logs.
                </li>
                <li>
                  Data stored locally on your device, including local storage, cached assets,
                  service worker data, saved satellite lists, tracker preferences, and similar
                  browser-side settings.
                </li>
                <li>
                  Notification preferences if you enable browser notifications.
                </li>
                <li>
                  Information generated through your use of the product, such as searches,
                  selections, interface interactions, or feature usage patterns, to the extent
                  SpaceMap or its service providers monitor product usage.
                </li>
              </ul>
            </Clause>

            <Clause title="3. Tracking, cookies, local storage, and similar technologies">
              <p>
                By using SpaceMap, you authorize SpaceMap and its service providers to use cookies,
                local storage, cache storage, service workers, server logs, diagnostics, analytics,
                and similar technologies for product operation, security, abuse prevention,
                performance monitoring, debugging, and product improvement.
              </p>
              <p>
                Some features depend on local browser storage or cached assets to function
                correctly. Disabling these technologies may limit functionality.
              </p>
            </Clause>

            <Clause title="4. How we use information">
              <p>SpaceMap may use information to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>operate, maintain, secure, and improve the website and tracker;</li>
                <li>render orbital data, map layers, and optional overlays;</li>
                <li>remember settings and saved items on your device;</li>
                <li>respond to support requests, feedback, or legal notices;</li>
                <li>measure reliability, detect abuse, prevent fraud, and investigate incidents;</li>
                <li>understand how the product is used and what should be improved next.</li>
              </ul>
            </Clause>

            <Clause title="5. Public data sources and third-party materials">
              <p>
                SpaceMap uses public, publicly accessible, or publicly licensed data and reference
                materials from third parties. Depending on the feature, these may include orbital
                element sets and metadata, launch information, basemap imagery, geographic
                reference data, and astronomical catalogs.
              </p>
              <p>Examples of sources used by the product include:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Space-Track and CelesTrak for orbital element and catalog data;</li>
                <li>Launch Library 2 / The Space Devs for launch-related data;</li>
                <li>Natural Earth for geographic outlines and reference layers;</li>
                <li>HYG and similar astronomy datasets for star background data;</li>
                <li>imagery and mapping providers used through the tracker experience.</li>
              </ul>
              <p>
                Those sources are not owned by SpaceMap. Their accuracy, uptime, freshness,
                licensing terms, and usage restrictions are controlled by their respective
                providers.
              </p>
            </Clause>

            <Clause title="6. Sharing and disclosure">
              <p>SpaceMap may share information in the following circumstances:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  with hosting, infrastructure, analytics, security, or delivery providers that
                  help operate the service;
                </li>
                <li>
                  with third-party data or media providers when your browser requests their
                  content or APIs;
                </li>
                <li>
                  when required by law, legal process, court order, or a good-faith belief that
                  disclosure is necessary to protect rights, safety, or property;
                </li>
                <li>
                  in connection with a reorganization, asset sale, financing, or transfer of the
                  business, subject to applicable law.
                </li>
              </ul>
              <p>
                SpaceMap does not represent that it sells personal information in the ordinary
                consumer sense. However, service providers and infrastructure partners may process
                technical data as part of delivering the service.
              </p>
            </Clause>

            <Clause title="7. Retention">
              <p>
                Information may be retained for as long as reasonably necessary to operate the
                service, comply with legal obligations, resolve disputes, enforce agreements, or
                maintain security and business records.
              </p>
              <p>
                Data stored locally in your browser may remain there until you clear it or your
                browser removes it.
              </p>
            </Clause>

            <Clause title="8. Security">
              <p>
                SpaceMap uses reasonable administrative, technical, and organizational measures to
                protect information. No website, storage method, or network transmission is
                perfectly secure, so absolute security cannot be guaranteed.
              </p>
            </Clause>

            <Clause title="9. Children">
              <p>
                SpaceMap is not intended for children under 13 and is not knowingly designed to
                collect personal information from children under 13. If you believe such
                information has been provided, contact SpaceMap so it can be reviewed.
              </p>
            </Clause>

            <Clause title="10. Your choices">
              <p>You may be able to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>disable notifications through your browser;</li>
                <li>clear local storage, cookies, or cached assets through browser settings;</li>
                <li>stop using the service at any time;</li>
                <li>contact SpaceMap regarding privacy questions or requests.</li>
              </ul>
            </Clause>

            <Clause title="11. Changes to this policy">
              <p>
                SpaceMap may update this Privacy Policy from time to time. Changes become effective
                when posted here, unless a later date is stated. Continued use of the service after
                updates means you accept the revised policy.
              </p>
            </Clause>
          </Section>

          <Section id="terms" title="Terms of Use">
            <Clause title="1. Acceptance of these terms">
              <p>
                By accessing or using SpaceMap, you agree to these Terms of Use. If you do not
                agree, do not use the site or tracker.
              </p>
            </Clause>

            <Clause title="2. Who is providing the service">
              <p>
                SpaceMap is provided by Rahul Awasthi, operating as a sole proprietor. References
                to &quot;SpaceMap,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot; on this page refer to that business
                operation unless the context requires otherwise.
              </p>
            </Clause>

            <Clause title="3. License and permitted use">
              <p>
                Subject to these terms, SpaceMap grants you a limited, revocable, non-exclusive,
                non-transferable right to access and use the site for lawful personal,
                educational, research, editorial, or internal business purposes.
              </p>
              <p>You may not use SpaceMap to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>break the law or violate another person&apos;s rights;</li>
                <li>interfere with the service, infrastructure, or data sources;</li>
                <li>
                  scrape, mirror, bulk-download, or automate access in a way that is abusive,
                  excessive, or inconsistent with provider restrictions;
                </li>
                <li>attempt to bypass security controls, rate limits, or access restrictions;</li>
                <li>misrepresent SpaceMap data as guaranteed authoritative or certified.</li>
              </ul>
            </Clause>

            <Clause title="4. Closed-source software and intellectual property">
              <p>
                SpaceMap is closed-source, proprietary software. Except where a third-party license
                expressly says otherwise, all software, interface design, visual assets, branding,
                page content, and product presentation are owned by Rahul Awasthi or licensed to
                SpaceMap and are protected by applicable intellectual property laws.
              </p>
              <p>
                You may not copy, sell, sublicense, republish, redistribute, modify, reverse
                engineer, or create derivative works from SpaceMap except to the extent a law
                cannot be waived or a third-party license expressly allows it.
              </p>
              <p>
                Public datasets, maps, imagery, and other third-party materials remain subject to
                their own licenses and provider rights.
              </p>
            </Clause>

            <Clause title="5. Public data limitations and no safety-critical reliance">
              <p>
                SpaceMap uses public or publicly accessible data sources. Orbital element sets,
                launch data, imagery, and related metadata may be delayed, incomplete, corrected,
                rate-limited, or inaccurate.
              </p>
              <p>
                SpaceMap is offered for informational, visualization, educational, editorial,
                research, and exploratory purposes. It is not certified mission software and should
                not be used as the sole basis for conjunction assessment, collision avoidance,
                regulatory compliance, export control decisions, emergency action, flight safety, or
                any safety-critical or operational decision.
              </p>
            </Clause>

            <Clause title="6. Availability and changes">
              <p>
                SpaceMap may change, suspend, restrict, or discontinue any feature, dataset,
                interface, or integration at any time, with or without notice. We do not guarantee
                uninterrupted availability or error-free operation.
              </p>
            </Clause>

            <Clause title="7. Tracking, monitoring, and enforcement">
              <p>
                You agree that SpaceMap may use reasonable monitoring, logging, analytics,
                diagnostics, abuse-detection, and security tools to protect the service and enforce
                these terms.
              </p>
              <p>
                SpaceMap may suspend or block access if use appears unlawful, abusive, disruptive,
                or harmful to the product, data providers, infrastructure, or other users.
              </p>
            </Clause>

            <Clause title="8. Feedback and submissions">
              <p>
                If you send feedback, ideas, bug reports, suggestions, or similar submissions, you
                grant SpaceMap a worldwide, perpetual, irrevocable, royalty-free license to use,
                adapt, publish, and incorporate that feedback without compensation or obligation.
              </p>
            </Clause>

            <Clause title="9. Third-party services">
              <p>
                SpaceMap may rely on third-party APIs, datasets, content, hosting, or media
                services. We are not responsible for third-party services, and your use of them may
                also be subject to their separate terms or privacy policies.
              </p>
            </Clause>

            <Clause title="10. Disclaimers">
              <p>
                To the maximum extent permitted by law, SpaceMap is provided on an &quot;as is&quot; and
                &quot;as available&quot; basis, without warranties of any kind, whether express, implied, or
                statutory, including implied warranties of merchantability, fitness for a particular
                purpose, non-infringement, accuracy, availability, or reliability.
              </p>
            </Clause>

            <Clause title="11. Limitation of liability">
              <p>
                To the maximum extent permitted by law, Rahul Awasthi and SpaceMap will not be
                liable for any indirect, incidental, special, consequential, exemplary, or punitive
                damages, or for any loss of data, profits, goodwill, business opportunity, or use,
                arising out of or related to the service, even if advised of the possibility.
              </p>
              <p>
                To the maximum extent permitted by law, the total liability of SpaceMap and Rahul
                Awasthi for claims arising out of or related to the service will not exceed the
                greater of one hundred U.S. dollars (US $100) or the amount you paid directly to
                SpaceMap for the specific service giving rise to the claim in the prior twelve
                months.
              </p>
            </Clause>

            <Clause title="12. Indemnity">
              <p>
                You agree to defend, indemnify, and hold harmless Rahul Awasthi and SpaceMap from
                claims, liabilities, damages, losses, and expenses arising out of your misuse of
                the service, your violation of these terms, or your violation of another person&apos;s
                rights.
              </p>
            </Clause>

            <Clause title="13. Changes to these terms">
              <p>
                SpaceMap may revise these terms by posting an updated version on this page.
                Continued use after changes are posted means you accept the revised terms.
              </p>
            </Clause>

            <Clause title="14. Contact">
              <p>
                Questions about these terms or the privacy policy can be sent to{' '}
                <a
                  href="mailto:hello@spacemap.earth"
                  className="text-space-accent transition-colors hover:text-white"
                >
                  hello@spacemap.earth
                </a>
                .
              </p>
              <p>
                If you want to continue exploring the product, you can return to the{' '}
                <Link to="/tracker/" className="text-space-accent transition-colors hover:text-white">
                  tracker
                </Link>{' '}
                or read more{' '}
                <Link to="/about" className="text-space-accent transition-colors hover:text-white">
                  about SpaceMap
                </Link>
                .
              </p>
            </Clause>
          </Section>

          <Section id="attributions" title="Attributions">
            <Clause title="Homepage hero video">
              <p>
                SpaceMap&apos;s homepage hero uses a trimmed excerpt from{' '}
                <a
                  href="https://www.youtube.com/watch?v=s96R57qEb_c"
                  className="text-space-accent transition-colors hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  ISS Timelapse - 45min revolution (21 Aug 2023)
                </a>
                , uploaded by{' '}
                <a
                  href="https://www.youtube.com/@astronauticast"
                  className="text-space-accent transition-colors hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  AstronautiCAST
                </a>
                .
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Source upload: AstronautiCAST on YouTube.</li>
                <li>Source title: ISS Timelapse - 45min revolution (21 Aug 2023).</li>
                <li>Camera setup credit in the source description: Sultan Al Neyadi.</li>
                <li>
                  Original timelapse credit in the source description: Riccardo Rossi, ISAA
                  (Italian Space and Astronautics Association).
                </li>
                <li>Original timelapse licence in the source description: CC BY 4.0.</li>
                <li>Accessed by SpaceMap: August 13, 2026.</li>
                <li>Modified by SpaceMap on August 13, 2026: trimmed only.</li>
              </ul>
              <p>
                This excerpt is used for educational and informational context on SpaceMap, a
                free-to-access orbital tracking website. AstronautiCAST, Sultan Al Neyadi,
                Riccardo Rossi, and ISAA do not sponsor, support, endorse, approve, or have any
                affiliation with SpaceMap, Rahul Awasthi, or spacemap.earth.
              </p>
            </Clause>

            <Clause title="Homepage second slide video">
              <p>
                SpaceMap&apos;s second homepage hero slide uses a modified excerpt from{' '}
                <a
                  href="https://archive.org/details/NASATimeLapseVideos/jsc2015m000146.mp4"
                  className="text-space-accent transition-colors hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  jsc2015m000146.mp4
                </a>{' '}
                in the Internet Archive collection{' '}
                <a
                  href="https://archive.org/details/NASATimeLapseVideos"
                  className="text-space-accent transition-colors hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA Time Lapse Videos
                </a>
                .
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Source collection: NASA Time Lapse Videos.</li>
                <li>Source file: jsc2015m000146.mp4.</li>
                <li>Source topic listing: NASA.</li>
                <li>Usage marking listed on the source page: Public Domain Mark 1.0.</li>
                <li>Source page Addeddate: May 6, 2015 at 17:02:25.</li>
                <li>Source identifier: NASATimeLapseVideos.</li>
                <li>Scanner credit listed on the source page: Internet Archive HTML5 Uploader 1.6.1.</li>
                <li>Accessed by SpaceMap: August 13, 2026.</li>
                <li>Modified by SpaceMap on August 13, 2026.</li>
              </ul>
              <p>
                This material is presented as a modified public-domain source for educational and
                informational context on SpaceMap. NASA and the Internet Archive do not sponsor,
                support, endorse, approve, or have any affiliation with SpaceMap, Rahul Awasthi,
                or spacemap.earth.
              </p>
            </Clause>
          </Section>
        </div>
      </section>
    </div>
  );
}
