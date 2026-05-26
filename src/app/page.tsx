'use client';

import { ArrowRight, CheckCircle2, Link2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { FormEvent, useState } from 'react';

const integrations = ['Salesforce', 'Gong', 'Slack', 'Gmail'];

const bentoCards = [
  {
    title: 'Day-Zero Pre-Mortem',
    label: 'Predict churn before kickoff',
    body: 'Flags silent skeptics, unresolved objections, and technical risks before CS walks into the first call.',
    metric: 'Risk level: High',
    receipt: 'Gong 18:42',
  },
  {
    title: 'The Expectation Ledger',
    label: 'Hold Sales accountable',
    body: 'Turns every promise made during the sales cycle into a verified checklist CS can review before onboarding.',
    metric: '4 promises found',
    receipt: 'Email May 18',
  },
  {
    title: 'Source Receipts',
    label: 'Every claim linked to truth',
    body: 'Each risk and promise links back to the exact Gong timestamp, Slack message, or email quote.',
    metric: '100% verifiable',
    receipt: 'Slack #deal-acme',
  },
];

const LEADS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwS8DX_J-1a7mwdDqVmh5jYOlGgHeX-SC8W1qspN3uFUUjWgC5IgaEf4JuVeor8dgAT/exec';

export default function Home() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const submitDemoRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormStatus('submitting');

    try {
      await fetch(LEADS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          source: 'batonyx_landing_page',
          name: form.name,
          email: form.email,
          company: form.company,
          submittedAt: new Date().toISOString(),
        }),
      });

      setFormStatus('success');
      setForm({ name: '', email: '', company: '' });
    } catch {
      setFormStatus('error');
    }
  };

  return (
    <main className="bx-page">
      <header className="bx-nav bx-nav-simple">
        <a href="#top" className="bx-brand" aria-label="Batonyx home">
          <span className="bx-brand-symbol" aria-hidden="true">
            B
          </span>
          <span>Batonyx</span>
        </a>
        <a href="#book-demo" className="bx-nav-cta">
          Book a Demo
        </a>
      </header>

      <section className="bx-hero bx-single-hero" id="top">
        <div className="bx-hero-copy">
          <p className="bx-eyebrow">Day-Zero Pre-Mortem for Customer Success</p>
          <h1>Context changes everything.</h1>
          <p className="bx-hero-line">
            Every promise. Every concern. Every risk. Verified before kickoff.
          </p>
          <p className="bx-hero-copyline">
            Built for Customer Success leaders who walk into every kickoff prepared.
          </p>
          <div className="bx-hero-actions">
            <a href="#book-demo" className="bx-button bx-button-verde">
              Book a Demo <ArrowRight size={17} />
            </a>
          </div>
        </div>

        <aside className="bx-product-card" aria-label="Batonyx handoff brief preview">
          <div className="bx-product-top">
            <div>
              <span>Closed-Won account</span>
              <strong>Acme Analytics</strong>
            </div>
            <span className="bx-risk-badge">Day-Zero risk: High</span>
          </div>

          <div className="bx-alert-panel">
            <TriangleAlert size={22} />
            <div>
              <span>Pre-Mortem Alert</span>
              <p>Technical lead disengaged after an unresolved API rate-limit objection.</p>
            </div>
          </div>

          <div className="bx-receipt-list">
            <article>
              <span>Expectation</span>
              <p>AE promised a custom churn-risk report within 30 days.</p>
              <code>
                <Link2 size={12} /> Gong 00:32:14
              </code>
            </article>
            <article>
              <span>Action</span>
              <p>CS should book technical alignment before kickoff.</p>
              <code>
                <Link2 size={12} /> Slack #deal-acme
              </code>
            </article>
          </div>
        </aside>
      </section>

      <section className="bx-integrations" aria-label="Integrations">
        <span>Pulls context seamlessly from:</span>
        <div>
          {integrations.map((integration) => (
            <strong key={integration}>{integration}</strong>
          ))}
        </div>
      </section>

      <section className="bx-pain">
        <p className="bx-eyebrow">The status quo is broken</p>
        <h2>When a deal closes, the context dies.</h2>
        <p>
          Sales promised one thing, CS walks in blind, and the customer churns in 90 days. The manual handoff does not
          work.
        </p>
      </section>

      <section className="bx-bento-section">
        <div className="bx-section-heading">
          <p className="bx-eyebrow">The solution</p>
          <h2>Batonyx turns handoff chaos into a verified launch plan.</h2>
        </div>

        <div className="bx-bento-grid bx-bento-single-page">
          {bentoCards.map((card, index) => (
            <article className={index === 0 ? 'bx-bento-card bx-bento-large' : 'bx-bento-card'} key={card.title}>
              <div className="bx-bento-icon">
                {index === 2 ? <ShieldCheck size={24} /> : <TriangleAlert size={24} />}
              </div>
              <span>{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <div className="bx-bento-footer">
                <strong>{card.metric}</strong>
                <code>{card.receipt}</code>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bx-final-cta" id="book-demo">
        <div>
          <p className="bx-eyebrow">Book a demo</p>
          <h2>Stop Day-90 churn before Day 1 begins.</h2>
          <p>Tell us who you are. We will show you how Batonyx turns one Closed-Won deal into a Day-Zero Pre-Mortem.</p>
        </div>

        <form className="bx-demo-form" onSubmit={submitDemoRequest}>
          <label>
            Name
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Aditya Shinde"
            />
          </label>
          <label>
            Work email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Company
            <input
              required
              type="text"
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              placeholder="Acme SaaS"
            />
          </label>
          <button className="bx-button bx-button-verde" type="submit" disabled={formStatus === 'submitting'}>
            {formStatus === 'submitting' ? 'Submitting...' : 'Book a Demo'} <ArrowRight size={17} />
          </button>
          {formStatus === 'success' ? (
            <p className="bx-form-success">
              <CheckCircle2 size={14} /> You are on the list. We will reach out for a demo.
            </p>
          ) : formStatus === 'error' ? (
            <p className="bx-form-error">Could not submit. Try again in a moment.</p>
          ) : (
            <p>
              <CheckCircle2 size={14} /> Private beta for mid-market B2B SaaS CS teams.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
