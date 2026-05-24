// Pure TypeScript — no 'use client', safe to import in Server Components

export interface AppSettingsData {
  home: {
    titolo1: string;
    titolo1Maiuscolo: boolean;
    titolo1Colore: string;
    titolo1Size: number;
    titolo1Font: string;
    titolo1Weight: string;
    titolo1LineHeight: number;
    titolo1LetterSpacing: number;
    titolo1Transform: string;
    titolo2: string;
    titolo2Colore: string;
    titolo2Size: number;
    titolo2Font: string;
    titolo2Weight: string;
    titolo2LineHeight: number;
    titolo2LetterSpacing: number;
    titolo2Transform: string;
    cta: string;
    scrollAttivo: boolean;
    scrollNumero: number;
    scrollCollezione: string;
  };
  social: {
    ordine: string[];
    items: Record<string, { visibile: boolean; url: string }>;
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

export const SOCIAL_KEYS = ['instagram', 'facebook', 'pinterest', 'tiktok', 'website', 'podcast'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const DEFAULT_SOCIAL_URLS: Record<string, string> = {
  instagram: 'https://www.instagram.com/onearth_official/',
  facebook:  'https://www.facebook.com/onearthofficial/',
  pinterest: 'https://it.pinterest.com/OnEarth_official/',
  tiktok:    'https://www.tiktok.com/@onearth_official',
  website:   'https://www.on-earth.it',
  podcast:   'https://open.spotify.com/show/3MjWJeGlQFAy2D2D2awo4t',
};

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
  home: {
    titolo1: 'TERRA E LUCE',
    titolo1Maiuscolo: true,
    titolo1Colore: '#1C1C1C',
    titolo1Size: 28,
    titolo1Font: 'system',
    titolo1Weight: 'light',
    titolo1LineHeight: 1.25,
    titolo1LetterSpacing: 2,
    titolo1Transform: 'uppercase',
    titolo2: 'Scopri la collezione casa 2027',
    titolo2Colore: '#1C1C1C',
    titolo2Size: 16,
    titolo2Font: 'system',
    titolo2Weight: 'light',
    titolo2LineHeight: 1.25,
    titolo2LetterSpacing: 1,
    titolo2Transform: 'none',
    cta: 'Apri il catalogo e crea un ordine',
    scrollAttivo: true,
    scrollNumero: 6,
    scrollCollezione: 'CA27',
  },
  social: {
    ordine: [...SOCIAL_KEYS],
    items: Object.fromEntries(
      SOCIAL_KEYS.map((k) => [k, { visibile: true, url: DEFAULT_SOCIAL_URLS[k] }])
    ),
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

  let socialOrdine = [...SOCIAL_KEYS] as string[];
  try {
    const raw = m['social.ordine'];
    if (raw) socialOrdine = JSON.parse(raw);
  } catch { /* keep default */ }

  return {
    home: {
      titolo1: str('home.titolo1', 'TERRA E LUCE'),
      titolo1Maiuscolo: bool('home.titolo1.maiuscolo', true),
      titolo1Colore: str('home.titolo1.colore', '#1C1C1C'),
      titolo1Size: num('home.titolo1.size', 28),
      titolo1Font: str('home.titolo1.font', 'system'),
      titolo1Weight: str('home.titolo1.weight', 'light'),
      titolo1LineHeight: num('home.titolo1.lineHeight', 1.25),
      titolo1LetterSpacing: num('home.titolo1.letterSpacing', 2),
      titolo1Transform: str('home.titolo1.transform', 'uppercase'),
      titolo2: str('home.titolo2', 'Scopri la collezione casa 2027'),
      titolo2Colore: str('home.titolo2.colore', '#1C1C1C'),
      titolo2Size: num('home.titolo2.size', 16),
      titolo2Font: str('home.titolo2.font', 'system'),
      titolo2Weight: str('home.titolo2.weight', 'light'),
      titolo2LineHeight: num('home.titolo2.lineHeight', 1.25),
      titolo2LetterSpacing: num('home.titolo2.letterSpacing', 1),
      titolo2Transform: str('home.titolo2.transform', 'none'),
      cta: str('home.cta', 'Apri il catalogo e crea un ordine'),
      scrollAttivo: bool('home.scrollAttivo', true),
      scrollNumero: num('home.scrollNumero', 6),
      scrollCollezione: str('home.scrollCollezione', 'CA27'),
    },
    social: {
      ordine: socialOrdine,
      items: Object.fromEntries(
        SOCIAL_KEYS.map((k) => [
          k,
          {
            visibile: bool(`social.${k}.visibile`, true),
            url: str(`social.${k}.url`, DEFAULT_SOCIAL_URLS[k]),
          },
        ])
      ),
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
