/**
 * Zentrales Datenmodell der MedTech Academy.
 *
 * Alle Inhalte (Geräte, Lektionen, Fälle, Lexikon …) sind reine TypeScript-Daten.
 * Neue Inhalte werden hinzugefügt, indem eine Datei im passenden Ordner unter
 * `src/data/` angelegt wird – die Registries sammeln sie automatisch per
 * `import.meta.glob` ein. Es ist keine Änderung am UI-Code nötig.
 *
 * Text-Felder unterstützen eine minimale Inline-Syntax:
 *   **fett**, *kursiv*, `code`, [[glossar-id|Anzeigetext]] (Link ins Lexikon),
 *   [[geraet:device-id|Anzeigetext]] (Link zu einem Geräteprofil).
 */

/** ISO-Datum JJJJ-MM-TT */
export type ISODate = string;

export type ExplainLevel = 'einfach' | 'technisch' | 'experte';
export type Difficulty = 1 | 2 | 3; // 1 = Einsteiger, 2 = Fortgeschritten, 3 = Experte

/** Erklärung auf drei Ebenen (Anfänger / Ausbildung & Studium / Experten). */
export interface LeveledText {
  einfach: string;
  technisch: string;
  experte: string;
}

/* ------------------------------------------------------------------ */
/* Quellen                                                             */
/* ------------------------------------------------------------------ */

export type SourceType =
  | 'buch'
  | 'norm'
  | 'gesetz'
  | 'artikel'
  | 'hersteller'
  | 'behoerde'
  | 'fachgesellschaft'
  | 'web';

