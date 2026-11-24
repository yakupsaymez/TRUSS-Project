import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');

export const ANTIGRAVITY_RULE_MAX_BYTES = 24000;
export const ANTIGRAVITY_RULES_BUDGET_TOKENS = 20000;
export const AGENT_MD_MAX_LINES = 55;
export const AI_LINE_LIMITS = {
  '.ai/PROGRESS.md': 120,
  '.ai/ENGINEERING_GUARDRAILS.md': 140,
  '.ai/SWARM_PLAYBOOK.md': 150,
  '.ai/ARCHITECTURE_MAP.md': 160,
  '.ai/DECISIONS.md': 180,
  '.ai/skills/caveman.md': 50,
  '.ai/HANDOFF_TEMPLATE.md': 60,
};

const countLines = (c) => (!c ? 0 : c.endsWith('\n') ? c.split('\n').length - 1 : c.split('\n').length);
const estTokens = (bytes) => Math.ceil(bytes / 4);

function walkFiles(rootDir, relSubDir, filterFn = () => true) {
  const base = path.join(rootDir, relSubDir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && filterFn(full)) out.push(path.relative(rootDir, full).replace(/\\/g, '/'));
    }
  };
  visit(base);
  return out.sort((a, b) => a.localeCompare(b));
}

function readMetrics(rootDir, relPath) {
  const full = path.join(rootDir, relPath);
  if (!fs.existsSync(full)) return null;
  const content = fs.readFileSync(full, 'utf8');
  const bytes = Buffer.byteLength(content, 'utf8');
  return { path: relPath, content, lines: countLines(content), bytes, tokens: estTokens(bytes) };
}

export function parseFrontmatter(content) {
  const match = String(content ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const data = {};
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const raw = rawVal.trim();
    if (/^[>|][+-]?$/.test(raw)) {
      const block = [];
      let baseIndent = null;
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (/^[A-Za-z0-9_-]+\s*:/.test(next)) break;
        if (!next.trim()) { block.push(''); i += 1; continue; }
        const ind = next.match(/^(\s+)/);
        if (!ind) break;
        if (baseIndent === null) baseIndent = ind[1].length;
        block.push(next.slice(Math.min(baseIndent, ind[1].length)));
        i += 1;
      }
      data[key] = raw.startsWith('>') ? block.map((l) => l.trim()).filter(Boolean).join(' ') : block.join('\n').trim();
    } else if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
      const inner = raw.slice(1, -1);
      data[key] = raw.startsWith("'") ? inner.replace(/''/g, "'") : inner.replace(/\\"/g, '"');
    } else {
      data[key] = raw;
    }
  }
  return data;
}

