#!/usr/bin/env node
// Extract the UVS rules glossary from the reference PDF into structured JSON.
//
//   node scripts/extract-glossary.mjs
//
// The PDF's own index (pp. 2-4) is the authoritative, ordered list of term
// headings. For the body we use `pdftotext -bbox-layout`, which groups words into
// lines and lines into blocks (paragraphs) with x/y coordinates. We assign each
// block to a column by its x position (the page is two newspaper-style columns),
// read the left column then the right column per page, and slice the block stream
// into per-term entries at the heading blocks. Coordinates give us reliable
// paragraph boundaries without depending on ambiguous blank lines.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PDF = resolve(ROOT, 'Reference/UVS_Rules_Reference_v1.2.7.pdf');
const OUT = resolve(ROOT, 'src/data/glossary.json');
const COLUMN_SPLIT_X = 300; // page width 612; left col xMax ~285, right col xMin ~318

// The actual UVS keywords (shown in red in the PDF, a color text extraction
// loses). `isKeyword` is set from this authoritative list only — the term is a
// genuine keyword ability or keyword trait, not a meta-term or instruction that
// merely mentions keywords (e.g. Ruin, Freeze, Seal, Drive, Rival are NOT here).
// Names match the glossary headings exactly.
// NB: Enhance, Form, Response, Blitz, and Continuous are ability *type
// designations* (timings), NOT keywords — keyword abilities are the colored
// terms at the edge of a card's text box that grant an ability.
const KEYWORDS = new Set([
  // keyword abilities
  'Breaker', 'Combo', 'Deflect', 'Desperation (Keyword Ability)', 'Echo',
  'Elusive', 'EX', 'Flash', 'Frenzy', 'Outwit', 'Powerful', 'Safe', 'Shift',
  'Stun', 'Tenacious', 'Terrain', 'Throw', 'Unblockable', 'Unique',
  // keyword traits
  'Ally', 'Charge', 'Fury', 'Kick', 'Punch', 'Slam', 'Tech', 'Titan', 'Weapon',
]);

// Index lines that are sub-headings or artifacts, not standalone terms.
const INDEX_SKIP = new Set(['In the Stage or Card Pool']);

const ZWSP = /[​]/g;

