import React, { useState, useEffect } from 'react';
import './GapDashboard.css';

const STATUS_META = {
  'Strong Match': { label: 'Strong', cls: 'gap-status-strong' },
  'Good Match':   { label: 'Good',   cls: 'gap-status-good' },
  'Partial':      { label: 'Partial', cls: 'gap-status-partial' },
  'Gap':          { label: 'Gap',    cls: 'gap-status-gap' },
};

const PRIORITY_META = {
  Critical: { cls: 'gap-priority-critical' },
  High:     { cls: 'gap-priority-high' },
  Medium:   { cls: 'gap-priority-medium' },
  Low:      { cls: 'gap-priority-low' },
};

const LABEL_META = {
  'Strong Fit':  { cls: 'gap-label-strong' },
  'Good Fit':    { cls: 'gap-label-good' },
  'Partial Fit': { cls: 'gap-label-partial' },
  'Weak Fit':    { cls: 'gap-label-weak' },
};

export default function GapDashboard({ onExit }) {
  const [state, setState] = useState('loading'); // loading | no-context | error | done
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [openGap, setOpenGap] = useState(null);

  useEffect(() => {
    async function run() {
      // 1. Load context files
      let context;
      try {
        const r = await fetch('/api/load-context');
        context = r.ok ? await r.json() : null;
      } catch {
        context = null;
      }

      if (!context?.resume || !context?.jobDescription) {
        setState('no-context');
        return;
      }

      // 2. Run analysis
      try {
        const r = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume: context.resume, jobDescription: context.jobDescription }),
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Analysis failed.');
        setData(json);
        setState('done');
      } catch (err) {
        setErrorMsg(err.message);
        setState('error');
      }
    }
    run();
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="gap-screen">
        <div className="gap-loading">
          <div className="gap-spinner" />
          <p>Analyzing your fit&hellip;</p>
          <span>Comparing resume against job requirements</span>
        </div>
      </div>
    );
  }

  // ── No context ───────────────────────────────────────────────────────────────
  if (state === 'no-context') {
    return (
      <div className="gap-screen">
        <div className="gap-empty">
          <p className="gap-empty-icon">📄</p>
          <h2>No context files loaded</h2>
          <p>Add your resume and the job description to <code>context/</code> to run a skill gap analysis.</p>
          <button className="gap-back-btn" onClick={onExit}>&larr; Back</button>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="gap-screen">
        <div className="gap-empty">
          <p className="gap-empty-icon">⚠</p>
          <h2>Analysis failed</h2>
          <p>{errorMsg}</p>
          <button className="gap-back-btn" onClick={onExit}>&larr; Back</button>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const { verdict, company_context, match_scores, matrix, gaps, strengths, prep_plan } = data;
  const labelMeta = LABEL_META[match_scores?.label] || LABEL_META['Partial Fit'];

  // Group matrix by category
  const byCategory = {};
  (matrix || []).forEach(row => {
    const cat = row.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(row);
  });

  return (
    <div className="gap-screen">
      {/* Header */}
      <div className="gap-header">
        <button className="gap-exit-btn" onClick={onExit}>&larr; Back</button>
        <span className="gap-header-title">Skill Gap Analysis</span>
        <span />
      </div>

      <div className="gap-body">

        {/* ── Hero: Match Score ── */}
        <div className="gap-hero">
          <div className="gap-scores">
            <div className="gap-score-item">
              <span className="gap-score-num">{match_scores?.raw || '—'}</span>
              <span className="gap-score-label">Raw match</span>
            </div>
            <div className="gap-score-divider" />
            <div className="gap-score-item">
              <span className="gap-score-num">{match_scores?.weighted || '—'}</span>
              <span className="gap-score-label">Weighted match</span>
            </div>
            <div className="gap-score-divider" />
            <div className="gap-score-item">
              <span className={`gap-fit-label ${labelMeta.cls}`}>{match_scores?.label || '—'}</span>
              <span className="gap-score-label">Overall fit</span>
            </div>
          </div>
          {verdict && <p className="gap-verdict">{verdict}</p>}
          {match_scores?.summary && <p className="gap-score-summary">{match_scores.summary}</p>}
        </div>

        {/* ── Company Context ── */}
        {company_context && (
          <div className="gap-card">
            <h3 className="gap-card-title">About this role</h3>
            <p className="gap-card-body">{company_context}</p>
          </div>
        )}

        {/* ── Skills Matrix ── */}
        {matrix?.length > 0 && (
          <div className="gap-card">
            <h3 className="gap-card-title">Skills matrix</h3>
            <div className="gap-matrix">
              {Object.entries(byCategory).map(([cat, rows]) => (
                <div key={cat} className="gap-matrix-group">
                  <div className="gap-matrix-category">{cat}</div>
                  {rows.map((row, i) => {
                    const sm = STATUS_META[row.status] || { label: row.status, cls: '' };
                    return (
                      <div key={i} className="gap-matrix-row">
                        <span className={`gap-matrix-status ${sm.cls}`}>{sm.label}</span>
                        <div className="gap-matrix-content">
                          <span className="gap-matrix-req">{row.requirement}</span>
                          {row.notes && <span className="gap-matrix-notes">{row.notes}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Gaps ── */}
        {gaps?.length > 0 && (
          <div className="gap-card">
            <h3 className="gap-card-title">Gaps to address</h3>
            <div className="gap-gaps">
              {gaps.map((g, i) => {
                const pm = PRIORITY_META[g.priority] || PRIORITY_META.Low;
                const isOpen = openGap === i;
                return (
                  <div key={i} className={`gap-gap-item ${isOpen ? 'gap-gap-open' : ''}`}>
                    <button
                      className="gap-gap-header"
                      onClick={() => setOpenGap(isOpen ? null : i)}
                    >
                      <div className="gap-gap-header-left">
                        <span className={`gap-priority-badge ${pm.cls}`}>{g.priority}</span>
                        <span className="gap-gap-name">{g.name}</span>
                      </div>
                      <span className="gap-gap-chevron">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div className="gap-gap-body">
                        <div className="gap-gap-section">
                          <span className="gap-gap-section-label">Why it matters</span>
                          <p>{g.why_it_matters}</p>
                        </div>
                        <div className="gap-gap-section">
                          <span className="gap-gap-section-label">How to bridge it</span>
                          <p>{g.bridge}</p>
                        </div>
                        {g.say_this && (
                          <div className="gap-gap-section gap-gap-talktack">
                            <span className="gap-gap-section-label">Say this in the interview</span>
                            <p>&ldquo;{g.say_this}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Strengths ── */}
        {strengths?.length > 0 && (
          <div className="gap-card">
            <h3 className="gap-card-title">What you bring</h3>
            <div className="gap-strengths">
              {strengths.map((s, i) => (
                <div key={i} className="gap-strength-item">
                  <span className="gap-strength-skill">{s.skill}</span>
                  <span className="gap-strength-evidence">{s.evidence}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Prep Plan ── */}
        {prep_plan?.length > 0 && (
          <div className="gap-card">
            <h3 className="gap-card-title">Prep plan</h3>
            <div className="gap-prep">
              {prep_plan.map((item, i) => (
                <div key={i} className="gap-prep-item">
                  <span className="gap-prep-timeframe">{item.timeframe}</span>
                  <span className="gap-prep-task">{item.task}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
