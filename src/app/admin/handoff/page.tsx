'use client';

import Link from 'next/link';
import type { ElementType } from 'react';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  Folder,
  Mail,
  MessageSquare,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Target,
  UserRound,
} from 'lucide-react';

type SourceType = 'email' | 'slack' | 'drive' | 'notion' | 'transcript';

type HandoffSource = {
  id: string;
  type: SourceType;
  title: string;
  owner: string;
  signal: string;
  content: string;
};

type HandoffBrief = {
  customer: string;
  stage: string;
  dealValue: string;
  ae: string;
  csm: string;
  buyerIntent: string;
  successMetric: string;
  promisedOutcomes: string[];
  stakeholders: string[];
  internalSkeptic: string;
  technicalConstraints: string[];
  unresolvedRisks: string[];
  nextSteps: string[];
  sourceLinks: string[];
};

const closedWonDeal = {
  customer: 'Acme Analytics',
  stage: 'Closed-Won',
  dealValue: '$48K ARR',
  ae: 'Maya, Account Executive',
  csm: 'Rohan, Customer Success',
  closeDate: 'May 24, 2026',
};

const sourceLibrary: HandoffSource[] = [
  {
    id: 'email-1',
    type: 'email',
    title: 'Gmail: final buying committee thread',
    owner: 'Maya, AE',
    signal: 'Buyer promised board-ready churn report before kickoff.',
    content:
      'Customer bought because their VP CS needs a board-ready view of renewal risk before the next QBR cycle. AE promised the first useful churn-risk brief within 30 days of kickoff.',
  },
  {
    id: 'slack-1',
    type: 'slack',
    title: 'Slack: #deal-acme-internal',
    owner: 'Sales engineering',
    signal: 'Internal skeptic cares about Zendesk and HubSpot quality.',
    content:
      'Sales engineer noted that Priya from RevOps is skeptical because Zendesk tags are inconsistent and HubSpot company records have duplicate account names.',
  },
  {
    id: 'drive-1',
    type: 'drive',
    title: 'Drive: Acme onboarding notes',
    owner: 'Solutions team',
    signal: 'Technical constraint: read-only first, no CRM writeback yet.',
    content:
      'Implementation should start read-only. Customer security asked for source links on every extracted claim. Do not push updates into CRM until CS lead approves the handoff output.',
  },
  {
    id: 'notion-1',
    type: 'notion',
    title: 'Notion: sales discovery summary',
    owner: 'Maya, AE',
    signal: 'Main buyer goal is reducing surprise churn.',
    content:
      'Economic buyer is Jordan, VP Customer Success. Their current pain is surprise churn after weak onboarding. Success metric: identify at least five risky accounts before the next renewal meeting.',
  },
  {
    id: 'call-1',
    type: 'transcript',
    title: 'Call transcript: closing call',
    owner: 'Gong export',
    signal: 'Unrecorded promise: Slack summary every Friday during pilot.',
    content:
      'AE said the team would send a Friday Slack summary during the first pilot month. Customer asked for open risks, promised outcomes, and technical blockers in that summary.',
  },
];

const sampleRealContext = `Gmail thread: Final buying committee
Jordan, VP Customer Success at Acme Analytics, said they are buying because they keep discovering churn risk too late before QBRs. Maya, the AE, promised that the first useful churn-risk handoff brief would be ready within 30 days of kickoff.

Slack: #deal-acme-internal
Sales engineering said Priya from RevOps is skeptical. Her concern is that Zendesk tags are inconsistent and HubSpot has duplicate company records. She will only trust the output if every claim has source links.

Drive note: onboarding constraints
Start read-only. Do not push anything back into HubSpot until Rohan, the CSM, approves the first few briefs. Security asked for a clear audit trail.

Call transcript: closing call
Maya told the customer the pilot team would send a Friday Slack summary during the first month. The summary should include open risks, promised outcomes, technical blockers, and the agreed next step before kickoff.`;