export interface Source {
  /** global eindeutig, kebab-case, z. B. "kramme-2017" oder "iec-62353" */
  id: string;
  type: SourceType;
  title: string;
  authors?: string;
  publisher?: string;
  /** Jahr bzw. Ausgabestand, z. B. "2017" oder "2015-10" */
  year?: string;
  edition?: string;
  url?: string;
  /** Datum des letzten Abrufs/der letzten Prüfung bei Online-Quellen */
  accessed?: ISODate;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Quiz & Fragen                                                       */
/* ------------------------------------------------------------------ */

interface QuestionBase {
  /** global eindeutig, z. B. "beatmung-peep-1" */
  id: string;
  prompt: string;
  /** Erklärung, die nach der Antwort angezeigt wird (warum richtig/falsch) */
  explanation: string;
  difficulty?: Difficulty;
  /** Themen-Tags für Prüfungsakademie & Wissenslücken, z. B. "elektrotechnik", "stk" */
  topics?: string[];
}

export interface SingleChoiceQuestion extends QuestionBase {
  kind: 'single';
  options: string[];
  /** Index der richtigen Option */
  answer: number;
  /** optionale Erklärung je falscher Option (gleiche Länge wie options) */
  optionFeedback?: string[];
}
export interface MultiChoiceQuestion extends QuestionBase {
  kind: 'multi';
  options: string[];
  answers: number[];
}
export interface TrueFalseQuestion extends QuestionBase {
  kind: 'truefalse';
  answer: boolean;
}
export interface NumericQuestion extends QuestionBase {
  kind: 'numeric';
  answer: number;
  /** absolute Toleranz */
  tolerance: number;
  unit: string;
}
export interface OrderQuestion extends QuestionBase {
  kind: 'order';
  /** Elemente in der KORREKTEN Reihenfolge – die UI mischt sie */
  items: string[];
}
export interface MatchQuestion extends QuestionBase {
  kind: 'match';
  /** [links, rechts] korrekt zugeordnet – die UI mischt die rechte Seite */
  pairs: [string, string][];
}

export type Question =
  | SingleChoiceQuestion
  | MultiChoiceQuestion
  | TrueFalseQuestion
  | NumericQuestion
  | OrderQuestion
  | MatchQuestion;

/* ------------------------------------------------------------------ */
/* Lektions-Bausteine                                                  */
/* ------------------------------------------------------------------ */

export type CalloutVariant = 'info' | 'merke' | 'praxis' | 'warnung' | 'sicherheit' | 'vereinfachung';

export type Block =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; variant: CalloutVariant; title?: string; text: string }
  /** Ein Abschnitt in drei Erklärungsebenen; der Nutzer wählt die Ebene */
  | { type: 'leveled'; title?: string; levels: LeveledText }
  /** Formel: display = lesbare Formel, z. B. "U = R · I" */
  | { type: 'formula'; display: string; explanation: string; variables?: [string, string][] }
  | { type: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { type: 'steps'; title?: string; steps: { title: string; text: string }[] }
  | { type: 'quiz'; title?: string; questions: Question[] }
  /** Einbettung einer Simulation aus src/sims (Dateiname ohne .tsx) */
  | { type: 'sim'; simId: string; caption?: string }
  /** Verweis auf Geräteprofile */
  | { type: 'devices'; title?: string; deviceIds: string[] }
  /** Praxisbeispiel aus dem Klinikalltag */
  | { type: 'example'; title: string; text: string }
  /** Lernspiel */
  | { type: 'game'; game: Game }
  /** Einfaches Blockschaltbild */
  | { type: 'diagram'; diagram: BlockDiagram; caption: string };

/* ------------------------------------------------------------------ */
/* Lernspiele                                                          */
/* ------------------------------------------------------------------ */

export type Game =
  | { kind: 'match'; title: string; instructions: string; pairs: [string, string][] }
  | { kind: 'order'; title: string; instructions: string; items: string[] }
  | {
      kind: 'categorize';
      title: string;
      instructions: string;
      categories: string[];
      /** [Element, Index der richtigen Kategorie] */
      items: [string, number][];
    };

/* ------------------------------------------------------------------ */
/* Blockschaltbild (vereinfachtes Funktionsdiagramm)                   */
/* ------------------------------------------------------------------ */

export type DiagramNodeKind =
  | 'patient' // Patient / Anwendungsteil
  | 'sensor' // Sensoren, Aufnehmer
  | 'signal' // Signalaufbereitung, Verstärker, Filter, ADC
  | 'control' // Steuerung, Mikrocontroller, Software
  | 'actuator' // Aktoren: Pumpen, Ventile, Motoren, Röhren
  | 'output' // Anzeige, Alarm, Schnittstelle
  | 'power' // Stromversorgung
  | 'supply'; // Medienversorgung (Gase, Wasser, Blut-/Flüssigkeitskreis)

export interface DiagramNode {
  id: string;
  label: string;
  kind: DiagramNodeKind;
  /** Erklärung, die beim Anklicken erscheint */
  info: string;
}
export interface BlockDiagram {
  nodes: DiagramNode[];
  /** [vonId, nachId, optionales Label] */
  edges: [string, string, string?][];
}

/* ------------------------------------------------------------------ */
/* Lektionen & Module                                                  */
/* ------------------------------------------------------------------ */

/** Hauptbereiche der Akademie, in denen Module erscheinen */
export type AreaId =
  | 'medizintechnik' // Was ist Medizintechnik? Fachbereiche, Berufe
  | 'geraetemodul' // Vollständige Gerätelernmodule (Beatmung, Monitor …)
  | 'grundlagen' // Elektrotechnik, Elektronik, Physik, Messtechnik, Medizin
  | 'elektronik' // Elektronik- & Schaltungslabor, Schaltpläne
  | 'instandhaltung' // Wartung, Fehlerdiagnose, Reparatur
  | 'pruefung' // STK, MTK, Prüfverfahren, Recht
  | 'sicherheit' // Medizinprodukte-Sicherheit & Risikomanagement
  | 'dokumentation'; // Technische Dokumentation

export interface Lesson {
  /** global eindeutig */
  id: string;
  title: string;
  summary: string;
  minutes: number;
  difficulty: Difficulty;
  blocks: Block[];
  /** Quellen-IDs (src/data/sources) */
  sources: string[];
  /** Stand der Inhalte */
  updated: ISODate;
  /** Geräte, an denen die Inhalte praktisch relevant sind */
  devices?: string[];
}

export interface Module {
  /** global eindeutig, z. B. "elektrotechnik" */
  id: string;
  area: AreaId;
  title: string;
  description: string;
  /** Emoji oder kurzes Symbol */
  icon: string;
  /** Sortierung innerhalb des Bereichs */
  order: number;
  /** Themen-Tag für Prüfungsakademie */
  topic: string;
  lessons: Lesson[];
  /** Status – 'prototyp' wird im UI sichtbar gekennzeichnet */
  status?: 'vollstaendig' | 'prototyp';
}

/* ------------------------------------------------------------------ */
/* Geräte                                                              */
/* ------------------------------------------------------------------ */

export type CategoryId =
  | 'beatmung'
  | 'monitoring'
  | 'notfall'
  | 'infusion'
  | 'bildgebung'
  | 'labor'
  | 'chirurgie'
  | 'kreislauf'
  | 'reha'
  | 'implantate'
  | 'dental'
  | 'it'
  | 'aufbereitung';

/** Die 12 Fachbereiche aus "Was ist Medizintechnik?" */
export type FieldId =
  | 'diagnostik'
  | 'therapie'
  | 'intensiv-notfall'
  | 'bildgebung'
  | 'labor-ivd'
  | 'chirurgie'
  | 'rehabilitation'
  | 'dental'
  | 'implantate'
  | 'medizin-it'
  | 'messtechnik'
  | 'geraetetechnik';

export interface ManufacturerRef {
  /** ID aus src/data/manufacturers */
  manufacturerId: string;
  /** bekannte Produktfamilien/Modelle dieses Herstellers für diesen Gerätetyp */
  products?: string[];
}

export interface Spec {
  param: string;
  /** typischer Wert bzw. Bereich, z. B. "0–50 cmH₂O" */
  typical: string;
  note?: string;
}

export interface PriceRange {
  segment: 'Einstieg' | 'Mittelklasse' | 'High-End' | 'Gebraucht' | 'Service/Jahr';
  range: string;
  currency: 'EUR' | 'USD';
  /** Stand der Preisangabe */
  date: ISODate;
  sourceId: string;
}

export interface Economics {
  /** Faktoren, die den Preis beeinflussen */
  costFactors: string[];
  /**
   * 'unbelegt' = es liegen noch keine belegten Preise vor (UI zeigt dies offen an).
   * 'belegt'   = priceRanges enthalten Quelle + Datum.
   */
  priceStatus: 'unbelegt' | 'belegt';
  priceRanges?: PriceRange[];
  /** qualitative Hinweise zu Folgekosten, Verbrauchsmaterial, Service */
  runningCosts?: string;
}

export interface MaintenanceInfo {
  /** Typische Prüfungen: STK, MTK, Funktionsprüfung, Herstellerwartung … */
  checks: string[];
  /** Typische Fehlerbilder in der Praxis */
  typicalFaults: string[];
  /** typische Verschleißteile */
  wearParts?: string[];
  /**
   * Einordnung nach MPBetreibV (Anlagen 1/2). Immer als "typisch" zu verstehen –
   * maßgeblich sind Herstellerangaben und die konkrete Zweckbestimmung.
   */
  stk: 'ja' | 'nein' | 'abhaengig';
  mtk: 'ja' | 'nein' | 'abhaengig';
  notes?: string;
}

export interface Device {
  /** global eindeutig, kebab-case */
  id: string;
  name: string;
  aliases?: string[];
  category: CategoryId;
  fields: FieldId[];
  /** Kurzbeschreibung in 1–2 Sätzen (für Karten & Suche) */
  short: string;
  purpose: string;
  applications: string[];
  clinicalRelevance: string;
  history: string;
  /** Funktionsprinzip auf drei Ebenen */
  principle: LeveledText;
  /** Hauptkomponenten (anklickbar im UI) */
  components: { name: string; function: string }[];
  /** vereinfachtes Funktionsdiagramm */
  diagram?: BlockDiagram;
  /** technische Daten als typische Größenordnungen */
  specs: Spec[];
  interfaces?: string[];
  power?: string;
  sensors?: string[];
  safetyFeatures: string[];
  manufacturers: ManufacturerRef[];
  /** Unterschiede zwischen Geräteklassen/Modellen (Einstieg vs. High-End …) */
  modelDifferences?: string;
  economics: Economics;
  maintenance: MaintenanceInfo;
  /** typische Risikoklasse nach MDR, z. B. "IIb" */
  mdrClass?: string;
  /** Relevante Normen/Gesetze als Quellen-IDs */
  standards?: string[];
  quiz: Question[];
  sources: string[];
  updated: ISODate;
  /**
   * 'profil'   = Geräteprofil mit Kerninformationen
   * 'vertieft' = zusätzlich Simulation oder ausführliche Lerninhalte
   * 'vollmodul'= eigenes vollständiges Lernmodul (siehe moduleId)
   */
  depth: 'profil' | 'vertieft' | 'vollmodul';
  /** ID eines vertiefenden Moduls (area 'geraetemodul') */
  moduleId?: string;
  /** IDs von Simulationen aus src/sims */
  sims?: string[];
  /** Lexikon-IDs */
  glossary?: string[];
  /** verwandte Geräte */
  related?: string[];
}

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  icon: string;
  color: string;
}

