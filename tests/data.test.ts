/**
 * Integritätstests für alle Inhalte: eindeutige IDs, auflösbare Referenzen,
 * gültige Quizfragen, Vollständigkeit des Gerätekatalogs.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as R from '../src/data/registry';
import type { Block, Question } from '../src/types/content';
import { PLANNED_DEVICES, PLANNED_MANUFACTURERS } from './plan';

const simFiles = new Set(
  readdirSync(fileURLToPath(new URL('../src/sims', import.meta.url)))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace('.tsx', '')),
);

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  const d = new Set<string>();
  for (const id of ids) (seen.has(id) ? d : seen).add(id);
  return [...d];
}

function blocksOf(): { ctx: string; blocks: Block[] }[] {
  const out: { ctx: string; blocks: Block[] }[] = [];
  for (const m of R.modules) for (const l of m.lessons) out.push({ ctx: `lesson ${l.id}`, blocks: l.blocks });
  for (const t of R.testEquipment) out.push({ ctx: `equipment ${t.id}`, blocks: t.example });
  for (const d of R.docTypes) if (d.example) out.push({ ctx: `doc ${d.id}`, blocks: d.example });
  return out;
}

function allQuestions(): { ctx: string; q: Question }[] {
  const out: { ctx: string; q: Question }[] = [];
  for (const p of R.questionPool) out.push({ ctx: `${p.origin.kind} ${p.origin.ref}`, q: p.question });
  return out;
}

/** Alle Texte mit [[...]]-Links */
function allTexts(): { ctx: string; text: string }[] {
  const out: { ctx: string; text: string }[] = [];
  const walk = (ctx: string, v: unknown) => {
    if (typeof v === 'string') {
      if (v.includes('[[')) out.push({ ctx, text: v });
    } else if (Array.isArray(v)) v.forEach((x) => walk(ctx, x));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(ctx, x));
  };
  R.devices.forEach((d) => walk(`device ${d.id}`, d));
  R.modules.forEach((m) => walk(`module ${m.id}`, m));
  R.glossary.forEach((g) => walk(`glossary ${g.id}`, g));
  R.cases.forEach((c) => walk(`case ${c.id}`, c));
  R.faults.forEach((f) => walk(`fault ${f.id}`, f));
  R.testEquipment.forEach((t) => walk(`equipment ${t.id}`, t));
  R.componentEntries.forEach((t) => walk(`component ${t.id}`, t));
  R.hospitalAreas.forEach((t) => walk(`hospital ${t.id}`, t));
  R.coachTopics.forEach((t) => walk(`coach ${t.id}`, t));
  R.docTypes.forEach((t) => walk(`doc ${t.id}`, t));
  R.manufacturers.forEach((t) => walk(`manufacturer ${t.id}`, t));
  return out;
}

describe('Gerätekatalog', () => {
  it('enthält mindestens 100 Geräte', () => {
    expect(R.devices.length).toBeGreaterThanOrEqual(100);
  });
  it('enthält alle geplanten Geräte in der richtigen Kategorie', () => {
    const missing: string[] = [];
    const wrongCat: string[] = [];
    for (const [cat, ids] of Object.entries(PLANNED_DEVICES))
      for (const id of ids) {
        const d = R.deviceById.get(id);
        if (!d) missing.push(id);
        else if (d.category !== cat) wrongCat.push(`${id} (${d.category} statt ${cat})`);
      }
    expect(missing).toEqual([]);
    expect(wrongCat).toEqual([]);
  });
  it('hat vollständige Pflichtfelder', () => {
    const problems: string[] = [];
    for (const d of R.devices) {
      if (d.applications.length < 2) problems.push(`${d.id}: <2 Einsatzgebiete`);
      if (d.components.length < 3) problems.push(`${d.id}: <3 Komponenten`);
      if (d.manufacturers.length < 1) problems.push(`${d.id}: keine Hersteller`);
      if (d.quiz.length < 3) problems.push(`${d.id}: <3 Quizfragen`);
      if (d.sources.length < 1) problems.push(`${d.id}: keine Quellen`);
      if (d.safetyFeatures.length < 1) problems.push(`${d.id}: keine Sicherheitsfunktionen`);
      if (!d.principle.einfach || !d.principle.technisch || !d.principle.experte) problems.push(`${d.id}: Prinzip unvollständig`);
      if (d.economics.priceStatus === 'belegt' && !(d.economics.priceRanges ?? []).length) problems.push(`${d.id}: 'belegt' ohne Preise`);
      if (d.depth === 'vollmodul' && !d.moduleId) problems.push(`${d.id}: vollmodul ohne moduleId`);
    }
    expect(problems).toEqual([]);
  });
});

