import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function runGit(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'N/A';
  }
}

function readSection(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    return `<!-- MISSING: ${relPath} -->`;
  }
  return fs.readFileSync(fullPath, 'utf8').trim();
}

const branch = runGit('branch --show-current');
const headSha = runGit('rev-parse --short HEAD');
const recentCommits = runGit('log --oneline -n 10');
const gitStatus = runGit('status --short') || '(clean working tree)';

const CORE_FILES = [
  'AGENTS.md',
  '.ai/PROGRESS.md',
  '.ai/SWARM_PLAYBOOK.md',
  '.ai/skills/caveman.md',
  '.ai/DECISIONS.md',
  '.ai/ARCHITECTURE_MAP.md',
];

const parts = [
  `# TRUSS — Universal AI Context Pack`,
  `- **Generated At:** ${new Date().toISOString()}`,
  `- **Git Branch:** \`${branch}\` (\`${headSha}\`)`,
  '',
  '---',
];

for (const relPath of CORE_FILES) {
  parts.push('');
  parts.push(`<!-- ==================== ${relPath} ==================== -->`);
  parts.push(readSection(relPath));
  parts.push('');
  parts.push('---');
}

parts.push('');
parts.push('## Git Snapshot');
parts.push('### Last 10 Commits (`git log --oneline -n 10`)');
parts.push('```text');
parts.push(recentCommits);
parts.push('```');
parts.push('');
parts.push('### Working Tree (`git status --short`)');
parts.push('```text');
parts.push(gitStatus);
parts.push('```');
parts.push('');

const output = parts.join('\n');
process.stdout.write(output);

const byteCount = Buffer.byteLength(output, 'utf8');
const estimatedTokens = Math.ceil(byteCount / 4);
process.stderr.write(
  `[truss:context-pack] Bytes: ${byteCount} | Estimated Tokens (~4B/tok): ~${estimatedTokens}\n`
);
