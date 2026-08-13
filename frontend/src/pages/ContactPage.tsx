import { useState } from 'react';
import {
  Bug,
  CheckCircle,
  ChevronDown,
  Code,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SystemPill } from '../components/SystemPill.js';

function AccentWord({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`spacemap-heading-accent ${className}`.trim()}>{children}</span>;
}

/**
 * Contact page — form submissions stored to localStorage.
 * The admin console reads them via /contactread.
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

/* ───────────────────────────────────────────────────────────── */

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
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="relative pt-24">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <div className="flex justify-center gap-3">
          <SystemPill tone="accent" icon={Send}>
            Get in touch
          </SystemPill>
        </div>
        <h1 className="spacemap-heading-display mt-6 text-4xl text-white md:text-6xl">
          We'd love to{' '}
          <span className="spacemap-heading-accent bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
            hear from you.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-space-dim">
          Questions, feature requests, bug reports, or a simple hello, drop us a line
          and we'll get back to you.
        </p>
      </section>

      {/* ── Contact form ─────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <form
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(8,15,25,0.96)_58%,rgba(77,150,232,0.12))] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-10"
        >
          {/* decorative glows */}
          <div className="pointer-events-none absolute right-[-3rem] top-[-2rem] h-28 w-28 rounded-full bg-[#8ed8ff]/12 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-3rem] left-[-2rem] h-28 w-28 rounded-full bg-[#4d96e8]/8 blur-3xl" />

          <div className="relative space-y-6">
            {/* Name + Email row */}
            <div className="grid gap-5 sm:grid-cols-2">
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-all focus:border-space-accent/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(77,150,232,0.15)]"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-space-dim mb-2">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-all focus:border-space-accent/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(77,150,232,0.15)]"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="contact-subject" className="block text-sm font-medium text-space-dim mb-2">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                placeholder="Feature request, bug report, general question..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-all focus:border-space-accent/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(77,150,232,0.15)]"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="contact-question" className="block text-sm font-medium text-space-dim mb-2">
                Message
              </label>
              <textarea
                id="contact-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                rows={5}
                placeholder="What would you like to know?"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-space-dim/50 outline-none transition-all focus:border-space-accent/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(77,150,232,0.15)] resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitted}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all ${
                submitted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] text-[#06101a] hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-[1.02]'
              }`}
            >
              {submitted ? (
                <>
                  <CheckCircle size={18} />
                  Sent! We'll be in touch.
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>

            <p className="text-center text-xs text-space-dim">
              Or email us directly at{' '}
              <a
                href="mailto:hello@spacemap.earth"
                className="text-space-accent hover:text-white transition-colors"
              >
                hello@spacemap.earth
              </a>
            </p>
          </div>
        </form>
      </section>

      {/* ── Quick links ──────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLinkCard
            icon={Mail}
            title="Email"
            desc="Fastest for questions and partnerships."
            action="hello@spacemap.earth"
            href="mailto:hello@spacemap.earth"
          />
          <QuickLinkCard
            icon={Bug}
            title="Bug reports"
            desc="Include browser, OS, and steps to reproduce."
            action="Report a bug"
            href="mailto:hello@spacemap.earth?subject=Bug%20report"
          />
          <QuickLinkCard
            icon={MessageSquare}
            title="Feature requests"
            desc="Tell us what would make SpaceMap better."
            action="Request a feature"
            href="mailto:hello@spacemap.earth?subject=Feature%20request"
          />
          <QuickLinkCard
            icon={Code}
            title="Source & issues"
            desc="SpaceMap is open by design."
            action="View on GitHub"
            href="https://github.com/codehost-commit/spacemap-website"
          />
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <FaqSection />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function QuickLinkCard({
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
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-all hover:border-space-accent/30 hover:bg-white/[0.06]"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d96e8]/20 to-[#8ed8ff]/10 text-space-accent transition-transform group-hover:scale-110">
        <Icon size={18} />
      </div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-space-dim">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-space-accent">
        {action}
        <ExternalLink size={11} className="opacity-60" />
      </div>
    </a>
  );
}

/* ───────────────────────────────────────────────────────────── */

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is SpaceMap really free?',
    a: 'Yes. No paywall, no signup, no trial. Every feature works in the browser without an account and there are no ads.',
  },
  {
    q: 'How often is satellite data updated?',
    a: 'The live catalog is pulled from CelesTrak on load. New TLE data is typically published every 4 to 12 hours; SpaceMap picks up the latest set automatically.',
  },
  {
    q: 'How accurate is the tracking?',
    a: 'SGP4 propagation from a fresh TLE is accurate to roughly ±1 km at the epoch and drifts over days. SpaceMap propagates continuously in the browser using the same math NORAD uses.',
  },
  {
    q: "Why can't I find a specific satellite?",
    a: 'It may be classified (military assets aren\'t in the public catalog), decayed, or listed under a different name or NORAD ID. Try searching by international designator (e.g. "2020-100").',
  },
  {
    q: 'Does SpaceMap send my location or data anywhere?',
    a: 'No. All computation is client-side and no personal data leaves your device. Your coordinates are never transmitted.',
  },
  {
    q: 'Can I embed the tracker on my own site?',
    a: 'Not officially yet. A public embed is on the roadmap. For now you can link to spacemap.earth/tracker with a satellite pre-selected via URL parameters.',
  },
  {
    q: 'The globe is slow. How can I improve performance?',
    a: 'Reduce rendered objects using the orbit-class filters (LEO, MEO, GEO, HEO) or hide debris from the object-type filter. Closing background browser tabs also helps.',
  },
  {
    q: 'Is there an API?',
    a: "A public JSON API for TLE data is on the roadmap. Until then, all the raw data feeding SpaceMap comes from CelesTrak's free public endpoints.",
  },
  {
    q: 'Who runs SpaceMap?',
    a: 'Rahul Awasthi, solo developer and designer. See the About page for the full story.',
  },
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-32 relative px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="flex justify-center">
            <SystemPill tone="accent" icon={HelpCircle}>
              FAQ
            </SystemPill>
          </div>
          <h2 className="spacemap-heading-display mt-4 text-3xl text-white md:text-5xl">
            Common <AccentWord className="text-space-accent">questions</AccentWord>,{' '}
            <span className="bg-gradient-to-r from-[#8ed8ff] to-[#4d96e8] bg-clip-text text-transparent">
              straight answers.
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-space-dim">
            Something not covered? Reach out using the form above.
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

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-sm text-space-dim">Ready to explore?</p>
          <Link
            to="/tracker/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4d96e8] to-[#8ed8ff] px-6 py-3 text-sm font-semibold text-[#06101a] transition-all hover:shadow-xl hover:shadow-[#4d96e8]/30 hover:scale-[1.02]"
          >
            Open the live tracker
          </Link>
        </div>
      </div>
    </section>
  );
}

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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-colors hover:border-space-accent/20">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-sm font-semibold text-white md:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-space-accent transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
