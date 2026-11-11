/**
 * KI-Lerncoach – lokale Wissens-Engine.
 *
 * Der Coach beantwortet Fragen ausschließlich aus den geprüften Inhalten der
 * Plattform (Coach-Themen, Lexikon, Geräteprofile, Lektionen) und gibt die
 * Quellen mit an. Findet er nichts Belastbares, sagt er das offen.
 * Optional kann ein Sprachmodell über den lokalen Coach-Server
 * (server/coach-server.mjs) zugeschaltet werden – auch dann wird der hier
 * gefundene Plattform-Kontext mitgegeben.
 */
import type { LeveledText } from '../types/content';
import { coachTopics, devices, glossary, lessonIndex, questionById, questionPool, type PooledQuestion } from '../data/registry';
import type { ProgressState } from './progress';
import { knowledgeGaps, topicLabel } from './tasks';
import { plain } from './text';
import { normalize, shuffle } from './util';

export interface CoachAnswer {
  kind: 'explain' | 'quiz' | 'gaps' | 'mistakes' | 'unknown' | 'help';
  title: string;
  levels?: LeveledText;
  links: { title: string; href: string }[];
  sources: string[];
  /** Basis der Antwort – transparent für Nutzer */
  basis: string;
  quiz?: PooledQuestion[];
  text?: string;
  confidence: 'hoch' | 'mittel' | 'niedrig';
}

const STOP = new Set(
  'wie was warum wieso weshalb funktioniert funktion ein eine einer eines der die das den dem des ist sind wird werden mir mich erklaer erklaere erklaerung bitte kannst du hat haben gibt es zu im in am an auf fuer mit von und oder bei beim was ist eigentlich genau einfach technisch experte'.split(' '),
);