export interface Field {
  id: FieldId;
  name: string;
  short: string;
  icon: string;
}

/* ------------------------------------------------------------------ */
/* Hersteller, Komponenten, Prüfmittel, Dokumentation                  */
/* ------------------------------------------------------------------ */

export interface Manufacturer {
  id: string;
  name: string;
  country: string;
  founded?: string;
  headquarters?: string;
  website: string;
  profile: string;
  productAreas: string[];
  productFamilies: string[];
  history: string;
  specialties?: string;
  sources: string[];
  updated: ISODate;
}

export interface ComponentEntry {
  id: string;
  name: string;
  group: 'sensorik' | 'aktorik' | 'energie' | 'elektronik' | 'mechanik' | 'fluidik' | 'verbindung' | 'anzeige';
  function: string;
  principle: LeveledText;
  applications: string[];
  failureModes: string[];
  properties: Spec[];
  /** konkrete Gerätebeispiele (Device-IDs) */
  devices: string[];
  /** Hinweise zur Identifikation/Beschaffung als Ersatzteil */
  sparePartNotes?: string;
  sources: string[];
  updated: ISODate;
}

export interface TestEquipment {
  id: string;
  name: string;
  group: 'elektrisch' | 'simulator' | 'kalibrator' | 'durchfluss' | 'allgemein';
  purpose: string;
  principle: LeveledText;
  measures: string[];
  specs: Spec[];
  manufacturers: ManufacturerRef[];
  economics: Economics;
  usage: string[];
  /** Beispielmessung als Lektionsbausteine */
  example: Block[];
  quiz: Question[];
  sims?: string[];
  sources: string[];
  updated: ISODate;
}

