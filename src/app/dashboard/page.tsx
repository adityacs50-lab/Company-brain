'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Link2,
  LockKeyhole,
  MessageSquareWarning,
  PanelLeft,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';

const sampleContext = `Gong 00:18:42 - Dave, Lead Engineer: "Before we move forward, I need clarity on API rate limits. Our current system can spike hard at quarter-end."
Gong 00:22:10 - AE: "We can support the quarter-end load and include a custom churn-risk report within 30 days."
Email May 21 - CFO: "The discount works if onboarding proves value before the end of the quarter."
Slack #deal-acme - AE: "Dave stopped joining the last two calls. Champion says he is still worried about API limits."
Gmail thread - Buyer VP CS: "Success means reducing failed onboarding from 18% to under 8% this quarter."
Slack #deal-acme - SE: "SOC2 is fine, but Zendesk tag cleanup and duplicate Salesforce accounts need to happen before kickoff."`;

const alerts = [
  {
    title: 'Technical lead disengaged after API concern',
    risk: 'High',
    detail:
      'Dave raised the API rate-limit concern, never received a precise answer, then stopped joining the last two sales calls.',
    action: 'Book a technical alignment with Dave before the kickoff call.',
    receipt: 'Gong 00:18:42',
    source: 'Gong',
  },
  {
    title: 'Value proof is tied to quarter-end pressure',
    risk: 'Medium',
    detail:
      'The CFO accepted discounting only if onboarding proves value before quarter end, creating a compressed TTV window.',
    action: 'Make the first 7 days measurable around the buyer KPI.',
    receipt: 'Email May 21',
    source: 'Email',
  },
  {
    title: 'Implementation starts with dirty CRM context',
    risk: 'Medium',
    detail:
      'The sales engineer flagged duplicate Salesforce accounts and missing Zendesk tags before close.',
    action: 'Clean account records before CS asks the buyer to repeat setup details.',
    receipt: 'Slack #deal-acme',
    source: 'Slack',
  },
];

const promises = [
  {
    promise: 'Custom churn-risk report delivered within 30 days',
    owner: 'AE',
    status: 'Needs CS review',
    receipt: 'Gong 00:22:10',
  },
  {
    promise: 'Quarter-end onboarding value proof for the CFO',
    owner: 'CSM',
    status: 'Critical path',
    receipt: 'Email May 21',
  },
  {
    promise: 'Support for quarter-end API traffic spikes',
    owner: 'SE',
    status: 'Unverified',
    receipt: 'Gong 00:18:42',
  },
  {
    promise: 'Zendesk tag cleanup before kickoff',
    owner: 'RevOps',
    status: 'Open',
    receipt: 'Slack #deal-acme',
  },
];

const actions = [
  {
    window: 'Day 1',
    task: 'Send expectation ledger to AE, CSM, SE, and VP CS for sign-off.',
    reason: 'Align internal team before the customer sees kickoff materials.',
  },
  {
    window: 'Day 1-2',
    task: 'Schedule technical alignment with Dave.',
    reason: 'Silent technical detractor is the highest implementation stall risk.',
  },
  {
    window: 'Day 3',
    task: 'Confirm API limits and document the support boundary.',
    reason: 'The biggest pre-sale objection is still unresolved.',
  },
  {
    window: 'Day 4-5',
    task: 'Build kickoff agenda around failed-onboarding reduction.',
    reason: 'The buyer KPI is clear and should lead the first call.',
  },
  {
    window: 'Day 7',
    task: 'Review CRM and Zendesk cleanup before implementation starts.',
    reason: 'Bad internal records will make CS look unprepared.',
  },
];

const navItems = ['Deals', 'Pre-Mortems', 'Receipts', 'Settings'];

function ReceiptChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="dash-receipt">
      <Link2 size={13} />
      {children}
    </span>
  );
}

