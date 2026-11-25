import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT_DIR, '.ai', 'gate-baseline.json');

export const DEFAULT_EXEMPT_PATHS = [
  'Backend/scripts/seedKatalog.js',
  'Frontend/src/components/ui/**',
];

function isExemptPath(relPath, exemptPaths = DEFAULT_EXEMPT_PATHS) {
  const norm = relPath.replace(/\\/g, '/');
  for (const pattern of exemptPaths) {
    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      if (norm === prefix || norm.startsWith(`${prefix}/`)) return true;
    } else if (norm === pattern) {
      return true;
    }
  }
  return false;
}

function walkFiles(dirPath, filterFn, acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, filterFn, acc);
    } else if (entry.isFile() && filterFn(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function toRel(fullPath) {
  return path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
}

function countLines(content) {
  if (!content) return 0;
  const lines = content.split('\n');
  return content.endsWith('\n') ? lines.length - 1 : lines.length;
}

/**
 * Pure function 1: Scan semantic theme & brand hygiene on file content.
 */
export function scanThemeHygiene(content) {
  const violations = [];
  const lines = String(content ?? '').split('\n');

  const rgbaRe = /\brgba?\s*\(/i;
  const hslaRe = /\bhsla?\s*\(/i;
  const legacyPaletteRe =
    /(?:^|[\s"'`:])(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|decoration|shadow)-(?:zinc|slate|purple|violet|emerald|amber|rose|truss)(?:-[\w/]+)?\b/;
  const legacyTrussTokenRe = /\btruss-(?:bg|surface|purple|text|muted|border)\b/;
  const blur3xlRe = /(?:^|[\s"'`:])blur-3xl\b/;
  const hexColorRe =
    /(?<![\w/$-])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F\w-])/;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const lineNo = i + 1;

    if (rgbaRe.test(rawLine)) {
      violations.push({ line: lineNo, rule: 'raw-rgb', match: rawLine.match(rgbaRe)[0] });
    }
    if (hslaRe.test(rawLine)) {
      violations.push({ line: lineNo, rule: 'raw-hsl', match: rawLine.match(hslaRe)[0] });
    }
    if (legacyPaletteRe.test(rawLine)) {
      violations.push({
        line: lineNo,
        rule: 'legacy-palette',
        match: rawLine.match(legacyPaletteRe)[0].trim(),
      });
    }
    if (legacyTrussTokenRe.test(rawLine)) {
      violations.push({
        line: lineNo,
        rule: 'legacy-truss-token',
        match: rawLine.match(legacyTrussTokenRe)[0],
      });
    }
    if (blur3xlRe.test(rawLine)) {
      violations.push({ line: lineNo, rule: 'heavy-blur-3xl', match: 'blur-3xl' });
    }

    const strippedHrefTo = rawLine
      .replace(/href\s*=\s*["']#[^"']*["']/g, '')
      .replace(/to\s*=\s*["']#[^"']*["']/g, '');

    if (hexColorRe.test(strippedHrefTo)) {
      violations.push({
        line: lineNo,
        rule: 'raw-hex-color',
        match: strippedHrefTo.match(hexColorRe)[0],
      });
    }
  }

  return violations;
}

/**
 * Pure function 2: Scan forbidden imports and browser dialogs on file content.
 */
export function scanForbiddenImports(content) {
  const violations = [];
  const text = String(content ?? '');
  const lines = text.split('\n');

  const rules = [
    { name: 'use-client-directive', re: /^\s*['"]use client['"]\s*;?/ },
    { name: 'next-import', re: /from\s+['"]next\// },
    { name: 'sonner-import', re: /from\s+['"]sonner['"]/ },
    { name: 'legacy-ui-calendar', re: /components\/ui\/calendar/ },
    { name: 'dead-package-import', re: /from\s+['"](?:react-toastify|mapbox-gl|leaflet)['"]/ },
    { name: 'native-browser-dialog', re: /\bwindow\.(?:confirm|alert)\s*\(/ },
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;
    for (const rule of rules) {
      const m = line.match(rule.re);
      if (m) {
        violations.push({ line: lineNo, rule: rule.name, match: m[0].trim() });
      }
    }
  }

  return violations;
}

/**
 * Pure function 3: Evaluate file line limits and ratchet rules against baseline.
 */
export function evaluateLineRatchet(
  fileLineMap,
  baselineFiles = {},
  options = { maxNewFileLines: 600, warnFileLines: 300, exemptPaths: DEFAULT_EXEMPT_PATHS }
) {
  const maxNewFileLines = options?.maxNewFileLines ?? 600;
  const warnFileLines = options?.warnFileLines ?? 300;
  const exemptPaths = options?.exemptPaths ?? DEFAULT_EXEMPT_PATHS;

  const failures = [];
  const warnings = [];
  const shrinkHints = [];

  const entries =
    fileLineMap instanceof Map ? Array.from(fileLineMap.entries()) : Object.entries(fileLineMap || {});

  for (const [relPath, lines] of entries) {
    if (isExemptPath(relPath, exemptPaths)) continue;

    const baselineLimit =
      baselineFiles && Object.prototype.hasOwnProperty.call(baselineFiles, relPath)
        ? baselineFiles[relPath]
        : undefined;

    if (typeof baselineLimit === 'number') {
      if (lines > baselineLimit) {
        failures.push({
          file: relPath,
          lines,
          limit: baselineLimit,
          reason: `Ratchet violated: ${lines} > baseline ${baselineLimit} (+${lines - baselineLimit})`,
        });
      } else if (lines < baselineLimit) {
        shrinkHints.push({
          file: relPath,
          lines,
          limit: baselineLimit,
          reason: `Shrunk ${baselineLimit} -> ${lines} (run with --update-baseline to lock in)`,
        });
      }
    } else if (lines > maxNewFileLines) {
      failures.push({
        file: relPath,
        lines,
        limit: maxNewFileLines,
        reason: `Exceeds hard limit: ${lines} > ${maxNewFileLines}`,
      });
    } else if (lines > warnFileLines) {
      warnings.push({
        file: relPath,
        lines,
        limit: warnFileLines,
        reason: `Warning zone (${warnFileLines + 1}-${maxNewFileLines}): ${lines} lines`,
      });
    }
  }

  const status = failures.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS';
  return { status, failures, warnings, shrinkHints };
}

/**
 * Pure function 4: Compute next baseline tightening only downwards (ratchet).
 */
export function computeNextBaseline(currentBaseline, fileLineMap, measuredMaxChunkKb = null) {
  const isInitial = !currentBaseline || typeof currentBaseline !== 'object';
  const maxNewFileLines = currentBaseline?.maxNewFileLines ?? 600;
  const warnFileLines = currentBaseline?.warnFileLines ?? 300;
  const targetChunkKb = currentBaseline?.targetChunkKb ?? 450;
  const exemptPaths = currentBaseline?.exemptPaths ?? DEFAULT_EXEMPT_PATHS;
  const prevFiles = currentBaseline?.files ?? {};

  const entries =
    fileLineMap instanceof Map ? Array.from(fileLineMap.entries()) : Object.entries(fileLineMap || {});
  const currentMap = new Map(entries);

  const nextFilesUnsorted = {};

  if (isInitial) {
    for (const [relPath, lines] of currentMap.entries()) {
      if (isExemptPath(relPath, exemptPaths)) continue;
      if (lines > warnFileLines) {
        nextFilesUnsorted[relPath] = lines;
      }
    }
  } else {
    for (const [relPath, prevLimit] of Object.entries(prevFiles)) {
      if (isExemptPath(relPath, exemptPaths)) continue;
      if (!currentMap.has(relPath)) continue;
      const measuredLines = currentMap.get(relPath);
      const tightened = Math.min(prevLimit, measuredLines);
      if (tightened > warnFileLines) {
        nextFilesUnsorted[relPath] = tightened;
      }
    }
    for (const [relPath, lines] of currentMap.entries()) {
      if (isExemptPath(relPath, exemptPaths)) continue;
      if (Object.prototype.hasOwnProperty.call(nextFilesUnsorted, relPath)) continue;
      if (lines > warnFileLines && !Object.prototype.hasOwnProperty.call(prevFiles, relPath)) {
        nextFilesUnsorted[relPath] = lines;
      }
    }
  }

  const sortedFiles = {};
  for (const key of Object.keys(nextFilesUnsorted).sort()) {
    sortedFiles[key] = nextFilesUnsorted[key];
  }

  let nextMaxChunkKb = currentBaseline?.maxChunkKb ?? 550;
  if (typeof measuredMaxChunkKb === 'number' && Number.isFinite(measuredMaxChunkKb) && measuredMaxChunkKb > 0) {
    const initialCeiling = Math.ceil(measuredMaxChunkKb + 25);
    if (isInitial || typeof currentBaseline?.maxChunkKb !== 'number') {
      nextMaxChunkKb = initialCeiling;
    } else {
      const tightenedCeiling = Math.ceil(measuredMaxChunkKb);
      nextMaxChunkKb = Math.min(currentBaseline.maxChunkKb, tightenedCeiling);
    }
  }

  return {
    maxNewFileLines,
    warnFileLines,
    targetChunkKb,
    maxChunkKb: nextMaxChunkKb,
    exemptPaths,
    files: sortedFiles,
  };
}

function collectSourceFileLines() {
  const feFiles = walkFiles(
    path.join(ROOT_DIR, 'Frontend', 'src'),
    (p) => p.endsWith('.js') || p.endsWith('.jsx')
  );
  const beFiles = walkFiles(path.join(ROOT_DIR, 'Backend'), (p) => p.endsWith('.js'));
  const fileLineMap = {};

  for (const fullPath of [...feFiles, ...beFiles]) {
    const rel = toRel(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    fileLineMap[rel] = countLines(content);
  }
  return fileLineMap;
}

function measureDistMaxChunkKb() {
  const assetsDir = path.join(ROOT_DIR, 'Frontend', 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) return { maxChunkKb: 0, maxChunkFile: null };

  let maxBytes = 0;
  let maxFile = null;
  for (const name of fs.readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue;
    const full = path.join(assetsDir, name);
    const stat = fs.statSync(full);
    if (stat.size > maxBytes) {
      maxBytes = stat.size;
      maxFile = name;
    }
  }
  return {
    maxChunkKb: +(maxBytes / 1024).toFixed(1),
    maxChunkFile: maxFile,
  };
}

function runCli() {
  const args = new Set(process.argv.slice(2));
  const isFast = args.has('--fast');
  const shouldUpdateBaseline = args.has('--update-baseline');

  const existingBaseline = fs.existsSync(BASELINE_PATH)
    ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
    : null;

  const fileLineMap = collectSourceFileLines();
  const gateResults = [];

  // If --update-baseline is passed and baseline doesn't exist yet, run build first (unless --fast) to measure chunk
  let buildDurationMs = 0;
  let buildError = null;
  let measuredChunk = { maxChunkKb: 0, maxChunkFile: null };

  if (!isFast) {
    const t0 = Date.now();
    try {
      execSync('npm --prefix Frontend run build', {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      measuredChunk = measureDistMaxChunkKb();
    } catch (err) {
      buildError = err.stderr ? err.stderr.toString().trim() : err.message;
    }
    buildDurationMs = Date.now() - t0;
  }

  let activeBaseline = existingBaseline;
  if (shouldUpdateBaseline) {
    activeBaseline = computeNextBaseline(
      existingBaseline,
      fileLineMap,
      measuredChunk.maxChunkKb > 0 ? measuredChunk.maxChunkKb : null
    );
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(activeBaseline, null, 2)}\n`, 'utf8');
  } else if (!activeBaseline) {
    activeBaseline = computeNextBaseline(null, fileLineMap, measuredChunk.maxChunkKb || 550);
  }

  // Gate 1: Line Limit + Ratchet
  {
    const t0 = Date.now();
    const res = evaluateLineRatchet(fileLineMap, activeBaseline.files, activeBaseline);
    const details = [
      ...res.failures.map((f) => `${f.file}:${f.lines} (${f.reason})`),
      ...res.warnings.slice(0, 5).map((w) => `${w.file}:${w.lines} (${w.reason})`),
      ...res.shrinkHints.map((h) => `${h.file}:${h.lines} (${h.reason})`),
    ];
    if (res.warnings.length > 5) {
      details.push(`...and ${res.warnings.length - 5} more warning-zone files (301-600 lines)`);
    }
    gateResults.push({
      id: '1. Line Limit & Ratchet',
      status: res.status,
      ms: Date.now() - t0,
      summary: `${res.failures.length} fail, ${res.warnings.length} warn, ${res.shrinkHints.length} shrinkable`,
      details: res.failures.length > 0 ? res.failures.map((f) => `${f.file}:${f.lines} (${f.reason})`) : details,
    });
  }

  // Gate 2: Semantic Theme & Brand Hygiene
  {
    const t0 = Date.now();
    const isJsOrJsx = (p) => p.endsWith('.js') || p.endsWith('.jsx');
    const targetSet = new Set([
      ...walkFiles(path.join(ROOT_DIR, 'Frontend', 'src', 'pages', 'v2'), isJsOrJsx),
      ...walkFiles(path.join(ROOT_DIR, 'Frontend', 'src', 'pages', 'home'), isJsOrJsx),
      ...walkFiles(path.join(ROOT_DIR, 'Frontend', 'src', 'components', 'v2'), isJsOrJsx),
      ...walkFiles(path.join(ROOT_DIR, 'Frontend', 'src', 'utils'), isJsOrJsx),
    ]);
    const homePage = path.join(ROOT_DIR, 'Frontend', 'src', 'pages', 'HomePage.jsx');
    if (fs.existsSync(homePage)) targetSet.add(homePage);
    const targets = Array.from(targetSet);

    const violations = [];
    for (const fullPath of targets) {
      const rel = toRel(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const v of scanThemeHygiene(content)) {
        violations.push(`${rel}:${v.line} [${v.rule}] ${v.match}`);
      }
    }
    gateResults.push({
      id: '2. Semantic Theme Hygiene',
      status: violations.length > 0 ? 'FAIL' : 'PASS',
      ms: Date.now() - t0,
      summary: `${targets.length} v2/home/utils files scanned, ${violations.length} violations`,
      details: violations,
    });
  }

  // Gate 3: Forbidden Imports & Browser Dialogs
  {
    const t0 = Date.now();
    const feFiles = walkFiles(
      path.join(ROOT_DIR, 'Frontend', 'src'),
      (p) => (p.endsWith('.js') || p.endsWith('.jsx')) && !isExemptPath(toRel(p), activeBaseline.exemptPaths)
    );
    const violations = [];
    for (const fullPath of feFiles) {
      const rel = toRel(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const v of scanForbiddenImports(content)) {
        violations.push(`${rel}:${v.line} [${v.rule}] ${v.match}`);
      }
    }
    gateResults.push({
      id: '3. Forbidden Imports & Dialogs',
      status: violations.length > 0 ? 'FAIL' : 'PASS',
      ms: Date.now() - t0,
      summary: `${feFiles.length} files scanned, ${violations.length} violations`,
      details: violations,
    });
  }

  // Gate 4: Backend Syntax
  {
    const t0 = Date.now();
    const beFiles = walkFiles(path.join(ROOT_DIR, 'Backend'), (p) => p.endsWith('.js'));
    const errors = [];
    for (const fullPath of beFiles) {
      try {
        execFileSync(process.execPath, ['--check', fullPath], { stdio: 'pipe' });
      } catch (err) {
        errors.push(`${toRel(fullPath)}:1 [syntax-error] ${(err.stderr || err.message).toString().split('\n')[0]}`);
      }
    }
    gateResults.push({
      id: '4. Backend Syntax (node --check)',
      status: errors.length > 0 ? 'FAIL' : 'PASS',
      ms: Date.now() - t0,
      summary: `${beFiles.length} Backend JS files checked`,
      details: errors,
    });
  }

  // Gate 5: Frontend Build + Chunk Ratchet
  {
    if (isFast) {
      gateResults.push({
        id: '5. Frontend Build & Chunk Budget',
        status: 'SKIP',
        ms: 0,
        summary: 'SKIP (--fast)',
        details: [],
      });
    } else if (buildError) {
      gateResults.push({
        id: '5. Frontend Build & Chunk Budget',
        status: 'FAIL',
        ms: buildDurationMs,
        summary: 'vite build failed',
        details: [buildError],
      });
    } else {
      const { maxChunkKb, maxChunkFile } = measuredChunk;
      const limitKb = activeBaseline.maxChunkKb;
      const targetKb = activeBaseline.targetChunkKb ?? 450;
      const overLimit = maxChunkKb > limitKb;
      const overTarget = maxChunkKb > targetKb;
      gateResults.push({
        id: '5. Frontend Build & Chunk Budget',
        status: overLimit ? 'FAIL' : overTarget ? 'WARN' : 'PASS',
        ms: buildDurationMs,
        summary: `largest=${maxChunkKb} KB (${maxChunkFile || 'n/a'}) | ceiling=${limitKb} KB | targetChunkKb=${targetKb} KB`,
        details: overLimit
          ? [`Frontend/dist/assets/${maxChunkFile}:1 ${maxChunkKb} KB exceeds ceiling ${limitKb} KB`]
          : [],
      });
    }
  }

  // Gate 6: Dead Page Check
  {
    const t0 = Date.now();
    const pageFiles = walkFiles(
      path.join(ROOT_DIR, 'Frontend', 'src', 'pages'),
      (p) => p.endsWith('.js') || p.endsWith('.jsx')
    );
    const allFeFiles = walkFiles(
      path.join(ROOT_DIR, 'Frontend', 'src'),
      (p) => p.endsWith('.js') || p.endsWith('.jsx')
    );
    const contentsByFile = new Map(
      allFeFiles.map((full) => [full, fs.readFileSync(full, 'utf8')])
    );

    const deadPages = [];
    for (const pageFull of pageFiles) {
      const baseName = path.basename(pageFull, path.extname(pageFull));
      let referenced = false;
      for (const [otherFull, content] of contentsByFile.entries()) {
        if (otherFull === pageFull) continue;
        if (content.includes(baseName)) {
          referenced = true;
          break;
        }
      }
      if (!referenced) {
        deadPages.push(`${toRel(pageFull)}:1 [dead-page] Not referenced anywhere in Frontend/src/**`);
      }
    }
    gateResults.push({
      id: '6. Dead Page Check',
      status: deadPages.length > 0 ? 'FAIL' : 'PASS',
      ms: Date.now() - t0,
      summary: `${pageFiles.length} pages verified, ${deadPages.length} dead`,
      details: deadPages,
    });
  }

  // Gate 7: .ai/PROGRESS.md Freshness Reminder
  {
    const t0 = Date.now();
    let gitStatus = '';
    try {
      gitStatus = execSync('git status --short', {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      gitStatus = '';
    }

    const statusLines = gitStatus ? gitStatus.split('\n') : [];
    const hasCodeChange = statusLines.some((l) => /\b(?:Frontend|Backend)\//.test(l));
    const hasProgressUpdate = statusLines.some((l) => l.includes('.ai/PROGRESS.md'));

    const needWarn = hasCodeChange && !hasProgressUpdate;
    gateResults.push({
      id: '7. PROGRESS.md Freshness',
      status: needWarn ? 'WARN' : 'PASS',
      ms: Date.now() - t0,
      summary: needWarn
        ? 'Frontend/Backend modified without .ai/PROGRESS.md update'
        : 'Clean or .ai/PROGRESS.md updated',
      details: needWarn ? ['.ai/PROGRESS.md:1 Remember to record sprint delta before final commit'] : [],
    });
  }

  // Print Summary Table
  console.log('\n=== TRUSS AI QUALITY GATE (OPS-2) ===');
  console.log(
    `${'GATE'.padEnd(34)} | ${'STATUS'.padEnd(6)} | ${'TIME'.padStart(7)} | SUMMARY`
  );
  console.log('-'.repeat(100));
  for (const g of gateResults) {
    console.log(
      `${g.id.padEnd(34)} | ${g.status.padEnd(6)} | ${`${g.ms}ms`.padStart(7)} | ${g.summary}`
    );
    for (const d of g.details) {
      console.log(`   -> ${d}`);
    }
  }
  console.log('-'.repeat(100));

  const failCount = gateResults.filter((g) => g.status === 'FAIL').length;
  const warnCount = gateResults.filter((g) => g.status === 'WARN').length;
  console.log(
    `RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'} (${failCount} failed, ${warnCount} warnings)${
      shouldUpdateBaseline ? ' [baseline updated]' : ''
    }\n`
  );

  process.exit(failCount > 0 ? 1 : 0);
}

const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runCli();