function tokens(q: string): string[] {
  return normalize(q)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreText(toks: string[], hay: string, weight: number): number {
  let s = 0;
  for (const t of toks) {
    if (new RegExp(`(^| )${t}( |$)`).test(hay)) s += weight * 2;
    else if (t.length > 3 && hay.includes(t)) s += weight;
  }
  return s;
}

interface Candidate {
  score: number;
  answer: CoachAnswer;
}

export function askCoach(question: string, s: ProgressState): CoachAnswer {
  const nq = normalize(question);
  const toks = tokens(question);

  if (/^(hilfe|help|\?)$/.test(nq) || nq === '') {
    return {
      kind: 'help',
      title: 'Was ich kann',
      text:
        'Stelle mir eine Frage zu einem Gerät, Begriff oder Prinzip – z. B. „Wie funktioniert ein Pulsoximeter?“ oder „Was ist PEEP?“. ' +
        'Ich erkläre auf drei Ebenen (einfach, technisch, Experte) und nenne die Quellen. Außerdem: „Quiz zu Beatmung“, ' +
        '„Meine Wissenslücken“ oder „Erkläre meine Fehler“.',
      links: [],
      sources: [],
      basis: 'Hilfe',
      confidence: 'hoch',
    };
  }

  if (/(wissensluecke|luecken|schwaeche|was sollte ich wiederholen)/.test(nq)) {
    const gaps = knowledgeGaps(s);
    return {
      kind: 'gaps',
      title: 'Deine Wissenslücken',
      text:
        gaps.length === 0
          ? 'Bisher erkenne ich keine Wissenslücken – entweder hast du noch wenige Quizfragen beantwortet oder deine Trefferquote liegt überall über 70 %. Mach ein paar Quizze, dann kann ich gezielter helfen.'
          : 'Basierend auf deinen bisherigen Antworten empfehle ich, diese Themen zu wiederholen:\n' +
            gaps
              .slice(0, 6)
              .map((g) => `• **${topicLabel(g.topic)}** – ${Math.round(g.ratio * 100)} % richtig (${g.correct + g.wrong} Antworten)`)
              .join('\n'),
      links: gaps.slice(0, 4).map((g) => ({ title: `Prüfung/Quiz: ${topicLabel(g.topic)}`, href: '/akademie' })),
      sources: [],
      basis: 'Auswertung deines lokalen Lernfortschritts',
      confidence: 'hoch',
    };
  }

  if (/(meine fehler|falsche antwort|falsch beantwortet|fehler erklaer)/.test(nq)) {
    const wrong = Object.entries(s.questions)
      .filter(([, v]) => v.wrong > 0 && v.box === 0)
      .sort((a, b) => b[1].last - a[1].last)
      .slice(0, 5)
      .map(([id]) => questionById.get(id))
      .filter((x): x is PooledQuestion => !!x);
    return {
      kind: 'mistakes',
      title: 'Analyse deiner letzten Fehler',
      text:
        wrong.length === 0
          ? 'Aktuell gibt es keine offenen falsch beantworteten Fragen. Sehr gut!'
          : wrong.map((w) => `**Frage:** ${plain(w.question.prompt)}\n**Erklärung:** ${plain(w.question.explanation)}`).join('\n\n'),
      links: wrong.map((w) => ({ title: `Wiederholen: ${w.origin.title}`, href: originHref(w) })),
      sources: [],
      basis: 'Deine falsch beantworteten Fragen und die hinterlegten Erklärungen',
      confidence: 'hoch',
    };
  }

  if (/^(quiz|teste mich|frag mich|pruef mich)/.test(nq) || /\bquiz\b/.test(nq)) {
    const topicToks = toks.filter((t) => !['quiz', 'teste', 'frag', 'pruef', 'fragen'].includes(t));
    let pool = questionPool;
    if (topicToks.length) {
      const filtered = questionPool.filter((p) => {
        const hay = normalize(`${p.origin.title} ${p.topics.join(' ')} ${plain(p.question.prompt)}`);
        return topicToks.some((t) => hay.includes(t));
      });
      if (filtered.length >= 3) pool = filtered;
    }
    const quiz = shuffle(pool).slice(0, 5);
    return {
      kind: 'quiz',
      title: topicToks.length ? `Quiz: ${topicToks.join(' ')}` : 'Gemischtes Quiz',
      quiz,
      links: [],
      sources: [],
      basis: 'Fragen aus dem geprüften Fragenpool der Plattform',
      confidence: 'hoch',
    };
  }

  const candidates: Candidate[] = [];

  for (const t of coachTopics) {
    const score = scoreText(toks, normalize(t.keywords.join(' ') + ' ' + t.title), 5);
    if (score > 0)
      candidates.push({
        score: score + 6,
        answer: {
          kind: 'explain',
          title: t.title,
          levels: t.levels,
          links: (t.related ?? []).map((r) => ({ title: r.title, href: refHref(r.kind, r.ref) })),
          sources: t.sources,
          basis: 'Kuratiertes Coach-Thema mit drei Erklärungsebenen',
          confidence: 'hoch',
        },
      });
  }

  for (const g of glossary) {
    const score = scoreText(toks, normalize(`${g.term} ${g.abbr ?? ''}`), 6) + (nq.includes(normalize(g.term)) ? 6 : 0);
    if (score > 0)
      candidates.push({
        score,
        answer: {
          kind: 'explain',
          title: g.abbr ? `${g.term} (${g.abbr})` : g.term,
          levels: {
            einfach: g.simple,
            technisch: g.technical,
            experte: `${g.technical}${g.formula ? `\n\n**Formel:** ${g.formula}` : ''}\n\n**Anwendungsbeispiel:** ${g.example}`,
          },
          links: [
            { title: `Lexikon: ${g.term}`, href: `/lexikon/${g.id}` },
            ...(g.devices ?? []).slice(0, 3).map((d) => ({ title: devices.find((x) => x.id === d)?.name ?? d, href: `/geraete/${d}` })),
          ],
          sources: g.sources ?? [],
          basis: 'Lexikoneintrag der Plattform',
          confidence: 'hoch',
        },
      });
  }

  for (const d of devices) {
    const score = scoreText(toks, normalize([d.name, ...(d.aliases ?? [])].join(' ')), 5);
    if (score > 0)
      candidates.push({
        score: score + 1,
        answer: {
          kind: 'explain',
          title: `So funktioniert: ${d.name}`,
          levels: d.principle,
          links: [{ title: `Geräteprofil: ${d.name}`, href: `/geraete/${d.id}` }, ...(d.moduleId ? [{ title: 'Vollständiges Lernmodul', href: `/modul/${d.moduleId}` }] : [])],
          sources: d.sources,
          basis: 'Geräteprofil (Funktionsprinzip auf drei Ebenen)',
          confidence: 'hoch',
        },
      });
  }

  // Leveled-Blöcke aus Lektionen
  for (const { lesson, module } of lessonIndex.values()) {
    const titleScore = scoreText(toks, normalize(lesson.title), 3);
    for (const b of lesson.blocks) {
      if (b.type !== 'leveled') continue;
      const score = titleScore + scoreText(toks, normalize(b.title ?? ''), 4);
      if (score > 2)
        candidates.push({
          score,
          answer: {
            kind: 'explain',
            title: b.title ?? lesson.title,
            levels: b.levels,
            links: [{ title: `Lektion: ${lesson.title}`, href: `/lektion/${lesson.id}` }],
            sources: lesson.sources,
            basis: `Lektion „${lesson.title}“ im Modul „${module.title}“`,
            confidence: 'mittel',
          },
        });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (best && best.score >= 6) {
    const more = candidates
      .slice(1)
      .filter((c) => c.answer.title !== best.answer.title)
      .slice(0, 3)
      .flatMap((c) => c.answer.links.slice(0, 1));
    return { ...best.answer, links: [...best.answer.links, ...more], confidence: best.score >= 10 ? best.answer.confidence : 'mittel' };
  }

  return {
    kind: 'unknown',
    title: 'Dazu habe ich keine geprüfte Antwort',
    text:
      'Zu dieser Frage finde ich in den geprüften Inhalten der Plattform keine belastbare Erklärung. Ich rate nicht, um dir keine falschen Informationen zu geben. ' +
      'Versuche es mit einem Fachbegriff (z. B. „Ableitstrom“, „Tidalvolumen“) oder nutze die Volltextsuche.',
    links: [{ title: `Volltextsuche: „${question}“`, href: `/suche?q=${encodeURIComponent(question)}` }],
    sources: [],
    basis: 'Keine passenden Inhalte gefunden',
    confidence: 'niedrig',
  };
}

function refHref(kind: string, ref: string): string {
  switch (kind) {
    case 'lesson':
      return `/lektion/${ref}`;
    case 'module':
      return `/modul/${ref}`;
    case 'device':
      return `/geraete/${ref}`;
    case 'sim':
      return `/labor/${ref}`;
    case 'case':
      return `/faelle/${ref}`;
    case 'exam':
      return `/akademie/${ref}`;
    case 'glossary':
      return `/lexikon/${ref}`;
    default:
      return ref.startsWith('/') ? ref : `/${ref}`;
  }
}

export function originHref(p: PooledQuestion): string {
  switch (p.origin.kind) {
    case 'device':
      return `/geraete/${p.origin.ref}`;
    case 'lesson':
      return `/lektion/${p.origin.ref}`;
    case 'equipment':
      return `/messmittel/${p.origin.ref}`;
    case 'hospital':
      return `/krankenhaus/${p.origin.ref}`;
    default:
      return `/akademie/${p.origin.ref}`;
  }
}

/** Kontext für den optionalen LLM-Modus */
export function contextFor(answer: CoachAnswer): string {
  if (!answer.levels) return answer.text ?? '';
  return `${answer.title}\n\nEinfach: ${plain(answer.levels.einfach)}\n\nTechnisch: ${plain(answer.levels.technisch)}\n\nExperte: ${plain(answer.levels.experte)}`;
}