function pdftext(from, to, mode) {
  const args = ['-f', String(from), '-l', String(to)];
  if (mode) args.push(mode); // e.g. '-bbox-layout'
  args.push(PDF, '-');
  return execFileSync('pdftotext', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
}

// --- normalisation ---------------------------------------------------------

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');

const norm = (s) =>
  s
    .replace(ZWSP, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// heading comparison ignores underscores (the "Ability That ____" blank) too
const hnorm = (s) => norm(s).replace(/_/g, '').replace(/\s+/g, ' ').trim();

const cleanText = (s) =>
  s
    .replace(ZWSP, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const isPageNum = (s) => /^\d{1,3}$/.test(s.trim());

function slugify(name) {
  return name
    .replace(ZWSP, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// --- 1. ordered heading list from the index --------------------------------

function buildHeadings() {
  const raw = pdftext(2, 4).split('\n');
  const seen = new Set();
  const headings = [];
  for (let line of raw) {
    line = line.replace(ZWSP, '').trim();
    if (!line) continue;
    if (isPageNum(line)) continue; // page numbers 2/3/4
    if (line.endsWith('.')) continue; // stray body sentence in the TOC
    if (INDEX_SKIP.has(line)) continue;
    const key = hnorm(line);
    if (seen.has(key)) continue;
    seen.add(key);
    headings.push(line);
  }
  return headings;
}

// --- 2. body blocks in reading order (bbox-layout) -------------------------

function bodyBlocks() {
  const xml = pdftext(5, 49, '-bbox-layout');
  const blocks = [];
  for (const pm of xml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)) {
    const pageBlocks = [];
    for (const bm of pm[1].matchAll(/<block\b([^>]*)>([\s\S]*?)<\/block>/g)) {
      const xMin = parseFloat((bm[1].match(/xMin="([\d.]+)"/) || [])[1] || '0');
      const yMin = parseFloat((bm[1].match(/yMin="([\d.]+)"/) || [])[1] || '0');
      const lines = [];
      for (const lm of bm[2].matchAll(/<line\b[^>]*>([\s\S]*?)<\/line>/g)) {
        const words = [...lm[1].matchAll(/<word\b[^>]*>([\s\S]*?)<\/word>/g)].map((w) =>
          decode(w[1])
        );
        const text = words.join(' ').replace(ZWSP, '').replace(/\s+/g, ' ').trim();
        if (text) lines.push(text);
      }
      if (lines.length) pageBlocks.push({ xMin, yMin, lines });
    }
    const left = pageBlocks.filter((b) => b.xMin < COLUMN_SPLIT_X).sort((a, b) => a.yMin - b.yMin);
    const right = pageBlocks.filter((b) => b.xMin >= COLUMN_SPLIT_X).sort((a, b) => a.yMin - b.yMin);
    blocks.push(...left, ...right);
  }
  return blocks.filter((b) => !(b.lines.length === 1 && isPageNum(b.lines[0])));
}

// --- 3. slice blocks into per-heading entries ------------------------------

function sliceEntries(headings) {
  const blocks = bodyBlocks();
  const nHead = headings.map(hnorm);
  const entries = [];
  let hi = 0;
  let cur = null;

  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i];
    if (hi < headings.length) {
      const btext = hnorm(blk.lines.join(' '));
      const first = hnorm(blk.lines[0]);
      // heading split across two blocks (e.g. "Desperation (Keyword" + "Ability)")
      const two = hnorm(blk.lines.join(' ') + ' ' + (blocks[i + 1]?.lines.join(' ') ?? ''));
      if (btext === nHead[hi]) {
        cur = { name: headings[hi], blocks: [] };
        entries.push(cur);
        hi++;
        continue;
      }
      // heading is the first line of a block that also holds a subheading/body
      if (blk.lines.length > 1 && first === nHead[hi]) {
        cur = { name: headings[hi], blocks: [{ ...blk, lines: blk.lines.slice(1) }] };
        entries.push(cur);
        hi++;
        continue;
      }
      if (two === nHead[hi]) {
        cur = { name: headings[hi], blocks: [] };
        entries.push(cur);
        hi++;
        i++; // consume the second heading block
        continue;
      }
    }
    if (cur) cur.blocks.push(blk);
  }

  const missed = headings.filter((h) => !entries.some((e) => e.name === h));
  return { entries, missed };
}

// --- 4. structure each entry -----------------------------------------------

// Within a block, lines are the real consecutive lines of one paragraph or list.
// Join wrapped lines; a bullet/number marker starts a new item.
function blockToItems(lines) {
  const items = [];
  let cur = null;
  const flush = () => {
    if (cur && cur.text.trim()) items.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    const b = t.match(/^[●•▪◦·]\s*(.*)$/);
    const n = t.match(/^(\d+)[.)]\s+(.*)$/);
    if (b) {
      flush();
      cur = { type: 'bullet', text: b[1] };
    } else if (n) {
      flush();
      cur = { type: 'bullet', text: n[2] };
    } else if (cur) {
      cur.text += ' ' + t;
    } else {
      cur = { type: 'p', text: t };
    }
  }
  flush();
  return items;
}

function structure(entry, nameByKey) {
  const items = entry.blocks.flatMap((b) => blockToItems(b.lines));
  const definitionParts = [];
  const examples = [];
  const notes = [];
  const bullets = [];

  for (const it of items) {
    const text = cleanText(it.text);
    if (!text) continue;
    if (it.type === 'bullet') {
      bullets.push(text);
    } else if (/^\(example[:s]/i.test(text)) {
      examples.push(text.replace(/^\(example:?s?\s*/i, '').replace(/\)\s*$/, '').trim());
    } else if (/^\(note[:s]/i.test(text)) {
      notes.push(text.replace(/^\(note:?s?\s*/i, '').replace(/\)\s*$/, '').trim());
    } else {
      definitionParts.push(text.replace(/^[-–—]\s+/, ''));
    }
  }

  const whole = items.map((it) => it.text).join(' ');
  const seeAlso = [];
  const seen = new Set();
  for (const m of whole.matchAll(/see:\s*([^)\n.]+)/gi)) {
    for (let ref of m[1].split(/\s+and\s+|,|&/i)) {
      ref = cleanText(ref).replace(/\.$/, '');
      if (!ref) continue;
      const target = nameByKey.get(hnorm(ref));
      if (target && !seen.has(target)) {
        seen.add(target);
        seeAlso.push(target);
      }
    }
  }

  const isKeyword = KEYWORDS.has(entry.name);
  // Any term about abilities (name contains "ability"/"abilities").
  const isAbility = /abilit/i.test(entry.name);

  const letter = (entry.name.match(/[a-z]/i) || ['#'])[0].toUpperCase();

  return {
    name: entry.name,
    definition: definitionParts.join('\n\n'),
    examples,
    notes,
    bullets,
    seeAlso,
    isKeyword,
    isAbility,
    category: letter,
  };
}

// --- main ------------------------------------------------------------------

function main() {
  const headings = buildHeadings();
  const { entries, missed } = sliceEntries(headings);

  const slugCount = new Map();
  const nameByKey = new Map(); // hnorm(name) -> name
  for (const e of entries) {
    let slug = slugify(e.name);
    const n = slugCount.get(slug) || 0;
    slugCount.set(slug, n + 1);
    if (n > 0) slug = `${slug}-${n + 1}`;
    e.slug = slug;
    nameByKey.set(hnorm(e.name), e.name);
  }
  const nameToSlug = new Map(entries.map((e) => [e.name, e.slug]));

  const out = entries.map((e) => {
    const s = structure(e, nameByKey);
    return {
      slug: e.slug,
      ...s,
      seeAlso: s.seeAlso.map((n) => nameToSlug.get(n) || slugify(n)),
    };
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

  const empty = out.filter((e) => !e.definition.trim());
  console.log(`headings in index : ${headings.length}`);
  console.log(`entries extracted : ${out.length}`);
  console.log(`keyword-flagged   : ${out.filter((e) => e.isKeyword).length}`);
  console.log(`with examples     : ${out.filter((e) => e.examples.length).length}`);
  console.log(`with see-also     : ${out.filter((e) => e.seeAlso.length).length}`);
  console.log(`empty definitions : ${empty.length}${empty.length ? ' -> ' + empty.map((e) => e.name).join(', ') : ''}`);
  if (missed.length) console.log(`UNMATCHED headings: ${missed.join(' | ')}`);
  console.log(`written           : ${OUT}`);
}

main();
