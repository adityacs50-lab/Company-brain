'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardCheck, Link2, RadioTower, ShieldCheck, Target, TriangleAlert, UsersRound } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

const receiptSignals = [
  {
    label: 'Promises Made',
    value: '94%',
    detail: 'Friday onboarding report, custom dashboard, SOC2 review path',
    receipt: 'Gong 32:14',
  },
  {
    label: 'Buyer KPIs',
    value: '91%',
    detail: 'Reduce failed onboarding from 18% to under 8% this quarter',
    receipt: 'Email thread',
  },
  {
    label: 'Internal Skeptic',
    value: '86%',
    detail: 'Technical lead stopped joining calls after API rate-limit question',
    receipt: 'Gong 18:42',
  },
  {
    label: 'Technical Blockers',
    value: '89%',
    detail: 'Salesforce duplicate accounts and missing Zendesk tags',
    receipt: 'Slack #deal-acme',
  },
];

const problemPoints = [
  'Sales closes the deal. Everything they know lives in Gong calls, Slack DMs, and Gmail threads.',
  'CS walks into the kickoff with a Notion doc and a prayer.',
  '30% of churn is traceable to misaligned expectations set during the sales cycle.',
];

const steps = [
  {
    title: 'Deal closes in Salesforce',
    body: 'Batonyx triggers instantly, no human action needed.',
  },
  {
    title: 'Scans Gong, Slack, and Gmail',
    body: 'It extracts the 4 signals that actually determine retention.',
  },
  {
    title: 'Delivers a verified Handoff Brief',
    body: 'Straight to Slack and your CRM, with source receipts attached.',
  },
];

const signals = [
  {
    icon: ClipboardCheck,
    title: 'Promises Made',
    body: 'Every commitment Sales made during negotiation, with the exact Gong timestamp it was said.',
  },
  {
    icon: Target,
    title: 'Buyer KPIs',
    body: 'What success looks like to this customer, captured in their own words.',
  },
  {
    icon: UsersRound,
    title: 'Internal Skeptics',
    body: "Who pushed back during the sale and why they weren't fully sold.",
  },
  {
    icon: TriangleAlert,
    title: 'Technical Blockers',
    body: "Integration risks and open technical questions that didn't get resolved before close.",
  },
];

const betaTools = ['Gong', 'Salesforce', 'Slack'];

