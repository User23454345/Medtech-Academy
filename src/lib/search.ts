/**
 * Plattformweite Suche: Geräte, Lexikon (inkl. Abkürzungen), Lektionen,
 * Komponenten, Prüfmittel, Hersteller, Fehlerbilder, Fälle, Simulationen.
 * Rein clientseitig, Index wird einmalig beim ersten Aufruf erstellt.
 */
import {
  cases,
  componentEntries,
  devices,
  docTypes,
  faults,
  glossary,
  manufacturers,
  modules,
  simMetas,
  testEquipment,
  categoryById,
} from '../data/registry';
import { plain } from './text';
import { normalize } from './util';

export type ResultKind =
  | 'Gerät'
  | 'Lexikon'
  | 'Lektion'
  | 'Modul'
  | 'Komponente'
  | 'Prüfmittel'
  | 'Hersteller'
  | 'Fehlerbild'
  | 'Fall'
  | 'Simulation'
  | 'Dokumentation';

export interface SearchDoc {
  kind: ResultKind;
  title: string;
  subtitle: string;
  href: string;
  /** Felder mit Gewicht */
  primary: string; // Titel, Abkürzungen, Aliase (Gewicht hoch)
  secondary: string; // Kurzbeschreibung (mittel)
  body: string; // Volltext (niedrig)
}

let index: SearchDoc[] | null = null;

function build(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const d of devices) {
    docs.push({
      kind: 'Gerät',
      title: d.name,
      subtitle: categoryById.get(d.category)?.name ?? d.category,
      href: `/geraete/${d.id}`,
      primary: normalize([d.name, ...(d.aliases ?? [])].join(' ')),
      secondary: normalize(plain(d.short + ' ' + d.purpose)),
      body: normalize(
        plain(
          [
            d.principle.einfach,
            d.applications.join(' '),
            d.components.map((c) => c.name).join(' '),
            d.maintenance.typicalFaults.join(' '),
            d.manufacturers.flatMap((m) => m.products ?? []).join(' '),
          ].join(' '),
        ),
      ),
    });
  }
  for (const g of glossary) {
    docs.push({
      kind: 'Lexikon',
      title: g.abbr ? `${g.term} (${g.abbr})` : g.term,
      subtitle: plain(g.simple).slice(0, 120),
      href: `/lexikon/${g.id}`,
      primary: normalize(`${g.term} ${g.abbr ?? ''}`),
      secondary: normalize(plain(g.simple)),
      body: normalize(plain(g.technical + ' ' + g.example)),
    });
  }
  for (const m of modules) {
    docs.push({
      kind: 'Modul',
      title: m.title,
      subtitle: m.description,
      href: `/modul/${m.id}`,
      primary: normalize(m.title),
      secondary: normalize(m.description),
      body: '',
    });
    for (const l of m.lessons) {
      const text = l.blocks
        .map((b) => {
          switch (b.type) {
            case 'p':
            case 'h':
              return b.text;
            case 'list':
              return b.items.join(' ');
            case 'callout':
              return b.text;
            case 'leveled':
              return `${b.title ?? ''} ${b.levels.einfach} ${b.levels.technisch}`;
            case 'example':
              return b.title + ' ' + b.text;
            default:
              return '';
          }
        })
        .join(' ');
      docs.push({
        kind: 'Lektion',
        title: l.title,
        subtitle: m.title,
        href: `/lektion/${l.id}`,
        primary: normalize(l.title),
        secondary: normalize(plain(l.summary)),
        body: normalize(plain(text)),
      });
    }
  }
  for (const c of componentEntries) {
    docs.push({
      kind: 'Komponente',
      title: c.name,
      subtitle: plain(c.function).slice(0, 120),
      href: `/komponenten/${c.id}`,
      primary: normalize(c.name),
      secondary: normalize(plain(c.function)),
      body: normalize(plain(c.failureModes.join(' ') + ' ' + c.applications.join(' '))),
    });
  }
  for (const t of testEquipment) {
    docs.push({
      kind: 'Prüfmittel',
      title: t.name,
      subtitle: plain(t.purpose).slice(0, 120),
      href: `/messmittel/${t.id}`,
      primary: normalize(t.name),
      secondary: normalize(plain(t.purpose)),
      body: normalize(t.measures.join(' ')),
    });
  }
  for (const m of manufacturers) {
    docs.push({
      kind: 'Hersteller',
      title: m.name,
      subtitle: `${m.country} · ${m.productAreas.slice(0, 3).join(', ')}`,
      href: `/hersteller/${m.id}`,
      primary: normalize(m.name),
      secondary: normalize(m.productFamilies.join(' ')),
      body: normalize(m.productAreas.join(' ')),
    });
  }
  for (const f of faults) {
    docs.push({
      kind: 'Fehlerbild',
      title: f.title,
      subtitle: plain(f.description).slice(0, 120),
      href: `/instandhaltung/fehler/${f.id}`,
      primary: normalize(f.title),
      secondary: normalize(plain(f.description)),
      body: normalize(plain(f.causes.map((c) => c.cause).join(' '))),
    });
  }
  for (const c of cases) {
    docs.push({
      kind: 'Fall',
      title: c.title,
      subtitle: plain(c.problem).slice(0, 120),
      href: `/faelle/${c.id}`,
      primary: normalize(c.title),
      secondary: normalize(plain(c.problem)),
      body: normalize(plain(c.situation)),
    });
  }
  for (const s of simMetas) {
    docs.push({
      kind: 'Simulation',
      title: s.title,
      subtitle: s.description,
      href: `/labor/${s.id}`,
      primary: normalize(s.title),
      secondary: normalize(s.description),
      body: normalize(s.principle),
    });
  }
  for (const d of docTypes) {
    docs.push({
      kind: 'Dokumentation',
      title: d.name,
      subtitle: plain(d.purpose).slice(0, 120),
      href: `/dokumentation#${d.id}`,
      primary: normalize(d.name),
      secondary: normalize(plain(d.purpose)),
      body: normalize(d.contents.join(' ')),
    });
  }
  return docs;
}

export function getIndex(): SearchDoc[] {
  if (!index) index = build();
  return index;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

export function search(query: string, limit = 40): SearchHit[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(' ').filter((t) => t.length > 0);
  const hits: SearchHit[] = [];
  for (const doc of getIndex()) {
    let score = 0;
    let allMatched = true;
    for (const t of terms) {
      let s = 0;
      const wordRe = new RegExp(`(^| )${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      if (doc.primary === t) s += 60;
      if (wordRe.test(doc.primary)) s += 25;
      else if (doc.primary.includes(t)) s += 15;
      if (wordRe.test(doc.secondary)) s += 8;
      else if (doc.secondary.includes(t)) s += 4;
      if (t.length > 2 && doc.body.includes(t)) s += 2;
      if (s === 0) allMatched = false;
      score += s;
    }
    if (!allMatched) score *= 0.25;
    if (doc.primary === q) score += 50;
    if (score >= 2) hits.push({ doc, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
