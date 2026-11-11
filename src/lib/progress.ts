/**
 * Lernfortschritt – lokal im Browser (localStorage), kein Server nötig.
 * Store mit useSyncExternalStore; alle Schreibzugriffe laufen über `update`.
 */
import { useSyncExternalStore } from 'react';
import type { ExplainLevel } from '../types/content';

const KEY = 'mta-progress-v1';

export interface QuestionStat {
  correct: number;
  wrong: number;
  /** Leitner-Box 0–4 (0 = sofort wiederholen) */
  box: number;
  last: number; // Zeitstempel
}

export interface QuizRecord {
  attempts: number;
  best: number; // Prozent
  last: number; // Prozent
  at: number;
}

export interface HistoryEntry {
  at: number;
  kind: 'lesson' | 'quiz' | 'sim' | 'case' | 'fault' | 'exam' | 'game' | 'device' | 'badge' | 'task';
  ref: string;
  title: string;
  xp: number;
  detail?: string;
}

export interface ProgressState {
  xp: number;
  completedLessons: Record<string, number>;
  visitedDevices: Record<string, number>;
  completedSims: Record<string, number>;
  solvedCases: Record<string, { at: number; score: number }>;
  solvedFaults: Record<string, number>;
  quizzes: Record<string, QuizRecord>;
  exams: Record<string, QuizRecord & { passed: boolean }>;
  questions: Record<string, QuestionStat>;
  badges: Record<string, number>;
  streak: { current: number; best: number; lastDay: string };
  /** erledigte Tagesaufgaben je Tag "JJJJ-MM-TT" */
  dailyDone: Record<string, string[]>;
  activePaths: string[];
  explainLevel: ExplainLevel;
  difficulty: 1 | 2 | 3;
  displayName: string;
  history: HistoryEntry[];
}

const initial: ProgressState = {
  xp: 0,
  completedLessons: {},
  visitedDevices: {},
  completedSims: {},
  solvedCases: {},
  solvedFaults: {},
  quizzes: {},
  exams: {},
  questions: {},
  badges: {},
  streak: { current: 0, best: 0, lastDay: '' },
  dailyDone: {},
  activePaths: [],
  explainLevel: 'technisch',
  difficulty: 1,
  displayName: '',
  history: [],
};

function load(): ProgressState {
  if (typeof localStorage === 'undefined') return structuredClone(initial);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(initial);
    return { ...structuredClone(initial), ...JSON.parse(raw) };
  } catch {
    return structuredClone(initial);
  }
}

let state: ProgressState = load();
const listeners = new Set<() => void>();
type Toast = { id: number; text: string; icon: string };
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Speicher voll oder deaktiviert – Fortschritt bleibt nur in dieser Sitzung */
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getState(): ProgressState {
  return state;
}

export function update(fn: (draft: ProgressState) => void) {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  checkBadges();
  persist();
  emit();
}

export function useProgress<T>(selector: (s: ProgressState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(initial),
  );
}

export function resetProgress() {
  state = structuredClone(initial);
  persist();
  emit();
}

export function exportProgress(): string {
  return JSON.stringify(state, null, 2);
}

export function importProgress(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.xp !== 'number') return false;
    state = { ...structuredClone(initial), ...parsed };
    persist();
    emit();
    return true;
  } catch {
    return false;
  }
}

/* ---------------- Toasts (XP-/Abzeichen-Meldungen) ---------------- */

export function pushToast(text: string, icon = '⭐') {
  const id = Math.random();
  toasts = [...toasts, { id, text, icon }];
  for (const l of toastListeners) l();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    for (const l of toastListeners) l();
  }, 3800);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
}

/* ---------------- Datum & Serien ---------------- */

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function touchStreak(s: ProgressState) {
  const t = today();
  if (s.streak.lastDay === t) return;
  const gap = s.streak.lastDay ? daysBetween(s.streak.lastDay, t) : Infinity;
  s.streak.current = gap === 1 ? s.streak.current + 1 : 1;
  s.streak.best = Math.max(s.streak.best, s.streak.current);
  s.streak.lastDay = t;
}

/* ---------------- Level ---------------- */

export const LEVELS = [
  { level: 1, xp: 0, title: 'Neugierige:r Einsteiger:in' },
  { level: 2, xp: 100, title: 'Geräte-Entdecker:in' },
  { level: 3, xp: 250, title: 'Technik-Lehrling' },
  { level: 4, xp: 500, title: 'Messtechnik-Kenner:in' },
  { level: 5, xp: 900, title: 'Service-Assistent:in' },
  { level: 6, xp: 1400, title: 'Fehlerdiagnostiker:in' },
  { level: 7, xp: 2100, title: 'Prüftechnik-Profi' },
  { level: 8, xp: 3000, title: 'Medizintechnik-Spezialist:in' },
  { level: 9, xp: 4200, title: 'Medizintechnik-Expert:in' },
  { level: 10, xp: 6000, title: 'MedTech-Meister:in' },
];

