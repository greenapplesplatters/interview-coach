# Interview Coach — ChatGPT Workflow

## How ChatGPT Fits Into This Project

ChatGPT cannot run code or deploy this app, but it's useful for:
- Generating new company configurations and role setups
- Writing and refining interview question banks
- Drafting or stress-testing system prompts before you paste them into code
- Reviewing component logic and suggesting improvements
- Explaining AWS/DevOps/security concepts to improve question quality

Paste the relevant section of this file into ChatGPT at the start of any session to give it full context.

---

## Project Context (paste this into ChatGPT)

```
I'm working on an AI interview practice app called Interview Coach.

Tech stack: React 19, Vite, Vercel serverless functions, Google Gemini API.

The app lets users pick a company and interview style (Behavioral, Technical, HR Screen,
or Stress Test), then practice against an AI interviewer that probes their answers and
can switch into coaching mode when asked.

Key files:
- src/components/SetupScreen.jsx — company/style picker. COMPANIES array at top controls options.
- src/components/InterviewChat.jsx — chat UI with session persistence and streaming.
- api/interview.js — serverless function. Contains system prompts for all 4 interview styles.

The AI model is Google Gemini (gemini-3.1-flash-lite-preview), not ChatGPT or Claude.
```

---

## Task: Generate New Company Configurations

Give ChatGPT this prompt to generate new entries for the `COMPANIES` array:

```
Generate 3 entries for a React COMPANIES array in an interview practice app.
Each needs these fields: id (kebab-case string), icon (emoji), label (short display name),
role (job title), company (company name), color (hex color).

I want to target these roles: [e.g., Data Engineer, ML Engineer, Product Manager]
Make companies sound like real but fictional mid-sized tech companies.
Examples: "Apex Data", "CloudCore Systems", "NexusAI".

Return only the JSON array, no explanation.
```

Paste the output into the `COMPANIES` array in `src/components/SetupScreen.jsx`.

---

## Task: Generate an Interview Question Bank

Use this prompt to build a question bank for any role:

```
Act as a senior interviewer preparing for a [ROLE] position.
Generate 10 [behavioral / technical / HR / stress test] interview questions.

For each question:
1. Write the question exactly as you'd ask it in a real interview
2. State what signal you're looking for (what a strong answer demonstrates)
3. Provide the STAR breakdown: what belongs in Situation, Task, Action, Result
   (skip STAR for technical/HR questions — give an answer structure instead)

Be specific. No generic questions. Target real challenges for this role.
```

---

## Task: Draft or Improve a System Prompt

Give ChatGPT the current prompt from `api/interview.js` and ask:

```
Here is the system prompt for a [behavioral / technical / HR / stress test] AI interviewer
for a [ROLE] position:

[paste the prompt here]

Review this prompt and suggest improvements for:
1. Making the interviewer more realistic and harder to satisfy with vague answers
2. Sharpening the coaching mode breakdown (is it specific enough per question type?)
3. Tightening the boundary rules to prevent off-topic responses
4. Any phrasing that might make the AI break character

Return the full improved prompt, ready to paste into code.
```

---

## Task: Generate Coaching Breakdowns for Specific Questions

If you want to pre-write coaching content for common questions:

```
For each of these interview questions, write a coaching breakdown:
1. [question 1]
2. [question 2]
3. [question 3]

For each, provide:
- WHAT TO CONVEY: the core message a strong answer communicates
- WHAT THE INTERVIEWER EVALUATES: the signal they're looking for
- STAR BREAKDOWN: one sentence per bucket (Situation / Task / Action / Result)
  describing what belongs there for this specific question

Keep each breakdown concise — it will be shown inline in a chat UI.
```

---

## Task: Code Review

Paste any component or function and ask:

```
Review this React component / serverless function from my interview practice app.
Look for:
1. Security issues (injection vulnerabilities, exposed data, insecure patterns)
2. Logic bugs
3. Performance problems (unnecessary re-renders, missing memoization)
4. Anything that would break on Vercel deployment

[paste code here]
```

---

## Task: Plan a New Feature

Ask ChatGPT to scope a feature before you start coding:

```
I want to add [feature] to my interview practice app.

Current architecture:
- React 19 frontend with useState-based screen routing (setup → interview)
- Vercel serverless function at /api/interview that streams Gemini responses via SSE
- No database — localStorage only
- No auth

The feature: [describe it]

Give me:
1. Which files need to change and what changes
2. Any new files needed
3. Risks or edge cases to watch out for
4. Whether this needs a new API endpoint or can use the existing one
```

---

## Task: Write a New Interview Style

To add a 5th interview style (e.g., "Panel Interview" or "Case Study"):

```
Write a system prompt for an AI interviewer conducting a [style] interview
for a "${role}" position at "${company}".

The prompt must follow this structure:
1. Persona — who the interviewer is
2. Method — how they ask questions and probe answers (bullet points)
3. COACHING MODE — what to provide when the candidate asks for coaching:
   a. What a strong answer conveys
   b. What you're evaluating
   c. Answer structure guide
4. BOUNDARY RULES — what to refuse and how to stay in character

Keep the persona realistic. The method section should make it hard for the candidate
to give vague or rehearsed answers. The coaching mode should be genuinely useful.
```

Then add the new style to:
- `VALID_STYLES` in `api/interview.js`
- `STYLES` array in `src/components/SetupScreen.jsx`
- `STYLE_META` object in `src/components/InterviewChat.jsx`

---

## What ChatGPT Cannot Do Here

- Run the app or call the Gemini API
- Read your actual codebase files (paste them manually)
- Deploy to Vercel
- Access your environment variables or API keys
- Test whether a prompt actually works (use Google AI Studio for that — see `GEMINI.md`)