export function auditContext(rootDir = ROOT_DIR) {
  const ceilingViolations = [];
  const always_on = [];
  const glob_rules = [];
  const progressive_metadata = [];
  const canonical_memory = [];
  const drift_alerts = [];
  const addViolation = (category, p, rule, detail) => ceilingViolations.push({ category, path: p, rule, detail });

  const agentsFile = readMetrics(rootDir, 'AGENTS.md');
  if (!agentsFile) {
    addViolation('always_on', 'AGENTS.md', 'missing-file', 'AGENTS.md missing');
  } else {
    const okBytes = agentsFile.bytes <= ANTIGRAVITY_RULE_MAX_BYTES;
    if (!okBytes) addViolation('always_on', 'AGENTS.md', 'max-bytes', `${agentsFile.bytes} > ${ANTIGRAVITY_RULE_MAX_BYTES}`);
    always_on.push({ path: 'AGENTS.md', trigger: 'always_on', lines: agentsFile.lines, bytes: agentsFile.bytes, tokens: agentsFile.tokens, ok: okBytes });
  }

  for (const rel of walkFiles(rootDir, '.agent/rules', (p) => p.endsWith('.md'))) {
    const m = readMetrics(rootDir, rel);
    const fm = parseFrontmatter(m.content);
    const trigger = fm.trigger || 'always_on';
    const isGlob = trigger === 'glob' || trigger === 'model_decision';
    const cat = isGlob ? 'glob_rules' : 'always_on';
    const okBytes = m.bytes <= ANTIGRAVITY_RULE_MAX_BYTES;
    const okLines = m.lines <= AGENT_MD_MAX_LINES;
    if (!okBytes) addViolation(cat, rel, 'max-bytes', `${m.bytes} > ${ANTIGRAVITY_RULE_MAX_BYTES}`);
    if (!okLines) addViolation(cat, rel, 'max-lines', `${m.lines} > ${AGENT_MD_MAX_LINES}`);
    (isGlob ? glob_rules : always_on).push({ path: rel, trigger, globs: fm.globs || null, lines: m.lines, bytes: m.bytes, tokens: m.tokens, ok: okBytes && okLines });
  }

  const progPaths = [
    ...walkFiles(rootDir, '.agent/skills', (p) => path.basename(p) === 'SKILL.md'),
    ...walkFiles(rootDir, '.agent/agents', (p) => p.endsWith('.md')),
  ];
  for (const rel of progPaths) {
    const m = readMetrics(rootDir, rel);
    const fm = parseFrontmatter(m.content);
    const hasMeta = Boolean(fm.name && fm.description);
    const metaBytes = hasMeta ? Buffer.byteLength(`${fm.name}: ${fm.description}`, 'utf8') : 0;
    const okLines = m.lines <= AGENT_MD_MAX_LINES;
    if (!okLines) addViolation('progressive_metadata', rel, 'max-lines', `${m.lines} > ${AGENT_MD_MAX_LINES}`);
    if (!hasMeta) addViolation('progressive_metadata', rel, 'missing-frontmatter', 'name and description required');
    progressive_metadata.push({ path: rel, kind: rel.startsWith('.agent/agents/') ? 'agent' : 'skill', name: fm.name || null, metaBytes, metaTokens: estTokens(metaBytes), lines: m.lines, bytes: m.bytes, tokens: m.tokens, ok: okLines && hasMeta });
  }

  for (const [rel, limit] of Object.entries(AI_LINE_LIMITS)) {
    const m = readMetrics(rootDir, rel);
    if (!m) {
      addViolation('canonical_memory', rel, 'missing-file', 'Missing canonical file');
      canonical_memory.push({ path: rel, exists: false, lines: 0, limit, bytes: 0, tokens: 0, ok: false });
    } else {
      const ok = m.lines <= limit;
      if (!ok) addViolation('canonical_memory', rel, 'max-lines', `${m.lines} > ${limit}`);
      canonical_memory.push({ path: rel, exists: true, lines: m.lines, limit, bytes: m.bytes, tokens: m.tokens, ok });
    }
  }

  for (const rel of walkFiles(rootDir, '.agent/workflows')) {
    drift_alerts.push({ type: 'legacy-workflow', path: rel, message: 'Legacy .agent/workflows file present' });
  }
  for (const rel of walkFiles(rootDir, 'skills', (p) => p.endsWith('.md'))) {
    const m = readMetrics(rootDir, rel);
    drift_alerts.push({ type: 'root-skills', path: rel, lines: m.lines, bytes: m.bytes, tokens: m.tokens, message: `${m.bytes} B (~${m.tokens} tok)` });
  }
  for (const rel of walkFiles(rootDir, '.agent/skills', (p) => p.includes('/references/') && p.endsWith('.md'))) {
    const m = readMetrics(rootDir, rel);
    if (m.lines > AGENT_MD_MAX_LINES) {
      drift_alerts.push({ type: 'reference-over-55', path: rel, lines: m.lines, bytes: m.bytes, tokens: m.tokens, message: `${m.lines} lines > ${AGENT_MD_MAX_LINES}` });
    }
  }

  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
  const alwaysOnTokens = sum(always_on, 'tokens');
  const metaTokens = sum(progressive_metadata, 'metaTokens');
  const summary = {
    alwaysOnBytes: sum(always_on, 'bytes'),
    alwaysOnTokens,
    rulesBudgetTokens: ANTIGRAVITY_RULES_BUDGET_TOKENS,
    rulesBudgetPct: +((alwaysOnTokens / ANTIGRAVITY_RULES_BUDGET_TOKENS) * 100).toFixed(2),
    globRulesBytes: sum(glob_rules, 'bytes'),
    globRulesTokens: sum(glob_rules, 'tokens'),
    progressiveMetadataBytes: sum(progressive_metadata, 'metaBytes'),
    progressiveMetadataTokens: metaTokens,
    progressiveFullBytes: sum(progressive_metadata, 'bytes'),
    progressiveFullTokens: sum(progressive_metadata, 'tokens'),
    baselineTurnOverheadTokens: alwaysOnTokens + metaTokens,
    canonicalBootBytes: sum(canonical_memory, 'bytes'),
    canonicalBootTokens: sum(canonical_memory, 'tokens'),
    ceilingViolationCount: ceilingViolations.length,
    driftAlertCount: drift_alerts.length,
  };
  return { summary, always_on, glob_rules, progressive_metadata, canonical_memory, ceilingViolations, drift_alerts };
}