export interface DocType {
  id: string;
  name: string;
  purpose: string;
  contents: string[];
  howToRead: string[];
  whereToFind: string;
  legal?: string;
  example?: Block[];
  sources: string[];
  updated: ISODate;
}

/* ------------------------------------------------------------------ */
/* Lexikon                                                             */
/* ------------------------------------------------------------------ */

export type GlossaryCategory =
  | 'technik'
  | 'elektronik'
  | 'medizin'
  | 'physik'
  | 'messtechnik'
  | 'norm-recht'
  | 'abkuerzung'
  | 'it';

export interface GlossaryTerm {
  id: string;
  term: string;
  abbr?: string;
  category: GlossaryCategory;
  simple: string;
  technical: string;
  example: string;
  formula?: string;
  devices?: string[];
  related?: string[];
  sources?: string[];
}

/* ------------------------------------------------------------------ */
/* Fehlerdiagnose & Fälle                                              */
/* ------------------------------------------------------------------ */

export interface DiagNode {
  id: string;
  question: string;
  info?: string;
  options: {
    label: string;
    /** ID des nächsten Knotens */
    next?: string;
    /** oder Ende mit Ergebnis */
    result?: { text: string; resolved: boolean };
  }[];
}

/** Typisches Fehlerbild mit interaktivem Diagnosebaum (Instandhaltung B) */
export interface FaultScenario {
  id: string;
  title: string;
  /** betroffene Gerätegruppen/Device-IDs */
  devices: string[];
  difficulty: Difficulty;
  description: string;
  causes: { cause: string; explanation: string }[];
  /** Startknoten = nodes[0] */
  nodes: DiagNode[];
  technique: string;
  checks: string[];
  documentation: string[];
  qualificationLimits: string;
  sources: string[];
  updated: ISODate;
}

