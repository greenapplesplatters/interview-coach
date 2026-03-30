# Interview Coach

An AI-powered interview practice app. Select a company and interview style, then go head-to-head with an AI interviewer that probes your answers, pushes for specifics, and — when you ask — coaches you on how to answer better.

Built with React 19, Vite, Vercel Serverless Functions, and Google Gemini.

---

## Features

- **4 interview styles** — Behavioral (STAR), Technical, HR Screen, Stress Test
- **Resume + JD context** — drop your resume and the job posting into `context/` and the AI asks questions tailored to your actual background and the role requirements
- **Coaching mode** — click "💡 Coach me on that" at any point to get a breakdown of what the interviewer is looking for and how to structure your answer
- **Session persistence** — sessions save to localStorage and can be resumed across page reloads (7-day expiry)
- **Streaming responses** — AI responses stream token-by-token like a real chat
- **Security** — rate limiting, injection detection, strike/lockout system

---

## Quick Start

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy it — you'll need it in the next step

### 2. Deploy to Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Fork or clone this repo and push it to GitHub
2. Import the repo into [Vercel](https://vercel.com)
3. During setup, add an environment variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your API key from step 1
4. Deploy — Vercel runs `npm install` and `npm run build` automatically

That's it. No other configuration needed.

### 3. Local Development

```bash
# Install dependencies
npm install

# Add your API key
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=your_key_here

# Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`. API calls proxy to `http://localhost:3000` via the Vite dev server config, but **local API execution requires the Vercel CLI**:

```bash
npm install -g vercel
vercel dev
```

Or just deploy to Vercel and use that URL for testing — it's faster.

---

## Customizing Companies

Open `src/components/SetupScreen.jsx` and edit the `COMPANIES` array at the top of the file:

```js
const COMPANIES = [
  {
    id: 'companyA',
    icon: '🖥️',
    label: 'Company A',       // Display name on the button
    role: 'Software Engineer', // Role the AI will interview for
    company: 'Company A',      // Company name injected into the AI prompt
    color: '#3b82f6',          // Accent color for the button
  },
  // Add more entries here...
];
```

The AI uses `role` and `company` to tailor every question — so "Software Engineer at Acme Corp" will get different questions than "DevOps Engineer at Apex Cloud".

---

## Interview Styles

| Style | What it does |
|---|---|
| 🎯 **Behavioral** | STAR-method questions ("Tell me about a time when..."), probes for Situation, Task, Action, Result |
| 💻 **Technical** | Role-appropriate technical questions, pushes for tradeoffs, scale, and reasoning depth |
| 🏢 **HR Screen** | Classic screening — motivation, fit, strengths/weaknesses, company research |
| 😈 **Stress Test** | Adversarial. Challenges vague answers. Curveball questions. Simulates a hostile panel |

---

## Coaching Mode

At any point during the interview, click **💡 Coach me on that** (above the input box) or type something like:

> "Can you coach me on that?" / "What are you looking for?" / "How should I structure my answer?"

The AI will step out of interview mode and give you:
1. What a strong answer for this specific question conveys
2. What the interviewer is evaluating (the signal they're looking for)
3. A STAR breakdown or answer structure guide where applicable

Then it returns to the interview and invites you to try again.

---

## Personalizing with Your Resume and Job Description

The app ships with demo content so it works out of the box. To practice for a real interview, replace the files in the `context/` directory:

```
context/
├── job_description.txt   ← paste the job posting here
└── resume.txt            ← paste your resume here
```

Open each file in a text editor, delete everything below the dashed line, and paste in your content. Plain text is fine — no formatting needed.

The AI will use your resume and the job description to ask targeted questions about **your specific experience** and the **requirements of the actual role**. Without these files, it falls back to generic role-based questions.

The setup screen shows a status indicator confirming which files are loaded before you start the interview.

---

## Project Structure

```
interview-coach/
├── api/
│   ├── interview.js        # Vercel serverless function — AI streaming endpoint
│   └── load-context.js     # Reads context/ files and returns them to the frontend
├── context/
│   ├── job_description.txt # Paste the job posting here
│   └── resume.txt          # Paste your resume here
├── src/
│   ├── App.jsx             # Top-level state: setup → interview
│   ├── main.jsx            # React entry point
│   ├── index.css           # Global reset and base styles
│   └── components/
│       ├── SetupScreen.jsx # Company + style picker (edit COMPANIES here)
│       ├── SetupScreen.css
│       ├── InterviewChat.jsx # Chat UI, session management, streaming
│       └── InterviewChat.css
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .env.example
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key from AI Studio |

Set this in Vercel's project dashboard under **Settings → Environment Variables**. For local dev, copy `.env.example` to `.env.local`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, plain CSS |
| Build | Vite 8 |
| Backend | Vercel Serverless Functions (Node.js ESM) |
| AI | Google Gemini (`gemini-3.1-flash-lite-preview`) |
| Storage | `localStorage` only — no database |
