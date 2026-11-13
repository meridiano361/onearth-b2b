'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, ChevronDown, ChevronUp, FileText, Download,
  Search, X, Check, Pencil, ArrowLeft, Copy, MessageCircle, Building2,
  User, Package, ChevronRight, AlertCircle, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPORI_NOMI: Record<string, string> = {
  MN: 'Mantova', RE: 'Reggio Emilia', CR: 'Cremona', CA: 'Cagliari', VI: 'Vicenza',
};
const EMPORI = Object.keys(EMPORI_NOMI);

const STATI = ['bozza', 'inviato', 'accettato', 'rifiutato', 'convertito'];
const STATI_LABEL: Record<string, string> = {
  bozza: 'Bozza', inviato: 'Inviato', accettato: 'Accettato',
  rifiutato: 'Rifiutato', convertito: 'Convertito',
};
const STATI_COLOR: Record<string, string> = {
  bozza: 'bg-gray-100 text-gray-600',
  inviato: 'bg-blue-100 text-blue-700',
  accettato: 'bg-green-100 text-green-700',
  rifiutato: 'bg-red-100 text-red-700',
  convertito: 'bg-purple-100 text-purple-700',
};

const TIPI_ORDINE = [
  { id: 'standard', label: 'Standard', desc: 'Preventivo generico' },
  { id: 'bomboniere', label: 'Bomboniere', desc: 'Con confezionamento e cartoncini' },
  { id: 'natale', label: 'Natale', desc: 'Strenne e cesti natalizi' },
];
const SOTTOTIPI_NATALE = [
  { id: 'privato', label: 'Privato', azienda: false },
  { id: 'azienda', label: 'Azienda', azienda: true },
  { id: 'no_profit', label: 'No profit', azienda: true },
  { id: 'altro', label: 'Altro', azienda: false },
];

const CONFEZ_TIPI = ['completo', 'solo nastro', 'solo fiocco', 'carta + nastro'];
const PAGAMENTO_OPZIONI = ['Contanti', 'Bonifico 30gg', 'Bonifico 60gg', 'Carta', 'Assegno'];

// ── Types ─────────────────────────────────────────────────────────────────────

type Articolo = {
  id: string;
  gruppo_id: number;
  tipo_gruppo: string;
  group_qty: number;
  group_foto_url: string;
  codice: string;
  descrizione: string;
  prezzo: number;
  iva_perc: number;
  sconto_perc: number;
  costo_ii: number;
  foto_url: string;
  qta: number;
  totale: number;
  confezionamento: boolean;
  confez_tipo: string;
  confez_costo: number;
  cartoncino_fronte: string;
  cartoncino_interno: string;
  is_omaggio: boolean;
};

type CondizioniCommerciali = {
  scadenza: string;
  validita: string;
  pagamento: string;
  consegna_gratuita: boolean;
  consegna_soglia: string;
  omaggio: string;
  extrasconto_perc: number;
  extrasconto_cond: string;
  note: string;
};

type Preventivo = {
  id: string;
  numeroPreventivo: string;
  tipoOrdine: string;
  sottotipoNatale: string | null;
  emporio: string;
  canale: string | null;
  operatore: string | null;
  dataPreventivo: string;
  clienteNome: string;
  clienteCognome: string | null;
  clienteCellulare: string | null;
  clienteEmail: string | null;
  waAttivo: boolean;
  clienteExtra: Record<string, string> | null;
  modalitaConsegna: string | null;
  consegnaData: string | null;
  consegnaOra: string | null;
  totale: number;
  totaleIe: number;
  acconto: number;
  note: string | null;
  articoli: Articolo[];
  titolo: string;
  condizioniCommerciali: CondizioniCommerciali | null;
  stato: string;
  ordineId: string | null;
  createdAt: string;
  dataModifica: string;
};

type ProdottoOE = {
  id: string; codice: string | null; nome: string; formato: string | null;
  pvpIi: number; pvpConsigliato: number | null; ivaPerc: number;
  costoIi: number; fotoUrl: string | null;
};

