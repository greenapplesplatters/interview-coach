import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readContext(filename) {
  try {
    const raw = readFileSync(join(__dirname, '..', 'context', filename), 'utf8');
    // Strip comment lines and check if there's real content
    const lines = raw.split('\n').filter(l => !l.startsWith('#'));
    const content = lines.join('\n').trim();
    return content || null;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const jobDescription = readContext('job_description.txt');
  const resume = readContext('resume.txt');

  res.status(200).json({ jobDescription, resume });
}
