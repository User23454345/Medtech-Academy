/**
 * Content-Registry: sammelt alle Inhaltsdateien automatisch ein.
 * Neue Inhalte = neue Datei im jeweiligen Ordner mit `export default [...]`
 * (bzw. bei Modulen `export default { ... } satisfies Module`).
 */
import type {
  Category,
  CoachTopic,
  ComponentEntry,
  Device,
  DocType,
  Exam,
  FaultScenario,
  Field,
  GlossaryTerm,
  HospitalArea,
  LearningPath,
  Lesson,
  Manufacturer,
  Module,
  Question,
  SimMeta,
  Source,
  TechCase,
  TestEquipment,
} from '../types/content';
import { categories as categoryList } from './categories';
import { fields as fieldList } from './fields';

type Glob<T> = Record<string, { default: T }>;

function collect<T>(glob: Glob<T[]>): T[] {
  return Object.keys(glob)
    .sort()
    .flatMap((k) => glob[k].default ?? []);
}
function collectSingle<T>(glob: Glob<T>): T[] {
  return Object.keys(glob)
    .sort()
    .map((k) => glob[k].default)
    .filter(Boolean);
}
function byId<T extends { id: string }>(list: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const item of list) m.set(item.id, item);
  return m;
}

export const categories: Category[] = categoryList;
export const fields: Field[] = fieldList;

export const devices: Device[] = collect<Device>(import.meta.glob('./devices/*.ts', { eager: true }));
export const modules: Module[] = collectSingle<Module>(import.meta.glob('./modules/*.ts', { eager: true })).sort(
  (a, b) => a.order - b.order,
);
export const sources: Source[] = collect<Source>(import.meta.glob('./sources/*.ts', { eager: true }));
export const manufacturers: Manufacturer[] = collect<Manufacturer>(
  import.meta.glob('./manufacturers/*.ts', { eager: true }),
).sort((a, b) => a.name.localeCompare(b.name, 'de'));
export const componentEntries: ComponentEntry[] = collect<ComponentEntry>(
  import.meta.glob('./components/*.ts', { eager: true }),
);
export const testEquipment: TestEquipment[] = collect<TestEquipment>(
  import.meta.glob('./test-equipment/*.ts', { eager: true }),
);
export const docTypes: DocType[] = collect<DocType>(import.meta.glob('./docs/*.ts', { eager: true }));
export const glossary: GlossaryTerm[] = collect<GlossaryTerm>(
  import.meta.glob('./glossary/*.ts', { eager: true }),
).sort((a, b) => a.term.localeCompare(b.term, 'de'));
export const faults: FaultScenario[] = collect<FaultScenario>(import.meta.glob('./faults/*.ts', { eager: true }));
export const cases: TechCase[] = collect<TechCase>(import.meta.glob('./cases/*.ts', { eager: true }));
export const hospitalAreas: HospitalArea[] = collect<HospitalArea>(
  import.meta.glob('./hospital/*.ts', { eager: true }),
);
export const learningPaths: LearningPath[] = collect<LearningPath>(
  import.meta.glob('./paths/*.ts', { eager: true }),
);
export const exams: Exam[] = collect<Exam>(import.meta.glob('./exams/*.ts', { eager: true }));
export const coachTopics: CoachTopic[] = collect<CoachTopic>(import.meta.glob('./coach/*.ts', { eager: true }));
export const simMetas: SimMeta[] = collect<SimMeta>(import.meta.glob('./sims/*.ts', { eager: true }));

export const deviceById = byId(devices);
export const moduleById = byId(modules);
export const sourceById = byId(sources);
export const manufacturerById = byId(manufacturers);
export const componentById = byId(componentEntries);
export const testEquipmentById = byId(testEquipment);
export const docTypeById = byId(docTypes);
export const glossaryById = byId(glossary);
export const faultById = byId(faults);
export const caseById = byId(cases);
export const hospitalAreaById = byId(hospitalAreas);
export const pathById = byId(learningPaths);
export const examById = byId(exams);
export const simById = byId(simMetas);
export const categoryById = byId(categories);
export const fieldById = byId(fields);

/** Lektion inkl. Modul nachschlagen */
export const lessonIndex = new Map<string, { lesson: Lesson; module: Module }>();
for (const m of modules) for (const l of m.lessons) lessonIndex.set(l.id, { lesson: l, module: m });

export function modulesByArea(area: Module['area']): Module[] {
  return modules.filter((m) => m.area === area);
}

/* ------------------------------------------------------------------ */
/* Fragenpool für Prüfungsakademie & Wiederholung                       */
/* ------------------------------------------------------------------ */

export interface PooledQuestion {
  question: Question;
  /** effektive Topics (eigene + vom Kontext geerbte) */
  topics: string[];
  /** Herkunft für "Wiederholen"-Links */
  origin: { kind: 'device' | 'lesson' | 'equipment' | 'hospital' | 'exam'; ref: string; title: string };
}

function quizQuestionsFromBlocks(blocks: Lesson['blocks']): Question[] {
  return blocks.flatMap((b) => (b.type === 'quiz' ? b.questions : []));
}

export const questionPool: PooledQuestion[] = (() => {
  const pool: PooledQuestion[] = [];
  for (const d of devices) {
    for (const q of d.quiz) {
      pool.push({
        question: q,
        topics: Array.from(new Set([...(q.topics ?? []), 'geraete', `kat-${d.category}`])),
        origin: { kind: 'device', ref: d.id, title: d.name },
      });
    }
  }
  for (const m of modules) {
    for (const l of m.lessons) {
      for (const q of quizQuestionsFromBlocks(l.blocks)) {
        pool.push({
          question: q,
          topics: Array.from(new Set([...(q.topics ?? []), m.topic])),
          origin: { kind: 'lesson', ref: l.id, title: `${m.title}: ${l.title}` },
        });
      }
    }
  }
  for (const t of testEquipment) {
    for (const q of t.quiz) {
      pool.push({
        question: q,
        topics: Array.from(new Set([...(q.topics ?? []), 'messmittel', 'messtechnik'])),
        origin: { kind: 'equipment', ref: t.id, title: t.name },
      });
    }
  }
  for (const h of hospitalAreas) {
    for (const q of h.scenario?.questions ?? []) {
      pool.push({
        question: q,
        topics: Array.from(new Set([...(q.topics ?? []), 'krankenhaus'])),
        origin: { kind: 'hospital', ref: h.id, title: h.name },
      });
    }
  }
  for (const e of exams) {
    for (const q of e.questions ?? []) {
      pool.push({
        question: q,
        topics: Array.from(new Set([...(q.topics ?? []), ...e.topics])),
        origin: { kind: 'exam', ref: e.id, title: e.title },
      });
    }
  }
  return pool;
})();

export const questionById = new Map(questionPool.map((p) => [p.question.id, p]));
