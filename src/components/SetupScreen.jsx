import React, { useState, useEffect } from 'react';
import './SetupScreen.css';

// ── Customize these companies for your use case ───────────────────────────────
// Each entry maps a company button to a specific role the AI will interview for.
// Change the label, role, and color to match your target companies.
const COMPANIES = [
  {
    id: 'companyA',
    icon: '🖥️',
    label: 'Company A',
    role: 'Software Engineer',
    company: 'Company A',
    color: '#3b82f6',
  },
  {
    id: 'companyB',
    icon: '☁️',
    label: 'Company B',
    role: 'Cloud / DevOps Engineer',
    company: 'Company B',
    color: '#7c3aed',
  },
  {
    id: 'companyC',
    icon: '🔒',
    label: 'Company C',
    role: 'Cybersecurity Engineer',
    company: 'Company C',
    color: '#059669',
  },
];

const STYLES = [
  {
    id: 'behavioral',
    icon: '🎯',
    label: 'Behavioral',
    desc: 'STAR method. Tell me about a time when...',
    color: '#3b82f6',
  },
  {
    id: 'technical',
    icon: '💻',
    label: 'Technical',
    desc: 'System design, architecture, depth of knowledge.',
    color: '#8b5cf6',
  },
  {
    id: 'hr',
    icon: '🏢',
    label: 'HR Screen',
    desc: 'Fit, motivation, company research.',
    color: '#10b981',
  },
  {
    id: 'stress',
    icon: '😈',
    label: 'Stress Test',
    desc: 'Hostile. Skeptical. Will challenge everything.',
    color: '#ef4444',
  },
];

export default function SetupScreen({ onStart, onAnalyze }) {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [style, setStyle] = useState(null);
  const [context, setContext] = useState(null); // { jobDescription, resume }

  useEffect(() => {
    fetch('/api/load-context')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setContext(data); })
      .catch(() => {});
  }, []);

  const activeStyle = STYLES.find(s => s.id === style);

  function handleStart() {
    if (!selectedCompany || !style) return;
    onStart({
      role: selectedCompany.role,
      company: selectedCompany.company,
      style,
      context,
    });
  }

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-header">
          <h1 className="setup-title">Interview Coach</h1>
          <p className="setup-tagline">AI-powered interview practice. Real questions. Real pressure.</p>
        </div>

        {/* Context status banner */}
        {context !== null && (
          <div className="setup-context-banner">
            <div className="setup-context-top">
              <div className="setup-context-items">
                <span className={`setup-context-item ${context.jobDescription ? 'setup-context-loaded' : 'setup-context-missing'}`}>
                  {context.jobDescription ? '✓ Job description' : '⚠ No job description'}
                </span>
                <span className={`setup-context-item ${context.resume ? 'setup-context-loaded' : 'setup-context-missing'}`}>
                  {context.resume ? '✓ Resume' : '⚠ No resume'}
                </span>
              </div>
              <button className="setup-analyze-btn" onClick={onAnalyze}>
                📊 {context.jobDescription && context.resume ? 'Analyze my fit' : 'View demo analysis'}
              </button>
            </div>
            {(!context.jobDescription || !context.resume) && (
              <p className="setup-context-hint">
                Replace content in <code>context/</code> with your own for personalized questions.
              </p>
            )}
          </div>
        )}

        {/* Step 1: Company */}
        <div className="setup-field">
          <label className="setup-label">
            <span className="setup-step">1</span>
            Select Company
          </label>
          <div className="setup-company-grid">
            {COMPANIES.map(c => (
              <button
                key={c.id}
                type="button"
                className={`setup-company-card${selectedCompany?.id === c.id ? ' selected' : ''}`}
                style={{ '--company-color': c.color }}
                onClick={() => {
                  setSelectedCompany(selectedCompany?.id === c.id ? null : c);
                  setStyle(null);
                }}
              >
                <span className="setup-company-icon">{c.icon}</span>
                <span className="setup-company-name">{c.label}</span>
                <span className="setup-company-role">{c.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Interview Style — only shown after company is selected */}
        {selectedCompany && (
          <div className="setup-field setup-field-animate">
            <label className="setup-label">
              <span className="setup-step">2</span>
              Interview Style
            </label>
            <div className="setup-style-grid">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`setup-style-btn${style === s.id ? ' selected' : ''}`}
                  style={{ '--style-color': s.color }}
                  onClick={() => setStyle(s.id)}
                >
                  <span className="setup-style-icon">{s.icon}</span>
                  <span className="setup-style-label">{s.label}</span>
                  <span className="setup-style-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit — only shown after both are selected */}
        {selectedCompany && style && (
          <button
            type="button"
            className="setup-submit-btn"
            style={{ '--style-color': activeStyle?.color || '#3b82f6' }}
            onClick={handleStart}
          >
            Start Interview →
          </button>
        )}
      </div>
    </div>
  );
}
