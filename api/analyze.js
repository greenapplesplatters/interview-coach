import { GoogleGenAI } from '@google/genai';

const MAX_BODY_SIZE = 50000;

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.com$/,
  'http://localhost:5173',
  'http://localhost:3000',
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(a => a instanceof RegExp ? a.test(origin) : a === origin);
}

function buildPrompt(resume, jobDescription) {
  return `You are a career strategist performing an honest, detailed skill gap analysis.

CANDIDATE RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Analyze the candidate's fit for this role. Be honest — if the fit is poor, say so clearly.
Return ONLY valid JSON. No markdown, no code blocks, no explanation. Just the JSON object.

Use this exact schema:
{
  "verdict": "one honest sentence assessing overall fit",
  "company_context": "2-3 sentences: what the company does, why this role exists, what makes it critical",
  "match_scores": {
    "raw": "XX%",
    "weighted": "XX%",
    "label": "Strong Fit | Good Fit | Partial Fit | Weak Fit",
    "summary": "one sentence explaining the gap between raw and weighted"
  },
  "matrix": [
    {
      "requirement": "specific named requirement from the JD",
      "category": "Core Technical | Domain Knowledge | Compliance | Tools | Soft Skills",
      "status": "Strong Match | Good Match | Partial | Gap",
      "notes": "one line: why this rating based on the resume"
    }
  ],
  "gaps": [
    {
      "name": "gap name",
      "priority": "Critical | High | Medium | Low",
      "why_it_matters": "why this specific gap matters for this specific role (not generic)",
      "bridge": "honest strategy — what the candidate can realistically do pre-interview",
      "say_this": "exact talk track for addressing this gap in an interview"
    }
  ],
  "strengths": [
    {
      "skill": "skill or experience area",
      "evidence": "specific evidence pulled from the resume"
    }
  ],
  "prep_plan": [
    {
      "timeframe": "Days 1-2",
      "task": "specific actionable prep task"
    }
  ]
}

Rules:
- Matrix must cover every named technology, framework, or methodology in the JD.
- Weight gaps by how much of the daily role they represent, not just JD prominence.
- Bridge strategies must be achievable before an interview. If not, say "longer-term."
- Strengths must cite the resume directly — no generic observations.
- Prep plan should be 5-7 items spanning 1-2 weeks.
- Return ONLY the JSON object.`;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const bodyStr = JSON.stringify(req.body);
  if (bodyStr.length > MAX_BODY_SIZE) return res.status(413).json({ error: 'Request too large.' });

  const { resume, jobDescription } = req.body;

  if (!resume || typeof resume !== 'string' || resume.trim().length < 50) {
    return res.status(400).json({ error: 'Resume is missing or too short.' });
  }
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 50) {
    return res.status(400).json({ error: 'Job description is missing or too short.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured.' });

  try {
    const client = new GoogleGenAI({ apiKey });
    const result = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: [{ role: 'user', parts: [{ text: buildPrompt(resume.slice(0, 4000), jobDescription.slice(0, 4000)) }] }],
      config: { maxOutputTokens: 2000 },
    });

    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if model wraps the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse analysis response.' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Analysis failed.' });
  }
}
