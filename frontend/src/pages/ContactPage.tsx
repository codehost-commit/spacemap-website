import { useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  Code,
  ExternalLink,
  Mail,
  Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  subject: string;
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
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !question.trim()) return;

    saveContact({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      question: question.trim(),
      timestamp: new Date().toISOString(),
    });

    setSubmitted(true);
    setName('');
    setEmail('');
    setSubject('');
    setQuestion('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="relative pt-24">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center">
        <h1 className="spacemap-heading-display mt-6 text-4xl text-white md:text-6xl">
          Contact <AccentWord className="text-space-accent">SpaceMap</AccentWord>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-space-dim">
          Use the form for questions, bug reports, feature requests, or anything else about the
          project. If email is easier, you can also write directly to hello@spacemap.earth.
        </p>
      </section>

      {/* ── Contact form ─────────────────────────────────────── */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <form
          onSubmit={handleSubmit}
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm md:p-10"
        >
          <div className="space-y-6">
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
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
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
                  ? 'border border-emerald-500/30 bg-emerald-500/14 text-emerald-300'
                  : 'bg-white text-[#06101a] hover:bg-[#dfe9f2]'
              }`}
            >
              {submitted ? (
                <>
                  <CheckCircle size={18} />
                  Message saved on this device.
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send
                </>
              )}
            </button>

            <p className="text-center text-sm text-space-dim">
              For a direct reply, email{' '}
              <a
                href="mailto:hello@spacemap.earth"
                className="font-semibold text-space-accent hover:text-white transition-colors"
              >
                hello@spacemap.earth
              </a>
            </p>
          </div>
        </form>
      </section>

      {/* ── Quick links ──────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickLinkCard
            icon={Mail}
            title="Email"
            desc="Best for questions, feedback, and direct replies."
            action="hello@spacemap.earth"
            href="mailto:hello@spacemap.earth"
          />
          <QuickLinkCard
            icon={Code}
            title="Code and issues"
            desc="Browse the project or open an issue on GitHub."
            action="Open GitHub"
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
      className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm transition-colors hover:border-space-accent/30 hover:bg-white/[0.05]"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-space-accent">
        <Icon size={20} />
      </div>
      <div className="text-base font-semibold text-white">{title}</div>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-space-dim">{desc}</p>
      <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-space-accent">
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
    a: 'Yes. There is no paywall, no account, and no trial period. The tracker works in the browser without signing in.',
  },
  {
    q: 'How accurate is the tracking?',
    a: 'It depends on how fresh the public TLE data is. SpaceMap uses standard SGP4 propagation, so it is generally reliable for public tracking, but older element sets drift over time.',
  },
  {
    q: 'Does SpaceMap send my location or data anywhere?',
    a: 'No. The tracker runs locally in your browser, and your coordinates are not sent anywhere just to use the site.',
  },
  {
    q: 'Who runs SpaceMap?',
    a: 'Rahul Awasthi. SpaceMap is an independent project, and the About page explains more about why it was built.',
  },
  {
    q: 'Where should I report bugs or request features?',
    a: 'Email is the simplest option right now. If it is a bug, include your browser, device, and the steps that caused it. GitHub issues also work.',
  },
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-32 relative px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <h2 className="spacemap-heading-display mt-4 text-3xl text-white md:text-5xl">
            A few common <AccentWord className="text-space-accent">questions</AccentWord>
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

        <div className="mt-14 text-center">
          <Link
            to="/tracker/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-space-accent/30 hover:bg-white/8"
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
