import type { Field } from '../types/content';

/** Die 12 Fachbereiche der Medizintechnik (Bereich "Was ist Medizintechnik?") */
export const fields: Field[] = [
  { id: 'diagnostik', name: 'Diagnostische Medizintechnik', short: 'Messen und Erkennen von Krankheiten', icon: '🩺' },
  { id: 'therapie', name: 'Therapeutische Medizintechnik', short: 'Behandeln mit technischen Mitteln', icon: '💊' },
  { id: 'intensiv-notfall', name: 'Intensiv- & Notfallmedizintechnik', short: 'Lebenserhaltung und Akutversorgung', icon: '🚨' },
  { id: 'bildgebung', name: 'Bildgebende Medizintechnik', short: 'Den Körper sichtbar machen', icon: '🩻' },
  { id: 'labor-ivd', name: 'Labor- & In-vitro-Diagnostik', short: 'Analyse von Proben außerhalb des Körpers', icon: '🧪' },
  { id: 'chirurgie', name: 'Chirurgische Medizintechnik', short: 'Werkzeuge und Systeme für den OP', icon: '🔪' },
  { id: 'rehabilitation', name: 'Rehabilitationstechnik', short: 'Mobilität, Pflege und Teilhabe', icon: '♿' },
  { id: 'dental', name: 'Dentaltechnik', short: 'Technik in der Zahnmedizin', icon: '🦷' },
  { id: 'implantate', name: 'Implantat- & Prothesentechnik', short: 'Technik im und am Körper', icon: '🦾' },
  { id: 'medizin-it', name: 'Medizinische Informationstechnik', short: 'Daten, Netzwerke, Software', icon: '🖥️' },
  { id: 'messtechnik', name: 'Medizinische Messtechnik', short: 'Physiologische Größen erfassen', icon: '📏' },
  { id: 'geraetetechnik', name: 'Gerätetechnik & Instandhaltung', short: 'Betrieb, Prüfung, Service', icon: '🛠️' },
];