export function levelFor(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) current = l;
  const next = LEVELS.find((l) => l.xp > xp);
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  return { ...current, next, progress };
}

/* ---------------- Aktionen ---------------- */

function addXp(s: ProgressState, xp: number, entry: Omit<HistoryEntry, 'at' | 'xp'>) {
  s.xp += xp;
  touchStreak(s);
  s.history.unshift({ ...entry, at: Date.now(), xp });
  if (s.history.length > 300) s.history.length = 300;
}

export function completeLesson(id: string, title: string) {
  if (state.completedLessons[id]) return;
  update((s) => {
    s.completedLessons[id] = Date.now();
    addXp(s, 20, { kind: 'lesson', ref: id, title });
  });
  pushToast(`Lektion abgeschlossen: +20 XP`, '📘');
}

export function visitDevice(id: string, title: string) {
  if (state.visitedDevices[id]) return;
  update((s) => {
    s.visitedDevices[id] = Date.now();
    addXp(s, 5, { kind: 'device', ref: id, title });
  });
}

export function completeSim(id: string, title: string) {
  if (state.completedSims[id]) return;
  update((s) => {
    s.completedSims[id] = Date.now();
    addXp(s, 25, { kind: 'sim', ref: id, title });
  });
  pushToast(`Simulation erkundet: +25 XP`, '🧪');
}

export function solveCase(id: string, title: string, score: number) {
  const first = !state.solvedCases[id];
  update((s) => {
    const prev = s.solvedCases[id];
    s.solvedCases[id] = { at: Date.now(), score: Math.max(score, prev?.score ?? 0) };
    if (first) addXp(s, Math.round(20 + score * 0.3), { kind: 'case', ref: id, title, detail: `${score} Punkte` });
  });
  if (first) pushToast(`Fall gelöst: +${Math.round(20 + score * 0.3)} XP`, '🔧');
}

export function solveFault(id: string, title: string) {
  if (state.solvedFaults[id]) return;
  update((s) => {
    s.solvedFaults[id] = Date.now();
    addXp(s, 20, { kind: 'fault', ref: id, title });
  });
  pushToast(`Diagnosebaum gelöst: +20 XP`, '🩺');
}

export function recordGame(id: string, title: string, percent: number) {
  update((s) => {
    const key = `game:${id}`;
    const prev = s.quizzes[key];
    const first = !prev;
    s.quizzes[key] = {
      attempts: (prev?.attempts ?? 0) + 1,
      best: Math.max(prev?.best ?? 0, percent),
      last: percent,
      at: Date.now(),
    };
    addXp(s, first ? Math.round(10 + percent / 10) : 3, { kind: 'game', ref: id, title, detail: `${percent} %` });
  });
}

/**
 * Ergebnis eines Quiz speichern.
 * results: Frage-ID → richtig?
 */
export function recordQuiz(
  quizKey: string,
  title: string,
  results: Record<string, boolean>,
  kind: 'quiz' | 'exam' = 'quiz',
  passPercent = 60,
) {
  const ids = Object.keys(results);
  if (ids.length === 0) return 0;
  const correct = ids.filter((id) => results[id]).length;
  const percent = Math.round((correct / ids.length) * 100);
  const isFirst = kind === 'quiz' ? !state.quizzes[quizKey] : !state.exams[quizKey];
  const xp = isFirst ? correct * 5 + (percent === 100 ? 15 : 0) : Math.max(2, correct);
  update((s) => {
    const now = Date.now();
    for (const id of ids) {
      const q = s.questions[id] ?? { correct: 0, wrong: 0, box: 0, last: 0 };
      if (results[id]) {
        q.correct += 1;
        q.box = Math.min(4, q.box + 1);
      } else {
        q.wrong += 1;
        q.box = 0;
      }
      q.last = now;
      s.questions[id] = q;
    }
    const store = kind === 'quiz' ? s.quizzes : s.exams;
    const prev = store[quizKey];
    const rec = {
      attempts: (prev?.attempts ?? 0) + 1,
      best: Math.max(prev?.best ?? 0, percent),
      last: percent,
      at: now,
    };
    if (kind === 'exam') s.exams[quizKey] = { ...rec, passed: (s.exams[quizKey]?.passed ?? false) || percent >= passPercent };
    else s.quizzes[quizKey] = rec;
    addXp(s, xp, { kind, ref: quizKey, title, detail: `${correct}/${ids.length} richtig` });
  });
  pushToast(`${correct}/${ids.length} richtig · +${xp} XP`, percent >= 80 ? '🏆' : '✅');
  return percent;
}

export function setExplainLevel(level: ExplainLevel) {
  update((s) => {
    s.explainLevel = level;
  });
}

export function setDifficulty(d: 1 | 2 | 3) {
  update((s) => {
    s.difficulty = d;
  });
}

export function setDisplayName(name: string) {
  update((s) => {
    s.displayName = name.slice(0, 60);
  });
}

