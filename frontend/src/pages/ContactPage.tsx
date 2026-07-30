import { useState } from 'react';
import {
  Bug,
  CheckCircle,
  ChevronDown,
  Code,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Radio,
  Search,
  Send,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SystemPill } from '../components/SystemPill.js';

/**
 * Contact form. Submissions are saved to localStorage as JSON.
 * The admin console reads them via /contactread.
 * In a production setup you'd POST to an API, but for now this
 * keeps everything client-side and the data persists in the browser.
 */

interface ContactEntry {
  name: string;
  email: string;
  question: string;
  timestamp: string;
}

function getContacts(): ContactEntry[] {
  try {
    return JSON.parse(localStorage.getItem('spacemap-contacts') || '[]');
  } catch {
    return [];
  }
}

function saveContact(entry: ContactEntry) {
  const contacts = getContacts();
  contacts.push(entry);
  localStorage.setItem('spacemap-contacts', JSON.stringify(contacts));
}

export { getContacts };

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !question.trim()) return;

    saveContact({
      name: name.trim(),
      email: email.trim(),
      question: question.trim(),
      timestamp: new Date().toISOString(),
    });

    setSubmitted(true);
    setName('');
    setEmail('');
    setQuestion('');

    // Reset after a few seconds
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="relative pt-24">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(8,15,25,0.96)_58%,rgba(77,150,232,0.15))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="absolute right-[-3rem] top-[-2rem] h-28 w-28 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
            <div className="absolute bottom-[-3rem] left-[-2rem] h-28 w-28 rounded-full bg-[#ff6b6b]/8 blur-3xl" />

            <div className="relative">
              <div className="flex flex-wrap gap-3">
                <SystemPill tone="accent" icon={Send}>
                  Get in touch
                </SystemPill>
                <SystemPill tone="live" icon={Radio} pulse>
                  Signal open
                </SystemPill>
              </div>
              <h1 className="mt-5 text-4xl font-bold text-white md:text-5xl">Contact SpaceMap</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-space-dim md:text-base">
                Questions, launch ideas, data notes, feature requests, or a simple hello all belong
                here. This page should feel like an intentional intake lane, not just a blank form.
              </p>

              <div className="mt-7 grid gap-3">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-white">
                    <Search size={18} className="text-space-accent" />
                    <span className="text-sm font-semibold">Feature feedback</span>
                  </div>
                  <p className="mt-2 text-sm text-space-dim">
                    Tell us what would make the tracker, alerts, or live panels more useful.
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-white">
                    <Zap size={18} className="text-space-accent" />
                    <span className="text-sm font-semibold">Product questions</span>
                  </div>
                  <p className="mt-2 text-sm text-space-dim">
                    Ask about data sources, privacy, closed-source development, or how the live stack works.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <SystemPill tone="neutral" icon={Send}>
                  hello@spacemap.earth
                </SystemPill>
                <SystemPill tone="neutral" icon={Radio}>
                  Stored locally in this demo
                </SystemPill>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-[#09131f]/88 p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-space-dim">
                  Quick route
                </div>
                <div className="mt-3 text-sm leading-relaxed text-space-dim">
                  Want to see the product before writing?
                </div>
                <Link
                  to="/tracker/"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:border-space-accent/30 hover:bg-white/10"
                >
                  <Radio size={16} />
                  Open the live tracker first
                </Link>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
          >
          {/* Name */}
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-space-dim mb-2">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-colors focus:border-space-accent/50 focus:bg-white/10"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium text-space-dim mb-2"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-colors focus:border-space-accent/50 focus:bg-white/10"
            />
          </div>

          {/* Question */}
          <div>
            <label
              htmlFor="contact-question"
              className="block text-sm font-medium text-space-dim mb-2"
            >
              Question
            </label>
            <textarea
              id="contact-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={5}
              placeholder="What would you like to know?"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-colors focus:border-space-accent/50 focus:bg-white/10 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitted}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              submitted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] text-[#06101a] hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-[1.02]'
            }`}
          >
            {submitted ? (
              <>
                <CheckCircle size={18} />
                Sent! We will be in touch.
              </>
            ) : (
              <>
                <Send size={18} />
                Send Message
              </>
            )}
          </button>
          <p className="text-center text-xs text-space-dim">
            You can also reach us directly at{' '}
            <a
              href="mailto:hello@spacemap.earth"
              className="text-space-accent hover:text-white transition-colors"
            >
              hello@spacemap.earth
            </a>
          </p>
          </form>
        </div>
      </section>

      <FaqAndSupportSection />
    </div>
  );
}

// ─── FAQ + Support ─────────────────────────────────────────────────────────

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is SpaceMap really free?',
    a: 'Yes. No paywall, no signup, no trial. Every feature works in the browser without an account. There are no ads.',
  },
  {
    q: 'How often is satellite data updated?',
    a: 'The live catalog is pulled from CelesTrak and refreshed whenever you open the app. New TLE data is typically published every 4 – 12 hours; SpaceMap picks up the latest set on load.',
  },
  {
    q: 'How accurate is the tracking?',
    a: 'SGP4 propagation from a fresh TLE is accurate to roughly ±1 km at the epoch and drifts over days. SpaceMap propagates continuously in the browser so the number you see is the same math NORAD uses.',
  },
  {
    q: 'Why can\'t I find a specific satellite?',
    a: 'It may be classified (military assets aren\'t in the public catalog), decayed, or listed under a different name or NORAD ID. Try searching by international designator (e.g. "2020-100").',
  },
  {
    q: 'Does SpaceMap send my location or data anywhere?',
    a: 'No. All computation is client-side and no personal data leaves your device. Your local sky view only works locally in your browser; your coordinates are never transmitted.',
  },
  {
    q: 'Can I embed the tracker on my own site?',
    a: 'Not officially yet — a public embed is on the roadmap. For now you can link to spacemap.earth/tracker with a satellite pre-selected via URL parameters.',
  },
  {
    q: 'The globe is slow / uses a lot of GPU. How can I improve performance?',
    a: 'Reduce the number of rendered objects using the orbit-class filters (LEO, MEO, GEO, HEO) or hide debris from the object-type filter. Closing background browser tabs also helps.',
  },
  {
    q: 'How do I report a bug or request a feature?',
    a: 'Use the form above or email hello@spacemap.earth. Include screenshots plus browser and OS if it\'s a rendering bug — it makes reproduction much faster.',
  },
  {
    q: 'Is there an API?',
    a: 'A public JSON API for TLE data is on the roadmap. Until then, all the raw data feeding SpaceMap comes from CelesTrak\'s free public endpoints.',
  },
  {
    q: 'Who runs SpaceMap?',
    a: 'Rahul Awasthi — solo developer and designer. See the About page for the full story.',
  },
];

function FaqRow({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-colors hover:border-space-accent/30">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-sm font-semibold text-white md:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-space-accent transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-relaxed text-space-dim">
          {a}
        </div>
      )}
    </div>
  );
}

function FaqAndSupportSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <>
      <section id="faq" className="scroll-mt-32 relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <div className="flex justify-center">
              <SystemPill tone="accent" icon={HelpCircle}>
                Frequently asked
              </SystemPill>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Questions people actually ask.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-space-dim">
              Answers to the ten questions that come up most in email. Something not covered?
              Message us up top or email hello@spacemap.earth.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <FaqRow
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="support" className="scroll-mt-32 relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <div className="flex justify-center">
              <SystemPill tone="live" icon={LifeBuoy} pulse>
                Support
              </SystemPill>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Four ways to get unstuck.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <SupportCard
              icon={Mail}
              title="Email"
              desc="Fastest for feedback, questions, and partnership."
              action="hello@spacemap.earth"
              href="mailto:hello@spacemap.earth"
            />
            <SupportCard
              icon={Bug}
              title="Bug reports"
              desc="Include browser + OS + steps to reproduce. Screenshots help a lot."
              action="Report via contact form"
              href="#top"
            />
            <SupportCard
              icon={MessageSquare}
              title="Feature requests"
              desc="Tell us what would make SpaceMap more useful for your workflow."
              action="Open a request"
              href="mailto:hello@spacemap.earth?subject=Feature%20request"
            />
            <SupportCard
              icon={Code}
              title="Source & issues"
              desc="SpaceMap is open by design. File issues where the code lives."
              action="View on GitHub"
              href="https://github.com/codehost-commit/spacemap-website"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function SupportCard({
  icon: Icon,
  title,
  desc,
  action,
  href,
}: {
  icon: React.ComponentType<{ size?: number | string }>;
  title: string;
  desc: string;
  action: string;
  href: string;
}) {
  const isExternal = href.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noreferrer' : undefined}
      className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/10"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/25 to-[#8ed8ff]/15 text-space-accent transition-transform group-hover:scale-110">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold text-white">{title}</div>
        <p className="mt-1 text-sm leading-relaxed text-space-dim">{desc}</p>
        <div className="mt-3 text-xs font-semibold text-space-accent">{action} →</div>
      </div>
    </a>
  );
}