function printReport(r) {
  const row = (cols, w) => cols.map((c, i) => String(c).padEnd(w[i])).join(' | ');
  console.log('\n=== TRUSS AI CONTEXT AUDIT (OPS-5) ===\n\n[1] Always-On & Glob Rules');
  const w1 = [34, 14, 7, 8, 7, 6];
  console.log(row(['PATH', 'TRIGGER', 'LINES', 'BYTES', 'TOK', 'OK'], w1));
  for (const x of [...r.always_on, ...r.glob_rules]) console.log(row([x.path, x.trigger, x.lines, x.bytes, x.tokens, x.ok ? 'PASS' : 'FAIL'], w1));
  console.log('\n[2] Progressive Metadata (.agent/skills & .agent/agents)');
  const w2 = [42, 7, 7, 8, 8, 7, 6];
  console.log(row(['PATH', 'KIND', 'LINES', 'META_B', 'META_T', 'FULL_T', 'OK'], w2));
  for (const x of r.progressive_metadata) console.log(row([x.path, x.kind, x.lines, x.metaBytes, x.metaTokens, x.tokens, x.ok ? 'PASS' : 'FAIL'], w2));
  console.log('\n[3] Canonical .ai/* Memory');
  const w3 = [34, 10, 8, 7, 6];
  console.log(row(['PATH', 'LINES/LIM', 'BYTES', 'TOK', 'OK'], w3));
  for (const x of r.canonical_memory) console.log(row([x.path, `${x.lines}/${x.limit}`, x.bytes, x.tokens, x.ok ? 'PASS' : 'FAIL'], w3));
  const s = r.summary;
  console.log('\n[4] Summary');
  console.log(`Always-On Tokens vs 20,000 budget % : ${s.alwaysOnTokens} / ${s.rulesBudgetTokens} (${s.rulesBudgetPct}%)`);
  console.log(`Progressive Metadata Tokens          : ${s.progressiveMetadataTokens} tok (${s.progressiveMetadataBytes} B; full=${s.progressiveFullTokens} tok)`);
  console.log(`Baseline Turn Overhead (Always+Meta) : ${s.baselineTurnOverheadTokens} tok`);
  console.log(`Canonical .ai/* Full Boot Read       : ${s.canonicalBootTokens} tok (${s.canonicalBootBytes} B)`);
  console.log(`Ceiling Violations                   : ${s.ceilingViolationCount}`);
  for (const v of r.ceilingViolations) console.log(`  FAIL [${v.category}] ${v.path} (${v.rule}): ${v.detail}`);
  console.log(`Drift Alerts                         : ${s.driftAlertCount}`);
  for (const d of r.drift_alerts) console.log(`  WARN [${d.type}] ${d.path}: ${d.message}`);
  console.log('');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  const report = auditContext(ROOT_DIR);
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (args.includes('--strict') && report.ceilingViolations.length > 0) process.exit(1);
}
