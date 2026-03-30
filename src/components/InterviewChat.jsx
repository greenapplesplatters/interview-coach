import React, { useState, useEffect, useRef } from 'react';
import './InterviewChat.css';

const MAX_INPUT_LENGTH = 500;

const INJECTION_PATTERNS = [
  /(ignore|disregard|forget|override|skip|drop|cancel|delete|erase|wipe|clear)\s+.{0,30}(instructions|rules|prompt|guidelines|directives|constraints|boundaries|limitations|programming)/i,
  /you\s+are\s+now\s+(a|an|my)\s+/i,
  /act\s+as\s+(a|an|my|if)\s+/i,
  /pretend\s+(you('re|\s+are)\s+|to\s+be\s+)/i,
  /new\s+(instructions|rules|prompt|role|persona)/i,
  /system\s*prompt/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /bypass\s+(your|the|all)\s+(rules|filters|restrictions|limitations|guidelines)/i,
  /enter\s+.{0,20}mode/i,
  /switch\s+(to|into)\s+.{0,20}mode/i,
  /from\s+now\s+on/i,
  /for\s+the\s+rest\s+of\s+(this|our)\s+(conversation|chat|session)/i,
  /respond\s+(only\s+)?(in|with|as)/i,
  /\brole\s*play/i,
  /stop\s+being\s+(a\s+)?socratic/i,
  /you\s+must\s+obey/i,
  /I\s+command\s+you/i,
];

function detectInjection(text) {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

const MAX_STRIKES = 2;
const LOCKOUT_KEY = 'interview_lockout';
const LOCKOUT_DURATION = 15 * 60 * 1000;

function isLockedOut() {
  try {
    const lockout = localStorage.getItem(LOCKOUT_KEY);
    if (!lockout) return false;
    const expiry = JSON.parse(lockout);
    if (Date.now() < expiry) return true;
    localStorage.removeItem(LOCKOUT_KEY);
    return false;
  } catch { return false; }
}

function setLockout() {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(Date.now() + LOCKOUT_DURATION));
}

const SESSION_PREFIX = 'interview_session_';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_MESSAGES = 76;

function getSessionKey(role, style) {
  return SESSION_PREFIX + role.toLowerCase().replace(/\s+/g, '_') + '_' + style;
}

function saveSession(role, style, msgs) {
  try {
    const trimmed = msgs.slice(-SESSION_MAX_MESSAGES);
    localStorage.setItem(
      getSessionKey(role, style),
      JSON.stringify({ messages: trimmed, savedAt: Date.now() })
    );
  } catch { /* storage full — degrade gracefully */ }
}

function loadSession(role, style) {
  try {
    const raw = localStorage.getItem(getSessionKey(role, style));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > SESSION_MAX_AGE) {
      localStorage.removeItem(getSessionKey(role, style));
      return null;
    }
    return data.messages;
  } catch { return null; }
}

function clearSession(role, style) {
  localStorage.removeItem(getSessionKey(role, style));
}

function buildApiHistory(msgs) {
  const mapped = msgs.map(m => ({ role: m.role, content: m.content }));
  if (mapped.length <= SESSION_MAX_MESSAGES) return mapped;
  return [mapped[0], ...mapped.slice(-(SESSION_MAX_MESSAGES - 1))];
}

const STYLE_META = {
  behavioral: { icon: '🎯', label: 'Behavioral', avatarLabel: 'B', color: '#3b82f6' },
  technical:  { icon: '💻', label: 'Technical',  avatarLabel: 'T', color: '#8b5cf6' },
  hr:         { icon: '🏢', label: 'HR Screen',  avatarLabel: 'H', color: '#10b981' },
  stress:     { icon: '😈', label: 'Stress Test', avatarLabel: 'S', color: '#ef4444' },
};

export default function InterviewChat({ role, company, style, context, onExit }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [terminated, setTerminated] = useState(false);
  const [pendingResume, setPendingResume] = useState(null);
  const strikesRef = useRef(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const meta = STYLE_META[style] || STYLE_META.behavioral;
  const accentColor = meta.color;

  useEffect(() => {
    if (isLockedOut()) setTerminated(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (!streaming && messages.length > 0) {
      saveSession(role, style, messages);
    }
  }, [streaming, messages, role, style]);

  useEffect(() => {
    const saved = loadSession(role, style);
    if (saved && saved.length > 0) {
      setPendingResume(saved);
    } else {
      setMessages([]);
      askAI([]);
    }
  }, [role, style]);

  async function askAI(history) {
    setStreaming(true);
    setError(null);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company, style, history, context }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.error === 'session_terminated') {
          setLockout();
          setTerminated(true);
          return;
        }
        if (errData.error === 'injection_blocked') {
          strikesRef.current += 1;
          if (strikesRef.current >= MAX_STRIKES) {
            setLockout();
            setTerminated(true);
            return;
          }
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: `${errData.message}\n\nStrike ${strikesRef.current} of ${MAX_STRIKES}. One more and this session ends.`,
            };
            return updated;
          });
          return;
        }
        if (response.status === 429) {
          strikesRef.current += 1;
          if (strikesRef.current >= MAX_STRIKES) {
            setLockout();
            setTerminated(true);
            return;
          }
        }
        throw new Error(errData.error || `Server error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text, error: streamErr } = JSON.parse(payload);
            if (streamErr) throw new Error(streamErr);
            if (text) {
              full += text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: full };
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return;
    let sanitized = input.trim();
    if (sanitized.length > MAX_INPUT_LENGTH) sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);

    if (detectInjection(sanitized)) {
      strikesRef.current += 1;
      if (strikesRef.current >= MAX_STRIKES) {
        setLockout();
        setTerminated(true);
        return;
      }
      const blocked = { role: 'user', content: sanitized };
      const refusal = {
        role: 'assistant',
        content: `That looks like an attempt to change my instructions. I'm your interviewer for the ${role} role — nothing else. This is strike ${strikesRef.current} of ${MAX_STRIKES}. One more and this session ends.\n\nLet's continue with the interview:`,
      };
      setMessages(prev => [...prev, blocked, refusal]);
      setInput('');
      return;
    }

    const userMessage = { role: 'user', content: sanitized };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    await askAI(buildApiHistory(updatedHistory));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // -- Session terminated --
  if (terminated) {
    return (
      <div className="interview-select">
        <div className="interview-select-header">
          <h1 className="interview-title" style={{ color: '#ef4444' }}>Session Terminated</h1>
          <span className="interview-subtitle">
            Interview Coach has been locked due to repeated policy violations. Try again in 15 minutes.
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button className="interview-exit-btn" onClick={onExit} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
            &larr; Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // -- Resume prompt --
  if (pendingResume) {
    return (
      <div className="interview-select">
        <div className="interview-select-header">
          <h1 className="interview-title">Continue Session?</h1>
          <span className="interview-subtitle">
            You have a saved interview session for{' '}
            <strong style={{ color: accentColor }}>{role}</strong>
            {company ? ` at ${company}` : ''} ({pendingResume.length} messages).
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button
            className="interview-action-btn"
            style={{ '--accent': accentColor }}
            onClick={() => { setMessages(pendingResume); setPendingResume(null); }}
          >
            Continue
          </button>
          <button
            className="interview-action-btn"
            style={{ '--accent': '#6b7280' }}
            onClick={() => {
              clearSession(role, style);
              setPendingResume(null);
              setMessages([]);
              askAI([]);
            }}
          >
            Start Fresh
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="interview-exit-btn" onClick={onExit}>
            &larr; Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // -- Chat view --
  return (
    <div className="interview-chat">
      {/* Header */}
      <div className="interview-header" style={{ '--accent': accentColor }}>
        <button className="interview-exit-btn" onClick={onExit}>&larr; Exit</button>
        <div className="interview-header-center">
          <span className="interview-header-style">{meta.icon} {meta.label}</span>
          <span className="interview-header-role" style={{ color: accentColor }}>
            {role}{company ? ` · ${company}` : ''}
          </span>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Messages */}
      <div className="interview-messages">
        {messages.length === 0 && !streaming && !error && (
          <div className="interview-loading">
            <span className="interview-dot-pulse" />
            <span className="interview-dot-pulse" />
            <span className="interview-dot-pulse" />
          </div>
        )}

        {error && (
          <div className="interview-error">{error}</div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`interview-bubble-wrap ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="interview-avatar" style={{ background: accentColor }}>
                {meta.avatarLabel}
              </div>
            )}
            <div
              className={`interview-bubble ${msg.role}`}
              style={msg.role === 'assistant' ? { '--accent': accentColor } : {}}
            >
              {msg.content}
              {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                <span className="interview-cursor" />
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Coach me quick action */}
      {messages.length > 0 && !streaming && (
        <div className="interview-quick-actions">
          <button
            className="interview-coach-btn"
            onClick={() => {
              const msg = "Can you coach me on that question? What are you looking for, and how should I structure my answer?";
              const userMessage = { role: 'user', content: msg };
              const updatedHistory = [...messages, userMessage];
              setMessages(updatedHistory);
              askAI(buildApiHistory(updatedHistory));
            }}
          >
            💡 Coach me on that
          </button>
        </div>
      )}

      {/* Input */}
      <div className="interview-input-bar">
        <textarea
          ref={inputRef}
          className="interview-input"
          placeholder="Your answer — speak as you would in a real interview..."
          value={input}
          maxLength={MAX_INPUT_LENGTH}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={streaming}
        />
        <button
          className="interview-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || streaming}
          style={{ background: accentColor }}
        >
          &uarr;
        </button>
      </div>
    </div>
  );
}
