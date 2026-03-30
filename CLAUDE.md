# Interview Coach — Claude Code Instructions

## What This App Is

A focused AI interview practice app. The user picks a company and interview style, then the AI plays a live interviewer — probing answers, pushing for specifics, and switching into coaching mode when asked. No flashcards, no multi-mode learning system. Just the interview loop.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, plain CSS (no frameworks) |
| Build | Vite 8 |
| Backend | Vercel Serverless Functions / Express (Node.js ESM) |
| AI | Model-agnostic — Gemini, OpenAI, or Anthropic via `api/ai-adapter.js` |
| Storage | `localStorage` only |
| Deployment | Vercel or local Express server |

## AI Provider

The app is model-agnostic. Provider is controlled by `.env.local`:

```
AI_PROVIDER=gemini | openai | anthropic   # auto-detected from key if omitted
AI_MODEL=<model-id>                        # optional override
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

Default models: `gemini-3.1-flash-lite-preview` / `gpt-4o-mini` / `claude-haiku-4-5-20251001`

All AI calls route through `api/ai-adapter.js`. To add a new provider, add a case in that file — no changes to `interview.js` or `analyze.js` needed.

---

## File Structure

```
interview-coach/
├── api/
│   ├── interview.js        # Serverless function — all AI logic lives here
│   └── load-context.js     # Reads context/ files, returns JSON to frontend
├── context/
│   ├── job_description.txt # Paste the job posting here
│   └── resume.txt          # Paste your resume here
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

## Resume + Job Description Context

Drop files into `context/` to give the AI your background and the job requirements. The interviewer will ask targeted questions based on your actual experience and the role spec.

```
context/
├── job_description.txt   ← paste the job posting here
└── resume.txt            ← paste your resume here
```

### How it works

1. `api/load-context.js` (GET `/api/load-context`) reads both files at startup
2. `SetupScreen.jsx` fetches this on mount and shows a status banner (✓ loaded / ⚠ missing)
3. Context is passed from `SetupScreen` → `App` → `InterviewChat` → `api/interview.js`
4. `api/interview.js` prepends a `CANDIDATE CONTEXT` block to the system prompt when present, instructing the AI to draw on the JD and resume

### Rules

- Content is truncated to 3000 chars each before injection (prevents prompt bloat)
- Files with only the placeholder text (`[Paste job description here]`) are treated as empty — no context injected
- Neither file is required — the AI falls back to generic role-based questions when absent
- For local dev: paste content, run `vercel dev`. For Vercel deployment: commit the files to the repo.

---

## Common Tasks

| Task | Where to edit |
|---|---|
| Add a company | `src/components/SetupScreen.jsx` → `COMPANIES` array |
| Change interview style names/icons | `src/components/SetupScreen.jsx` → `STYLES` array + `src/components/InterviewChat.jsx` → `STYLE_META` |
| Edit what the AI asks | `api/interview.js` → the relevant `build*Prompt()` function |
| Edit coaching instructions | `api/interview.js` → `COACHING MODE` block in each prompt |
| Add/update resume or JD | `context/job_description.txt` and `context/resume.txt` |
| Change session expiry (default 7 days) | `InterviewChat.jsx` → `SESSION_MAX_AGE` |
| Change max message history | `InterviewChat.jsx` → `SESSION_MAX_MESSAGES` and `api/interview.js` → `MAX_HISTORY_LENGTH` |
| Add a custom domain to CORS | `api/interview.js` → `ALLOWED_ORIGINS` |
