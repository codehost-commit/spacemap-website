import { useState } from 'react';
import { CheckCircle, Radio, Search, Send, Zap } from 'lucide-react';
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
    </div>
  );
}
