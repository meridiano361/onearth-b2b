export const EMPORI = ['MN', 'RE', 'CR', 'CA', 'VI'] as const;
export type Emporio = typeof EMPORI[number];

export const STRENNA_FOTO: Record<number, string> = {
  30:  '/strenne/strenna-30.svg',
  40:  '/strenne/strenna-40.svg',
  50:  '/strenne/strenna-50.svg',
  70:  '/strenne/strenna-70.svg',
  100: '/strenne/strenna-100.svg',
};

export const CESTI_LICHENS = [
  { codice: '7430', descrizione: 'Rett. medio basso', misure: 'cm 33×23×8h', pvp: 15.00, costo: 3.75,
    giacenze: { CR: 1, RE: 0, CA: 1, VI: 1, MN: 5, TR: 80, HUB: 121 } },
  { codice: '7431', descrizione: 'Rett. grande basso', misure: 'cm 38×28×9h', pvp: 20.00, costo: 5.00,
    giacenze: { CR: 0, RE: 0, CA: 0, VI: 0, MN: 7, TR: 0, HUB: 81 } },
  { codice: '7433', descrizione: 'Rett. medio alto', misure: 'cm 30×19×13h', pvp: 15.00, costo: 3.75,
    giacenze: { CR: 1, RE: 3, CA: 0, VI: 0, MN: 6, TR: 0, HUB: 78 } },
  { codice: '7434', descrizione: 'Rett. grande alto', misure: 'cm 32×22×16h', pvp: 18.00, costo: 4.50,
    giacenze: { CR: 4, RE: 0, CA: 0, VI: 0, MN: 12, TR: 124, HUB: 93 } },
  { codice: '7436', descrizione: 'Medio ovale', misure: '', pvp: 27.00, costo: 6.75,
    giacenze: { CR: 0, RE: 0, CA: 0, VI: 0, MN: 3, TR: 0, HUB: 7 } },
  { codice: '7437', descrizione: 'Grande ovale', misure: '', pvp: 35.00, costo: 8.75,
    giacenze: { CR: 0, RE: 0, CA: 0, VI: 0, MN: 2, TR: 0, HUB: 13 } },
  { codice: '7439', descrizione: 'Rett. maxi medio', misure: 'cm 40×28×22h', pvp: 34.00, costo: 8.50,
    giacenze: { CR: 0, RE: 0, CA: 0, VI: 0, MN: 4, TR: 0, HUB: 25 } },
  { codice: '7440', descrizione: 'Rett. maxi grande', misure: '', pvp: 40.00, costo: 10.00,
    giacenze: { CR: 0, RE: 0, CA: 0, VI: 0, MN: 2, TR: 0, HUB: 21 } },
] as const;

export const STRENNE = [
  {
    barcode: '8051684517997', prezzo: 30, cestoCodice: '7430', costoCesto: 3.75,
    prodotti: [
      { nome: 'Pasta (tipo A)', pvp: 5.00 },
      { nome: 'Sugo al basilico', pvp: 4.50 },
      { nome: 'Salsa Giardiniera', pvp: 4.50 },
      { nome: 'Crema di Zucchine', pvp: 4.50 },
      { nome: 'Torta Sbrisolona Mantovana', pvp: 7.50 },
    ],
    totCosto: 29.75,
    qte: { CR: 20, CA: 4, VI: 4, RE: 15, MN: 30 },
  },
  {
    barcode: '8051684518000', prezzo: 40, cestoCodice: '7433', costoCesto: 3.75,
    prodotti: [
      { nome: 'Pasta (tipo A)', pvp: 5.00 },
      { nome: 'Pomodori datterini', pvp: 4.50 },
      { nome: 'Salsa Giardiniera', pvp: 4.50 },
      { nome: 'Crema di Zucchine', pvp: 4.50 },
      { nome: 'Torta Sbrisolona Mantovana', pvp: 7.50 },
      { nome: 'Pomodorini secchi', pvp: 6.50 },
    ],
    totCosto: 36.25,
    qte: { CR: 15, CA: 3, VI: 3, RE: 10, MN: 20 },
  },
  {
    barcode: '8051684518017', prezzo: 50, cestoCodice: '7434', costoCesto: 4.50,
    prodotti: [
      { nome: 'Pasta (tipo A)', pvp: 5.00 },
      { nome: 'Pomodori datterini', pvp: 4.50 },
      { nome: 'Salsa Giardiniera', pvp: 4.50 },
      { nome: 'Crema di Zucchine', pvp: 4.50 },
      { nome: 'Torta Sbrisolona Mantovana', pvp: 7.50 },
      { nome: 'Miele Millefiori', pvp: 4.50 },
      { nome: 'Olio evo del Parco', pvp: 14.00 },
    ],
    totCosto: 49.00,
    qte: { CR: 15, CA: 3, VI: 3, RE: 10, MN: 20 },
  },
  {
    barcode: '8051684518024', prezzo: 70, cestoCodice: '7434', costoCesto: 4.50,
    prodotti: [
      { nome: 'Pasta (tipo A)', pvp: 5.00 },
      { nome: 'Sugo al basilico', pvp: 4.50 },
      { nome: 'Salsa Giardiniera', pvp: 4.50 },
      { nome: 'Crema di Zucchine', pvp: 4.50 },
      { nome: 'Torta Sbrisolona Mantovana', pvp: 7.50 },
      { nome: 'Miele Millefiori', pvp: 4.50 },
      { nome: 'Olio evo del Parco', pvp: 14.00 },
      { nome: 'Mostarda classica', pvp: 9.00 },
      { nome: 'Spergola', pvp: 10.00 },
    ],
    totCosto: 68.00,
    qte: { CR: 8, CA: 1, VI: 1, RE: 5, MN: 10 },
  },
  {
    barcode: '8051684518031', prezzo: 100, cestoCodice: '7439', costoCesto: 8.50,
    prodotti: [
      { nome: 'Pasta (tipo A)', pvp: 5.00 },
      { nome: 'Sugo al basilico', pvp: 4.50 },
      { nome: 'Salsa Giardiniera', pvp: 4.50 },
      { nome: 'Crema di Zucchine', pvp: 4.50 },
      { nome: 'Torta Sbrisolona Mantovana', pvp: 7.50 },
      { nome: 'Miele Millefiori', pvp: 4.50 },
      { nome: 'Olio evo del Parco', pvp: 14.00 },
      { nome: 'Mostarda classica', pvp: 9.00 },
      { nome: 'Panettone', pvp: 35.00 },
    ],
    totCosto: 97.00,
    qte: { CR: 5, CA: 1, VI: 1, RE: 2, MN: 8 },
  },
] as const;

// Fabbisogno strenne per prodotto (quanti pezzi servono in totale per assemblare le 217 strenne)
export const FABBISOGNO_STRENNE: Record<string, number> = {
  'Pasta (tipo A)': 217,
  'Pomodori datterini': 102,
  'Sugo al basilico': 115,
  'Olio evo del Parco': 93,
  'Mostarda classica': 42,
  'Torta Sbrisolona Mantovana': 217,
  'Panettone': 17,
  'Crema di Zucchine': 217,
  'Salsa Giardiniera': 217,
  'Miele Millefiori': 93,
  'Pomodorini secchi': 51,
  'Spergola': 25,
};
