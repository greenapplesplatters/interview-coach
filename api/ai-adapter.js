/**
 * Model-agnostic AI adapter.
 *
 * Configure via .env.local:
 *   AI_PROVIDER=gemini | openai | anthropic     (auto-detected from key if omitted)
 *   AI_MODEL=<model-id>                          (optional — falls back to provider default)
 *   GEMINI_API_KEY=...
 *   OPENAI_API_KEY=...
 *   ANTHROPIC_API_KEY=...
 *
 * Default models:
 *   gemini    → gemini-3.1-flash-lite-preview
 *   openai    → gpt-4o-mini
 *   anthropic → claude-haiku-4-5-20251001
 */

const DEFAULT_MODELS = {
  gemini:    'gemini-3.1-flash-lite-preview',
  openai:    'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
};

function detectProvider() {
  if (process.env.GEMINI_API_KEY)    return 'gemini';
  if (process.env.OPENAI_API_KEY)    return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

export function getConfig() {
  const provider = (process.env.AI_PROVIDER || '').toLowerCase() || detectProvider();
  if (!provider) {
    throw new Error('No AI provider configured. Set AI_PROVIDER and the corresponding API key in .env.local');
  }
  if (!DEFAULT_MODELS[provider]) {
    throw new Error(`Unknown AI_PROVIDER "${provider}". Valid values: gemini, openai, anthropic`);
  }
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];
  const keyMap = { gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };
  const apiKey = process.env[keyMap[provider]];
  if (!apiKey) {
    throw new Error(`${keyMap[provider]} is not set. Add it to .env.local`);
  }
  return { provider, model, apiKey };
}

// ── Streaming chat ─────────────────────────────────────────────────────────────
// history: [{ role: 'user' | 'assistant', content: string }]
// Writes SSE chunks to res. Caller is responsible for setting SSE headers
// and writing the final [DONE] / closing the response.

export async function streamChat({ systemPrompt, history, res, maxTokens = 400 }) {
  const { provider, model, apiKey } = getConfig();
  if (provider === 'gemini')    return _streamGemini   ({ systemPrompt, history, res, maxTokens, model, apiKey });
  if (provider === 'openai')    return _streamOpenAI   ({ systemPrompt, history, res, maxTokens, model, apiKey });
  if (provider === 'anthropic') return _streamAnthropic({ systemPrompt, history, res, maxTokens, model, apiKey });
}

// ── Non-streaming text generation ─────────────────────────────────────────────
// Returns the raw text response as a string.

export async function generateText({ prompt, maxTokens = 2000 }) {
  const { provider, model, apiKey } = getConfig();
  if (provider === 'gemini')    return _generateGemini   ({ prompt, maxTokens, model, apiKey });
  if (provider === 'openai')    return _generateOpenAI   ({ prompt, maxTokens, model, apiKey });
  if (provider === 'anthropic') return _generateAnthropic({ prompt, maxTokens, model, apiKey });
}

// ── Gemini ─────────────────────────────────────────────────────────────────────

async function _streamGemini({ systemPrompt, history, res, maxTokens, model, apiKey }) {
  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey });

  const contents = history.length > 0
    ? history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    : [{ role: 'user', parts: [{ text: 'Begin.' }] }];

  const stream = await client.models.generateContentStream({
    model,
    config: { systemInstruction: systemPrompt, maxOutputTokens: maxTokens },
    contents,
  });

  for await (const chunk of stream) {
    const text = chunk.text ?? '';
    if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
  }
}

async function _generateGemini({ prompt, maxTokens, model, apiKey }) {
  const { GoogleGenAI } = await import('@google/genai');
  const client = new GoogleGenAI({ apiKey });
  const result = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { maxOutputTokens: maxTokens },
  });
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── OpenAI ─────────────────────────────────────────────────────────────────────

async function _streamOpenAI({ systemPrompt, history, res, maxTokens, model, apiKey }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history.length > 0
      ? history.map(m => ({ role: m.role, content: m.content }))
      : [{ role: 'user', content: 'Begin.' }]),
  ];

  const stream = await client.chat.completions.create({ model, messages, stream: true, max_tokens: maxTokens });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
  }
}

async function _generateOpenAI({ prompt, maxTokens, model, apiKey }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });
  const result = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });
  return result.choices[0]?.message?.content || '';
}

// ── Anthropic ──────────────────────────────────────────────────────────────────

async function _streamAnthropic({ systemPrompt, history, res, maxTokens, model, apiKey }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const messages = history.length > 0
    ? history.map(m => ({ role: m.role, content: m.content }))
    : [{ role: 'user', content: 'Begin.' }];

  const stream = await client.messages.create({ model, system: systemPrompt, messages, stream: true, max_tokens: maxTokens });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      const text = event.delta.text || '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
}

async function _generateAnthropic({ prompt, maxTokens, model, apiKey }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const result = await client.messages.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });
  return result.content[0]?.text || '';
}
