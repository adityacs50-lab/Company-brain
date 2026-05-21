import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing-container">
      {/* Sleek background radial gradient elements */}
      <div className="glow-bubble-1"></div>
      <div className="glow-bubble-2"></div>

      <div className="landing-card">
        <div className="logo-badge">Enterprise Knowledge Capture</div>
        
        <h1 className="landing-title">
          Company <span className="text-gradient">Brain</span>
        </h1>
        
        <p className="landing-description">
          Convert employee communications and operational documents into executable, deduplicated enterprise skills in real-time. Protect your company’s institutional memory.
        </p>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="feature-icon-wrapper">📬</div>
            <h4>Ingest Everything</h4>
            <p>Connect employee Gmail threads, Slack conversations, Google shared docs, and Notion databases.</p>
          </div>
          
          <div className="landing-feature-card">
            <div className="feature-icon-wrapper">⚡</div>
            <h4>Groq LLM Extraction</h4>
            <p>Uses Llama-3.3-70B-Versatile to extract raw procedures, schedules, workflows, and policies.</p>
          </div>
          
          <div className="landing-feature-card">
            <div className="feature-icon-wrapper">📐</div>
            <h4>Vector Deduplication</h4>
            <p>Cosine similarity calculations cluster duplicate communications and merge them with confidence weights.</p>
          </div>
        </div>

        <div className="landing-actions">
          <Link href="/admin/sweep" className="btn-primary btn-glow">
            Enter Admin Sweep Console →
          </Link>
        </div>
        
        <div className="landing-footer">
          Designed for high-performance organization scaling. Pitch-ready console.
        </div>
      </div>
    </main>
  );
}