const sourceIcons: Record<SourceType, ElementType> = {
  email: Mail,
  slack: MessageSquare,
  drive: Folder,
  notion: FileText,
  transcript: ClipboardCheck,
};

function buildBrief(selectedSources: HandoffSource[]): HandoffBrief {
  const sourceLinks = selectedSources.map((source) => source.title);

  return {
    customer: closedWonDeal.customer,
    stage: closedWonDeal.stage,
    dealValue: closedWonDeal.dealValue,
    ae: closedWonDeal.ae,
    csm: closedWonDeal.csm,
    buyerIntent:
      'Acme bought Company Brain to prevent surprise churn by giving CS leadership a source-backed account-risk view before QBRs and renewals.',
    successMetric:
      'Within 30 days, identify at least five risky accounts and produce one board-ready churn-risk brief with source links.',
    promisedOutcomes: [
      'First useful churn-risk handoff brief within 30 days of kickoff.',
      'Friday Slack summary during the pilot month.',
      'Every extracted claim includes a source link for human review.',
    ],
    stakeholders: [
      'Jordan, VP Customer Success - economic buyer',
      'Priya, RevOps - internal skeptic and data-quality owner',
      'Maya, AE - sales context owner',
      'Rohan, CSM - onboarding owner',
    ],
    internalSkeptic:
      'Priya from RevOps is skeptical because Zendesk tags are inconsistent and HubSpot company records include duplicates.',
    technicalConstraints: [
      'Start read-only; no CRM writeback until the CS lead approves output quality.',
      'Handle duplicate HubSpot company names before any automated routing.',
      'Zendesk tags may be noisy, so sources must be visible for review.',
    ],
    unresolvedRisks: [
      'If source links are missing, RevOps will not trust the brief.',
      'If Friday pilot summaries are skipped, the customer may feel the sales promise was broken.',
      'If onboarding starts with generic discovery, the customer will repeat information already shared with sales.',
    ],
    nextSteps: [
      'CSM reviews this handoff brief before kickoff.',
      'AE confirms the promised Friday Slack summary and 30-day churn-risk output.',
      'RevOps approves read-only source access and duplicate-account handling.',
      'CSM sends kickoff agenda around buyer intent, success metric, risks, and technical constraints.',
    ],
    sourceLinks,
  };
}

function toMarkdown(brief: HandoffBrief) {
  return `# Sales-to-CS Handoff Brief: ${brief.customer}

Stage: ${brief.stage}
Deal value: ${brief.dealValue}
AE: ${brief.ae}
CSM: ${brief.csm}

## Why the customer bought
${brief.buyerIntent}

## 30-day success metric
${brief.successMetric}

## Promises made
${brief.promisedOutcomes.map((item) => `- ${item}`).join('\n')}

## Stakeholders
${brief.stakeholders.map((item) => `- ${item}`).join('\n')}

## Internal skeptic
${brief.internalSkeptic}

## Technical constraints
${brief.technicalConstraints.map((item) => `- ${item}`).join('\n')}

## Unresolved risks
${brief.unresolvedRisks.map((item) => `- ${item}`).join('\n')}

## Next steps
${brief.nextSteps.map((item) => `- ${item}`).join('\n')}

## Sources
${brief.sourceLinks.map((item) => `- ${item}`).join('\n')}`;
}

