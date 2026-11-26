import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const EDIT_RE = /^(edit_file|write_file|replace_file_content|multi_replace_file_content|run_command|bash|shell|cmd)/i;
const GRADES = ['A+', 'A', 'B', 'C', 'D'];

function parseArgs(argv) {
  const o = { dir: null, conv: null, limit: 5, json: false, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--dir' && argv[i + 1]) o.dir = argv[++i];
    else if (a.startsWith('--dir=')) o.dir = a.slice(6);
    else if (a === '--conv' && argv[i + 1]) o.conv = argv[++i];
    else if (a.startsWith('--conv=')) o.conv = a.slice(7);
    else if (a === '--limit' && argv[i + 1]) o.limit = Math.max(1, parseInt(argv[++i], 10) || 5);
    else if (a.startsWith('--limit=')) o.limit = Math.max(1, parseInt(a.slice(8), 10) || 5);
  }
  return o;
}

const DEC_1_MS = Date.parse('2026-12-01T00:00:00Z');
const toMs = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : (v ? Date.parse(v) || 0 : 0));
const fmtTok = (n) => (n < 1000 ? String(Math.round(n)) : n < 1e6 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${(n / 1e6).toFixed(2)}M`);
const fmtUsd = (u) => (u > 0 && u < 0.01 ? u.toFixed(4) : u.toFixed(2));

function stepCost(model, inp, cache, out, tsMs = 0) {
  const m = String(model || '');
  const p = /carbon|argon/i.test(m)
    ? (tsMs >= DEC_1_MS ? { i: 4.00, c: 0.20, o: 20.00 } : { i: 2.00, c: 0.10, o: 10.00 })
    : /hydrogen/i.test(m) ? { i: 1.50, c: 0.075, o: 7.50 }
      : /flash/i.test(m) ? { i: 0.30, c: 0.075, o: 2.50 }
        : /sonnet/i.test(m) ? { i: 2.00, c: 0.20, o: 10.00 }
          : /opus/i.test(m) ? { i: 4.00, c: 0.40, o: 20.00 }
            : { i: 3.00, c: 0.15, o: 15.00 };
  return (inp * p.i + cache * p.c + out * p.o) / 1_000_000;
}

function projectEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const tool_names = Array.isArray(raw.tool_calls) ? raw.tool_calls.map((tc) => tc?.name).filter(Boolean) : [];
  return {
    type: raw.type || null, created_at: raw.created_at || null, model: raw.model || null,
    input_tokens: Number(raw.input_tokens) || 0, cache_read_tokens: Number(raw.cache_read_tokens) || 0,
    output_tokens: Number(raw.output_tokens) || 0, tool_names,
  };
}

function applyStep(turn, ev) {
  const { input_tokens: inp, cache_read_tokens: cache, output_tokens: out, tool_names } = ev;
  if (inp + cache + out <= 0 && tool_names.length === 0) return;
  const stepCtx = inp + cache;
  turn.in += inp; turn.cache += cache; turn.out += out;
  turn.ctx = Math.max(turn.ctx, stepCtx); turn.steps += 1;
  turn.turn_usd += stepCost(ev.model, inp, cache, out, toMs(ev.created_at));
  for (const name of tool_names) {
    if (/browser/i.test(name)) turn.hasBrowserTool = true;
    if (EDIT_RE.test(name)) turn.hasEditCmd = true;
    if (/^invoke_subagent$/i.test(name)) turn.invokeSubagentCount += 1;
  }
}

function parseTranscript(rawText, onEvent) {
  let skipped = 0;
  for (const line of rawText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let ev;
    try { ev = projectEvent(JSON.parse(line)); } catch { skipped += 1; continue; }
    if (!ev) { skipped += 1; continue; }
    onEvent(ev);
  }
  return skipped;
}

function gradeTurn(t) {
  let env = { steps: 14, net: 95_000, usd: 0.45 };
  if (t.browser_steps > 0 || t.hasBrowserTool) env = { steps: 28, net: 220_000, usd: 0.95 };
  else if (t.subagents >= 2) env = { steps: 45, net: 320_000, usd: 1.35 };
  else if (t.hasEditCmd) env = { steps: 24, net: 160_000, usd: 0.65 };
  const ratio = Math.max(t.steps / env.steps, (t.in + t.out) / env.net, t.turn_usd / env.usd);
  let idx = ratio <= 0.75 ? 0 : ratio <= 1.05 ? 1 : ratio <= 1.35 ? 2 : ratio <= 1.75 ? 3 : 4;
  if (t.steps >= 4 && (t.in + t.cache) >= 20_000 && t.cache / (t.in + t.cache) < 0.30) idx = Math.max(idx, 2);
  if (t.ctx > 200_000) idx = Math.max(idx, 3);
  if (t.browser_steps > 15) idx = 4;
  return GRADES[idx];
}

function pickTurn(turns, { turn, turnIndex, ts }) {
  if (turn != null && Number.isFinite(Number(turn)) && turns[Number(turn) - 1]) return turns[Number(turn) - 1];
  if (turnIndex != null && Number.isFinite(Number(turnIndex)) && turns[Number(turnIndex)]) return turns[Number(turnIndex)];
  if (ts > 0) {
    let best = null;
    for (const t of turns) if (t.ts > 0 && t.ts <= ts) best = t;
    if (best) return best;
  }
  return turns[turns.length - 1];
}

function readOptional(filePath, allowPerm = false) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    if (allowPerm && (err.code === 'EPERM' || err.code === 'EACCES')) return null;
    throw err;
  }
}

function analyzeConv(convDir, dirMtimeMs) {
  const turns = [];
  const newTurn = (ts) => {
    const t = { index: turns.length + 1, ts, in: 0, cache: 0, out: 0, ctx: 0, steps: 0, browser_steps: 0, subagents: 0, hasBrowserTool: false, hasEditCmd: false, invokeSubagentCount: 0, turn_usd: 0 };
    turns.push(t); return t;
  };
  const ensureTurn = (ts = 0) => (turns.length ? turns[turns.length - 1] : newTurn(ts));
  let skipped_lines = 0;

  for (const p of [path.join(convDir, '.system_generated', 'logs', 'transcript.jsonl'), path.join(convDir, 'transcript.jsonl')]) {
    const raw = readOptional(p);
    if (raw === null) continue;
    skipped_lines += parseTranscript(raw, (ev) => {
      if (ev.type === 'USER_INPUT') newTurn(toMs(ev.created_at));
      applyStep(ensureTurn(toMs(ev.created_at)), ev);
    });
    break;
  }

  const subOwner = new Map(), seenSubs = new Set();
  for (const subDir of [path.join(convDir, 'subagents'), path.join(convDir, '.system_generated', 'subagents')]) {
    if (!fs.existsSync(subDir)) continue;
    for (const ent of fs.readdirSync(subDir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
      let m; try { m = JSON.parse(fs.readFileSync(path.join(subDir, ent.name), 'utf8')); } catch { continue; }
      if (!m || typeof m !== 'object') continue;
      const subId = String(m.id || m.conversationId || m.conversation_id || ent.name.slice(0, -5));
      if (seenSubs.has(subId)) continue;
      seenSubs.add(subId);
      const ts = toMs(m.created_at || m.started_at);
      const target = pickTurn(turns, { turn: m.turn, turnIndex: m.turn_index, ts }) || ensureTurn(ts);
      subOwner.set(subId, target); target.subagents += 1;
      const cands = [m.transcript_path || m.transcriptPath, path.join(convDir, 'subagents', subId, 'transcript.jsonl'),
        path.join(convDir, 'subagents', subId, '.system_generated', 'logs', 'transcript.jsonl'),
        path.join(path.dirname(convDir), subId, '.system_generated', 'logs', 'transcript.jsonl')].filter(Boolean);
      let subRaw = null;
      for (let i = 0; i < cands.length && subRaw === null; i += 1) subRaw = readOptional(cands[i], i === cands.length - 1 || path.isAbsolute(cands[i]));
      if (subRaw !== null) skipped_lines += parseTranscript(subRaw, (ev) => applyStep(target, ev));
      else if ((Number(m.input_tokens) || 0) + (Number(m.cache_read_tokens) || 0) + (Number(m.output_tokens) || 0) > 0) {
        applyStep(target, { created_at: m.created_at || m.started_at || null, model: m.model || null, input_tokens: Number(m.input_tokens) || 0, cache_read_tokens: Number(m.cache_read_tokens) || 0, output_tokens: Number(m.output_tokens) || 0, tool_names: [] });
      }
    }
  }

  for (const bDir of [path.join(convDir, 'browser_evidence'), path.join(convDir, '.system_generated', 'browser_evidence')]) {
    if (!fs.existsSync(bDir)) continue;
    for (const ent of fs.readdirSync(bDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const subPath = path.join(bDir, ent.name);
      let maxN = 0, maxMtime = 0;
      for (const f of fs.readdirSync(subPath)) {
        const mm = f.match(/^final_step_(\d+)\.png$/);
        if (!mm) continue;
        const n = parseInt(mm[1], 10);
        if (n > maxN) { maxN = n; maxMtime = fs.statSync(path.join(subPath, f)).mtimeMs; }
      }
      if (maxN > 0) {
        const target = subOwner.get(ent.name) || pickTurn(turns, { ts: maxMtime }) || ensureTurn(maxMtime);
        target.browser_steps = Math.max(target.browser_steps, maxN);
      }
    }
  }

  let run_usd = 0, max_ctx = 0, tot = 0;
  const outTurns = turns.map((t) => {
    run_usd += t.turn_usd; const tTot = t.in + t.cache + t.out; tot += tTot; max_ctx = Math.max(max_ctx, t.ctx);
    return { index: t.index, in: t.in, cache: t.cache, out: t.out, tot: tTot, net: t.in + t.out, ctx: t.ctx, steps: t.steps, browser_steps: t.browser_steps, eff: gradeTurn(t), turn_usd: t.turn_usd, run_usd };
  });
  const id = path.basename(convDir), firstTs = turns.find((t) => t.ts > 0)?.ts || dirMtimeMs || Date.now();
  return { id, shortId: id.slice(0, 8), date: new Date(firstTs).toISOString().slice(0, 10), skipped_lines, conv_usd: run_usd, max_ctx, tot, turns: outTurns };
}

function main() {
  const opts = parseArgs(process.argv.slice(2)), conversations = [];
  try {
    if (opts.dir || opts.conv) {
      const target = opts.dir ? path.resolve(opts.dir) : path.join(os.homedir(), '.gemini', 'antigravity', 'brain', opts.conv);
      const st = fs.statSync(target);
      if (!st.isDirectory()) throw Object.assign(new Error('Not dir'), { code: 'ENOENT' });
      conversations.push(analyzeConv(target, st.mtimeMs));
    } else {
      const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
      const dirs = fs.readdirSync(brainDir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => { const p = path.join(brainDir, e.name); return { p, mtimeMs: fs.statSync(p).mtimeMs }; })
        .sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, opts.limit);
      for (const d of dirs) conversations.push(analyzeConv(d.p, d.mtimeMs));
    }
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'ENOENT') {
      console.log(`[forge:meter] WARN: brain okunamadi (${err.code}) — terminalde calistirin veya --dir verin.`);
      process.exit(opts.strict ? 1 : 0);
    }
    throw err;
  }
  const allTot = conversations.reduce((s, c) => s + c.tot, 0), allUsd = conversations.reduce((s, c) => s + c.conv_usd, 0);
  if (opts.json) return console.log(JSON.stringify({ conversations, totals: { conversations: conversations.length, tot: allTot, usd: allUsd } }, null, 2));
  for (const c of conversations) {
    console.log(`[${c.shortId}] · ${c.date} · prompts:${c.turns.length} · tot:${fmtTok(c.tot)} · Cost: $${fmtUsd(c.conv_usd)} · Ctx(peak): ${fmtTok(c.max_ctx)}`);
    for (const t of c.turns) {
      console.log(`  #${t.index} | in ${fmtTok(t.in)} (cache ${fmtTok(t.cache)}) · out ${fmtTok(t.out)} · tot ${fmtTok(t.tot)} | Eff: ${t.eff} | Cost: $${fmtUsd(t.turn_usd)} (tot $${fmtUsd(t.run_usd)}) | Ctx: ${fmtTok(t.ctx)}${t.browser_steps > 15 ? ` [!browser:${t.browser_steps}>15]` : ''}`);
    }
  }
  if (conversations.length > 1) console.log(`Σ TOTAL (${conversations.length} conv) | tot ${fmtTok(allTot)} | Cost: $${fmtUsd(allUsd)}`);
}
main();