describe('Eindeutige IDs', () => {
  const collections: [string, { id: string }[]][] = [
    ['devices', R.devices],
    ['modules', R.modules],
    ['lessons', R.modules.flatMap((m) => m.lessons)],
    ['sources', R.sources],
    ['manufacturers', R.manufacturers],
    ['components', R.componentEntries],
    ['testEquipment', R.testEquipment],
    ['docTypes', R.docTypes],
    ['glossary', R.glossary],
    ['faults', R.faults],
    ['cases', R.cases],
    ['hospitalAreas', R.hospitalAreas],
    ['learningPaths', R.learningPaths],
    ['exams', R.exams],
    ['coachTopics', R.coachTopics],
    ['sims', R.simMetas],
  ];
  for (const [name, list] of collections) {
    it(name, () => expect(dupes(list.map((x) => x.id))).toEqual([]));
  }
  it('Fragen-IDs plattformweit eindeutig', () => {
    expect(dupes(allQuestions().map((x) => x.q.id))).toEqual([]);
  });
});

describe('Referenzen', () => {
  it('Quellen-IDs existieren', () => {
    const missing = new Set<string>();
    const check = (ctx: string, ids: string[] | undefined) => ids?.forEach((id) => !R.sourceById.has(id) && missing.add(`${ctx} → ${id}`));
    R.devices.forEach((d) => {
      check(`device ${d.id}`, d.sources);
      check(`device ${d.id} standards`, d.standards);
      d.economics.priceRanges?.forEach((p) => check(`device ${d.id} price`, [p.sourceId]));
    });
    R.modules.forEach((m) => m.lessons.forEach((l) => check(`lesson ${l.id}`, l.sources)));
    R.manufacturers.forEach((x) => check(`manufacturer ${x.id}`, x.sources));
    R.componentEntries.forEach((x) => check(`component ${x.id}`, x.sources));
    R.testEquipment.forEach((x) => check(`equipment ${x.id}`, x.sources));
    R.docTypes.forEach((x) => check(`doc ${x.id}`, x.sources));
    R.glossary.forEach((x) => check(`glossary ${x.id}`, x.sources));
    R.faults.forEach((x) => check(`fault ${x.id}`, x.sources));
    R.cases.forEach((x) => check(`case ${x.id}`, x.sources));
    R.hospitalAreas.forEach((x) => check(`hospital ${x.id}`, x.sources));
    R.coachTopics.forEach((x) => check(`coach ${x.id}`, x.sources));
    R.simMetas.forEach((x) => check(`sim ${x.id}`, x.sources));
    expect([...missing]).toEqual([]);
  });
  it('Hersteller-IDs existieren', () => {
    const missing: string[] = [];
    for (const d of R.devices) for (const m of d.manufacturers) if (!R.manufacturerById.has(m.manufacturerId)) missing.push(`${d.id} → ${m.manufacturerId}`);
    for (const t of R.testEquipment) for (const m of t.manufacturers) if (!R.manufacturerById.has(m.manufacturerId)) missing.push(`${t.id} → ${m.manufacturerId}`);
    for (const id of PLANNED_MANUFACTURERS) if (!R.manufacturerById.has(id)) missing.push(`geplant: ${id}`);
    expect(missing).toEqual([]);
  });
  it('Geräte-IDs in Verweisen existieren', () => {
    const missing: string[] = [];
    const check = (ctx: string, ids: string[] | undefined) => ids?.forEach((id) => !R.deviceById.has(id) && missing.push(`${ctx} → ${id}`));
    R.devices.forEach((d) => check(`device ${d.id} related`, d.related));
    R.modules.forEach((m) => m.lessons.forEach((l) => check(`lesson ${l.id}`, l.devices)));
    for (const b of blocksOf()) for (const bl of b.blocks) if (bl.type === 'devices') check(b.ctx, bl.deviceIds);
    R.componentEntries.forEach((c) => check(`component ${c.id}`, c.devices));
    R.glossary.forEach((g) => check(`glossary ${g.id}`, g.devices));
    R.faults.forEach((f) => check(`fault ${f.id}`, f.devices));
    R.cases.forEach((c) => check(`case ${c.id}`, [c.deviceId]));
    R.hospitalAreas.forEach((h) => check(`hospital ${h.id}`, h.placements.map((p) => p.deviceId)));
    R.simMetas.forEach((s) => check(`sim ${s.id}`, s.devices));
    expect(missing).toEqual([]);
  });
  it('Module, Simulationen und Lexikon-Verweise existieren', () => {
    const missing: string[] = [];
    for (const d of R.devices) {
      if (d.moduleId && !R.moduleById.has(d.moduleId)) missing.push(`device ${d.id} module → ${d.moduleId}`);
      d.sims?.forEach((s) => !simFiles.has(s) && missing.push(`device ${d.id} sim-Datei → ${s}`));
      d.sims?.forEach((s) => !R.simById.has(s) && missing.push(`device ${d.id} sim-Meta → ${s}`));
      d.glossary?.forEach((g) => !R.glossaryById.has(g) && missing.push(`device ${d.id} glossary → ${g}`));
    }
    for (const s of R.simMetas) if (!simFiles.has(s.id)) missing.push(`sim-Meta ohne Datei → ${s.id}`);
    for (const f of simFiles) if (f !== 'registry' && !R.simById.has(f)) missing.push(`sim-Datei ohne Meta → ${f}`);
    for (const b of blocksOf()) for (const bl of b.blocks) if (bl.type === 'sim' && !simFiles.has(bl.simId)) missing.push(`${b.ctx} sim → ${bl.simId}`);
    for (const t of R.testEquipment) t.sims?.forEach((s) => !simFiles.has(s) && missing.push(`equipment ${t.id} sim → ${s}`));
    for (const g of R.glossary) g.related?.forEach((r) => !R.glossaryById.has(r) && missing.push(`glossary ${g.id} related → ${r}`));
    for (const c of R.cases) c.relatedLessons?.forEach((l) => !R.lessonIndex.has(l) && missing.push(`case ${c.id} lesson → ${l}`));
    for (const p of R.learningPaths)
      for (const st of p.steps) {
        const ok =
          (st.kind === 'lesson' && R.lessonIndex.has(st.ref)) ||
          (st.kind === 'module' && R.moduleById.has(st.ref)) ||
          (st.kind === 'device' && R.deviceById.has(st.ref)) ||
          (st.kind === 'sim' && R.simById.has(st.ref)) ||
          (st.kind === 'case' && R.caseById.has(st.ref)) ||
          (st.kind === 'exam' && R.examById.has(st.ref)) ||
          st.kind === 'page';
        if (!ok) missing.push(`path ${p.id} → ${st.kind}:${st.ref}`);
      }
    for (const t of R.coachTopics)
      for (const r of t.related ?? []) {
        const ok =
          (r.kind === 'lesson' && R.lessonIndex.has(r.ref)) ||
          (r.kind === 'module' && R.moduleById.has(r.ref)) ||
          (r.kind === 'device' && R.deviceById.has(r.ref)) ||
          (r.kind === 'sim' && R.simById.has(r.ref)) ||
          (r.kind === 'case' && R.caseById.has(r.ref)) ||
          (r.kind === 'exam' && R.examById.has(r.ref)) ||
          (r.kind === 'glossary' && R.glossaryById.has(r.ref)) ||
          r.kind === 'page';
        if (!ok) missing.push(`coach ${t.id} → ${r.kind}:${r.ref}`);
      }
    expect(missing).toEqual([]);
  });
  it('Inline-Links [[...]] lösen auf', () => {
    const broken: string[] = [];
    for (const { ctx, text } of allTexts()) {
      for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
        const target = m[1];
        const [prefix, id] = target.includes(':') ? target.split(':') : ['glossar', target];
        const ok =
          (prefix === 'glossar' && R.glossaryById.has(id)) ||
          (prefix === 'geraet' && R.deviceById.has(id)) ||
          (prefix === 'modul' && R.moduleById.has(id)) ||
          (prefix === 'lektion' && R.lessonIndex.has(id)) ||
          (prefix === 'sim' && R.simById.has(id));
        if (!ok) broken.push(`${ctx} → [[${target}]]`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('Quizfragen', () => {
  it('sind formal gültig', () => {
    const problems: string[] = [];
    for (const { ctx, q } of allQuestions()) {
      const tag = `${ctx} ${q.id}`;
      if (!q.explanation || q.explanation.length < 15) problems.push(`${tag}: Erklärung fehlt/zu kurz`);
      switch (q.kind) {
        case 'single':
          if (q.options.length < 2 || q.answer < 0 || q.answer >= q.options.length) problems.push(`${tag}: answer-Index ungültig`);
          if (new Set(q.options).size !== q.options.length) problems.push(`${tag}: doppelte Optionen`);
          if (q.optionFeedback && q.optionFeedback.length !== q.options.length) problems.push(`${tag}: optionFeedback-Länge`);
          break;
        case 'multi':
          if (q.answers.length === 0 || q.answers.some((a) => a < 0 || a >= q.options.length)) problems.push(`${tag}: answers ungültig`);
          if (new Set(q.options).size !== q.options.length) problems.push(`${tag}: doppelte Optionen`);
          break;
        case 'numeric':
          if (!Number.isFinite(q.answer) || q.tolerance < 0) problems.push(`${tag}: numeric ungültig`);
          break;
        case 'order':
          if (q.items.length < 3 || new Set(q.items).size !== q.items.length) problems.push(`${tag}: order ungültig`);
          break;
        case 'match':
          if (q.pairs.length < 2 || new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length || new Set(q.pairs.map((p) => p[0])).size !== q.pairs.length)
            problems.push(`${tag}: match ungültig/doppelt`);
          break;
      }
    }
    expect(problems).toEqual([]);
  });
  it('Diagnosebäume sind vollständig verknüpft', () => {
    const problems: string[] = [];
    for (const f of R.faults) {
      const ids = new Set(f.nodes.map((n) => n.id));
      if (f.nodes.length === 0) problems.push(`${f.id}: keine Knoten`);
      for (const n of f.nodes)
        for (const o of n.options) {
          if (!o.next && !o.result) problems.push(`${f.id}/${n.id}: Option ohne Ziel`);
          if (o.next && !ids.has(o.next)) problems.push(`${f.id}/${n.id}: next → ${o.next} fehlt`);
        }
      if (!f.nodes.some((n) => n.options.some((o) => o.result?.resolved))) problems.push(`${f.id}: kein lösender Pfad`);
    }
    for (const c of R.cases) {
      if (c.hypotheses.filter((h) => h.correct).length !== 1) problems.push(`case ${c.id}: nicht genau eine korrekte Hypothese`);
      if (!c.actions.some((a) => a.useful)) problems.push(`case ${c.id}: keine zielführende Aktion`);
    }
    expect(problems).toEqual([]);
  });
  it('Spiele sind gültig', () => {
    const problems: string[] = [];
    for (const b of blocksOf())
      for (const bl of b.blocks) {
        if (bl.type !== 'game') continue;
        const g = bl.game;
        if (g.kind === 'categorize' && g.items.some(([, i]) => i < 0 || i >= g.categories.length)) problems.push(`${b.ctx}: categorize-Index`);
        if (g.kind === 'match' && new Set(g.pairs.map((p) => p[1])).size !== g.pairs.length) problems.push(`${b.ctx}: match doppelt`);
        if (g.kind === 'order' && new Set(g.items).size !== g.items.length) problems.push(`${b.ctx}: order doppelt`);
      }
    expect(problems).toEqual([]);
  });
});

describe('Inhaltsqualität', () => {
  it('Datumsangaben sind ISO-Daten', () => {
    const bad: string[] = [];
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    R.devices.forEach((d) => !iso.test(d.updated) && bad.push(d.id));
    R.modules.forEach((m) => m.lessons.forEach((l) => !iso.test(l.updated) && bad.push(l.id)));
    expect(bad).toEqual([]);
  });
  it('keine Platzhaltertexte', () => {
    const src = readdirSync(fileURLToPath(new URL('../src/data', import.meta.url)), { recursive: true }) as string[];
    const bad: string[] = [];
    for (const f of src.filter((x) => x.endsWith('.ts'))) {
      const txt = readFileSync(fileURLToPath(new URL(`../src/data/${f}`, import.meta.url)), 'utf8');
      if (/lorem ipsum|TODO|TBD|\bXXX\b|Platzhalter/i.test(txt)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});
