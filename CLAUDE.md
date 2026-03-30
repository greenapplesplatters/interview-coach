# Interview Coach — Claude Code Instructions

## What This App Is

A focused AI interview practice app. The user picks a company and interview style, then the AI plays a live interviewer — probing answers, pushing for specifics, and switching into coaching mode when asked. No flashcards, no multi-mode learning system. Just the interview loop.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, plain CSS (no frameworks) |
| Build | Vite 8 |
| Backend | Vercel Serverless Functions (Node.js ESM) |
| AI | Google Gemini via `@google/genai` |
| Storage | `localStorage` only |
| Deployment | Vercel |

**Do NOT switch to the Anthropic SDK or any Claude model inside this app.** Gemini is intentional.

---

## File Structure

```
interview-coach/
├── api/
│   └── interview.js        # Serverless function — all AI logic lives here
├── src/
│   ├── App.jsx             # Two states: 'setup' → 'interview'
│   ├── main.jsx            # React entry point
│   ├── index.css           # Global reset only
│   └── components/
│       ├── SetupScreen.jsx # Edit COMPANIES array here to add/change companies
│       ├── SetupScreen.css
│       ├── InterviewChat.jsx  # Chat UI, session persistence, streaming, coaching button
│       └── InterviewChat.css
├── index.html
├── package.json
├── vite.config.js          # build: { minify: 'terser' } — terser must be in devDeps
├── vercel.json             # rewrites + maxDuration: 30 (required for streaming)
└── .env.example
```

---

## Adding or Changing Companies

Open `src/components/SetupScreen.jsx` and edit the `COMPANIES` array at the top:

```js
const COMPANIES = [
  {
    id: 'companyA',          // unique string, no spaces
    icon: '🖥️',              // emoji shown on the card
    label: 'Company A',      // display name
    role: 'Software Engineer', // role injected into AI prompt
    company: 'Company A',    // company name injected into AI prompt
    color: '#3b82f6',        // hex accent color for the card
  },
];
```

The AI uses `role` and `company` to tailor every question. "Software Engineer at Acme" gets different questions than "DevOps Engineer at Apex Cloud". No other files need changing.

---

## Changing Interview Prompts

All 4 prompts are in `api/interview.js`:
- `buildBehavioralPrompt(role, company)` — STAR method interviewer
- `buildTechnicalPrompt(role, company)` — system design / depth interviewer
- `buildHRPrompt(role, company)` — screening / fit interviewer
- `buildStressPrompt(role, company)` — adversarial pressure-test interviewer

Each prompt has three sections:
1. **Interviewer persona + method** — how they behave normally
2. **COACHING MODE** — what to provide when the user asks for coaching
3. **BOUNDARY RULES** — what to refuse / how to handle off-topic requests

When editing prompts, keep the `[STUDENT_ANSWER_START]` / `[STUDENT_ANSWER_END]` delimiter reference in BOUNDARY RULES — these wrap user messages on the server side and are part of the injection defense.

---

## Dependency Rules

**Do not change these versions without checking peer deps:**

```json
"@google/genai": "^1.46.0"   ← minimum for models.generateContentStream
"@vitejs/plugin-react": "^6.0.1"  ← requires vite ^8.0.0
"vite": "^8.0.0"
"terser": "^5.46.1"          ← required by build: { minify: 'terser' }
"react": "^19.2.4"
"react-dom": "^19.2.4"
```

**AI model:** always `gemini-3.1-flash-lite-preview`. Do not use `gemini-2.0-flash` — it may not be available on all API keys.

---

## Environment Variables

| Variable | Where |
|---|---|
| `GEMINI_API_KEY` | Vercel dashboard → Settings → Environment Variables |

Never commit `.env.local`. Never hardcode the key. The serverless function reads `process.env.GEMINI_API_KEY`.

---

## Deployment

Vercel auto-deploys on push to `main`. No manual build step needed. Ensure:
- `GEMINI_API_KEY` is set in Vercel project settings
- `vercel.json` has `"maxDuration": 30` — default 10s cuts off streaming responses

For local dev, use `vercel dev` (requires Vercel CLI) so the serverless function runs locally and picks up `.env.local`.

---

## Security — Do Not Remove

`api/interview.js` contains security layers that must stay intact:

| Layer | What it does |
|---|---|
| `INJECTION_PATTERNS` | 19 regex patterns blocking prompt injection attempts |
| `strikeMap` + `recordStrike` | 2-strike lockout system (15 min) per IP |
| `checkRateLimit` | 15 requests/min per IP |
| Body size check | Rejects payloads > 50KB |
| `ALLOWED_ORIGINS` | CORS allowlist (vercel.app + localhost) |
| `[STUDENT_ANSWER_START/END]` | Wraps user messages to prevent instruction injection |

If adding a custom domain, add it to `ALLOWED_ORIGINS` in `api/interview.js`.

---

## Coaching Mode

The `💡 Coach me on that` button in `InterviewChat.jsx` sends a hardcoded coaching request message. The system prompts in `api/interview.js` each have a `COACHING MODE` block that instructs the AI to provide:
1. What a strong answer conveys
2. What the interviewer is specifically evaluating
3. STAR breakdown or answer structure guide

This is prompt-driven — no separate API endpoint needed.

---

## Common Tasks

| Task | Where to edit |
|---|---|
| Add a company | `src/components/SetupScreen.jsx` → `COMPANIES` array |
| Change interview style names/icons | `src/components/SetupScreen.jsx` → `STYLES` array + `src/components/InterviewChat.jsx` → `STYLE_META` |
| Edit what the AI asks | `api/interview.js` → the relevant `build*Prompt()` function |
| Edit coaching instructions | `api/interview.js` → `COACHING MODE` block in each prompt |
| Change session expiry (default 7 days) | `InterviewChat.jsx` → `SESSION_MAX_AGE` |
| Change max message history | `InterviewChat.jsx` → `SESSION_MAX_MESSAGES` and `api/interview.js` → `MAX_HISTORY_LENGTH` |
| Add a custom domain to CORS | `api/interview.js` → `ALLOWED_ORIGINS` |
