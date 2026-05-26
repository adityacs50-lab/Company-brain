'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardCopy,
  Download,
  FileText,
  Link2,
  LockKeyhole,
  MessageSquareText,
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

type RiskLevel = 'High' | 'Medium' | 'Low';

interface PreMortemResult {
  riskLevel: RiskLevel;
  alertsCount: number;
  promisesCount: number;
  actionsCount: number;
  alerts: Array<{
    level: RiskLevel;
    title: string;
    explanation: string;
    action: string;
    receipt: string;
    confidence: RiskLevel;
  }>;
  promises: Array<{
    title: string;
    owner: string;
    status: string;
    receipt: string;
    confidence: RiskLevel;
  }>;
  missingInformation: Array<{
    topic: string;
    impact: string;
  }>;
  actionPlan: Array<{
    day: string;
    action: string;
  }>;
}

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
  const [result, setResult] = useState<PreMortemResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const displayCustomer = useMemo(() => customer.trim() || 'Selected account', [customer]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2200);
  }

  function buildSlackBrief(data: PreMortemResult) {
    const alertLines = data.alerts.length
      ? data.alerts
          .map((alert) => `- ${alert.title} - _Action: ${alert.action}_ (Receipt: ${alert.receipt})`)
          .join('\n')
      : '- No alerts extracted.';

    const promiseLines = data.promises.length
      ? data.promises
          .map((promise) => `- [ ] ${promise.title} - _Owner: ${promise.owner}_ (Receipt: ${promise.receipt})`)
          .join('\n')
      : '- [ ] No promises extracted.';

    const missingLines = data.missingInformation.length
      ? data.missingInformation
          .map((item) => `- ${item.topic} - _Impact: ${item.impact}_`)
          .join('\n')
      : '- No missing information flagged.';

    const actionLines = data.actionPlan.length
      ? data.actionPlan
          .map((item, index) => `${index + 1}. ${item.day}: ${item.action}`)
          .join('\n')
      : '1. Day 1: Review handoff context with AE and CSM.';

    return `*Batonyx Day-Zero Pre-Mortem: ${displayCustomer}*
*Risk Level:* ${data.riskLevel}

*Pre-Mortem Alerts:*
${alertLines}

*Expectation Ledger:*
${promiseLines}

*Missing Information:*
${missingLines}

*7-Day Action Plan:*
${actionLines}`;
  }

  function buildMarkdownBrief(data: PreMortemResult) {
    const alertLines = data.alerts.length
      ? data.alerts
          .map(
            (alert) =>
              `- **${alert.title}** (${alert.level}, ${alert.confidence} confidence)\n  - Explanation: ${alert.explanation}\n  - Action: ${alert.action}\n  - Receipt: \`${alert.receipt}\``
          )
          .join('\n')
      : '- No alerts extracted.';

    const promiseLines = data.promises.length
      ? data.promises
          .map(
            (promise) =>
              `- [ ] **${promise.title}**\n  - Owner: ${promise.owner}\n  - Status: ${promise.status}\n  - Confidence: ${promise.confidence}\n  - Receipt: \`${promise.receipt}\``
          )
          .join('\n')
      : '- [ ] No promises extracted.';

    const missingLines = data.missingInformation.length
      ? data.missingInformation
          .map((item) => `- **${item.topic}**\n  - Impact: ${item.impact}`)
          .join('\n')
      : '- No missing information flagged.';

    const actionLines = data.actionPlan.length
      ? data.actionPlan
          .map((item, index) => `${index + 1}. **${item.day}: ${item.action}**`)
          .join('\n')
      : '1. **Day 1: Review handoff context**\n   CSM and AE verify the source-backed brief.';

    return `# Batonyx Day-Zero Pre-Mortem: ${displayCustomer}

**Risk Level:** ${data.riskLevel}  
**Deal Value:** ${dealValue}  
**AE:** ${ae}  
**CSM:** ${csm}

## Pre-Mortem Alerts
${alertLines}

## Expectation Ledger
${promiseLines}

## Missing Information
${missingLines}

## 7-Day Action Plan
${actionLines}`;
  }

  async function copyToClipboard(text: string) {
    if (!navigator.clipboard) {
      throw new Error('Clipboard is not available in this browser.');
    }

    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  }

  async function handleCopySlack() {
    if (!result) return;
    await copyToClipboard(buildSlackBrief(result));
  }

  async function handleCopyMarkdown() {
    if (!result) return;
    await copyToClipboard(buildMarkdownBrief(result));
  }

  function handleDownloadJson() {
    if (!result) return;

    const slug = displayCustomer
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'customer';
    const payload = {
      customerName: displayCustomer,
      dealValue,
      ae,
      csm,
      generatedAt: new Date().toISOString(),
      ...result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batonyx-${slug}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('JSON downloaded.');
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setExtractError('');

    try {
      const response = await fetch('/api/extract-pre-mortem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customer,
          dealValue,
          ae,
          csm,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Could not generate pre-mortem.');
      }

      setResult(data as PreMortemResult);
    } catch (error: any) {
      setExtractError(error?.message || 'Could not generate pre-mortem.');
    } finally {
      setIsGenerating(false);
    }
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
        {toastMessage && <div className="dash-toast">{toastMessage}</div>}

        <header className="dash-topbar">
          <div>
            <span className="dash-eyebrow">MVP Dashboard</span>
            <h1>Generate a verified kickoff pre-mortem.</h1>
          </div>
          <div className="dash-status-pill">
            <span />
            LLM extraction ready
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

            {extractError && <div className="dash-error">{extractError}</div>}

            <button
              className="dash-primary-action"
              disabled={isGenerating}
              onClick={handleGenerate}
              type="button"
            >
              {isGenerating ? 'Reading deal context...' : 'Generate Pre-Mortem'}
              <ArrowRight size={18} />
            </button>
          </form>

          <section className="dash-output-card">
            {!result ? (
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
                <div className="dash-export-bar">
                  <button onClick={handleCopySlack} type="button">
                    <MessageSquareText size={16} />
                    Copy Slack Brief
                  </button>
                  <button onClick={handleCopyMarkdown} type="button">
                    <ClipboardCopy size={16} />
                    Copy Markdown
                  </button>
                  <button onClick={handleDownloadJson} type="button">
                    <Download size={16} />
                    Download JSON
                  </button>
                </div>

                <div className="dash-summary-card">
                  <div>
                    <span className="dash-eyebrow">Closed-won account</span>
                    <h2>{displayCustomer}</h2>
                    <p>{dealValue} | AE: {ae} | CSM: {csm}</p>
                  </div>
                  <div className="dash-risk-badge">
                    <span>Day-Zero risk</span>
                    {result.riskLevel}
                  </div>
                </div>

                <div className="dash-metric-row">
                  <article>
                    <AlertTriangle size={18} />
                    <strong>{result.alertsCount}</strong>
                    <span>Pre-mortem alerts</span>
                  </article>
                  <article>
                    <ClipboardCheck size={18} />
                    <strong>{result.promisesCount}</strong>
                    <span>Sales promises</span>
                  </article>
                  <article>
                    <Target size={18} />
                    <strong>{result.actionsCount}</strong>
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
                    {result.alerts.map((alert) => (
                      <article key={alert.title} className={`dash-alert-card risk-${alert.level.toLowerCase()}`}>
                        <div className="dash-alert-top">
                          <strong>{alert.title}</strong>
                          <span>{alert.level}</span>
                        </div>
                        <p>{alert.explanation}</p>
                        <div className="dash-confidence">
                          Confidence: <strong>{alert.confidence}</strong>
                        </div>
                        <div className="dash-next-step">
                          <CheckCircle2 size={16} />
                          {alert.action}
                        </div>
                        <ReceiptChip>{alert.receipt}</ReceiptChip>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="dash-section-card">
                  <div className="dash-section-title">
                    <AlertTriangle size={20} />
                    <div>
                      <span className="dash-eyebrow">Missing Information</span>
                      <h3>Context CS should collect before kickoff</h3>
                    </div>
                  </div>
                  <div className="dash-missing-list">
                    {result.missingInformation.length > 0 ? (
                      result.missingInformation.map((item) => (
                        <article className="dash-missing-row" key={item.topic}>
                          <strong>{item.topic}</strong>
                          <p>{item.impact}</p>
                        </article>
                      ))
                    ) : (
                      <article className="dash-missing-row">
                        <strong>No missing context flagged</strong>
                        <p>The extracted context looks complete enough for CS review.</p>
                      </article>
                    )}
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
                      {result.promises.map((item) => (
                        <div className="dash-ledger-row" key={item.title}>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.owner} | {item.status} | {item.confidence} confidence</span>
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
                      {result.actionPlan.map((item) => (
                        <div className="dash-action-row" key={`${item.day}-${item.action}`}>
                          <span>{item.day}</span>
                          <div>
                            <strong>{item.action}</strong>
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
