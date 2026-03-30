/**
 * Local Express server — use this to run the app on your own machine.
 *
 * Dev mode  (Vite hot-reload + API):  npm run dev
 * Standalone (built app + API):        npm start
 *
 * For Vercel deployment the api/ serverless functions are used instead —
 * this file is ignored by Vercel and has no effect on that path.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // matches Vite's default env file
dotenv.config();                        // fallback to .env if .env.local absent

import express from 'express';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import interviewHandler from './api/interview.js';
import loadContextHandler from './api/load-context.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// Forward the real IP when Express sits behind a proxy (e.g. nginx)
app.set('trust proxy', 1);

// ── API routes ────────────────────────────────────────────────────────────────
app.get('/api/load-context', loadContextHandler);
app.post('/api/interview', interviewHandler);

// ── Frontend ──────────────────────────────────────────────────────────────────
// In production mode (npm start) serve the Vite build output.
// In dev mode (npm run dev) Vite handles the frontend on its own port —
// this server only needs to answer /api requests.
if (isProd) {
  const distDir = join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')));
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  if (isProd) {
    console.log(`\nInterview Coach running at http://localhost:${PORT}\n`);
  } else {
    console.log(`\nAPI server running at http://localhost:${PORT}\n`);
  }
});
