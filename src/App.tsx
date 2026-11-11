import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import * as P from './pages';

/** HashRouter: funktioniert auf jedem statischen Hosting ohne Server-Rewrites. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<P.Home />} />
          <Route path="dashboard" element={<P.Dashboard />} />
          <Route path="suche" element={<P.SearchPage />} />

          <Route path="medizintechnik" element={<P.AreaPage area="medizintechnik" />} />
          <Route path="fachbereiche/:id" element={<P.FieldPage />} />
          <Route path="geraetemodule" element={<P.AreaPage area="geraetemodul" />} />
          <Route path="grundlagen" element={<P.AreaPage area="grundlagen" />} />
          <Route path="elektronik" element={<P.AreaPage area="elektronik" />} />
          <Route path="instandhaltung" element={<P.AreaPage area="instandhaltung" />} />
          <Route path="pruefung" element={<P.AreaPage area="pruefung" />} />
          <Route path="sicherheit" element={<P.AreaPage area="sicherheit" />} />
          <Route path="modul/:id" element={<P.ModulePage />} />
          <Route path="lektion/:id" element={<P.LessonPage />} />

          <Route path="geraete" element={<P.Catalog />} />
          <Route path="geraete/:id" element={<P.DeviceDetail />} />
          <Route path="vergleich" element={<P.ComparePage />} />

          <Route path="labor" element={<P.LabPage />} />
          <Route path="labor/:id" element={<P.SimPage />} />

          <Route path="instandhaltung/fehler/:id" element={<P.FaultPage />} />
          <Route path="service-labor" element={<P.CaseList mode="service" />} />
          <Route path="faelle" element={<P.CaseList mode="fall" />} />
          <Route path="faelle/:id" element={<P.CasePage />} />
          <Route path="service-management" element={<P.ServiceManagementPage />} />

          <Route path="messmittel" element={<P.TestEquipmentList />} />
          <Route path="messmittel/:id" element={<P.TestEquipmentPage />} />
          <Route path="komponenten" element={<P.ComponentList />} />
          <Route path="komponenten/:id" element={<P.ComponentPage />} />
          <Route path="hersteller" element={<P.ManufacturerList />} />
          <Route path="hersteller/:id" element={<P.ManufacturerPage />} />
          <Route path="dokumentation" element={<P.DocumentationPage />} />
          <Route path="lexikon" element={<P.GlossaryPage />} />
          <Route path="lexikon/:id" element={<P.TermPage />} />
          <Route path="quellen" element={<P.SourcesPage />} />

          <Route path="krankenhaus" element={<P.HospitalPage />} />
          <Route path="krankenhaus/:id" element={<P.HospitalAreaPage />} />

          <Route path="lernpfade" element={<P.PathsPage />} />
          <Route path="spiele" element={<P.GamesPage />} />
          <Route path="akademie" element={<P.ExamsPage />} />
          <Route path="akademie/:id" element={<P.ExamPage />} />
          <Route path="zertifikate" element={<P.CertificatesPage />} />
          <Route path="coach" element={<P.CoachPage />} />
          <Route path="ueber" element={<P.AboutPage />} />
          <Route path="*" element={<P.NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
