/**
 * Budget planning — pure computation functions.
 * All formulas live here so they are testable without React.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const BUDGET_SEASON = 'PE27' as const;
export const BUDGET_MESI_TOTALI = 6; // PE season: Mar-Aug

/** Canonical subclass list per famiglia.
 *  These are the BUDGET categories. Product.sottoclasse values must match them
 *  (case-insensitively, normalized) or will appear as "Altri / non classificati".
 */
export const MODA_FAMIGLIE = [
  'Abbigliamento',
  'Accessori persona',
  'Bigiotteria e gioielleria',
] as const;
export type ModaFamiglia = (typeof MODA_FAMIGLIE)[number];

export const MODA_SUBCLASSES: Record<ModaFamiglia, string[]> = {
  'Abbigliamento': [
    'Abiti',
    'Camicie',
    'Capispalla',
    'Gonne',
    'Pantaloni',
    'Tees',
    'Top e canotte',
  ],
  'Accessori persona': [
    'Borse',
    'Accessori borsetta',
    'Accessori personali',
    'Altri accessori',
  ],
  'Bigiotteria e gioielleria': [
    'Collane e pendenti',
    'Orecchini',
    'Bracciali',
    'Anelli',
  ],
};

// ─── Input / raw types ────────────────────────────────────────────────────────

export interface FamilyInput {
  famiglia: string;
  vendutoPrevValore: number | null;
  vendutoPrevPezzi: number | null;
  mesiConsuntivi: number;
  obiettivo: number | null;
  marginePieno: number | null;
  scontoMese5: number | null; // luglio
  scontoMese6: number | null; // agosto
}

export interface SubclassRow {
  famiglia: string;
  sottoclasse: string;
  pezziPE25: number | null;
  pezziPE26: number | null;
  continuativi: number;
}

export interface OrderAggRow {
  conferente: string;
  famiglia: string;
  sottoclasse: string;
  pezzi: number;
  imponibile: number;
  retailStimato: number;
}

// ─── Computed types ───────────────────────────────────────────────────────────

export interface FamilyComputed {
  vendutoProiettato: number | null;
  pezziProiettati: number | null;
  valoreMedioPezzo: number | null;
  obiettivoPezzi: number | null;
  margineMese5: number | null;
  margineMese6: number | null;
  margineMedioEffettivo: number | null;
  margineObiettivo: number | null;
}

export interface SubclassComputed {
  incidenzaPE25: number | null;
  incidenzaPE26: number | null;
  incidenzaMedia: number | null;
  fabbisognoRaw: number | null;
  fabbisognoNetto: number | null;
  ordinato: number;
  extra: number | null;
  copertura: number | null; // 0–1
  status: 'ok' | 'eccedente' | 'coperto' | 'no_data' | 'no_obiettivo';
}

export interface BudgetSummary {
  obiettivoTotale: number;
  margineObiettivoTotale: number;
  fabbisognoTotalePezzi: number;
  continuativiTotali: number;
  ordinatoTotale: number;
  delta: number;
  copertura: number | null; // 0–1
}

// ─── Core formulas ────────────────────────────────────────────────────────────

export function computeFamily(
  input: FamilyInput,
  mesiTotali = BUDGET_MESI_TOTALI,
): FamilyComputed {
  const {
    vendutoPrevValore, vendutoPrevPezzi, mesiConsuntivi,
    obiettivo, marginePieno, scontoMese5, scontoMese6,
  } = input;

  const mc = mesiConsuntivi > 0 ? mesiConsuntivi : null;

  const vendutoProiettato =
    vendutoPrevValore != null && mc != null
      ? (vendutoPrevValore / mc) * mesiTotali
      : null;

  const pezziProiettati =
    vendutoPrevPezzi != null && mc != null
      ? (vendutoPrevPezzi / mc) * mesiTotali
      : null;

  const valoreMedioPezzo =
    vendutoProiettato != null && pezziProiettati != null && pezziProiettati > 0
      ? vendutoProiettato / pezziProiettati
      : null;

  const obiettivoPezzi =
    obiettivo != null && valoreMedioPezzo != null && valoreMedioPezzo > 0
      ? obiettivo / valoreMedioPezzo
      : null;

  const margineMese5 =
    marginePieno != null && scontoMese5 != null ? marginePieno - scontoMese5 : null;
  const margineMese6 =
    marginePieno != null && scontoMese6 != null ? marginePieno - scontoMese6 : null;

  // PE: mesiTotali-2 months at full margin, 1 month at mese5, 1 month at mese6
  const margineMedioEffettivo =
    marginePieno != null && margineMese5 != null && margineMese6 != null
      ? (marginePieno * (mesiTotali - 2) + margineMese5 + margineMese6) / mesiTotali
      : null;

  const margineObiettivo =
    obiettivo != null && margineMedioEffettivo != null
      ? obiettivo * (margineMedioEffettivo / 100)
      : null;

  return {
    vendutoProiettato, pezziProiettati, valoreMedioPezzo, obiettivoPezzi,
    margineMese5, margineMese6, margineMedioEffettivo, margineObiettivo,
  };
}

