import type { Category } from '../types/content';

/** Gerätekategorien des Katalogs. Farben sind Akzentfarben für Karten. */
export const categories: Category[] = [
  { id: 'beatmung', name: 'Intensivmedizin & Beatmung', short: 'Beatmung, Anästhesie, Sauerstofftherapie', icon: '🫁', color: '#0e7490' },
  { id: 'monitoring', name: 'Monitoring & Patientenüberwachung', short: 'Vitalparameter, Elektrophysiologie, Hämodynamik', icon: '📈', color: '#1d4ed8' },
  { id: 'notfall', name: 'Notfall- & Rettungsmedizin', short: 'Defibrillation, Reanimation, präklinische Versorgung', icon: '🚑', color: '#b91c1c' },
  { id: 'infusion', name: 'Infusions- & Medikamententechnik', short: 'Pumpen, Dosiersysteme, Ernährung', icon: '💧', color: '#0891b2' },
  { id: 'bildgebung', name: 'Bildgebende Diagnostik', short: 'Röntgen, CT, MRT, Ultraschall, Nuklearmedizin', icon: '🩻', color: '#4338ca' },
  { id: 'labor', name: 'Labor & In-vitro-Diagnostik', short: 'Analysatoren, POCT, Mikroskopie, Molekulardiagnostik', icon: '🧪', color: '#7c3aed' },
  { id: 'chirurgie', name: 'Chirurgie & Therapie', short: 'HF-Chirurgie, Endoskopie, Laser, OP-Ausstattung', icon: '🔬', color: '#0f766e' },
  { id: 'kreislauf', name: 'Nierenersatz & Kreislaufunterstützung', short: 'Dialyse, ECMO, Herz-Lungen-Maschine', icon: '❤️', color: '#be123c' },
  { id: 'reha', name: 'Rehabilitation & Pflege', short: 'Pflegebetten, Mobilität, Elektrotherapie', icon: '♿', color: '#15803d' },
  { id: 'implantate', name: 'Implantate & Prothetik', short: 'Aktive Implantate, Neurostimulation, Prothesen', icon: '🦾', color: '#9333ea' },
  { id: 'dental', name: 'Dentaltechnik', short: 'Behandlungseinheiten, Dentalröntgen, Scanner', icon: '🦷', color: '#0369a1' },
  { id: 'it', name: 'Medizinische Informationstechnik', short: 'PACS, PDMS, Vernetzung, Alarmierung', icon: '🖧', color: '#334155' },
  { id: 'aufbereitung', name: 'Neonatologie, Aufbereitung & Infrastruktur', short: 'Inkubatoren, Sterilisation, Gase, Kühlung', icon: '🏥', color: '#a16207' },
];
