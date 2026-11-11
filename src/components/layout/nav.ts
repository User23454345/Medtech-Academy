export interface NavItem {
  to: string;
  label: string;
  icon: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Übersicht',
    items: [
      { to: '/', label: 'Start', icon: '🏠' },
      { to: '/dashboard', label: 'Mein Dashboard', icon: '📊' },
      { to: '/lernpfade', label: 'Lernpfade', icon: '🧭' },
      { to: '/coach', label: 'KI-Lerncoach', icon: '🤖' },
    ],
  },
  {
    title: 'Entdecken',
    items: [
      { to: '/medizintechnik', label: 'Was ist Medizintechnik?', icon: '🌍' },
      { to: '/geraete', label: 'Geräte-Katalog', icon: '🗂️' },
      { to: '/labor', label: 'Technik-Labor', icon: '🧪' },
      { to: '/krankenhaus', label: 'Virtuelles Krankenhaus', icon: '🏥' },
    ],
  },
  {
    title: 'Lernen',
    items: [
      { to: '/geraetemodule', label: 'Gerätemodule', icon: '🫀' },
      { to: '/grundlagen', label: 'Technische Grundlagen', icon: '⚡' },
      { to: '/elektronik', label: 'Elektronik & Schaltungen', icon: '🔌' },
      { to: '/sicherheit', label: 'Sicherheit & Risiko', icon: '🛡️' },
    ],
  },
  {
    title: 'Service & Prüfung',
    items: [
      { to: '/instandhaltung', label: 'Instandhaltung', icon: '🛠️' },
      { to: '/service-labor', label: 'Service-Labor', icon: '🔧' },
      { to: '/pruefung', label: 'STK, MTK & Prüfung', icon: '✅' },
      { to: '/messmittel', label: 'Messgeräte & Prüfmittel', icon: '📟' },
      { to: '/service-management', label: 'Service-Management', icon: '📋' },
    ],
  },
  {
    title: 'Wissen',
    items: [
      { to: '/faelle', label: 'Fallbibliothek', icon: '📁' },
      { to: '/komponenten', label: 'Komponenten', icon: '⚙️' },
      { to: '/hersteller', label: 'Hersteller', icon: '🏭' },
      { to: '/dokumentation', label: 'Technische Doku', icon: '📄' },
      { to: '/lexikon', label: 'Lexikon', icon: '📖' },
      { to: '/quellen', label: 'Quellen', icon: '📚' },
    ],
  },
  {
    title: 'Üben',
    items: [
      { to: '/spiele', label: 'Lernspiele', icon: '🎮' },
      { to: '/akademie', label: 'Prüfungsakademie', icon: '🎓' },
      { to: '/zertifikate', label: 'Zertifikate', icon: '📜' },
    ],
  },
];