type CestoOE = {
  codice: string; descrizione: string; pvp: number;
  pvpConsigliato: number | null; costo: number; fotoUrl: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtE = (n: number) => {
  const abs = Math.abs(n).toFixed(2);
  const [i, d] = abs.split('.');
  return (n < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €';
};

const today = () => new Date().toISOString().slice(0, 10);

function newArticolo(gruppoId: number, gruppoNome: string): Articolo {
  return {
    id: Math.random().toString(36).slice(2),
    gruppo_id: gruppoId,
    tipo_gruppo: gruppoNome,
    group_qty: 1,
    group_foto_url: '',
    codice: '',
    descrizione: '',
    prezzo: 0,
    iva_perc: 10,
    sconto_perc: 0,
    costo_ii: 0,
    foto_url: '',
    qta: 1,
    totale: 0,
    confezionamento: false,
    confez_tipo: 'completo',
    confez_costo: 0,
    cartoncino_fronte: '',
    cartoncino_interno: '',
    is_omaggio: false,
  };
}

function calcTotaleRiga(a: Articolo): number {
  if (a.is_omaggio) return 0;
  const prezzoSc = a.prezzo * (1 - a.sconto_perc / 100);
  return Math.round(prezzoSc * a.qta * 100) / 100;
}

function calcTotali(articoli: Articolo[], condizioni: CondizioniCommerciali | null) {
  const totaleII = articoli.reduce((s, a) => s + calcTotaleRiga(a), 0);
  const totaleIE = articoli.reduce((s, a) => {
    if (a.is_omaggio) return s;
    const pIe = a.prezzo / (1 + a.iva_perc / 100);
    const pScIe = pIe * (1 - a.sconto_perc / 100);
    return s + Math.round(pScIe * a.qta * 100) / 100;
  }, 0);
  const extraSconto = condizioni?.extrasconto_perc ?? 0;
  const totaleFinaleII = Math.round(totaleII * (1 - extraSconto / 100) * 100) / 100;
  const totaleFinaleIE = Math.round(totaleIE * (1 - extraSconto / 100) * 100) / 100;
  return { totaleII, totaleIE, totaleFinaleII, totaleFinaleIE };
}

function emptyCondizioni(): CondizioniCommerciali {
  return {
    scadenza: '', validita: '', pagamento: 'Bonifico 30gg',
    consegna_gratuita: false, consegna_soglia: '', omaggio: '',
    extrasconto_perc: 0, extrasconto_cond: '', note: '',
  };
}

// ── Componenti UI atomici ─────────────────────────────────────────────────────

function StatoBadge({ stato }: { stato: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', STATI_COLOR[stato] ?? 'bg-gray-100 text-gray-500')}>
      {STATI_LABEL[stato] ?? stato}
    </span>
  );
}

function SectionCard({ title, open, onToggle, children }: {
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <ChevronDown size={15} className={cn('transition-transform text-gray-400', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-border px-4 pt-3 pb-4">{children}</div>}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white';
const selectCls = 'w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white';

// ── Schermata selettore emporio ───────────────────────────────────────────────

function EmporioSelector({ onSelect }: { onSelect: (e: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
      <div className="text-center">
        <p className="text-xs tracking-widest uppercase text-gray-400 mb-1">Preventivi</p>
        <h2 className="text-2xl font-light tracking-wide text-gray-800">Seleziona l'emporio</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm">
        {EMPORI.map(e => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="flex flex-col items-center gap-1.5 py-5 px-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <span className="text-xl font-bold text-gray-700 group-hover:text-primary">{e}</span>
            <span className="text-[11px] text-gray-500 text-center leading-tight">{EMPORI_NOMI[e]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Lista preventivi ──────────────────────────────────────────────────────────

function ListaPreventivi({
  emporio, onCambiaEmporio, onNuovo, onModifica,
}: {
  emporio: string;
  onCambiaEmporio: () => void;
  onNuovo: () => void;
  onModifica: (p: Preventivo) => void;
}) {
  const qc = useQueryClient();
  const [filtroStato, setFiltroStato] = useState('');
  const [filtroCerca, setFiltroCerca] = useState('');
  const [filtroEmporio, setFiltroEmporio] = useState(emporio);

  const params = new URLSearchParams();
  if (filtroEmporio) params.set('emporio', filtroEmporio);
  if (filtroStato) params.set('stato', filtroStato);
  if (filtroCerca) params.set('cerca', filtroCerca);

  const { data: preventivi = [], isLoading } = useQuery<Preventivo[]>({
    queryKey: ['oe-preventivi', filtroEmporio, filtroStato, filtroCerca],
    queryFn: async () => {
      const r = await fetch(`/api/oe/alimentari/preventivi?${params}`);
      if (!r.ok) throw new Error('Errore');
      return r.json();
    },
    staleTime: 30_000,
  });

  const { mutate: cambiaStato } = useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: string }) => {
      const r = await fetch(`/api/oe/alimentari/preventivi/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato }),
      });
      if (!r.ok) throw new Error();
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oe-preventivi'] }); },
    onError: () => toast.error('Errore aggiornamento stato'),
  });

  const { mutate: elimina } = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/oe/alimentari/preventivi/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oe-preventivi'] }); toast.success('Eliminato'); },
    onError: () => toast.error('Errore eliminazione'),
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onCambiaEmporio} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-gray-600 hover:bg-gray-50">
          <span className="font-semibold text-primary">{emporio}</span>
          <span className="text-gray-400">·</span>
          <span>{EMPORI_NOMI[emporio]}</span>
          <ChevronDown size={13} />
        </button>
        <div className="flex-1 relative min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={filtroCerca}
            onChange={e => setFiltroCerca(e.target.value)}
            placeholder="Cerca cliente, numero..."
            className="w-full border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white">
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{STATI_LABEL[s]}</option>)}
        </select>
        <select value={filtroEmporio} onChange={e => setFiltroEmporio(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white">
          <option value="">Tutti gli empori</option>
          {EMPORI.map(e => <option key={e} value={e}>{EMPORI_NOMI[e]}</option>)}
        </select>
        <button onClick={onNuovo} className="ml-auto flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Nuovo
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Caricamento...</div>
      ) : preventivi.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
          <FileText size={28} className="opacity-40" />
          <p className="text-sm">Nessun preventivo</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {preventivi.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-border px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-500">{p.numeroPreventivo}</span>
                  <StatoBadge stato={p.stato} />
                  <span className="text-xs text-gray-400">{p.emporio}</span>
                  {p.tipoOrdine !== 'standard' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 capitalize">{p.tipoOrdine}{p.sottotipoNatale ? ` · ${p.sottotipoNatale}` : ''}</span>
                  )}
                </div>
                <p className="font-medium text-sm mt-0.5">
                  {[p.clienteCognome, p.clienteNome].filter(Boolean).join(' ') || p.clienteNome || '—'}
                  {p.clienteExtra?.ragioneSociale && <span className="text-gray-500 font-normal"> · {p.clienteExtra.ragioneSociale}</span>}
                </p>
                {p.titolo && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.titolo}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{new Date(p.dataPreventivo).toLocaleDateString('it-IT')}</span>
                  {p.operatore && <span className="text-xs text-gray-400">{p.operatore}</span>}
                  <span className="text-xs font-semibold text-primary ml-auto">{fmtE(p.totale)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Cambio stato rapido */}
                <select
                  value={p.stato}
                  onChange={e => cambiaStato({ id: p.id, stato: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  className="text-[11px] border border-border rounded-lg px-1.5 py-1 focus:outline-none bg-white max-w-[90px]"
                >
                  {STATI.map(s => <option key={s} value={s}>{STATI_LABEL[s]}</option>)}
                </select>
                <button onClick={() => onModifica(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors">
                  <Pencil size={14} />
                </button>
                {confirmDelete === p.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { elimina(p.id); setConfirmDelete(null); }} className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200"><Check size={13} /></button>
                    <button onClick={() => setConfirmDelete(null)} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={13} /></button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Riga prodotto nel form ────────────────────────────────────────────────────

type SuggerimentoOE = { label: string; sublabel: string; art: Partial<Articolo> };

function useSuggerimenti(query: string, prodottiOE: ProdottoOE[], cestiOE: CestoOE[]): SuggerimentoOE[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const out: SuggerimentoOE[] = [];
    for (const p of prodottiOE) {
      const matchCod = p.codice?.toLowerCase().startsWith(q);
      const matchNome = p.nome.toLowerCase().includes(q);
      if (!matchCod && !matchNome) continue;
      const desc = p.formato ? `${p.nome} — ${p.formato}` : p.nome;
      out.push({
        label: desc,
        sublabel: `${p.codice ?? ''} · IVA ${p.ivaPerc}% · PVP ${p.pvpIi.toFixed(2)} €`,
        art: { codice: p.codice ?? '', descrizione: desc, prezzo: p.pvpIi, iva_perc: p.ivaPerc, costo_ii: p.costoIi },
      });
      if (out.length >= 8) break;
    }
    for (const c of cestiOE) {
      if (out.length >= 8) break;
      const matchCod = c.codice.toLowerCase().startsWith(q);
      const matchDesc = c.descrizione.toLowerCase().includes(q);
      if (!matchCod && !matchDesc) continue;
      out.push({
        label: `Cesto ${c.codice} — ${c.descrizione}`,
        sublabel: `PVP ${c.pvp.toFixed(2)} € · costo ${c.costo.toFixed(2)} €`,
        art: { codice: c.codice, descrizione: `Cesto ${c.codice} — ${c.descrizione}`, prezzo: c.pvp, iva_perc: 10, costo_ii: c.costo },
      });
    }
    return out;
  }, [query, prodottiOE, cestiOE]);
}

function ArticoloRow({
  art, onUpdate, onDelete, isBomboniere, mostraMargini, prodottiOE, cestiOE,
}: {
  art: Articolo;
  onUpdate: (updated: Partial<Articolo>) => void;
  onDelete: () => void;
  isBomboniere: boolean;
  mostraMargini: boolean;
  prodottiOE: ProdottoOE[];
  cestiOE: CestoOE[];
}) {
  const [openCosto, setOpenCosto] = useState(false);
  const [acQuery, setAcQuery] = useState('');
  const [acOpen, setAcOpen] = useState(false);
  const acRef = useRef<HTMLDivElement>(null);
  const suggerimenti = useSuggerimenti(acQuery, prodottiOE, cestiOE);

  const seleziona = (s: SuggerimentoOE) => {
    onUpdate(s.art);
    setAcQuery('');
    setAcOpen(false);
  };

  const prezzoIe = art.prezzo / (1 + art.iva_perc / 100);
  const prezzoSc = art.prezzo * (1 - art.sconto_perc / 100);
  const totale = art.is_omaggio ? 0 : Math.round(prezzoSc * art.qta * 100) / 100;
  const costoIe = art.costo_ii / (1 + art.iva_perc / 100);
  const marginePz = prezzoSc - art.costo_ii;
  const marginePerc = prezzoSc > 0 ? Math.round((marginePz / prezzoSc) * 100) : 0;
  const margineTot = marginePz * art.qta;

  const setPrezzo = (v: string) => {
    const n = parseFloat(v.replace(',', '.')) || 0;
    onUpdate({ prezzo: n, totale: Math.round(n * (1 - art.sconto_perc / 100) * art.qta * 100) / 100 });
  };
  const setPrezzoIe = (v: string) => {
    const ie = parseFloat(v.replace(',', '.')) || 0;
    const ii = Math.round(ie * (1 + art.iva_perc / 100) * 100) / 100;
    onUpdate({ prezzo: ii, totale: Math.round(ii * (1 - art.sconto_perc / 100) * art.qta * 100) / 100 });
  };

  const numInput = 'w-20 border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary';
  const smallInput = 'border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className={cn('border border-border rounded-xl overflow-hidden', art.is_omaggio && 'opacity-60')}>
      {/* Riga principale */}
      <div className="flex items-start gap-2 px-3 py-2 bg-white">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap relative" ref={acRef}>
            <input
              value={art.codice}
              onChange={e => { onUpdate({ codice: e.target.value }); setAcQuery(e.target.value); setAcOpen(true); }}
              onFocus={() => { if (art.codice) { setAcQuery(art.codice); setAcOpen(true); } }}
              onBlur={() => setTimeout(() => setAcOpen(false), 150)}
              placeholder="Cod."
              className={cn(smallInput, 'w-20')}
            />
            <input
              value={art.descrizione}
              onChange={e => { onUpdate({ descrizione: e.target.value }); setAcQuery(e.target.value); setAcOpen(true); }}
              onFocus={() => { if (art.descrizione) { setAcQuery(art.descrizione); setAcOpen(true); } }}
              onBlur={() => setTimeout(() => setAcOpen(false), 150)}
              placeholder="Descrizione prodotto..."
              className={cn(smallInput, 'flex-1 min-w-[140px]')}
            />
            <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
              <input type="checkbox" checked={art.is_omaggio} onChange={e => onUpdate({ is_omaggio: e.target.checked })} className="accent-primary w-3 h-3" />
              Omaggio
            </label>
            {/* Autocomplete dropdown */}
            {acOpen && suggerimenti.length > 0 && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[320px] bg-white border border-border rounded-xl shadow-lg overflow-hidden">
                {suggerimenti.map((s, i) => (
                  <button
                    key={i}
                    onMouseDown={() => seleziona(s)}
                    className="w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <p className="text-xs font-medium text-gray-800 leading-snug">{s.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.sublabel}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400">Prezzo II (€)</span>
              <input value={art.prezzo === 0 ? '' : art.prezzo.toFixed(2)} onChange={e => setPrezzo(e.target.value)} className={numInput} placeholder="0,00" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400">Prezzo IE (€)</span>
              <input value={prezzoIe === 0 ? '' : prezzoIe.toFixed(2)} onChange={e => setPrezzoIe(e.target.value)} className={numInput} placeholder="0,00" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400">IVA %</span>
              <select value={art.iva_perc} onChange={e => onUpdate({ iva_perc: parseFloat(e.target.value) })} className="w-16 border border-border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white">
                {[4, 5, 10, 22].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400">Sconto %</span>
              <input value={art.sconto_perc === 0 ? '' : art.sconto_perc} onChange={e => onUpdate({ sconto_perc: parseFloat(e.target.value) || 0 })} className="w-16 border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400">Qtà</span>
              <input value={art.qta} onChange={e => onUpdate({ qta: parseInt(e.target.value) || 1 })} type="number" min={1} className="w-14 border border-border rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-gray-400">Totale II</span>
              <span className="text-xs font-semibold text-primary w-20 text-right">{fmtE(totale)}</span>
            </div>
            {art.sconto_perc > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-gray-400">P.eff. II</span>
                <span className="text-xs text-gray-600 w-20 text-right">{fmtE(prezzoSc)}</span>
              </div>
            )}
          </div>
          {/* Confezionamento bomboniere */}
          {isBomboniere && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                <input type="checkbox" checked={art.confezionamento} onChange={e => onUpdate({ confezionamento: e.target.checked })} className="accent-primary w-3 h-3" />
                Confezionamento
              </label>
              {art.confezionamento && (
                <>
                  <select value={art.confez_tipo} onChange={e => onUpdate({ confez_tipo: e.target.value })} className="border border-border rounded px-2 py-0.5 text-xs focus:outline-none bg-white">
                    {CONFEZ_TIPI.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">Costo</span>
                    <input value={art.confez_costo === 0 ? '' : art.confez_costo} onChange={e => onUpdate({ confez_costo: parseFloat(e.target.value) || 0 })} className="w-16 border border-border rounded px-2 py-0.5 text-xs text-right focus:outline-none" placeholder="0,00" />
                  </div>
                  <input value={art.cartoncino_fronte} onChange={e => onUpdate({ cartoncino_fronte: e.target.value })} placeholder="Cartoncino fronte..." className={cn(smallInput, 'w-40')} />
                  <input value={art.cartoncino_interno} onChange={e => onUpdate({ cartoncino_interno: e.target.value })} placeholder="Interno..." className={cn(smallInput, 'w-40')} />
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 self-start mt-1">
          {mostraMargini && (
            <button onClick={() => setOpenCosto(v => !v)} className="p-1 rounded text-gray-400 hover:text-green-600 transition-colors" title="Margini">
              <ChevronDown size={13} className={cn('transition-transform', openCosto && 'rotate-180')} />
            </button>
          )}
          <button onClick={onDelete} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {/* Riga costi/margini (interna, non stampata) */}
      {openCosto && mostraMargini && (
        <div className="flex items-center gap-3 px-3 py-2 bg-green-50 border-t border-green-200 flex-wrap text-xs">
          <span className="text-green-700 font-medium text-[10px] uppercase tracking-wide">Uso interno</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-green-600">Costo II</span>
            <input value={art.costo_ii === 0 ? '' : art.costo_ii.toFixed(2)} onChange={e => onUpdate({ costo_ii: parseFloat(e.target.value.replace(',', '.')) || 0 })} className="w-20 border border-green-300 rounded px-2 py-0.5 text-xs text-right focus:outline-none bg-white" placeholder="0,00" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-green-600">Costo IE</span>
            <span className="font-mono text-green-800">{costoIe.toFixed(2)} €</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-green-600">Margine/pz</span>
            <span className={cn('font-semibold', marginePz >= 0 ? 'text-green-800' : 'text-red-600')}>{marginePz.toFixed(2)} € ({marginePerc}%)</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-green-600">Margine tot</span>
            <span className={cn('font-semibold', margineTot >= 0 ? 'text-green-800' : 'text-red-600')}>{margineTot.toFixed(2)} €</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gruppo prodotti nel form ──────────────────────────────────────────────────

function GruppoProdotti({
  gruppoId, righe, onUpdateRiga, onDeleteRiga, onAddRiga,
  nomeGruppo, onUpdateNome, onDeleteGruppo,
  isBomboniere, mostraMargini, prodottiOE, cestiOE,
}: {
  gruppoId: number;
  righe: Articolo[];
  onUpdateRiga: (id: string, u: Partial<Articolo>) => void;
  onDeleteRiga: (id: string) => void;
  onAddRiga: (fromOE?: Partial<Articolo>) => void;
  nomeGruppo: string;
  onUpdateNome: (n: string) => void;
  onDeleteGruppo: () => void;
  isBomboniere: boolean;
  mostraMargini: boolean;
  prodottiOE: ProdottoOE[];
  cestiOE: CestoOE[];
}) {
  const [picker, setPicker] = useState(false);
  const [pickerQ, setPickerQ] = useState('');
  const totGruppo = righe.reduce((s, a) => s + calcTotaleRiga(a), 0);

  const risultatiPicker = useMemo(() => {
    const q = pickerQ.toLowerCase();
    if (!q) return [];
    const prods: { tipo: string; label: string; art: Partial<Articolo> }[] = [];
    prodottiOE.filter(p => p.nome.toLowerCase().includes(q) || (p.codice ?? '').toLowerCase().includes(q)).slice(0, 5).forEach(p => {
      prods.push({
        tipo: 'prodotto',
        label: `${p.nome}${p.formato ? ` — ${p.formato}` : ''}`,
        art: { codice: p.codice ?? '', descrizione: `${p.nome}${p.formato ? ` — ${p.formato}` : ''}`, prezzo: p.pvpIi, iva_perc: p.ivaPerc, costo_ii: p.costoIi },
      });
    });
    cestiOE.filter(c => c.descrizione.toLowerCase().includes(q) || c.codice.toLowerCase().includes(q)).slice(0, 5).forEach(c => {
      prods.push({
        tipo: 'cesto',
        label: `[Cesto] ${c.codice} — ${c.descrizione}`,
        art: { codice: c.codice, descrizione: `Cesto ${c.descrizione}`, prezzo: c.pvp, iva_perc: 10, costo_ii: c.costo },
      });
    });
    return prods;
  }, [pickerQ, prodottiOE, cestiOE]);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header gruppo */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-border">
        <input
          value={nomeGruppo}
          onChange={e => onUpdateNome(e.target.value)}
          placeholder={`Gruppo ${gruppoId}`}
          className="flex-1 bg-transparent text-sm font-medium text-gray-700 focus:outline-none placeholder:text-gray-400"
        />
        <span className="text-xs font-semibold text-primary">{fmtE(totGruppo)}</span>
        <button onClick={onDeleteGruppo} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Righe */}
      <div className="flex flex-col gap-2 p-2">
        {righe.map(a => (
          <ArticoloRow
            key={a.id}
            art={a}
            onUpdate={u => onUpdateRiga(a.id, u)}
            onDelete={() => onDeleteRiga(a.id)}
            isBomboniere={isBomboniere}
            mostraMargini={mostraMargini}
            prodottiOE={prodottiOE}
            cestiOE={cestiOE}
          />
        ))}
      </div>

      {/* Aggiungi riga */}
      <div className="px-2 pb-2 flex items-center gap-2 relative">
        <button onClick={() => onAddRiga()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-gray-50">
          <Plus size={12} /> Riga manuale
        </button>
        <button onClick={() => { setPicker(v => !v); setPickerQ(''); }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-gray-50">
          <Search size={12} /> Da catalogo OE
        </button>
        {picker && (
          <div className="absolute left-2 top-8 z-50 bg-white border border-border rounded-xl shadow-lg p-3 w-80">
            <input
              autoFocus
              value={pickerQ}
              onChange={e => setPickerQ(e.target.value)}
              placeholder="Cerca prodotto o cesto..."
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary mb-2"
            />
            {risultatiPicker.length === 0 && pickerQ.length > 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Nessun risultato</p>
            )}
            {risultatiPicker.map((r, i) => (
              <button key={i} onClick={() => { onAddRiga(r.art); setPicker(false); setPickerQ(''); }} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 text-sm flex items-start gap-2">
                <span className="text-[10px] mt-0.5 px-1 rounded bg-gray-100 text-gray-500 capitalize">{r.tipo}</span>
                <span className="flex-1 text-xs">{r.label}</span>
              </button>
            ))}
            <button onClick={() => setPicker(false)} className="mt-1 w-full text-center text-xs text-gray-400 hover:text-gray-600">Chiudi</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal selezione tipo preventivo ──────────────────────────────────────────

function ModalTipoPreventivo({ onConfirm, onClose }: {
  onConfirm: (tipo: string, sottotipo: string) => void;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState('');
  const [sottotipo, setSottotipo] = useState('');
  const step = tipo === 'natale' ? 2 : tipo ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        {step === 1 || (tipo !== 'natale' && tipo) ? (
          <>
            <h3 className="text-lg font-semibold mb-1">Nuovo Preventivo</h3>
            <p className="text-sm text-gray-500 mb-4">Seleziona il tipo</p>
            <div className="flex flex-col gap-2">
              {TIPI_ORDINE.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === 'natale') { setTipo(t.id); return; }
                    onConfirm(t.id, '');
                  }}
                  className="flex items-start gap-3 p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto mt-0.5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setTipo('')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary mb-3">
              <ArrowLeft size={13} /> Indietro
            </button>
            <h3 className="text-lg font-semibold mb-1">Natale</h3>
            <p className="text-sm text-gray-500 mb-4">Seleziona il sottotipo</p>
            <div className="flex flex-col gap-2">
              {SOTTOTIPI_NATALE.map(s => (
                <button
                  key={s.id}
                  onClick={() => onConfirm('natale', s.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  {s.azienda ? <Building2 size={16} className="text-gray-500 flex-shrink-0" /> : <User size={16} className="text-gray-500 flex-shrink-0" />}
                  <span className="font-medium text-sm">{s.label}</span>
                  <ChevronRight size={16} className="ml-auto text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
        <button onClick={onClose} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600">Annulla</button>
      </div>
    </div>
  );
}

// ── Form preventivo ───────────────────────────────────────────────────────────

function FormPreventivo({
  emporioCorrente, preventivoIniziale, tipoNuovo, onSaved, onBack,
}: {
  emporioCorrente: string;
  preventivoIniziale: Preventivo | null;
  tipoNuovo: { tipo: string; sottotipo: string } | null;
  onSaved: () => void;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const isNew = !preventivoIniziale;

  // ── Stato form ──
  const [emporio, setEmporio] = useState(preventivoIniziale?.emporio ?? emporioCorrente);
  const [canale, setCanale] = useState(preventivoIniziale?.canale ?? '');
  const [operatore, setOperatore] = useState(preventivoIniziale?.operatore ?? '');
  const [dataPrev, setDataPrev] = useState(
    preventivoIniziale ? preventivoIniziale.dataPreventivo.slice(0, 10) : today()
  );
  const [tipoOrdine, setTipoOrdine] = useState(preventivoIniziale?.tipoOrdine ?? tipoNuovo?.tipo ?? 'standard');
  const [sottotipoNatale, setSottotipoNatale] = useState(preventivoIniziale?.sottotipoNatale ?? tipoNuovo?.sottotipo ?? '');

  const isAzienda = tipoOrdine === 'natale' && (sottotipoNatale === 'azienda' || sottotipoNatale === 'no_profit');
  const isBomboniere = tipoOrdine === 'bomboniere';

  // Cliente
  const [clienteNome, setClienteNome] = useState(preventivoIniziale?.clienteNome ?? '');
  const [clienteCognome, setClienteCognome] = useState(preventivoIniziale?.clienteCognome ?? '');
  const [clienteCellulare, setClienteCellulare] = useState(preventivoIniziale?.clienteCellulare ?? '');
  const [clienteEmail, setClienteEmail] = useState(preventivoIniziale?.clienteEmail ?? '');
  const [waAttivo, setWaAttivo] = useState(preventivoIniziale?.waAttivo ?? false);
  const [clienteExtra, setClienteExtra] = useState<Record<string, string>>(preventivoIniziale?.clienteExtra ?? {});

  // Rubrica
  const [rubricaQ, setRubricaQ] = useState('');
  const { data: rubrica = [] } = useQuery({
    queryKey: ['oe-preventivi-clienti', rubricaQ],
    queryFn: async () => {
      if (!rubricaQ) return [];
      const r = await fetch(`/api/oe/alimentari/preventivi/clienti?q=${encodeURIComponent(rubricaQ)}`);
      return r.json();
    },
    enabled: rubricaQ.length > 1,
  });

  // Operatori
  const { data: operatori = [] } = useQuery({
    queryKey: ['oe-preventivi-operatori', emporio],
    queryFn: async () => {
      const r = await fetch(`/api/oe/alimentari/preventivi/operatori?emporio=${emporio}`);
      return r.json();
    },
  });

  // Titolo
  const [titolo, setTitolo] = useState(preventivoIniziale?.titolo ?? '');
  const generaTitolo = () => {
    const cliente = [clienteCognome, clienteNome].filter(Boolean).join(' ');
    const anno = new Date(dataPrev).getFullYear();
    const tipo = tipoOrdine === 'natale' ? 'Natale' : tipoOrdine === 'bomboniere' ? 'Bomboniere' : '';
    setTitolo([tipo, cliente, anno].filter(Boolean).join(' — '));
  };

  // Prodotti OE per il picker
  const { data: prodottiOE = [] } = useQuery<ProdottoOE[]>({
    queryKey: ['oe-alimentari-prodotti'],
    queryFn: async () => { const r = await fetch('/api/oe/alimentari/prodotti'); return r.json(); },
    staleTime: 60_000,
  });
  const { data: cestiOE = [] } = useQuery<CestoOE[]>({
    queryKey: ['oe-cesti'],
    queryFn: async () => { const r = await fetch('/api/oe/alimentari/cesti'); return r.json(); },
    staleTime: 60_000,
  });

  // Articoli
  const [articoli, setArticoli] = useState<Articolo[]>(preventivoIniziale?.articoli ?? []);
  const [nextGruppoId, setNextGruppoId] = useState(() => {
    if (!preventivoIniziale?.articoli?.length) return 1;
    return Math.max(...preventivoIniziale.articoli.map(a => a.gruppo_id)) + 1;
  });
  const [gruppoNomi, setGruppoNomi] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {};
    (preventivoIniziale?.articoli ?? []).forEach(a => { m[a.gruppo_id] = a.tipo_gruppo; });
    return m;
  });

  const gruppiIds = useMemo(() => [...new Set(articoli.map(a => a.gruppo_id))], [articoli]);

  const addGruppo = () => {
    const id = nextGruppoId;
    setNextGruppoId(id + 1);
    setGruppoNomi(m => ({ ...m, [id]: '' }));
    setArticoli(prev => [...prev, newArticolo(id, '')]);
  };

  const updateGruppoNome = (id: number, nome: string) => {
    setGruppoNomi(m => ({ ...m, [id]: nome }));
    setArticoli(prev => prev.map(a => a.gruppo_id === id ? { ...a, tipo_gruppo: nome } : a));
  };

  const deleteGruppo = (id: number) => {
    setArticoli(prev => prev.filter(a => a.gruppo_id !== id));
    setGruppoNomi(m => { const { [id]: _, ...rest } = m; return rest; });
  };

  const addRiga = (gruppoId: number, fromOE?: Partial<Articolo>) => {
    const nome = gruppoNomi[gruppoId] ?? '';
    const base = newArticolo(gruppoId, nome);
    setArticoli(prev => [...prev, { ...base, ...fromOE }]);
  };

  const updateRiga = (id: string, u: Partial<Articolo>) => {
    setArticoli(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...u };
      updated.totale = calcTotaleRiga(updated);
      return updated;
    }));
  };

  const deleteRiga = (id: string) => setArticoli(prev => prev.filter(a => a.id !== id));

  // Consegna
  const [modalitaConsegna, setModalitaConsegna] = useState(preventivoIniziale?.modalitaConsegna ?? '');
  const [consegnaData, setConsegnaData] = useState(preventivoIniziale?.consegnaData?.slice(0, 10) ?? '');
  const [consegnaOra, setConsegnaOra] = useState(preventivoIniziale?.consegnaOra ?? '');

  // Condizioni
  const [condizioni, setCondizioni] = useState<CondizioniCommerciali>(
    preventivoIniziale?.condizioniCommerciali ?? emptyCondizioni()
  );
  const [openConsegna, setOpenConsegna] = useState(false);
  const [openCondizioni, setOpenCondizioni] = useState(false);
  const [openMargini, setOpenMargini] = useState(false);
  const [mostraMargini, setMostraMargini] = useState(false);

  // Acconto / note
  const [acconto, setAcconto] = useState(preventivoIniziale?.acconto ?? 0);
  const [note, setNote] = useState(preventivoIniziale?.note ?? '');

  // Totali calcolati
  const totali = useMemo(() => calcTotali(articoli, condizioni), [articoli, condizioni]);

  // ── Save ──
  const { mutate: savePreventivo, isPending: saving } = useMutation({
    mutationFn: async () => {
      const payload = {
        tipoOrdine, sottotipoNatale: sottotipoNatale || null, emporio,
        canale: canale || null, operatore: operatore || null,
        dataPreventivo: dataPrev,
        clienteNome, clienteCognome: clienteCognome || null,
        clienteCellulare: clienteCellulare || null, clienteEmail: clienteEmail || null,
        waAttivo, clienteExtra: Object.keys(clienteExtra).length ? clienteExtra : null,
        modalitaConsegna: modalitaConsegna || null,
        consegnaData: consegnaData || null, consegnaOra: consegnaOra || null,
        totale: totali.totaleFinaleII, totaleIe: totali.totaleFinaleIE,
        acconto, note: note || null,
        articoli, titolo, condizioniCommerciali: condizioni,
        stato: preventivoIniziale?.stato ?? 'bozza',
        ordineId: preventivoIniziale?.ordineId ?? null,
      };
      const url = preventivoIniziale
        ? `/api/oe/alimentari/preventivi/${preventivoIniziale.id}`
        : '/api/oe/alimentari/preventivi';
      const r = await fetch(url, {
        method: preventivoIniziale ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Errore salvataggio');
      return r.json();
    },
    onSuccess: (saved) => {
      // Salva cliente in rubrica se non esiste
      if (clienteNome) {
        fetch('/api/oe/alimentari/preventivi/clienti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: clienteNome, cognome: clienteCognome, telefono: clienteCellulare, email: clienteEmail, wa: waAttivo }),
        }).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ['oe-preventivi'] });
      toast.success(isNew ? 'Preventivo creato' : 'Preventivo salvato');
      onSaved();
    },
    onError: () => toast.error('Errore salvataggio'),
  });

  // ── PDF ──
  const stampaPDF = () => {
    const cliente = [clienteCognome, clienteNome].filter(Boolean).join(' ');
    const ivaRiga = (a: Articolo) => {
      if (a.is_omaggio) return 0;
      const pIe = a.prezzo / (1 + a.iva_perc / 100);
      const pScIe = pIe * (1 - a.sconto_perc / 100);
      return Math.round((calcTotaleRiga(a) - pScIe * a.qta) * 100) / 100;
    };
    const totalIva = articoli.reduce((s, a) => s + ivaRiga(a), 0);

    const righeHtml = gruppiIds.map(gid => {
      const righe = articoli.filter(a => a.gruppo_id === gid);
      const nome = gruppoNomi[gid] || `Gruppo ${gid}`;
      const totG = righe.reduce((s, a) => s + calcTotaleRiga(a), 0);
      return `
        <tr class="gruppo-header"><td colspan="8"><strong>${nome}</strong></td><td class="num"><strong>${totG.toFixed(2)} €</strong></td></tr>
        ${righe.map(a => {
          const pSc = a.prezzo * (1 - a.sconto_perc / 100);
          return `<tr>
            <td>${a.codice}</td>
            <td>${a.descrizione}${a.is_omaggio ? ' <em>(omaggio)</em>' : ''}</td>
            <td class="num">${a.iva_perc}%</td>
            <td class="num">${a.qta}</td>
            <td class="num">${a.sconto_perc > 0 ? a.sconto_perc + '%' : '—'}</td>
            <td class="num">${a.prezzo.toFixed(2)} €</td>
            <td class="num">${(a.prezzo / (1 + a.iva_perc / 100)).toFixed(2)} €</td>
            <td class="num">${a.sconto_perc > 0 ? pSc.toFixed(2) + ' €' : '—'}</td>
            <td class="num">${a.is_omaggio ? 'omaggio' : calcTotaleRiga(a).toFixed(2) + ' €'}</td>
          </tr>`;
        }).join('')}
      `;
    }).join('');

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
      <title>Preventivo ${preventivoIniziale?.numeroPreventivo ?? ''}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 20px; }
        h1 { font-size: 18px; margin: 0; } h2 { font-size: 13px; color: #555; margin: 4px 0 0; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 12px; }
        .meta { font-size: 10px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f3f4f6; text-align: left; padding: 5px 6px; border-bottom: 2px solid #d1d5db; font-size: 10px; }
        td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .num { text-align: right; white-space: nowrap; }
        .gruppo-header td { background: #f9fafb; font-size: 11px; padding: 6px; }
        .totali { margin-top: 16px; display: flex; justify-content: flex-end; }
        .totali table { width: 260px; }
        .totali td { border: none; padding: 2px 6px; }
        .totali .label { font-size: 10px; color: #555; }
        .totali .bold { font-weight: bold; font-size: 13px; }
        .condizioni { margin-top: 16px; font-size: 10px; color: #555; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        .note { margin-top: 12px; font-size: 10px; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      <div class="header">
        <div>
          <h1>${titolo || 'Preventivo'}</h1>
          <h2>${cliente}</h2>
          <p class="meta">${clienteCellulare ? `Tel: ${clienteCellulare}` : ''} ${clienteEmail ? `· Email: ${clienteEmail}` : ''}</p>
        </div>
        <div class="meta" style="text-align:right">
          <p><strong>${preventivoIniziale?.numeroPreventivo ?? ''}</strong></p>
          <p>Data: ${new Date(dataPrev).toLocaleDateString('it-IT')}</p>
          <p>Emporio: ${EMPORI_NOMI[emporio] ?? emporio}</p>
          ${operatore ? `<p>Operatore: ${operatore}</p>` : ''}
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Cod.</th><th>Descrizione</th><th class="num">IVA</th><th class="num">Qtà</th>
          <th class="num">Sc.</th><th class="num">P. II</th><th class="num">P. IE</th>
          <th class="num">P. eff.</th><th class="num">Totale</th>
        </tr></thead>
        <tbody>${righeHtml}</tbody>
      </table>
      <div class="totali">
        <table>
          <tr><td class="label">Subtotale II:</td><td class="num">${totali.totaleII.toFixed(2)} €</td></tr>
          <tr><td class="label">IVA:</td><td class="num">${totalIva.toFixed(2)} €</td></tr>
          ${condizioni.extrasconto_perc > 0 ? `<tr><td class="label">Extra sconto (${condizioni.extrasconto_perc}%):</td><td class="num">-${(totali.totaleII - totali.totaleFinaleII).toFixed(2)} €</td></tr>` : ''}
          <tr><td class="label bold">Totale:</td><td class="num bold">${totali.totaleFinaleII.toFixed(2)} €</td></tr>
          ${acconto > 0 ? `<tr><td class="label">Acconto:</td><td class="num">${acconto.toFixed(2)} €</td></tr><tr><td class="label">Da pagare:</td><td class="num">${(totali.totaleFinaleII - acconto).toFixed(2)} €</td></tr>` : ''}
        </table>
      </div>
      ${condizioni.pagamento || condizioni.validita ? `
        <div class="condizioni">
          ${condizioni.pagamento ? `<p>Pagamento: ${condizioni.pagamento}</p>` : ''}
          ${condizioni.validita ? `<p>Validità offerta: ${condizioni.validita}</p>` : ''}
          ${condizioni.consegna_gratuita ? `<p>Consegna gratuita${condizioni.consegna_soglia ? ` ${condizioni.consegna_soglia}` : ''}</p>` : ''}
          ${condizioni.omaggio ? `<p>Omaggio: ${condizioni.omaggio}</p>` : ''}
        </div>` : ''}
      ${note ? `<div class="note"><strong>Note:</strong> ${note}</div>` : ''}
      <script>window.onload = () => window.print();</script>
      </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ── Excel/CSV ──
  const esportaExcel = () => {
    const BOM = '﻿';
    const righe = [
      ['Gruppo', 'Codice', 'Descrizione', 'IVA%', 'Qtà', 'Sconto%', 'Prezzo II', 'Prezzo IE', 'Totale II'],
      ...articoli.map(a => [
        gruppoNomi[a.gruppo_id] || `Gruppo ${a.gruppo_id}`,
        a.codice, a.descrizione,
        a.iva_perc.toString(), a.qta.toString(), a.sconto_perc.toString(),
        a.prezzo.toFixed(2).replace('.', ','),
        (a.prezzo / (1 + a.iva_perc / 100)).toFixed(2).replace('.', ','),
        calcTotaleRiga(a).toFixed(2).replace('.', ','),
      ]),
      [],
      ['', '', '', '', '', '', '', 'TOTALE II', totali.totaleFinaleII.toFixed(2).replace('.', ',')],
    ];
    const csv = BOM + righe.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${preventivoIniziale?.numeroPreventivo ?? 'preventivo'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const daPagare = totali.totaleFinaleII - acconto;

  return (
    <div className="flex flex-col h-full">
      {/* Header form */}
      <div className="flex-shrink-0 flex items-center gap-3 pb-4 border-b border-border">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-mono">{preventivoIniziale?.numeroPreventivo ?? 'Nuovo preventivo'}</p>
          <p className="font-medium text-sm capitalize truncate">{tipoOrdine}{sottotipoNatale ? ` · ${sottotipoNatale}` : ''} — {EMPORI_NOMI[emporio] ?? emporio}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={esportaExcel} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={13} /> Excel
          </button>
          <button onClick={stampaPDF} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            <Printer size={13} /> PDF
          </button>
          <button onClick={() => savePreventivo()} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
            <Check size={13} /> {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </div>

      {/* Contenuto form */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">

        {/* Sezione 1 — Testata */}
        <SectionCard title="Emporio e operatore" open={true} onToggle={() => {}}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FieldRow label="Emporio">
              <select value={emporio} onChange={e => setEmporio(e.target.value)} className={selectCls}>
                {EMPORI.map(e => <option key={e} value={e}>{e} — {EMPORI_NOMI[e]}</option>)}
              </select>
            </FieldRow>
            {emporio === 'CR' && (
              <FieldRow label="Canale">
                <input value={canale} onChange={e => setCanale(e.target.value)} placeholder="es. Retail" className={inputCls} />
              </FieldRow>
            )}
            <FieldRow label="Operatore">
              <select value={operatore} onChange={e => setOperatore(e.target.value)} className={selectCls}>
                <option value="">— seleziona —</option>
                {operatori.map((o: { id: string; nome: string }) => <option key={o.id} value={o.nome}>{o.nome}</option>)}
                <option value="__custom">Altro...</option>
              </select>
              {operatore === '__custom' && (
                <input autoFocus onChange={e => setOperatore(e.target.value)} placeholder="Nome operatore" className={cn(inputCls, 'mt-1')} />
              )}
            </FieldRow>
            <FieldRow label="Data">
              <input type="date" value={dataPrev} onChange={e => setDataPrev(e.target.value)} className={inputCls} />
            </FieldRow>
          </div>
        </SectionCard>

        {/* Sezione 2 — Cliente */}
        <SectionCard title={isAzienda ? 'Azienda' : 'Cliente'} open={true} onToggle={() => {}}>
          {/* Rubrica search */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={rubricaQ}
              onChange={e => setRubricaQ(e.target.value)}
              placeholder="Cerca in rubrica..."
              className="w-full border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {rubrica.length > 0 && rubricaQ.length > 1 && (
              <div className="absolute top-full left-0 right-0 z-30 bg-white border border-border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {(rubrica as Array<{ id: string; cliente: string; nome: string; cognome?: string; telefono?: string; email?: string; wa: boolean }>).map(c => (
                  <button key={c.id} onClick={() => {
                    setClienteNome(c.nome); setClienteCognome(c.cognome ?? '');
                    setClienteCellulare(c.telefono ?? ''); setClienteEmail(c.email ?? '');
                    setWaAttivo(c.wa); setRubricaQ('');
                  }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                    <User size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{c.cliente}</span>
                    {c.telefono && <span className="text-xs text-gray-400">{c.telefono}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAzienda ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <FieldRow label="Ragione sociale"><input value={clienteExtra.ragioneSociale ?? ''} onChange={e => setClienteExtra(x => ({ ...x, ragioneSociale: e.target.value }))} className={inputCls} /></FieldRow>
              <FieldRow label="P. IVA"><input value={clienteExtra.piva ?? ''} onChange={e => setClienteExtra(x => ({ ...x, piva: e.target.value }))} className={inputCls} /></FieldRow>
              <FieldRow label="Cod. Fiscale"><input value={clienteExtra.cf ?? ''} onChange={e => setClienteExtra(x => ({ ...x, cf: e.target.value }))} className={inputCls} /></FieldRow>
              <FieldRow label="Cod. Univoco SDI"><input value={clienteExtra.sdi ?? ''} onChange={e => setClienteExtra(x => ({ ...x, sdi: e.target.value }))} className={inputCls} /></FieldRow>
              <FieldRow label="Referente"><input value={clienteNome} onChange={e => setClienteNome(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="PEC"><input value={clienteExtra.pec ?? ''} onChange={e => setClienteExtra(x => ({ ...x, pec: e.target.value }))} type="email" className={inputCls} /></FieldRow>
              <FieldRow label="Email"><input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} type="email" className={inputCls} /></FieldRow>
              <FieldRow label="Cellulare">
                <div className="flex items-center gap-2">
                  <input value={clienteCellulare} onChange={e => setClienteCellulare(e.target.value)} type="tel" className={inputCls} />
                  <button onClick={() => setWaAttivo(v => !v)} className={cn('p-1.5 rounded-lg border transition-colors flex-shrink-0', waAttivo ? 'bg-green-100 border-green-400 text-green-700' : 'border-border text-gray-400')} title="WhatsApp">
                    <MessageCircle size={14} />
                  </button>
                </div>
              </FieldRow>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FieldRow label="Cognome"><input value={clienteCognome} onChange={e => setClienteCognome(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="Nome"><input value={clienteNome} onChange={e => setClienteNome(e.target.value)} className={inputCls} /></FieldRow>
              <FieldRow label="Cellulare">
                <div className="flex items-center gap-2">
                  <input value={clienteCellulare} onChange={e => setClienteCellulare(e.target.value)} type="tel" className={inputCls} />
                  <button onClick={() => setWaAttivo(v => !v)} className={cn('p-1.5 rounded-lg border transition-colors flex-shrink-0', waAttivo ? 'bg-green-100 border-green-400 text-green-700' : 'border-border text-gray-400')} title="WhatsApp">
                    <MessageCircle size={14} />
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="Email"><input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} type="email" className={inputCls} /></FieldRow>
            </div>
          )}
        </SectionCard>

        {/* Sezione 3 — Titolo */}
        <SectionCard title="Titolo preventivo" open={true} onToggle={() => {}}>
          <div className="flex items-center gap-2">
            <input value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Titolo del preventivo..." className={cn(inputCls, 'flex-1')} />
            <button onClick={generaTitolo} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
              <Copy size={12} /> Auto
            </button>
          </div>
        </SectionCard>

        {/* Sezione 4 — Prodotti */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-gray-800">Prodotti</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={mostraMargini} onChange={e => setMostraMargini(e.target.checked)} className="accent-primary w-3 h-3" />
                Mostra margini
              </label>
              <button onClick={addGruppo} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary/5">
                <Plus size={12} /> Aggiungi gruppo
              </button>
            </div>
          </div>
          <div className="p-3 space-y-3">
            {gruppiIds.length === 0 ? (
              <button onClick={addGruppo} className="w-full flex flex-col items-center gap-2 py-8 text-gray-400 hover:text-primary transition-colors">
                <Package size={24} className="opacity-50" />
                <span className="text-sm">Aggiungi il primo gruppo di prodotti</span>
              </button>
            ) : (
              gruppiIds.map(gid => (
                <GruppoProdotti
                  key={gid}
                  gruppoId={gid}
                  righe={articoli.filter(a => a.gruppo_id === gid)}
                  nomeGruppo={gruppoNomi[gid] ?? ''}
                  onUpdateNome={n => updateGruppoNome(gid, n)}
                  onDeleteGruppo={() => deleteGruppo(gid)}
                  onUpdateRiga={updateRiga}
                  onDeleteRiga={deleteRiga}
                  onAddRiga={fromOE => addRiga(gid, fromOE)}
                  isBomboniere={isBomboniere}
                  mostraMargini={mostraMargini}
                  prodottiOE={prodottiOE}
                  cestiOE={cestiOE}
                />
              ))
            )}
          </div>
        </div>

        {/* Sezione 5 — Consegna */}
        <SectionCard title="Consegna" open={openConsegna} onToggle={() => setOpenConsegna(v => !v)}>
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Modalità"><input value={modalitaConsegna} onChange={e => setModalitaConsegna(e.target.value)} placeholder="es. Ritiro in sede" className={inputCls} /></FieldRow>
            <FieldRow label="Data consegna"><input type="date" value={consegnaData} onChange={e => setConsegnaData(e.target.value)} className={inputCls} /></FieldRow>
            <FieldRow label="Ora consegna"><input type="time" value={consegnaOra} onChange={e => setConsegnaOra(e.target.value)} className={inputCls} /></FieldRow>
          </div>
        </SectionCard>

        {/* Sezione 6 — Condizioni commerciali */}
        <SectionCard title="Condizioni commerciali" open={openCondizioni} onToggle={() => setOpenCondizioni(v => !v)}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FieldRow label="Pagamento">
              <select value={condizioni.pagamento} onChange={e => setCondizioni(c => ({ ...c, pagamento: e.target.value }))} className={selectCls}>
                {PAGAMENTO_OPZIONI.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Validità offerta"><input value={condizioni.validita} onChange={e => setCondizioni(c => ({ ...c, validita: e.target.value }))} placeholder="es. 2025-01-31" className={inputCls} /></FieldRow>
            <FieldRow label="Scadenza">
              <input type="date" value={condizioni.scadenza} onChange={e => setCondizioni(c => ({ ...c, scadenza: e.target.value }))} className={inputCls} />
            </FieldRow>
            <FieldRow label="Extra sconto %"><input type="number" min={0} max={100} value={condizioni.extrasconto_perc || ''} onChange={e => setCondizioni(c => ({ ...c, extrasconto_perc: parseFloat(e.target.value) || 0 }))} placeholder="0" className={inputCls} /></FieldRow>
            <FieldRow label="Cond. extra sconto"><input value={condizioni.extrasconto_cond} onChange={e => setCondizioni(c => ({ ...c, extrasconto_cond: e.target.value }))} placeholder="es. pagamento anticipato" className={inputCls} /></FieldRow>
            <FieldRow label="Omaggio"><input value={condizioni.omaggio} onChange={e => setCondizioni(c => ({ ...c, omaggio: e.target.value }))} placeholder="es. Shopper" className={inputCls} /></FieldRow>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={condizioni.consegna_gratuita} onChange={e => setCondizioni(c => ({ ...c, consegna_gratuita: e.target.checked }))} className="accent-primary" />
                <span className="text-sm text-gray-600">Consegna gratuita</span>
              </label>
              {condizioni.consegna_gratuita && (
                <input value={condizioni.consegna_soglia} onChange={e => setCondizioni(c => ({ ...c, consegna_soglia: e.target.value }))} placeholder="da X pezzi" className={cn(inputCls, 'flex-1')} />
              )}
            </div>
            <div className="col-span-2 sm:col-span-3">
              <FieldRow label="Note condizioni">
                <textarea value={condizioni.note} onChange={e => setCondizioni(c => ({ ...c, note: e.target.value }))} rows={2} className={cn(inputCls, 'resize-none')} />
              </FieldRow>
            </div>
          </div>
        </SectionCard>

        {/* Sezione 7 — Riepilogo margini (uso interno) */}
        <SectionCard title="Riepilogo margini (uso interno)" open={openMargini} onToggle={() => setOpenMargini(v => !v)}>
          {articoli.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">Nessun articolo inserito</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left pb-2">Descrizione</th>
                  <th className="text-right pb-2">Costo II</th>
                  <th className="text-right pb-2">Prezzo eff.</th>
                  <th className="text-right pb-2">Marg/pz</th>
                  <th className="text-right pb-2">Marg%</th>
                  <th className="text-right pb-2">Marg tot</th>
                </tr>
              </thead>
              <tbody>
                {articoli.filter(a => !a.is_omaggio).map(a => {
                  const pSc = a.prezzo * (1 - a.sconto_perc / 100);
                  const mPz = pSc - a.costo_ii;
                  const mPerc = pSc > 0 ? Math.round((mPz / pSc) * 100) : 0;
                  return (
                    <tr key={a.id} className="border-t border-green-100">
                      <td className="py-1 text-gray-700 truncate max-w-[140px]">{a.descrizione || '—'}</td>
                      <td className="py-1 text-right font-mono">{a.costo_ii.toFixed(2)}</td>
                      <td className="py-1 text-right font-mono">{pSc.toFixed(2)}</td>
                      <td className={cn('py-1 text-right font-semibold', mPz >= 0 ? 'text-green-700' : 'text-red-600')}>{mPz.toFixed(2)}</td>
                      <td className={cn('py-1 text-right', mPerc >= 30 ? 'text-green-600' : mPerc >= 15 ? 'text-amber-600' : 'text-red-600')}>{mPerc}%</td>
                      <td className={cn('py-1 text-right font-semibold', (mPz * a.qta) >= 0 ? 'text-green-700' : 'text-red-600')}>{(mPz * a.qta).toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-green-300 font-semibold text-green-800">
                  <td className="py-1" colSpan={5}>Margine totale</td>
                  <td className="py-1 text-right">
                    {articoli.filter(a => !a.is_omaggio).reduce((s, a) => s + (a.prezzo * (1 - a.sconto_perc / 100) - a.costo_ii) * a.qta, 0).toFixed(2)} €
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Sezione 8 — Totali + Acconto */}
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Totali</p>
          <div className="flex flex-col gap-1 max-w-xs ml-auto text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotale II</span><span className="font-mono">{fmtE(totali.totaleII)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Subtotale IE</span><span className="font-mono">{fmtE(totali.totaleIE)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IVA</span><span className="font-mono">{fmtE(totali.totaleII - totali.totaleIE)}</span>
            </div>
            {condizioni.extrasconto_perc > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Extra sconto ({condizioni.extrasconto_perc}%)</span>
                <span className="font-mono">-{fmtE(totali.totaleII - totali.totaleFinaleII)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-primary text-base border-t border-border pt-1 mt-1">
              <span>Totale</span><span className="font-mono">{fmtE(totali.totaleFinaleII)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-gray-500">Acconto</span>
              <input
                type="number" min={0} step={0.01}
                value={acconto || ''}
                onChange={e => setAcconto(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className="w-28 border border-border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {acconto > 0 && (
              <div className="flex justify-between font-semibold text-gray-700 border-t border-border pt-1 mt-1">
                <span>Da pagare</span><span className="font-mono">{fmtE(daPagare)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sezione 9 — Note */}
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">Note</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Note libere per il preventivo..."
            className={cn(inputCls, 'resize-none')}
          />
        </div>

      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function TabPreventivi() {
  const [emporioCorrente, setEmporioCorrente] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [modalTipo, setModalTipo] = useState(false);
  const [preventivoEditing, setPreventivoEditing] = useState<Preventivo | null>(null);
  const [tipoNuovo, setTipoNuovo] = useState<{ tipo: string; sottotipo: string } | null>(null);

  if (!emporioCorrente) {
    return <EmporioSelector onSelect={setEmporioCorrente} />;
  }

  if (view === 'form') {
    return (
      <FormPreventivo
        emporioCorrente={emporioCorrente}
        preventivoIniziale={preventivoEditing}
        tipoNuovo={tipoNuovo}
        onSaved={() => { setView('list'); setPreventivoEditing(null); setTipoNuovo(null); }}
        onBack={() => { setView('list'); setPreventivoEditing(null); setTipoNuovo(null); }}
      />
    );
  }

  return (
    <>
      <ListaPreventivi
        emporio={emporioCorrente}
        onCambiaEmporio={() => setEmporioCorrente(null)}
        onNuovo={() => setModalTipo(true)}
        onModifica={p => { setPreventivoEditing(p); setView('form'); }}
      />
      {modalTipo && (
        <ModalTipoPreventivo
          onConfirm={(tipo, sottotipo) => {
            setTipoNuovo({ tipo, sottotipo });
            setPreventivoEditing(null);
            setModalTipo(false);
            setView('form');
          }}
          onClose={() => setModalTipo(false)}
        />
      )}
    </>
  );
}