export function togglePath(id: string) {
  update((s) => {
    s.activePaths = s.activePaths.includes(id) ? s.activePaths.filter((p) => p !== id) : [...s.activePaths, id];
  });
}

export function completeDailyTask(taskId: string, title: string, xp: number) {
  const t = today();
  if (state.dailyDone[t]?.includes(taskId)) return;
  update((s) => {
    s.dailyDone[t] = [...(s.dailyDone[t] ?? []), taskId];
    addXp(s, xp, { kind: 'task', ref: taskId, title });
  });
  pushToast(`Aufgabe erledigt: +${xp} XP`, '🎯');
}

/** Fragen, die zur Wiederholung fällig sind (Leitner-System) */
export function dueQuestionIds(s: ProgressState, now = Date.now()): string[] {
  const intervals = [0, 1, 3, 7, 16].map((d) => d * 86400000);
  return Object.entries(s.questions)
    .filter(([, q]) => q.wrong > 0 || q.box < 4)
    .filter(([, q]) => now - q.last >= intervals[q.box])
    .sort((a, b) => a[1].box - b[1].box || b[1].wrong - a[1].wrong)
    .map(([id]) => id);
}

/* ---------------- Abzeichen ---------------- */

export interface BadgeDef {
  id: string;
  title: string;
  icon: string;
  description: string;
  test: (s: ProgressState) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'erste-lektion', title: 'Erster Schritt', icon: '🌱', description: 'Erste Lektion abgeschlossen', test: (s) => Object.keys(s.completedLessons).length >= 1 },
  { id: 'zehn-lektionen', title: 'Wissensdurst', icon: '📚', description: '10 Lektionen abgeschlossen', test: (s) => Object.keys(s.completedLessons).length >= 10 },
  { id: 'fuenfzig-lektionen', title: 'Bücherwurm', icon: '🎓', description: '50 Lektionen abgeschlossen', test: (s) => Object.keys(s.completedLessons).length >= 50 },
  { id: 'geraete-10', title: 'Geräte-Scout', icon: '🔎', description: '10 Geräteprofile angesehen', test: (s) => Object.keys(s.visitedDevices).length >= 10 },
  { id: 'geraete-50', title: 'Katalog-Kenner:in', icon: '🗂️', description: '50 Geräteprofile angesehen', test: (s) => Object.keys(s.visitedDevices).length >= 50 },
  { id: 'geraete-100', title: 'Gerätepark-Profi', icon: '🏥', description: '100 Geräteprofile angesehen', test: (s) => Object.keys(s.visitedDevices).length >= 100 },
  { id: 'sim-1', title: 'Laborant:in', icon: '🧪', description: 'Erste Simulation erkundet', test: (s) => Object.keys(s.completedSims).length >= 1 },
  { id: 'sim-5', title: 'Simulations-Fan', icon: '🎛️', description: '5 Simulationen erkundet', test: (s) => Object.keys(s.completedSims).length >= 5 },
  { id: 'fall-1', title: 'Fehlerjäger:in', icon: '🔧', description: 'Ersten technischen Fall gelöst', test: (s) => Object.keys(s.solvedCases).length >= 1 },
  { id: 'fall-10', title: 'Service-Held:in', icon: '🛠️', description: '10 technische Fälle gelöst', test: (s) => Object.keys(s.solvedCases).length >= 10 },
  { id: 'diagnose-5', title: 'Systematiker:in', icon: '🌳', description: '5 Diagnosebäume gelöst', test: (s) => Object.keys(s.solvedFaults).length >= 5 },
  { id: 'perfekt', title: 'Volltreffer', icon: '🎯', description: 'Ein Quiz mit 100 % abgeschlossen', test: (s) => Object.values(s.quizzes).some((q) => q.best === 100) },
  { id: 'pruefung-1', title: 'Geprüft', icon: '📜', description: 'Erste Prüfung bestanden', test: (s) => Object.values(s.exams).some((e) => e.passed) },
  { id: 'serie-3', title: 'Dranbleiber:in', icon: '🔥', description: '3 Tage Lernserie', test: (s) => s.streak.best >= 3 },
  { id: 'serie-7', title: 'Wochenserie', icon: '⚡', description: '7 Tage Lernserie', test: (s) => s.streak.best >= 7 },
  { id: 'xp-1000', title: 'Tausender', icon: '💎', description: '1000 XP gesammelt', test: (s) => s.xp >= 1000 },
];

function checkBadges() {
  const fresh: BadgeDef[] = [];
  for (const b of BADGES) {
    if (!state.badges[b.id] && b.test(state)) {
      state.badges[b.id] = Date.now();
      state.history.unshift({ at: Date.now(), kind: 'badge', ref: b.id, title: b.title, xp: 0 });
      fresh.push(b);
    }
  }
  for (const b of fresh) setTimeout(() => pushToast(`Abzeichen: ${b.title}`, b.icon), 400);
}
