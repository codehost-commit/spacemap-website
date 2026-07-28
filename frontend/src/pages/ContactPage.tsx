import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

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
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-space-accent mb-4">
            Get in Touch
          </p>
          <h1 className="text-4xl font-bold text-white md:text-5xl">Contact Us</h1>
          <p className="mt-4 text-space-dim">
            Have a question, feature request, or just want to say hello? Fill out the form below and
            we'll get back to you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm space-y-6"
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
                Sent! We'll be in touch.
              </>
            ) : (
              <>
                <Send size={18} />
                Send Message
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-space-dim">
          You can also reach us directly at{' '}
          <a
            href="mailto:hello@spacemap.earth"
            className="text-space-accent hover:text-white transition-colors"
          >
            hello@spacemap.earth
          </a>
        </p>
      </section>
    </div>
  );
}
