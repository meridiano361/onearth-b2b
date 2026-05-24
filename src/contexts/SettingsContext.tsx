'use client';

import { createContext, useContext } from 'react';

export interface AppSettingsData {
  home: {
    titolo1: string;
    titolo1Maiuscolo: boolean;
    titolo1Colore: string;
    titolo1Size: number;
    titolo2: string;
    titolo2Colore: string;
    titolo2Size: number;
    cta: string;
    scrollAttivo: boolean;
    scrollNumero: number;
    scrollCollezione: string;
  };
  menu: {
    ordine: string[];
    items: Record<string, { label: string; visibile: boolean }>;
  };
  scheda: {
    codice: boolean;
    descrizione: boolean;
    produttore: boolean;
    paese: boolean;
    misure: boolean;
    linea: boolean;
    collezione: boolean;
    colore: boolean;
    temaColore: boolean;
    confezione: boolean;
    iva: boolean;
    prezzoCosto: boolean;
    pvp: boolean;
    fasciaSconto: boolean;
    fasciaRicarico: boolean;
    margine: boolean;
    guadagnoPotenziale: boolean;
    note: boolean;
  };
  card: {
    codice: boolean;
    prezzoCosto: boolean;
    pvp: boolean;
    aggiungi: boolean;
    badgeNuovo: boolean;
    cuoricino: boolean;
  };
  colori: {
    sfondo: string;
    pulsanti: string;
    testoPulsanti: string;
    testo: string;
  };
}

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
  home: {
    titolo1: 'TERRA E LUCE',
    titolo1Maiuscolo: true,
    titolo1Colore: '#1C1C1C',
    titolo1Size: 28,
    titolo2: 'Scopri la collezione casa 2027',
    titolo2Colore: '#1C1C1C',
    titolo2Size: 16,
    cta: 'Apri il catalogo e crea un ordine',
    scrollAttivo: true,
    scrollNumero: 6,
    scrollCollezione: 'CA27',
  },
  menu: {
    ordine: ['catalogo', 'preferiti', 'ordini', 'destinazioni', 'assistenza'],
    items: {
      catalogo: { label: 'Catalogo', visibile: true },
      preferiti: { label: 'Preferiti', visibile: true },
      ordini: { label: 'Ordini', visibile: true },
      destinazioni: { label: 'Destinazioni', visibile: true },
      assistenza: { label: 'Assistenza', visibile: true },
    },
  },
  scheda: {
    codice: true,
    descrizione: true,
    produttore: true,
    paese: true,
    misure: true,
    linea: true,
    collezione: true,
    colore: true,
    temaColore: true,
    confezione: true,
    iva: false,
    prezzoCosto: true,
    pvp: true,
    fasciaSconto: false,
    fasciaRicarico: false,
    margine: false,
    guadagnoPotenziale: true,
    note: false,
  },
  card: {
    codice: true,
    prezzoCosto: true,
    pvp: true,
    aggiungi: true,
    badgeNuovo: true,
    cuoricino: true,
  },
  colori: {
    sfondo: '#F5F0EA',
    pulsanti: '#000000',
    testoPulsanti: '#FFFFFF',
    testo: '#000000',
  },
};

export function parseSettingsFromDb(records: { chiave: string; valore: string }[]): AppSettingsData {
  const m = Object.fromEntries(records.map((r) => [r.chiave, r.valore]));
  const str = (k: string, d: string) => m[k] ?? d;
  const bool = (k: string, d: boolean) => (m[k] === undefined ? d : m[k] === 'true');
  const num = (k: string, d: number) => (m[k] ? Number(m[k]) : d);

  const MENU_KEYS = ['catalogo', 'preferiti', 'ordini', 'destinazioni', 'assistenza'];
  const MENU_LABELS: Record<string, string> = {
    catalogo: 'Catalogo', preferiti: 'Preferiti', ordini: 'Ordini',
    destinazioni: 'Destinazioni', assistenza: 'Assistenza',
  };
  let ordine = MENU_KEYS;
  try {
    const raw = m['menu.ordine'];
    if (raw) ordine = JSON.parse(raw);
  } catch { /* keep default */ }

  return {
    home: {
      titolo1: str('home.titolo1', 'TERRA E LUCE'),
      titolo1Maiuscolo: bool('home.titolo1.maiuscolo', true),
      titolo1Colore: str('home.titolo1.colore', '#1C1C1C'),
      titolo1Size: num('home.titolo1.size', 28),
      titolo2: str('home.titolo2', 'Scopri la collezione casa 2027'),
      titolo2Colore: str('home.titolo2.colore', '#1C1C1C'),
      titolo2Size: num('home.titolo2.size', 16),
      cta: str('home.cta', 'Apri il catalogo e crea un ordine'),
      scrollAttivo: bool('home.scrollAttivo', true),
      scrollNumero: num('home.scrollNumero', 6),
      scrollCollezione: str('home.scrollCollezione', 'CA27'),
    },
    menu: {
      ordine,
      items: Object.fromEntries(
        MENU_KEYS.map((k) => [
          k,
          {
            label: str(`menu.${k}.label`, MENU_LABELS[k] ?? k),
            visibile: bool(`menu.${k}.visibile`, true),
          },
        ])
      ),
    },
    scheda: {
      codice: bool('scheda.codice', true),
      descrizione: bool('scheda.descrizione', true),
      produttore: bool('scheda.produttore', true),
      paese: bool('scheda.paese', true),
      misure: bool('scheda.misure', true),
      linea: bool('scheda.linea', true),
      collezione: bool('scheda.collezione', true),
      colore: bool('scheda.colore', true),
      temaColore: bool('scheda.temaColore', true),
      confezione: bool('scheda.confezione', true),
      iva: bool('scheda.iva', false),
      prezzoCosto: bool('scheda.prezzoCosto', true),
      pvp: bool('scheda.pvp', true),
      fasciaSconto: bool('scheda.fasciaSconto', false),
      fasciaRicarico: bool('scheda.fasciaRicarico', false),
      margine: bool('scheda.margine', false),
      guadagnoPotenziale: bool('scheda.guadagnoPotenziale', true),
      note: bool('scheda.note', false),
    },
    card: {
      codice: bool('card.codice', true),
      prezzoCosto: bool('card.prezzoCosto', true),
      pvp: bool('card.pvp', true),
      aggiungi: bool('card.aggiungi', true),
      badgeNuovo: bool('card.badgeNuovo', true),
      cuoricino: bool('card.cuoricino', true),
    },
    colori: {
      sfondo: str('colori.sfondo', '#F5F0EA'),
      pulsanti: str('colori.pulsanti', '#000000'),
      testoPulsanti: str('colori.testoPulsanti', '#FFFFFF'),
      testo: str('colori.testo', '#000000'),
    },
  };
}

const SettingsContext = createContext<AppSettingsData>(DEFAULT_APP_SETTINGS);

export function SettingsProvider({ value, children }: { value: AppSettingsData; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): AppSettingsData {
  return useContext(SettingsContext);
}
