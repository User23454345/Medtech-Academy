import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Simulationen: jede Datei `src/sims/<id>.tsx` exportiert per default eine
 * React-Komponente ohne Pflicht-Props. Metadaten (Titel, Prinzip,
 * Vereinfachungen) stehen in `src/data/sims/*.ts`.
 * Die Komponenten werden erst bei Bedarf geladen (Code-Splitting).
 */
const loaders = import.meta.glob<{ default: ComponentType }>('./*.tsx');

export const simComponents: Record<string, LazyExoticComponent<ComponentType>> = {};
for (const [path, loader] of Object.entries(loaders)) {
  const id = path.replace('./', '').replace('.tsx', '');
  simComponents[id] = lazy(loader);
}

export function hasSim(id: string): boolean {
  return id in simComponents;
}