export default function DashboardPage() {
  const [customer, setCustomer] = useState('Acme Analytics');
  const [dealValue, setDealValue] = useState('$48,000 ARR');
  const [ae, setAe] = useState('Sarah Patel');
  const [csm, setCsm] = useState('Maya Chen');
  const [context, setContext] = useState(sampleContext);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const displayCustomer = useMemo(() => customer.trim() || 'Selected account', [customer]);

  function handleGenerate() {
    setIsGenerating(true);
    window.setTimeout(() => {
      setHasGenerated(true);
      setIsGenerating(false);
    }, 650);
  }

  return (
    <main className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span className="dash-brand-mark">B</span>
          <div>
            <strong>Batonyx</strong>
            <span>Day-Zero Pre-Mortem</span>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Dashboard navigation">
          {navItems.map((item, index) => (
            <button className={index === 1 ? 'active' : ''} key={item} type="button">
              {index === 0 && <FileText size={18} />}
              {index === 1 && <MessageSquareWarning size={18} />}
              {index === 2 && <Link2 size={18} />}
              {index === 3 && <PanelLeft size={18} />}
              {item}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-card">
          <LockKeyhole size={18} />
          <strong>Source-first by design</strong>
          <p>Every risk, promise, and action points back to Gong, Slack, or Email.</p>
        </div>
      </aside>

      <section className="dash-main">
        <header className="dash-topbar">
          <div>
            <span className="dash-eyebrow">MVP Dashboard</span>
            <h1>Generate a verified kickoff pre-mortem.</h1>
          </div>
          <div className="dash-status-pill">
            <span />
            Mock extraction ready
          </div>
        </header>

        <section className="dash-grid">
          <form className="dash-input-card" onSubmit={(event) => event.preventDefault()}>
            <div className="dash-card-heading">
              <div>
                <span className="dash-eyebrow">Deal Input</span>
                <h2>Paste closed-won context</h2>
              </div>
              <PlayCircle size={22} />
            </div>

            <div className="dash-form-grid">
              <label>
                Customer name
                <input value={customer} onChange={(event) => setCustomer(event.target.value)} />
              </label>
              <label>
                Deal value
                <input value={dealValue} onChange={(event) => setDealValue(event.target.value)} />
              </label>
              <label>
                Account executive
                <input value={ae} onChange={(event) => setAe(event.target.value)} />
              </label>
              <label>
                CSM owner
                <input value={csm} onChange={(event) => setCsm(event.target.value)} />
              </label>
            </div>

            <label className="dash-context-label">
              Gong / Slack / Email context
              <textarea value={context} onChange={(event) => setContext(event.target.value)} />
            </label>

            <button className="dash-primary-action" onClick={handleGenerate} type="button">
              {isGenerating ? 'Reading deal context...' : 'Generate Pre-Mortem'}
              <ArrowRight size={18} />
            </button>
          </form>

          <section className="dash-output-card">
            {!hasGenerated ? (
              <div className="dash-empty-state">
                <Sparkles size={28} />
                <h2>Pre-mortem appears here</h2>
                <p>
                  Paste a real closed-won sales thread, then generate the Day-Zero risk brief,
                  expectation ledger, and kickoff plan.
                </p>
              </div>
            ) : (
              <div className="dash-output-stack">
                <div className="dash-summary-card">
                  <div>
                    <span className="dash-eyebrow">Closed-won account</span>
                    <h2>{displayCustomer}</h2>
                    <p>{dealValue} | AE: {ae} | CSM: {csm}</p>
                  </div>
                  <div className="dash-risk-badge">
                    <span>Day-Zero risk</span>
                    High
                  </div>
                </div>

                <div className="dash-metric-row">
                  <article>
                    <AlertTriangle size={18} />
                    <strong>3</strong>
                    <span>Pre-mortem alerts</span>
                  </article>
                  <article>
                    <ClipboardCheck size={18} />
                    <strong>4</strong>
                    <span>Sales promises</span>
                  </article>
                  <article>
                    <Target size={18} />
                    <strong>5</strong>
                    <span>First-week actions</span>
                  </article>
                </div>

                <section className="dash-section-card">
                  <div className="dash-section-title">
                    <MessageSquareWarning size={20} />
                    <div>
                      <span className="dash-eyebrow">Pre-Mortem Alerts</span>
                      <h3>Why this account can churn before usage starts</h3>
                    </div>
                  </div>
                  <div className="dash-alert-list">
                    {alerts.map((alert) => (
                      <article key={alert.title} className={`dash-alert-card risk-${alert.risk.toLowerCase()}`}>
                        <div className="dash-alert-top">
                          <strong>{alert.title}</strong>
                          <span>{alert.risk}</span>
                        </div>
                        <p>{alert.detail}</p>
                        <div className="dash-next-step">
                          <CheckCircle2 size={16} />
                          {alert.action}
                        </div>
                        <ReceiptChip>{alert.receipt}</ReceiptChip>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="dash-two-column">
                  <article className="dash-section-card">
                    <div className="dash-section-title">
                      <ShieldCheck size={20} />
                      <div>
                        <span className="dash-eyebrow">Expectation Ledger</span>
                        <h3>Sales promised it. CS gets the receipt.</h3>
                      </div>
                    </div>
                    <div className="dash-ledger-list">
                      {promises.map((item) => (
                        <div className="dash-ledger-row" key={item.promise}>
                          <div>
                            <strong>{item.promise}</strong>
                            <span>{item.owner} | {item.status}</span>
                          </div>
                          <ReceiptChip>{item.receipt}</ReceiptChip>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="dash-section-card">
                    <div className="dash-section-title">
                      <ClipboardCheck size={20} />
                      <div>
                        <span className="dash-eyebrow">Kickoff Action Plan</span>
                        <h3>First 7 days mapped from pre-sale risk</h3>
                      </div>
                    </div>
                    <div className="dash-action-list">
                      {actions.map((item) => (
                        <div className="dash-action-row" key={`${item.window}-${item.task}`}>
                          <span>{item.window}</span>
                          <div>
                            <strong>{item.task}</strong>
                            <p>{item.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