export default function HandoffDemoPage() {
  const [selectedSourceIds, setSelectedSourceIds] = useState(sourceLibrary.map((source) => source.id));
  const [brief, setBrief] = useState<HandoffBrief | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [outputMode, setOutputMode] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);
  const [inputMode, setInputMode] = useState<'real' | 'sample'>('real');
  const [dealInput, setDealInput] = useState({
    customer: 'Acme Analytics',
    dealValue: '$48K ARR',
    ae: 'Maya, Account Executive',
    csm: 'Rohan, Customer Success',
    sourceTitle: 'Pasted sales context',
    sourceText: sampleRealContext,
  });
  const [extractError, setExtractError] = useState('');
  const [logs, setLogs] = useState<string[]>([
    '[Ready] Paste sales context or use sample connected sources.',
  ]);

  const selectedSources = useMemo(
    () => sourceLibrary.filter((source) => selectedSourceIds.includes(source.id)),
    [selectedSourceIds]
  );

  const output = brief
    ? outputMode === 'markdown'
      ? toMarkdown(brief)
      : JSON.stringify(
          {
            format: 'company_brain_sales_to_cs_handoff_brief',
            approval: isApproved ? 'human_approved' : 'needs_review',
            brief,
          },
          null,
          2
        )
    : '';

  const toggleSource = (id: string) => {
    setCopied(false);
    setBrief(null);
    setIsApproved(false);
    setSelectedSourceIds((current) =>
      current.includes(id) ? current.filter((sourceId) => sourceId !== id) : [...current, id]
    );
  };

  const generateBrief = async () => {
    const shouldUseRealInput = inputMode === 'real' && dealInput.sourceText.trim().length >= 20;

    if (!shouldUseRealInput && selectedSources.length === 0) return;

    setIsExtracting(true);
    setIsApproved(false);
    setCopied(false);
    setExtractError('');

    if (shouldUseRealInput) {
      setLogs([
        '[Input] Real pasted sales context received.',
        '[Extract] Calling Groq to extract promises, buyer intent, success metric, risks, and next steps.',
        '[Safety] Output will require human approval before routing.',
      ]);

      try {
        const response = await fetch('/api/handoff/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealInput),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Could not generate handoff brief');
        }

        setBrief(data.brief);
        setLogs((current) => [
          ...current,
          `[Review] Groq generated a handoff brief from ${data.sourceCount || 1} pasted source group.`,
          '[Waiting] Human approval required before routing to Slack or CRM.',
        ]);
      } catch (error: any) {
        setExtractError(error.message || 'Could not generate handoff brief.');
        setLogs((current) => [...current, `[Error] ${error.message || 'Could not generate handoff brief.'}`]);
      } finally {
        setIsExtracting(false);
      }

      return;
    }

    setLogs([
      '[Sample] Using demo connected sources.',
      `[Scan] Reading ${selectedSources.length} selected source groups.`,
      '[Extract] Building sample handoff brief from seeded Gmail, Slack, Drive, Notion, and transcript context.',
    ]);

    window.setTimeout(() => {
      setBrief(buildBrief(selectedSources));
      setIsExtracting(false);
      setLogs((current) => [
        ...current,
        '[Review] Draft handoff brief generated with source links.',
        '[Waiting] Human approval required before routing to Slack or CRM.',
      ]);
    }, 850);
  };

  const approveBrief = () => {
    setIsApproved(true);
    setLogs((current) => [
      ...current,
      '[Approved] CS lead approved the handoff brief.',
      '[Route] Ready to send Markdown to Slack or JSON to CRM/CS tools.',
    ]);
  };

  const copyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const downloadOutput = (mode: 'markdown' | 'json') => {
    if (!brief) return;

    const fileBody = mode === 'markdown'
      ? toMarkdown(brief)
      : JSON.stringify(
          {
            format: 'company_brain_sales_to_cs_handoff_brief',
            approval: isApproved ? 'human_approved' : 'needs_review',
            brief,
          },
          null,
          2
        );
    const extension = mode === 'markdown' ? 'md' : 'json';
    const mimeType = mode === 'markdown' ? 'text/markdown' : 'application/json';
    const safeCustomer = brief.customer.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'customer';
    const blob = new Blob([fileBody], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${safeCustomer}-sales-to-cs-handoff.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLogs((current) => [
      ...current,
      `[Export] Downloaded ${extension.toUpperCase()} handoff brief for ${brief.customer}.`,
    ]);
  };

  return (
    <main className="handoff-shell">
      <nav className="handoff-nav">
        <Link href="/" className="nav-brand">
          <span className="text-gradient">Company Brain</span>
        </Link>
        <div className="nav-actions">
          <Link href="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Landing page
          </Link>
        </div>
      </nav>

      <section className="handoff-hero">
        <div>
          <p className="handoff-eyebrow">Sales-to-CS Handoff Router</p>
          <h1>Sales sells intent. CRMs store facts. Company Brain captures the difference.</h1>
          <p>
            Demo the new wedge: when a B2B SaaS deal closes, Company Brain reads scattered pre-sale context and
            produces a source-backed handoff brief for the customer success team.
          </p>
        </div>
        <div className="handoff-hero-card">
          <span>Closed-won trigger</span>
          <h2>{closedWonDeal.customer}</h2>
          <dl>
            <div>
              <dt>Deal value</dt>
              <dd>{closedWonDeal.dealValue}</dd>
            </div>
            <div>
              <dt>Close date</dt>
              <dd>{closedWonDeal.closeDate}</dd>
            </div>
            <div>
              <dt>AE</dt>
              <dd>{closedWonDeal.ae}</dd>
            </div>
            <div>
              <dt>CSM</dt>
              <dd>{closedWonDeal.csm}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="handoff-workspace">
        <aside className="handoff-panel">
          <div className="handoff-panel-header">
            <h2>1. Ingest deal context</h2>
            <p>Paste real sales context, or use the seeded connected-source demo for recording.</p>
          </div>

          <div className="handoff-mode-switch" role="tablist" aria-label="Input mode">
            <button
              type="button"
              className={inputMode === 'real' ? 'handoff-mode active' : 'handoff-mode'}
              onClick={() => {
                setInputMode('real');
                setBrief(null);
                setIsApproved(false);
              }}
            >
              <PencilLine size={14} /> Paste real context
            </button>
            <button
              type="button"
              className={inputMode === 'sample' ? 'handoff-mode active' : 'handoff-mode'}
              onClick={() => {
                setInputMode('sample');
                setBrief(null);
                setIsApproved(false);
              }}
            >
              <Database size={14} /> Sample sources
            </button>
          </div>

          {inputMode === 'real' ? (
            <div className="handoff-real-input">
              <div className="handoff-input-grid">
                <label>
                  Customer
                  <input
                    value={dealInput.customer}
                    onChange={(event) => setDealInput({ ...dealInput, customer: event.target.value })}
                  />
                </label>
                <label>
                  Deal value
                  <input
                    value={dealInput.dealValue}
                    onChange={(event) => setDealInput({ ...dealInput, dealValue: event.target.value })}
                  />
                </label>
                <label>
                  AE
                  <input
                    value={dealInput.ae}
                    onChange={(event) => setDealInput({ ...dealInput, ae: event.target.value })}
                  />
                </label>
                <label>
                  CSM
                  <input
                    value={dealInput.csm}
                    onChange={(event) => setDealInput({ ...dealInput, csm: event.target.value })}
                  />
                </label>
              </div>

              <label className="handoff-context-label">
                Sales context
                <textarea
                  value={dealInput.sourceText}
                  onChange={(event) => setDealInput({ ...dealInput, sourceText: event.target.value })}
                  placeholder="Paste sales call transcript, AE notes, email thread, Slack summary, CRM notes, or onboarding doc..."
                />
              </label>

              <div className="handoff-input-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDealInput({ ...dealInput, sourceText: sampleRealContext })}
                >
                  Load sample context
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDealInput({ ...dealInput, sourceText: '' })}
                >
                  Clear
                </button>
              </div>

              {extractError && <div className="handoff-error">{extractError}</div>}
            </div>
          ) : (
            <div className="handoff-source-list">
            {sourceLibrary.map((source) => {
              const Icon = sourceIcons[source.type];
              const selected = selectedSourceIds.includes(source.id);

              return (
                <button
                  key={source.id}
                  className={`handoff-source-card ${selected ? 'selected' : ''}`}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                >
                  <span className="handoff-source-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <strong>{source.title}</strong>
                    <small>{source.signal}</small>
                  </span>
                  <CheckCircle2 size={18} className="handoff-source-check" />
                </button>
              );
            })}
            </div>
          )}

          <button
            className="btn-primary handoff-main-action"
            type="button"
            disabled={
              isExtracting ||
              (inputMode === 'real' && dealInput.sourceText.trim().length < 20) ||
              (inputMode === 'sample' && selectedSources.length === 0)
            }
            onClick={generateBrief}
          >
            {isExtracting ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Extracting handoff brief
              </>
            ) : (
              <>
                Generate handoff brief <ArrowRight size={16} />
              </>
            )}
          </button>
        </aside>

        <section className="handoff-panel handoff-output-panel">
          <div className="handoff-panel-header">
            <h2>2. Review extracted brief</h2>
            <p>Approve only after the brief captures the sales promise, success metric, risks, and sources.</p>
          </div>

          {!brief ? (
            <div className="handoff-empty-state">
              <Database size={34} />
              <h3>No handoff brief yet</h3>
              <p>Generate a brief from the selected context to see the source-backed output.</p>
            </div>
          ) : (
            <>
              <div className="handoff-brief-grid">
                <article>
                  <Target size={18} />
                  <span>Buyer intent</span>
                  <p>{brief.buyerIntent}</p>
                </article>
                <article>
                  <ClipboardCheck size={18} />
                  <span>30-day success metric</span>
                  <p>{brief.successMetric}</p>
                </article>
                <article>
                  <AlertTriangle size={18} />
                  <span>Unresolved risk</span>
                  <p>{brief.unresolvedRisks[0]}</p>
                </article>
                <article>
                  <UserRound size={18} />
                  <span>Internal skeptic</span>
                  <p>{brief.internalSkeptic}</p>
                </article>
              </div>

              <div className="handoff-approval-bar">
                <div>
                  <strong>{isApproved ? 'Human approved' : 'Needs human review'}</strong>
                  <span>
                    {isApproved
                      ? 'Ready to route to Slack, CRM, or a CS tool.'
                      : 'A CS lead should approve before this becomes official context.'}
                  </span>
                </div>
                <button className={isApproved ? 'btn-approved-state' : 'btn-approve'} type="button" onClick={approveBrief}>
                  {isApproved ? (
                    <>
                      <Check size={14} /> Approved
                    </>
                  ) : (
                    'Approve brief'
                  )}
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      <section className="handoff-workspace handoff-bottom-grid">
        <section className="handoff-panel">
          <div className="handoff-panel-header">
            <h2>3. Route to workflow</h2>
            <p>The same approved brief can be sent as Markdown to Slack or as JSON to a CRM/CS tool.</p>
          </div>

          <div className="handoff-output-actions">
            <button
              type="button"
              className={outputMode === 'markdown' ? 'handoff-mode active' : 'handoff-mode'}
              onClick={() => setOutputMode('markdown')}
            >
              Markdown
            </button>
            <button
              type="button"
              className={outputMode === 'json' ? 'handoff-mode active' : 'handoff-mode'}
              onClick={() => setOutputMode('json')}
            >
              JSON
            </button>
            <button type="button" className="btn-secondary" disabled={!output} onClick={copyOutput}>
              {copied ? 'Copied' : 'Copy output'}
            </button>
            <button type="button" className="btn-secondary" disabled={!brief} onClick={() => downloadOutput('markdown')}>
              Download .md
            </button>
            <button type="button" className="btn-secondary" disabled={!brief} onClick={() => downloadOutput('json')}>
              Download .json
            </button>
          </div>

          <pre className="handoff-code-block">
            {output || 'Generate and approve a handoff brief to produce the routed output.'}
          </pre>
        </section>

        <section className="handoff-panel">
          <div className="handoff-panel-header">
            <h2>Extraction log</h2>
            <p>Tracks how the handoff brief was generated from the provided sales context.</p>
          </div>

          <div className="handoff-log">
            {logs.map((log, index) => (
              <div key={`${log}-${index}`}>{log}</div>
            ))}
          </div>

          <div className="handoff-trust-note">
            <ShieldCheck size={18} />
            <span>Read-only first. Human review before any CRM writeback.</span>
          </div>
        </section>
      </section>
    </main>
  );
}
