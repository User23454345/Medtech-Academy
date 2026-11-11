import { Link } from 'react-router-dom';
import { PageHead } from '../components/ui/Common';
import { devices, glossary, modules, sources, simMetas, cases, faults } from '../data/registry';

export function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <div className="ico-lg">🔎</div>
      <h2>Seite nicht gefunden</h2>
      <p>Der Inhalt existiert (noch) nicht oder wurde verschoben.</p>
      <Link to="/" className="btn">Zur Startseite</Link>
    </div>
  );
}

export function AboutPage() {
  const lessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  return (
    <div className="content narrow" style={{ padding: 0 }}>
      <PageHead kicker="Über die Plattform" title="Qualitätsprinzipien der MedTech Academy" />
      <div className="prose">
        <h3>Wissenschaftliche Zuverlässigkeit</h3>
        <ul>
          <li>Jede umfangreiche Lektion und jedes Geräteprofil nennt seine Quellen ({sources.length} Einträge im <Link to="/quellen">Quellenverzeichnis</Link>) und zeigt den Inhaltsstand.</li>
          <li>Keine erfundenen Studien, Normen, Grenzwerte oder Herstellerangaben. Technische Daten sind als <em>typische Größenordnungen</em> der Geräteklasse gekennzeichnet; verbindlich sind Herstellerdatenblätter.</li>
          <li><strong>Preise:</strong> Wo keine öffentlich belegten Preisangaben mit Quelle und Datum vorliegen, zeigen wir das offen an und erklären stattdessen die Preisfaktoren.</li>
          <li><strong>Bilder:</strong> Alle Abbildungen sind schematische Eigenillustrationen und als solche gekennzeichnet. Herstellerfotos werden aus urheberrechtlichen Gründen nicht eingebunden; die Profile verlinken auf die offiziellen Herstellerseiten.</li>
          <li>Vereinfachte Modelle sind als „Vereinfachtes Modell“ gekennzeichnet; jede Simulation nennt ihre Vereinfachungen.</li>
          <li>Rechtliche Inhalte unterscheiden zwischen gesetzlicher Pflicht, normativer Prüfmethode, Herstellerangabe und Empfehlung. Maßgeblich ist stets die aktuelle Fassung.</li>
        </ul>
        <h3>Sicherheit</h3>
        <p>Die Plattform vermittelt Verständnis – sie ersetzt keine Herstellerschulung, keine Einweisung nach MPBetreibV und keine Qualifikation für reale Prüfungen oder Reparaturen. Anleitungen zum Umgehen von Schutzmechanismen gibt es hier grundsätzlich nicht.</p>
        <h3>Umfang (aktueller Stand)</h3>
        <ul>
          <li>{devices.length} Geräteprofile · {modules.length} Module mit {lessons} Lektionen</li>
          <li>{simMetas.length} Simulationen · {cases.length} technische Fälle · {faults.length} Diagnosebäume</li>
          <li>{glossary.length} Lexikonbegriffe</li>
        </ul>
        <h3>Datenschutz</h3>
        <p>Dein Lernfortschritt wird ausschließlich lokal im Browser (localStorage) gespeichert. Es gibt kein Konto und kein Tracking. Im Dashboard kannst du deinen Fortschritt exportieren, importieren oder löschen.</p>
        <h3>Erweiterbarkeit</h3>
        <p>Alle Inhalte sind typisierte Datendateien in <code>src/data/</code>. Ein neues Gerät, Modul oder Lexikonbegriff wird durch eine neue Datei bzw. einen neuen Eintrag ergänzt – ohne Änderungen am Programmcode. Details in der README.</p>
      </div>
    </div>
  );
}