/** Incidenza formula — isolated so it can be swapped independently. */
function blendIncidenza(
  incPE25: number | null,
  incPE26: number | null,
): number | null {
  const vals = [incPE25, incPE26].filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function computeSubclass(
  row: SubclassRow,
  totaliPE25: number | null,
  totaliPE26: number | null,
  obiettivoPezziFamily: number | null,
  ordinato: number,
): SubclassComputed {
  const incidenzaPE25 =
    row.pezziPE25 != null && totaliPE25 != null && totaliPE25 > 0
      ? row.pezziPE25 / totaliPE25
      : null;

  const incidenzaPE26 =
    row.pezziPE26 != null && totaliPE26 != null && totaliPE26 > 0
      ? row.pezziPE26 / totaliPE26
      : null;

  const incidenzaMedia = blendIncidenza(incidenzaPE25, incidenzaPE26);

  if (incidenzaMedia == null) {
    return {
      incidenzaPE25, incidenzaPE26, incidenzaMedia,
      fabbisognoRaw: null, fabbisognoNetto: null,
      ordinato, extra: null, copertura: null, status: 'no_data',
    };
  }
  if (obiettivoPezziFamily == null) {
    return {
      incidenzaPE25, incidenzaPE26, incidenzaMedia,
      fabbisognoRaw: null, fabbisognoNetto: null,
      ordinato, extra: null, copertura: null, status: 'no_obiettivo',
    };
  }

  const fabbisognoRaw = obiettivoPezziFamily * incidenzaMedia - row.continuativi;
  const fabbisognoNetto = Math.max(0, fabbisognoRaw);
  const extra = ordinato - fabbisognoNetto;
  const copertura = fabbisognoNetto > 0 ? ordinato / fabbisognoNetto : null;

  let status: SubclassComputed['status'] = 'ok';
  if (fabbisognoRaw < 0) status = 'eccedente';
  else if (copertura != null && copertura >= 1) status = 'coperto';

  return {
    incidenzaPE25, incidenzaPE26, incidenzaMedia,
    fabbisognoRaw, fabbisognoNetto,
    ordinato, extra, copertura, status,
  };
}

export function computeSummary(
  families: Array<{ input: FamilyInput; computed: FamilyComputed }>,
  subclassRows: Array<{ row: SubclassRow; computed: SubclassComputed }>,
): BudgetSummary {
  let obiettivoTotale = 0;
  let margineObiettivoTotale = 0;
  for (const { input, computed } of families) {
    obiettivoTotale += input.obiettivo ?? 0;
    margineObiettivoTotale += computed.margineObiettivo ?? 0;
  }

  let fabbisognoTotalePezzi = 0;
  let continuativiTotali = 0;
  let ordinatoTotale = 0;
  for (const { row, computed } of subclassRows) {
    fabbisognoTotalePezzi += computed.fabbisognoNetto ?? 0;
    continuativiTotali += row.continuativi;
    ordinatoTotale += computed.ordinato;
  }

  const delta = ordinatoTotale - fabbisognoTotalePezzi;
  const copertura = fabbisognoTotalePezzi > 0 ? ordinatoTotale / fabbisognoTotalePezzi : null;

  return { obiettivoTotale, margineObiettivoTotale, fabbisognoTotalePezzi, continuativiTotali, ordinatoTotale, delta, copertura };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—';
  return n.toFixed(decimals) + '%';
}

export function fmtCov(n: number | null | undefined): string {
  if (n == null) return '—';
  return Math.round(n * 100) + '%';
}
