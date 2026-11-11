# Redaktionsleitfaden – MedTech Academy

Dieser Leitfaden gilt für **alle** Inhalte unter `src/data/` und alle Simulationen unter `src/sims/`.
Das Datenmodell steht in `src/types/content.ts` – es ist der verbindliche Vertrag.

## 1. Grundprinzipien (nicht verhandelbar)

1. **Fachliche Korrektheit vor Umfang.** Lieber weniger, dafür richtig. Keine erfundenen Studien, Normen,
   Normnummern, Grenzwerte, Herstellerangaben, Produktnamen, Modellnummern oder Preise.
2. **Typische Werte kennzeichnen.** `specs` sind *typische Größenordnungen der Geräteklasse* aus Fachliteratur/Normen,
   keine Modellspezifikation. Nur aufnehmen, was du sicher weißt. Im Zweifel weglassen oder als Bereich formulieren.
3. **Preise:** Standard ist `priceStatus: 'unbelegt'` mit aussagekräftigen `costFactors` und `runningCosts`.
   `'belegt'` NUR mit realer, überprüfbarer Quelle (Quellen-ID), Datum und Währung.
4. **Hersteller/Produkte:** Nur reale, bekannte Produktfamilien, bei denen du dir sicher bist
   (z. B. Dräger „Evita“, Hamilton Medical „HAMILTON-C6“, Philips „IntelliVue“, ZOLL „X Series“,
   Stryker „LIFEPAK“, B. Braun „Perfusor“). Im Zweifel nur den Hersteller ohne Produkt nennen.
   Herstellerangaben vs. didaktische Erläuterung klar trennen.
5. **Recht/Normen:** Gesetzliche Pflicht (MDR, MPDG, MPBetreibV) ≠ normative Prüfmethode (DIN EN 62353)
   ≠ Herstellerangabe ≠ Empfehlung. Immer sauber unterscheiden. Paragraphen nur nennen, wenn sicher.
6. **Sicherheit:** Keine Anleitungen zum Überbrücken von Schutzeinrichtungen, zum Eingriff in sicherheitskritische
   Baugruppen oder zu realen Reparaturen ohne Herstellervorgaben. Reale Arbeiten: immer auf Herstellerunterlagen,
   Qualifikation und Vorschriften verweisen. Keine klinischen Handlungsanweisungen am Patienten.
7. **Vereinfachungen offenlegen:** Vereinfachte Modelle mit `callout` Variante `vereinfachung` kennzeichnen.
8. **Keine Patientendaten**, keine realen Fälle. Szenarien sind fiktiv.
9. **Sprache:** Deutsch, klar, aktiv, für Anfänger verständlich und trotzdem fachlich präzise. Fachbegriffe beim ersten
   Auftreten erklären. Einheiten mit SI-Schreibweise und schmalem Abstand („5 cmH₂O“, „0,5 mA“, „100 µA“).
   Dezimalkomma. Tiefgestellte Zeichen als Unicode (O₂, CO₂, H₂O, SpO₂).
10. **Keine Platzhalter** („TODO“, „Lorem ipsum“, „TBD“). Jeder Text ist final.

## 2. Drei Erklärungsebenen (`LeveledText`)

- `einfach`: ohne Vorkenntnisse, Alltagsanalogie, 2–4 Sätze bis kurze Absätze.
- `technisch`: Ausbildung/Studium – Aufbau, Messprinzip, Größen, Einheiten, typische Werte.
- `experte`: Physik/Formeln, Signalverarbeitung, Grenzen & Fehlerquellen, Normbezug.
Absätze mit Leerzeile (`\n\n`) trennen.

## 3. Inline-Syntax in Texten

`**fett**`, `*kursiv*`, `` `code` ``, `[[glossar-id|Text]]` (Lexikon), `[[geraet:device-id|Text]]`,
`[[modul:modul-id|Text]]`, `[[lektion:lektion-id|Text]]`, `[[sim:sim-id|Text]]`.
**Nur auf IDs verlinken, die garantiert existieren** (siehe Listen unten). Ein Test prüft alle Links.

## 4. ID-Konventionen

- kebab-case, nur `a-z0-9-`, keine Umlaute (ä→ae, ö→oe, ü→ue, ß→ss).
- Fragen-IDs global eindeutig mit Präfix des Inhalts: `<device-id>-q1`, `<lektion-id>-q3` …
- Lektions-IDs global eindeutig mit Modulpräfix: `et-ohmsches-gesetz`, `stk-ablauf` …
- Fachbereichs-Lektionen: **`fachbereich-<field-id>`** (werden auf `/fachbereiche/<id>` angezeigt).
- Neue Quellen in einer eigenen Datei `src/data/sources/<bereich>.ts`; IDs vorher gegen
  `src/data/sources/00-kern.ts` und andere Quellendateien prüfen (`grep -r "id: '" src/data/sources`), keine Duplikate.

## 5. Dateikonventionen

| Inhalt | Ordner | Export |
| --- | --- | --- |
| Geräte | `src/data/devices/<kategorie>.ts` | `export default [...] satisfies Device[]` |
| Module | `src/data/modules/<modul-id>.ts` | `export default {...} satisfies Module` (ein Modul pro Datei) |
| Simulationen | `src/sims/<sim-id>.tsx` + Metadaten in `src/data/sims/<thema>.ts` | default-Komponente ohne Props / `SimMeta[]` |
| Quellen | `src/data/sources/<bereich>.ts` | `Source[]` |
| Hersteller | `src/data/manufacturers/*.ts` | `Manufacturer[]` |
| Komponenten | `src/data/components/*.ts` | `ComponentEntry[]` |
| Prüfmittel | `src/data/test-equipment/*.ts` | `TestEquipment[]` |
| Dokumentationsarten | `src/data/docs/*.ts` | `DocType[]` |
| Lexikon | `src/data/glossary/*.ts` | `GlossaryTerm[]` |
| Fehlerbilder | `src/data/faults/*.ts` | `FaultScenario[]` |
| Fälle | `src/data/cases/*.ts` | `TechCase[]` |
| Krankenhaus | `src/data/hospital/*.ts` | `HospitalArea[]` |
| Lernpfade/Prüfungen/Coach | `src/data/paths`, `src/data/exams`, `src/data/coach` | Arrays |

Typen importieren mit `import type { Device } from '../../types/content';` (Pfad relativ anpassen).

## 6. Simulationen (`src/sims/<id>.tsx`)

- React 19 + TypeScript, **keine zusätzlichen npm-Pakete**. Darstellung mit SVG/Canvas und den CSS-Klassen aus
  `src/styles/global.css` (`.control`, `.monitor`, `.card`, `.row`, `.grid`, `.btn`, `.badge`, `.callout` …).
- Physik korrekt modellieren (z. B. Einkompartiment-Lungenmodell: p = V/C + R·V̇ + PEEP), aber Vereinfachungen in
  `SimMeta.simplifications` offenlegen.
- Animation mit `requestAnimationFrame` und Cleanup im `useEffect`. Keine Memory-Leaks.
- Responsive: SVG mit `viewBox` und `width="100%"`.
- Erklärtexte in der Simulation: was passiert gerade und warum.
- Wiederverwendbare Hilfen: `import { Rich } from '../lib/text'`, `import { Callout } from '../components/ui/Common'`.

## 7. Qualitätscheck vor Abgabe

```bash
npx tsc -p . 2>&1 | grep -E "<deine Dateien>"     # keine Typfehler in eigenen Dateien
npx vitest run 2>&1 | grep -E "<deine IDs>"        # keine Fehler zu eigenen IDs
```
