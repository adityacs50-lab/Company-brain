import Link from 'next/link';
import { ArrowRight, CheckCircle2, Database, FileCheck2, LockKeyhole, Search, ShieldCheck } from 'lucide-react';

const steps = [
  {
    label: '01',
    title: 'Watch closed-won deals',
    body: 'Trigger the workflow when a B2B SaaS customer moves from sales to onboarding.',
  },
  {
    label: '02',
    title: 'Extract lost context',
    body: 'Read Gmail, Slack, Drive, Notion, and call transcripts for promises, buyer intent, risks, and success metrics.',
  },
  {
    label: '03',
    title: 'Route the handoff brief',
    body: 'A human approves the source-backed brief, then CS gets Markdown or JSON inside the tools they already use.',
  },
];

const useCases = [
  'Closed-won sales handoffs',
  'Unrecorded customer promises',
  '30-day onboarding success metrics',
  'Internal skeptics and blockers',
  'Technical constraints before kickoff',
  'Source-backed CS handoff briefs',
];

export default function Home() {
  return (
    <main className="cb-landing">
      <header className="cb-nav">
        <Link href="/" className="cb-brand">
          Company Brain
        </Link>
        <nav className="cb-nav-links" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#pilot">Pilot</a>
        </nav>
        <Link href="/admin/handoff" className="cb-nav-cta">
          Demo
        </Link>
      </header>

      <section className="cb-hero">
        <div className="cb-hero-copy">
          <p className="cb-eyebrow">Sales-to-CS handoff router</p>
          <h1>Sales sells intent. CRMs store facts. Company Brain captures the difference.</h1>
          <p className="cb-hero-lede">
            When a B2B SaaS deal closes, Company Brain reads scattered pre-sale context and creates a source-backed
            handoff brief so customer success does not start onboarding blind.
          </p>
          <div className="cb-hero-actions">
            <Link href="/admin/handoff" className="cb-button-primary">
              View live demo <ArrowRight size={16} />
            </Link>
            <a href="mailto:shindeadityau@gmail.com?subject=Company%20Brain%20pilot" className="cb-button-secondary">
              Join design partner pilot
            </a>
          </div>
        </div>

        <div className="cb-hero-media" aria-label="Company Brain product preview">
          <div className="cb-agent-console">
            <div className="cb-console-top">
              <span>Handoff Brief</span>
              <span className="cb-live-dot">Live demo</span>
            </div>
            <div className="cb-skill-card">
              <p className="cb-skill-kicker">Closed-won account</p>
              <h2>Acme Analytics</h2>
              <p className="cb-trigger">Why they bought: prevent surprise churn before QBRs.</p>
              <ol>
                <li>Promised first churn-risk brief within 30 days.</li>
                <li>Internal skeptic is RevOps because CRM data is messy.</li>
                <li>Start read-only and require source links for every claim.</li>
                <li>CSM should lead kickoff around the agreed success metric.</li>
              </ol>
              <div className="cb-source-row">
                <span>Sources</span>
                <b>Gmail thread</b>
                <b>Slack</b>
                <b>Drive notes</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-proof-strip" aria-label="Current product proof">
        <span>Closed-won trigger</span>
        <span>Extract intent</span>
        <span>Human approve</span>
        <span>Route to CS</span>
      </section>

      <section className="cb-problem" id="product">
        <div>
          <p className="cb-eyebrow">Why this exists</p>
          <h2>Customer relationships break when sales intent disappears at handoff.</h2>
        </div>
        <p>
          CRMs capture facts like deal size and close date. They usually miss why the buyer signed, what was promised,
          who is skeptical, which risks are unresolved, and what the first success metric should be. CS has to rediscover
          that context while the customer is already judging onboarding.
        </p>
      </section>

      <section className="cb-dark-band" id="workflow">
        <div className="cb-band-header">
          <p className="cb-eyebrow cb-eyebrow-dark">How it works</p>
          <h2>From scattered sales context to a source-backed CS handoff.</h2>
        </div>
        <div className="cb-step-grid">
          {steps.map((step) => (
            <article className="cb-step-card" key={step.label}>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cb-capabilities">
        <article>
          <Search size={28} />
          <h3>Not another CRM</h3>
          <p>
            Company Brain sits on top of the tools teams already use. It routes missing context instead of replacing the
            system of record.
          </p>
        </article>
        <article>
          <FileCheck2 size={28} />
          <h3>Source-backed briefs</h3>
          <p>Every promise, risk, stakeholder, and next step can point back to the email, Slack message, doc, or call.</p>
        </article>
        <article>
          <ShieldCheck size={28} />
          <h3>Human approval</h3>
          <p>Read-only first. A CS lead approves the brief before it is routed into Slack, CRM, or CS tooling.</p>
        </article>
      </section>

      <section className="cb-use-cases">
        <div>
          <p className="cb-eyebrow">Where it helps</p>
          <h2>Start at the moment where dropped context turns into churn.</h2>
        </div>
        <div className="cb-use-list">
          {useCases.map((item) => (
            <div key={item}>
              <CheckCircle2 size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cb-api-panel">
        <div>
          <Database size={30} />
          <h2>Approved handoffs become structured context for revenue teams.</h2>
          <p>
            Once approved, the brief can be sent to Slack as Markdown or routed to CRM/CS tools as JSON. The first
            version is read-only and designed to protect onboarding quality, not replace the CRM.
          </p>
        </div>
        <pre>{`{
  "format": "sales_to_cs_handoff_brief",
  "customer": "Acme Analytics",
  "buyer_intent": "prevent surprise churn before QBRs",
  "success_metric": "identify 5 risky accounts in 30 days",
  "promises_made": ["Friday Slack summary", "source links"],
  "approval": "human_approved",
  "sources": ["Gmail thread", "Slack", "Drive notes"]
}`}</pre>
      </section>

      <section className="cb-final-cta" id="pilot">
        <LockKeyhole size={32} />
        <h2>Looking for 3 B2B SaaS teams to test this on recent closed-won handoffs.</h2>
        <p>
          Best fit: mid-market SaaS teams where sales, onboarding, customer success, and RevOps already feel the pain of
          missing context after a deal closes.
        </p>
        <div className="cb-hero-actions">
          <a href="mailto:shindeadityau@gmail.com?subject=Company%20Brain%20design%20partner" className="cb-button-primary">
            Become a design partner <ArrowRight size={16} />
          </a>
          <Link href="/admin/handoff" className="cb-button-secondary">
            Open product demo
          </Link>
        </div>
      </section>

      <footer className="cb-founder-footer">
        <p>Built by Aditya Shinde</p>
        <a href="https://www.linkedin.com/in/aditya-shinde-307264355/" target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href="mailto:shindeadityau@gmail.com">shindeadityau@gmail.com</a>
      </footer>
    </main>
  );
}