/**
 * Interaktiver technischer Fall (Service-Labor & Fallbibliothek).
 * Der Nutzer wählt Untersuchungsschritte, sammelt Befunde und stellt eine Diagnose.
 */
export interface TechCase {
  id: string;
  title: string;
  deviceId: string;
  difficulty: Difficulty;
  /** 'service' erscheint im virtuellen Service-Labor, 'fall' in der Fallbibliothek, 'beide' in beiden */
  usage: 'service' | 'fall' | 'beide';
  situation: string;
  background: string;
  problem: string;
  measurements: { label: string; value: string }[];
  /** Untersuchungsschritte */
  actions: { id: string; label: string; minutes: number; finding: string; useful: boolean }[];
  /** mögliche Ursachen – genau eine ist korrekt */
  hypotheses: { id: string; text: string; correct: boolean; feedback: string }[];
  result: string;
  explanation: string;
  science: string;
  learnings: string[];
  sources: string[];
  relatedLessons?: string[];
  updated: ISODate;
}

/* ------------------------------------------------------------------ */
/* Virtuelles Krankenhaus                                              */
/* ------------------------------------------------------------------ */

export interface HospitalArea {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Geräte im Raum; x/y in Prozent der Raumfläche (0–100) */
  placements: {
    deviceId: string;
    x: number;
    y: number;
    role: string;
    connections?: string[];
    alarms?: string[];
    safety?: string[];
  }[];
  interplay: string;
  scenario?: { title: string; intro: string; questions: Question[] };
  sources: string[];
  updated: ISODate;
}

/* ------------------------------------------------------------------ */
/* Lernpfade, Prüfungen, Coach                                         */
/* ------------------------------------------------------------------ */

export type PathStepKind = 'lesson' | 'module' | 'device' | 'sim' | 'case' | 'exam' | 'page';

export interface LearningPath {
  id: string;
  title: string;
  audience: string;
  description: string;
  icon: string;
  steps: { kind: PathStepKind; ref: string; title: string }[];
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Fragen werden aus allen Inhalten mit passenden Topic-Tags gezogen … */
  topics: string[];
  /** … plus eigene Fragen */
  questions?: Question[];
  questionCount: number;
  passPercent: number;
  minutes?: number;
}

export interface CoachTopic {
  id: string;
  title: string;
  /** Schlüsselwörter/Synonyme für die Erkennung von Nutzerfragen (klein, ohne Umlaute nötig) */
  keywords: string[];
  levels: LeveledText;
  related?: { kind: PathStepKind | 'glossary'; ref: string; title: string }[];
  sources: string[];
}

/* ------------------------------------------------------------------ */
/* Service-Management-Simulation                                       */
/* ------------------------------------------------------------------ */

export type AssetStatus = 'betriebsbereit' | 'wartung-faellig' | 'pruefung-faellig' | 'instandsetzung' | 'ausser-betrieb';

/* ------------------------------------------------------------------ */
/* Simulationen                                                        */
/* ------------------------------------------------------------------ */

export interface SimMeta {
  /** = Dateiname in src/sims ohne .tsx */
  id: string;
  title: string;
  description: string;
  /** Rubrik im Technik-Labor */
  group: 'geraete' | 'physik' | 'elektronik' | 'pruefung' | 'messtechnik';
  icon: string;
  devices?: string[];
  /** Welches physikalische/technische Prinzip wird gezeigt? */
  principle: string;
  /** Welche Vereinfachungen trifft das Modell? (Transparenz!) */
  simplifications: string;
  status: 'vollstaendig' | 'prototyp';
  sources: string[];
}
