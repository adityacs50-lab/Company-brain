'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Users, 
  RefreshCw, 
  Terminal as TermIcon, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Mail, 
  MessageSquare, 
  Folder, 
  BookOpen, 
  Award, 
  Check, 
  Search, 
  Sliders, 
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  gmail_connected: boolean;
  slack_connected: boolean;
  gdrive_connected: boolean;
  notion_connected: boolean;
  last_synced: string | null;
}

interface Skill {
  id: string;
  org_id: string;
  skill_name: string;
  trigger: string;
  steps: string[];
  source_employees: {
    employee_ids: string[];
    frequency: number;
    sources?: {
      title: string;
      url?: string;
    }[];
  };
  confidence: number;
  verified_by_human: boolean;
  created_at: string;
}

interface SweepStats {
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalEmployees: number;
  employeesProcessed: number;
  emailsProcessed: number;
  slackMessagesAnalyzed: number;
  driveFilesParsed: number;
  notionPagesScanned: number;
  rawSkillsExtracted: number;
  duplicatesFound: number;
  logs: string[];
}

export default function SweepDashboard() {
  const orgId = 'org_123'; // Hardcoded for YC demo/pitch scope
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const [frontendBaseUrl, setFrontendBaseUrl] = useState('');
  const apiUrl = (path: string) => `${apiBaseUrl}${path}`;
  const authUrl = (provider: 'google' | 'slack' | 'notion', employeeId: string) => {
    const params = new URLSearchParams({ employee_id: employeeId, org_id: orgId });
    if (frontendBaseUrl) {
      params.set('return_to', `${frontendBaseUrl}/admin/sweep`);
    }
    return apiUrl(`/api/auth/${provider}?${params.toString()}`);
  };
  const [activeTab, setActiveTab] = useState<'connect' | 'sweep' | 'dedup' | 'verify'>('connect');
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  
  // Ingestion states
  const [sweepStatus, setSweepStatus] = useState<SweepStats>({
    status: 'idle',
    totalEmployees: 0,
    employeesProcessed: 0,
    emailsProcessed: 0,
    slackMessagesAnalyzed: 0,
    driveFilesParsed: 0,
    notionPagesScanned: 0,
    rawSkillsExtracted: 0,
    duplicatesFound: 0,
    logs: ['[System Idle] Ready to trigger org knowledge sweep.'],
  });
  const [isSweeping, setIsSweeping] = useState(false);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Forms
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_id: '',
    name: '',
    email: '',
    department: 'Engineering',
    role: 'Software Engineer',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Scrolling reference for console window
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFrontendBaseUrl(window.location.origin);
  }, []);

  // 1. Fetch employees
  const fetchEmployees = async () => {
    try {
      const res = await fetch(apiUrl(`/api/admin/employees?org_id=${orgId}`));
      const data = await res.json();
      if (data.employees) {
        setEmployees(data.employees);
        // Pre-select all employees with at least one connection
        const connectedEmpIds = data.employees
          .filter((e: Employee) => e.gmail_connected || e.slack_connected || e.notion_connected)
          .map((e: Employee) => e.employee_id);
        setSelectedEmployees(connectedEmpIds);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // 2. Fetch skills
  const fetchSkills = async () => {
    try {
      const res = await fetch(apiUrl(`/api/skills/${orgId}/deduped`));
      const data = await res.json();
      if (data.skills) {
        setSkills(data.skills);
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    }
  };

  // 3. Initial loads
  useEffect(() => {
    fetchEmployees();
    fetchSkills();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected || error) {
      fetchEmployees();
      if (error) {
        alert(`Connection failed: ${error}`);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 4. Polling sweep status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isSweeping) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(apiUrl(`/api/admin/sweep-status/${orgId}`));
          const statusData: SweepStats = await res.json();
          setSweepStatus(statusData);

          if (statusData.status === 'completed' || statusData.status === 'failed') {
            setIsSweeping(false);
            fetchSkills(); // Reload raw skills
            // Automatically advance to Step 3 (Deduplication) if sweep completed successfully
            if (statusData.status === 'completed') {
              setActiveTab('dedup');
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 1500); // Poll every 1.5s
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSweeping]);

  // 5. Scroll terminal output automatically
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sweepStatus.logs]);

  // Handle employee checklist toggles
  const handleToggleEmployeeSelection = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  // Select all employees
  const handleSelectAllEmployees = () => {
    const allIds = employees.map(e => e.employee_id);
    setSelectedEmployees(allIds);
  };

  // Triggering the Sweeper
  const handleTriggerSweep = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please choose at least one connected person.');
      return;
    }
    setIsSweeping(true);
    setActiveTab('sweep');
    setSweepStatus(prev => ({
      ...prev,
      status: 'running',
      logs: ['[System] Connecting work apps...', '[System] Scan started.'],
    }));

    try {
      const res = await fetch(apiUrl('/api/admin/sweep-org'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          employee_ids: selectedEmployees,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not start the scan');
      }
    } catch (err: any) {
      console.error(err);
      setIsSweeping(false);
      setSweepStatus(prev => ({
        ...prev,
        status: 'failed',
        logs: [...prev.logs, `[ERROR] ${err.message}`],
      }));
    }
  };

  // Triggering similarity deduplication
  const handleTriggerDeduplication = async () => {
    setDedupLoading(true);
    try {
      const res = await fetch(apiUrl('/api/admin/deduplicate-skills'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh local sweepStats in-memory variables to show results count
        setSweepStatus(prev => ({
          ...prev,
          duplicatesFound: data.duplicatesFound,
        }));
        await fetchSkills();
        setActiveTab('verify'); // Transition to human verification
      } else {
        alert(`Could not combine duplicate skills: ${data.error}`);
      }
    } catch (err) {
      console.error('Error during deduplication:', err);
    } finally {
      setDedupLoading(false);
    }
  };

  // Verify and approve individual skills
  const handleToggleSkillVerification = async (skillId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(apiUrl('/api/skills/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: skillId,
          verified_by_human: !currentStatus,
        }),
      });
      if (res.ok) {
        setSkills(skills.map(s => s.id === skillId ? { ...s, verified_by_human: !currentStatus } : s));
      }
    } catch (err) {
      console.error('Error toggling skill verification:', err);
    }
  };

  // Adding a new employee manually
  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newEmployee.employee_id || !newEmployee.name || !newEmployee.email) {
      setFormError('Please fill out all fields.');
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/admin/employees'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          ...newEmployee,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setFormSuccess('Employee registered successfully! They can now connect their accounts.');
      setNewEmployee({
        employee_id: '',
        name: '',
        email: '',
        department: 'Engineering',
        role: 'Software Engineer',
      });
      fetchEmployees(); // Reload list
      
      // Close modal after 1.5s
      setTimeout(() => {
        setIsAddModalOpen(false);
        setFormSuccess('');
      }, 1500);

    } catch (err: any) {
      setFormError(err.message || 'Server error occurred.');
    }
  };

  // Filtering skills based on searches
  const filteredSkills = skills.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.skill_name.toLowerCase().includes(q) ||
      s.trigger.toLowerCase().includes(q) ||
      s.steps.some(step => step.toLowerCase().includes(q))
    );
  });

  return (
    <main className="dashboard-container">
      {/* Decorative Blur Background bubbles */}
      <div className="glow-bubble-1"></div>
      <div className="glow-bubble-2"></div>

      {/* Top Glassmorphic Navigation Bar */}
      <nav className="dashboard-nav">
        <Link href="/" className="nav-brand">
          <span className="text-gradient">Company Brain</span>
        </Link>
        <div className="nav-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></div>
            <span>Supabase Cloud Connected</span>
          </div>
          <button className="btn-secondary" onClick={fetchEmployees} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={12} /> Sync Status
          </button>
        </div>
      </nav>

      {/* Main Grid: Sidebar (Employee checklist) + Ingestion Wizard panel */}
      <div className="dashboard-grid">
        
        {/* Left Column: Organization Directory & Connection controls */}
        <aside className="dashboard-sidebar backdrop-glass">
          <div className="panel-header">
            <h3>Connected Orgs</h3>
            <button className="btn-secondary" onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Plus size={14} /> Add Employee
            </button>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <strong>How it works:</strong> Connect work apps, scan for repeatable workflows, then review the skills the app finds.
          </div>

          <div className="employee-card-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingBottom: '0.25rem' }}>
              <span>SELECT FOR SWEEP ({selectedEmployees.length})</span>
              <button onClick={handleSelectAllEmployees} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                Select All
              </button>
            </div>
            
            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dark)', fontSize: '0.8rem' }}>
                No employees registered. Click &apos;Add Employee&apos; to start.
              </div>
            ) : (
              employees.map(emp => {
                const isSelected = selectedEmployees.includes(emp.employee_id);
                const hasConnections = emp.gmail_connected || emp.slack_connected || emp.notion_connected;
                return (
                  <div key={emp.id} className={`employee-card ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      className="employee-checkbox"
                      checked={isSelected}
                      disabled={!hasConnections && !isSweeping}
                      onChange={() => handleToggleEmployeeSelection(emp.employee_id)}
                    />
                    <div className="employee-meta">
                      <h4>{emp.name}</h4>
                      <p>{emp.role} • {emp.department}</p>
                      
                      {/* OAuth Connection Status & Actions */}
                      <div className="employee-sources-status">
                        {/* Gmail/GDrive */}
                        {emp.gmail_connected ? (
                          <span className="source-badge connected" title="Google connected">GOOGLE</span>
                        ) : (
                          <Link 
                            href={authUrl('google', emp.employee_id)}
                            className="source-badge" 
                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                            title="Connect Gmail and Google Drive"
                          >
                            + GOOGLE
                          </Link>
                        )}

                        {/* Slack */}
                        {emp.slack_connected ? (
                          <span className="source-badge connected" title="Slack connected">SLACK</span>
                        ) : (
                          <Link 
                            href={authUrl('slack', emp.employee_id)}
                            className="source-badge" 
                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                            title="Connect Slack"
                          >
                            + SLACK
                          </Link>
                        )}

                        {/* Notion */}
                        {emp.notion_connected ? (
                          <span className="source-badge connected" title="Notion connected">NOTION</span>
                        ) : (
                          <Link 
                            href={authUrl('notion', emp.employee_id)}
                            className="source-badge" 
                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                            title="Connect Notion"
                          >
                            + NOTION
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Execution Panels */}
        <section className="dashboard-main">
          
          {/* Glassmorphic Wizard Steps Navigation */}
          <div className="wizard-steps-nav">
            <div className={`wizard-tab ${activeTab === 'connect' ? 'active' : ''}`} onClick={() => setActiveTab('connect')}>
              <div className="wizard-step-number">1</div>
              <div className="wizard-step-text">
                <h4>Connect Employees</h4>
                <p>Link work accounts</p>
              </div>
            </div>

            <div className={`wizard-tab ${activeTab === 'sweep' ? 'active' : ''}`} onClick={() => setActiveTab('sweep')}>
              <div className="wizard-step-number">2</div>
              <div className="wizard-step-text">
                <h4>Find Workflows</h4>
                <p>Read emails and docs</p>
              </div>
            </div>

            <div className={`wizard-tab ${activeTab === 'dedup' ? 'active' : ''}`} onClick={() => setActiveTab('dedup')}>
              <div className="wizard-step-number">3</div>
              <div className="wizard-step-text">
                <h4>Combine Duplicates</h4>
                <p>Clean up repeats</p>
              </div>
            </div>

            <div className={`wizard-tab ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>
              <div className="wizard-step-number">4</div>
              <div className="wizard-step-text">
                <h4>Review Playbook</h4>
                <p>Approve useful skills</p>
              </div>
            </div>
          </div>

          {/* ==============================================
              TAB 1: Connect Employees Panel
              ============================================== */}
          {activeTab === 'connect' && (
            <div className="action-card backdrop-glass">
              <div className="action-card-header">
                <h2>Connect Your Work Apps</h2>
                <p>Choose whose work history to scan. The app looks for repeatable company know-how.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
                <div style={{ border: '1px solid var(--border-glass)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: 'var(--accent-cyan)' }}>
                    <ShieldCheck size={18} /> Private by Design
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    Connected accounts are used only to find repeatable workflows. The final output is a clean playbook of useful company skills, not a tool for browsing private messages.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-glass)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#60A5FA' }}>
                      Ready to Scan?
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      You have <strong>{employees.filter(e => e.gmail_connected || e.slack_connected || e.notion_connected).length}</strong> connected person ready. Choose them on the left, then start the scan.
                    </p>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={handleTriggerSweep}
                    disabled={selectedEmployees.length === 0}
                    style={{ marginTop: '1rem', width: '100%' }}
                  >
                    Start Scan ({selectedEmployees.length} Person) →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================
              TAB 2: Sweep Ingestion Panel (Terminal logs)
              ============================================== */}
          {activeTab === 'sweep' && (
            <div className="action-card backdrop-glass">
              <div className="action-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2>Find Hidden Company Know-How</h2>
                  <p>Scan connected apps and turn scattered messages, emails, docs, and pages into clear reusable workflows.</p>
                </div>
                {sweepStatus.status === 'running' && (
                  <div style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', animation: 'pulseGlow 1s infinite' }}>
                    SCAN RUNNING
                  </div>
                )}
              </div>

              {/* Ingestion Metric Counters */}
              <div className="stats-strip">
                <div className="stat-box">
                  <h5>Employees Checked</h5>
                  <div className="stat-value">{sweepStatus.employeesProcessed} / {sweepStatus.totalEmployees}</div>
                </div>
                <div className="stat-box">
                  <h5>Gmail Threads</h5>
                  <div className="stat-value" style={{ color: '#F87171' }}>{sweepStatus.emailsProcessed}</div>
                </div>
                <div className="stat-box">
                  <h5>Slack Messages</h5>
                  <div className="stat-value" style={{ color: '#60A5FA' }}>{sweepStatus.slackMessagesAnalyzed}</div>
                </div>
                <div className="stat-box">
                  <h5>Drive / Notion Docs</h5>
                  <div className="stat-value" style={{ color: '#C084FC' }}>
                    {sweepStatus.driveFilesParsed + sweepStatus.notionPagesScanned}
                  </div>
                </div>
                <div className="stat-box font-glow">
                  <h5>Extracted Skills</h5>
                  <div className="stat-value" style={{ color: 'var(--success-green)' }}>{sweepStatus.rawSkillsExtracted}</div>
                </div>
              </div>

              {/* Monospaced Log Output Terminal */}
              <div className="console-wrapper">
                <div className="console-header">
                  <div className="console-title">
                    <div className="console-dot"></div>
                    <span>Scan Progress</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>PAGER=cat</span>
                </div>
                <div className="console-logs">
                  {sweepStatus.logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                  <div ref={consoleBottomRef} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  className="btn-primary"
                  disabled={sweepStatus.status === 'running' || sweepStatus.rawSkillsExtracted === 0}
                  onClick={() => setActiveTab('dedup')}
                >
                  Review and Combine Skills ({sweepStatus.rawSkillsExtracted} Found) →
                </button>
              </div>
            </div>
          )}

          {/* ==============================================
              TAB 3: Vector Deduplication Panel
              ============================================== */}
          {activeTab === 'dedup' && (
            <div className="action-card backdrop-glass">
              <div className="action-card-header">
                <h2>Clean Up Repeated Skills</h2>
                <p>Similar workflows are combined so the final playbook is short, clear, and easy to review.</p>
              </div>

              <div className="dedup-wrapper">
                <div className="dedup-action-bar">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Loaded <strong>{skills.length}</strong> skills found from the scan.
                    </span>
                  </div>
                  <button 
                    className="btn-primary btn-glow"
                    onClick={handleTriggerDeduplication}
                    disabled={dedupLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {dedupLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Combining similar skills...
                      </>
                    ) : (
                      <>Combine Similar Skills</>
                    )}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ border: '1px solid var(--border-glass)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--accent-cyan)' }}>
                      Duplicate Cleanup
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      If two skills say nearly the same thing, the app merges them into one cleaner workflow. For example, &quot;refunds under $50 auto-approve&quot; and &quot;approve refunds less than $50&quot; become one rule.
                    </p>
                  </div>

                  <div style={{ border: '1px solid var(--border-glass)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem', color: '#8B5CF6' }}>
                      Source Links
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Each skill can link back to the email, document, Slack message, or Notion page it came from, so you can check the original context before approving it.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================
              TAB 4: Skills Catalog & Verification Panel
              ============================================== */}
          {activeTab === 'verify' && (
            <div className="action-card backdrop-glass">
              <div className="action-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2>Company Playbook Review</h2>
                  <p>Review the workflows the app found. Approve the ones that are accurate enough for future AI agents to use.</p>
                </div>
                
                {/* Search Bar filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '32px', width: '250px' }}
                  />
                </div>
              </div>

              {/* Skills Directory Card Grid */}
              <div className="skills-results-grid" style={{ marginTop: '1.5rem' }}>
                {filteredSkills.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 0', border: '1px dashed var(--border-glass)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                    <BookOpen size={36} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>No skills found yet. Run Step 2 first.</p>
                  </div>
                ) : (
                  filteredSkills.map(skill => {
                    const contributorNames = skill.source_employees?.employee_ids
                      ?.map(empId => employees.find(e => e.employee_id === empId)?.name || empId)
                      || [];
                    const sourceLinks = skill.source_employees?.sources || [];
                    const formatSourceLabel = (title: string, index: number) => {
                      const cleanTitle = (title || `Source ${index + 1}`)
                        .replace(/^(Email Thread|Google Doc|Slack Message|Notion Page):\s*/i, '')
                        .trim();

                      return cleanTitle.length > 24 ? `${cleanTitle.slice(0, 24)}...` : cleanTitle;
                    };
                    
                    return (
                      <div key={skill.id} className="skill-card">
                        <div className="skill-card-header">
                          <div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--accent-cyan)' }}>⚙️</span> {skill.skill_name.toUpperCase().replace(/_/g, ' ')}
                            </h3>
                          </div>
                          
                          <div className="badge-row">
                            {skill.verified_by_human && (
                              <span className="badge-approved">
                                COMPANY APPROVED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Operational Trigger */}
                        <div className="skill-trigger-text">
                          <strong>WHEN THIS HAPPENS:</strong> {skill.trigger}
                        </div>

                        {/* Chronological Steps */}
                        <div className="skill-steps-list">
                          {skill.steps.map((step, sIdx) => (
                            <div key={sIdx} className="step-row">
                              <span className="step-num">{sIdx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>

                        {/* Card Footer: Contributors & Human Approval toggle */}
                        <div className="skill-contributors">
                          <div className="contributor-avatars">
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>CONTRIBUTORS:</span>
                            {contributorNames.map((name, cIdx) => (
                              <span key={cIdx} className="avatar-badge">
                                @{name}
                              </span>
                            ))}
                            {sourceLinks.length > 0 && (
                              <>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0.25rem 0 0.75rem' }}>SOURCES:</span>
                                {sourceLinks.slice(0, 3).map((source, sIdx) => (
                                  source.url ? (
                                    <a
                                      key={`${source.url}-${sIdx}`}
                                      className="avatar-badge"
                                      href={source.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={source.title}
                                      style={{ textDecoration: 'none' }}
                                    >
                                      {formatSourceLabel(source.title, sIdx)}
                                    </a>
                                  ) : (
                                    <span key={`${source.title}-${sIdx}`} className="avatar-badge" title={source.title}>
                                      {formatSourceLabel(source.title, sIdx)}
                                    </span>
                                  )
                                ))}
                              </>
                            )}
                          </div>

                          <button
                            className={skill.verified_by_human ? 'btn-approved-state' : 'btn-approve'}
                            onClick={() => handleToggleSkillVerification(skill.id, skill.verified_by_human)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            {skill.verified_by_human ? (
                              <>
                                <Check size={12} /> Approved
                              </>
                            ) : (
                              <>Approve Skill</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ==============================================
          MODAL WINDOW: Register Employee
          ============================================== */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content backdrop-glass">
            <h3>Add Employee Profile</h3>
            
            {formError && (
              <div style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--danger-rose)', border: '1px solid rgba(244,63,94,0.2)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            
            {formSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-green)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={14} /> {formSuccess}
              </div>
            )}

            <form onSubmit={handleAddEmployeeSubmit}>
              <div className="form-group">
                <label>Employee ID (Unique Tag)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. emp_101"
                  value={newEmployee.employee_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Umesh Shinde"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Primary Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. umesh@company.com"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Department</label>
                  <select
                    className="form-input"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    style={{ background: '#080C14', color: '#FFF' }}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Customer Support">Support</option>
                    <option value="Finance">Finance</option>
                    <option value="Human Resources">HR</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Architect"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