export default function Home() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [tools, setTools] = useState<string[]>(['Gong', 'Salesforce']);

  const earlyAccessHref = useMemo(() => {
    const subject = encodeURIComponent('Batonyx early access');
    const body = encodeURIComponent(
      `Email: ${email || 'not provided'}\nCompany: ${company || 'not provided'}\nTools: ${
        tools.length ? tools.join(', ') : 'not provided'
      }\n\nI want to see Batonyx for sales-to-CS handoff briefs.`
    );

    return `mailto:shindeadityau@gmail.com?subject=${subject}&body=${body}`;
  }, [company, email, tools]);

  const submitEarlyAccess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.href = earlyAccessHref;
  };

  const toggleTool = (tool: string) => {
    setTools((current) => (current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool]));
  };

  return (
    <main className="bt-page">
      <header className="bt-nav">
        <Link href="/" className="bt-brand" aria-label="Batonyx home">
          Batonyx
        </Link>
        <nav className="bt-nav-links" aria-label="Main navigation">
          <a href="#problem">Problem</a>
          <a href="#signals">Signals</a>
          <a href="#premortem">Pre-mortem</a>
        </nav>
        <a href="#early-access" className="bt-nav-cta">
          Get Early Access
        </a>
      </header>

      <section className="bt-hero">
        <div className="bt-hero-copy">
          <p className="bt-eyebrow">Sales-to-CS handoff briefs</p>
          <h1>Your CS Team Shouldn't Go Into Kickoffs Blind.</h1>
          <p className="bt-hero-lede">
            Batonyx turns every Closed-Won deal into a structured, source-verified Handoff Brief so your CS team knows
            exactly what was promised, who the skeptic is, and where the risk is. Before the first call.
          </p>
          <div className="bt-hero-actions">
            <a href="#early-access" className="bt-button-primary">
              Get Early Access <ArrowRight size={17} />
            </a>
            <Link href="/admin/handoff" className="bt-button-secondary">
              Open MVP
            </Link>
          </div>
        </div>

        <aside className="bt-product-proof" aria-label="Batonyx handoff brief preview">
          <div className="bt-proof-top">
            <div>
              <span>Handoff Brief</span>
              <strong>Acme Analytics</strong>
            </div>
            <span className="bt-risk-pill">Day-Zero risk: High</span>
          </div>
          <div className="bt-signal-list">
            {receiptSignals.map((signal) => (
              <article key={signal.label} className="bt-signal-row">
                <div className="bt-signal-score">{signal.value}</div>
                <div>
                  <h2>{signal.label}</h2>
                  <p>{signal.detail}</p>
                </div>
                <span>
                  <Link2 size={13} /> {signal.receipt}
                </span>
              </article>
            ))}
          </div>
          <div className="bt-proof-footer">
            <ShieldCheck size={16} />
            <span>Every claim has a confidence score and source receipt.</span>
          </div>
        </aside>
      </section>

      <section className="bt-problem" id="problem">
        <div className="bt-section-heading">
          <p className="bt-eyebrow">The problem</p>
          <h2>Context dies at handoff. Churn starts on Day 1.</h2>
        </div>
        <div className="bt-problem-grid">
          {problemPoints.map((point, index) => (
            <article key={point}>
              <span>0{index + 1}</span>
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bt-how">
        <div className="bt-section-heading">
          <p className="bt-eyebrow">How it works</p>
          <h2>Batonyx runs automatically. No meetings, no handoff calls.</h2>
        </div>
        <div className="bt-step-grid">
          {steps.map((step, index) => (
            <article key={step.title}>
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bt-signals" id="signals">
        <div className="bt-section-heading">
          <p className="bt-eyebrow">The 4 signals</p>
          <h2>Everything CS needs to know. Nothing they have to guess.</h2>
          <p>
            Each signal gets a confidence score and a deep-link receipt so CS can verify every single one before the
            kickoff.
          </p>
        </div>
        <div className="bt-feature-grid">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <article key={signal.title}>
                <Icon size={24} />
                <h3>{signal.title}</h3>
                <p>{signal.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bt-ledger">
        <div>
          <p className="bt-eyebrow">Expectation Ledger</p>
          <h2>Sales promised it. Now there's a receipt.</h2>
        </div>
        <p>
          The Expectation Ledger is a living checklist of every commitment made during the sales cycle. CS knows what
          was promised. Sales is accountable. No more &quot;that&apos;s not what we sold them&quot; conversations 60
          days in.
        </p>
      </section>

      <section className="bt-premortem" id="premortem">
        <div className="bt-premortem-copy">
          <p className="bt-eyebrow">Day-Zero Pre-Mortem</p>
          <h2>We predict churn before the customer logs in.</h2>
          <p>
            Batonyx analyzes pre-sales behavioral signals to flag accounts at risk before onboarding begins.
          </p>
          <strong>Stop churn before it starts.</strong>
        </div>
        <div className="bt-alert-card">
          <RadioTower size={26} />
          <span>Example signal</span>
          <p>The technical lead stopped joining calls 3 weeks before close. Implementation stall risk is high.</p>
        </div>
      </section>

      <section className="bt-beta">
        <div className="bt-section-heading">
          <p className="bt-eyebrow">Private beta</p>
          <h2>Built for VP of CS at mid-market B2B SaaS.</h2>
          <p>
            Best fit: 50-300 employee SaaS companies with 5-20 CSMs, high-touch onboarding, and sales context scattered
            across calls, email, CRM, and Slack.
          </p>
        </div>
        <div className="bt-pricing">
          <span>Private beta pricing</span>
          <strong>$800/month</strong>
          <p>One churned account saved pays for a year.</p>
        </div>
      </section>

      <section className="bt-final" id="early-access">
        <div>
          <p className="bt-eyebrow">Get early access</p>
          <h2>Stop going into kickoffs blind.</h2>
          <p>Batonyx is in private beta. We&apos;re onboarding 10 design partners now.</p>
        </div>

        <form className="bt-access-form" onSubmit={submitEarlyAccess}>
          <label>
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </label>
          <label>
            Company
            <input
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Acme SaaS"
              required
            />
          </label>
          <fieldset>
            <legend>Tools you use</legend>
            <div>
              {betaTools.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  className={tools.includes(tool) ? 'selected' : ''}
                  onClick={() => toggleTool(tool)}
                >
                  <CheckCircle2 size={15} /> {tool}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="bt-button-primary">
            Apply for Early Access <ArrowRight size={17} />
          </button>
        </form>
      </section>

      <footer className="bt-footer">
        <span>Batonyx</span>
        <Link href="/admin/handoff">MVP demo</Link>
        <a href="mailto:shindeadityau@gmail.com">shindeadityau@gmail.com</a>
      </footer>
    </main>
  );
}
