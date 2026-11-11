/**
 * Tages- und Wochenaufgaben, Empfehlungen und Wissenslücken-Analyse.
 * Alles wird aus dem lokalen Fortschritt abgeleitet.
 */
import { devices, lessonIndex, modules, questionById, categories, learningPaths } from '../data/registry';
import type { ProgressState } from './progress';
import { dueQuestionIds, today } from './progress';
import { hashString, seededShuffle } from './util';

export interface Task {
  id: string;
  title: string;
  description: string;
  xp: number;
  href: string;
  /** aktueller Stand / Ziel */
  progress: (s: ProgressState) => [number, number];
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Montag = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
export function weekKey(d = new Date()) {
  return 'W' + today(new Date(startOfWeek(d)));
}

function countSince(s: ProgressState, kind: string, since: number, ref?: string) {
  return s.history.filter((h) => h.kind === kind && h.at >= since && (!ref || h.ref === ref)).length;
}

export function deviceOfTheDay(date = today()) {
  if (devices.length === 0) return undefined;
  return seededShuffle(devices, hashString(date))[0];
}

export function dailyTasks(date = today()): Task[] {
  const dev = deviceOfTheDay(date);
  const since = startOfDay();
  const tasks: Task[] = [];
  if (dev) {
    tasks.push({
      id: `geraet-${dev.id}`,
      title: `Gerät des Tages: ${dev.name}`,
      description: 'Öffne das Geräteprofil und lies das Funktionsprinzip.',
      xp: 10,
      href: `/geraete/${dev.id}`,
      progress: (s) => [s.dailyDone[date]?.includes(`geraet-${dev.id}`) ? 1 : 0, 1],
    });
  }
  tasks.push({
    id: 'quiz',
    title: 'Ein Quiz abschließen',
    description: 'Beliebiger Wissenstest in Lektionen oder Geräteprofilen.',
    xp: 10,
    href: '/geraete',
    progress: (s) => [Math.min(1, countSince(s, 'quiz', since)), 1],
  });
  tasks.push({
    id: 'wiederholung',
    title: 'Wiederholung: 5 Fragen',
    description: 'Festige Wissen aus früheren Quizzen (Leitner-System).',
    xp: 15,
    href: '/dashboard#wiederholen',
    progress: (s) => [s.dailyDone[date]?.includes('wiederholung') ? 1 : 0, 1],
  });
  return tasks;
}

export function weeklyTasks(): Task[] {
  const since = startOfWeek();
  return [
    { id: 'w-lektionen', title: '5 Lektionen abschließen', description: 'In beliebigen Bereichen.', xp: 40, href: '/grundlagen', progress: (s) => [Math.min(5, countSince(s, 'lesson', since)), 5] },
    { id: 'w-fall', title: '2 technische Fälle lösen', description: 'Service-Labor oder Fallbibliothek.', xp: 40, href: '/service-labor', progress: (s) => [Math.min(2, countSince(s, 'case', since)), 2] },
    { id: 'w-sim', title: '2 Simulationen erkunden', description: 'Im Technik-Labor.', xp: 30, href: '/labor', progress: (s) => [Math.min(2, countSince(s, 'sim', since)), 2] },
    { id: 'w-geraete', title: '10 Geräteprofile ansehen', description: 'Im Geräte-Katalog.', xp: 30, href: '/geraete', progress: (s) => [Math.min(10, countSince(s, 'device', since)), 10] },
  ];
}

/* ---------------- Wissenslücken ---------------- */

export interface TopicStat {
  topic: string;
  correct: number;
  wrong: number;
  ratio: number;
}

export const TOPIC_LABEL: Record<string, string> = {
  geraete: 'Geräte allgemein',
  medizintechnik: 'Grundlagen der Medizintechnik',
  elektrotechnik: 'Elektrotechnik',
  elektronik: 'Elektronik',
  physik: 'Physik',
  messtechnik: 'Messtechnik',
  medizin: 'Anatomie & Physiologie',
  stk: 'STK',
  mtk: 'MTK',
  pruefung: 'Prüfverfahren',
  recht: 'Medizinprodukterecht',
  instandhaltung: 'Instandhaltung',
  sicherheit: 'Technische Sicherheit',
  risiko: 'Risikomanagement',
  dokumentation: 'Technische Dokumentation',
  messmittel: 'Messgeräte & Prüfmittel',
  krankenhaus: 'Krankenhaus-Medizintechnik',
  geraetefunktion: 'Gerätefunktionsprinzipien',
  beatmung: 'Beatmung',
  monitoring: 'Monitoring',
  defibrillation: 'Defibrillation',
  infusion: 'Infusionstechnik',
  ekg: 'EKG',
};

export function topicLabel(t: string): string {
  if (TOPIC_LABEL[t]) return TOPIC_LABEL[t];
  if (t.startsWith('kat-')) return categories.find((c) => c.id === t.slice(4))?.name ?? t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function topicStats(s: ProgressState): TopicStat[] {
  const acc = new Map<string, { correct: number; wrong: number }>();
  for (const [qid, stat] of Object.entries(s.questions)) {
    const pooled = questionById.get(qid);
    if (!pooled) continue;
    for (const t of pooled.topics) {
      const a = acc.get(t) ?? { correct: 0, wrong: 0 };
      a.correct += stat.correct;
      a.wrong += stat.wrong;
      acc.set(t, a);
    }
  }
  return Array.from(acc.entries())
    .map(([topic, v]) => ({ topic, ...v, ratio: v.correct / Math.max(1, v.correct + v.wrong) }))
    .sort((a, b) => a.ratio - b.ratio);
}

export function knowledgeGaps(s: ProgressState): TopicStat[] {
  return topicStats(s).filter((t) => t.correct + t.wrong >= 2 && t.ratio < 0.7);
}

/* ---------------- Empfehlungen ---------------- */

export interface Recommendation {
  title: string;
  reason: string;
  href: string;
  icon: string;
}

export function recommendations(s: ProgressState): Recommendation[] {
  const recs: Recommendation[] = [];
  const due = dueQuestionIds(s);
  if (due.length > 0) {
    recs.push({ title: `${Math.min(due.length, 10)} Fragen wiederholen`, reason: 'Fällig nach dem Leitner-System – so bleibt Wissen langfristig.', href: '/dashboard#wiederholen', icon: '🔁' });
  }
  for (const gap of knowledgeGaps(s).slice(0, 2)) {
    const mod = modules.find((m) => m.topic === gap.topic);
    recs.push({
      title: mod ? `Wiederhole: ${mod.title}` : `Wissenslücke: ${topicLabel(gap.topic)}`,
      reason: `Trefferquote bisher ${Math.round(gap.ratio * 100)} % in diesem Thema.`,
      href: mod ? `/modul/${mod.id}` : '/akademie',
      icon: '🩹',
    });
  }
  // Nächste Lektion in aktiven Lernpfaden
  for (const pid of s.activePaths) {
    const p = learningPaths.find((x) => x.id === pid);
    const next = p?.steps.find((st) => !stepDone(s, st.kind, st.ref));
    if (p && next) recs.push({ title: next.title, reason: `Nächster Schritt im Lernpfad „${p.title}“`, href: stepHref(next.kind, next.ref), icon: p.icon });
  }
  // Nächste unerledigte Lektion im ersten begonnenen Modul
  const started = modules.find((m) => m.lessons.some((l) => s.completedLessons[l.id]) && m.lessons.some((l) => !s.completedLessons[l.id]));
  const nextLesson = started?.lessons.find((l) => !s.completedLessons[l.id]);
  if (started && nextLesson) recs.push({ title: nextLesson.title, reason: `Weiter im Modul „${started.title}“`, href: `/lektion/${nextLesson.id}`, icon: started.icon });
  if (recs.length < 3) {
    const first = modules.find((m) => m.area === 'medizintechnik');
    const l = first?.lessons.find((x) => !s.completedLessons[x.id]);
    if (first && l) recs.push({ title: l.title, reason: 'Guter Einstieg in die Welt der Medizintechnik', href: `/lektion/${l.id}`, icon: '🌍' });
  }
  return recs.slice(0, 5);
}

export function stepHref(kind: string, ref: string): string {
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

export function stepDone(s: ProgressState, kind: string, ref: string): boolean {
  switch (kind) {
    case 'lesson':
      return !!s.completedLessons[ref];
    case 'module': {
      const m = modules.find((x) => x.id === ref);
      return !!m && m.lessons.length > 0 && m.lessons.every((l) => s.completedLessons[l.id]);
    }
    case 'device':
      return !!s.visitedDevices[ref];
    case 'sim':
      return !!s.completedSims[ref];
    case 'case':
      return !!s.solvedCases[ref];
    case 'exam':
      return !!s.exams[ref]?.passed;
    default:
      return s.history.some((h) => h.ref === ref);
  }
}

export function lessonTitle(id: string) {
  return lessonIndex.get(id)?.lesson.title ?? id;
}
