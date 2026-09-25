'use client';

import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera, Pencil, Trash2, Plus, X, Check, ChevronDown, ChevronUp,
  Package, ShoppingBasket, Gift, BarChart2, LayoutGrid, List, Search, Info, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CESTI_LICHENS, STRENNE, FABBISOGNO_STRENNE, EMPORI, type Emporio } from '@/data/oeAlimentariStatico';

// ── Types ─────────────────────────────────────────────────────────────────────

type FabbisognoEmpori = { emporio: string; qta: number };
type Ordinato = { ordinato: number } | null;

type Prodotto = {
  id: string; barcode: string | null; fornitore: string | null;
  nome: string; formato: string | null; ivaPerc: number;
  costoIi: number; pvpIi: number; pvpConsigliato: number | null;
  fotoUrl: string | null; note: string | null; ordine: number;
  fabbisognoEmpori: FabbisognoEmpori[];
  ordinato: Ordinato;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => {
  const abs = Math.abs(n).toFixed(2);
  const [int, dec] = abs.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + intFmt + ',' + dec + ' €';
};
const fmtN = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const FORNITORE_COLORS: Record<string, string> = {
  'Pietra di scarto': 'bg-red-50 text-red-700',
  'Giuste terre': 'bg-green-50 text-green-700',
  'Luccini': 'bg-amber-50 text-amber-700',
  'Sapori di Libertà': 'bg-purple-50 text-purple-700',
  'Semi Liberi': 'bg-blue-50 text-blue-700',
};
const fornitoreBadge = (f: string | null) =>
  f ? (FORNITORE_COLORS[f] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400';

function margine(p: Prodotto) {
  if (!p.pvpIi || !p.costoIi) return null;
  return Math.round(((p.pvpIi - p.costoIi) / p.pvpIi) * 100);
}

// ── Tab: Prodotti ─────────────────────────────────────────────────────────────

const FORNITORI_LIST = ['Pietra di scarto', 'Giuste terre', 'Luccini', 'Sapori di Libertà', 'Semi Liberi'];

function ProdottoFoto({ p, uploadFoto, fileRefs }: {
  p: Prodotto;
  uploadFoto: (id: string, file: File) => void;
  fileRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  return (
    <div
      className="relative flex-shrink-0 rounded-lg bg-gray-50 border border-border overflow-hidden cursor-pointer group w-16 h-16"
      onClick={() => fileRefs.current[p.id]?.click()}
      title="Clicca per caricare una foto"
    >
      {p.fotoUrl
        ? <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={22} /></div>
      }
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera size={16} className="text-white" />
      </div>
      <input
        ref={el => { fileRefs.current[p.id] = el; }}
        type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && uploadFoto(p.id, e.target.files[0])}
      />
    </div>
  );
}

function EditForm({ editData, setEditData, onSave, onCancel, saving }: {
  editData: Partial<Prodotto>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<Prodotto>>>;
  onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-2 pb-3 px-3">
      <div className="grid grid-cols-2 gap-1.5">
        <input className="input-oe col-span-2" placeholder="Nome" value={editData.nome ?? ''} onChange={e => setEditData(d => ({ ...d, nome: e.target.value }))} />
        <input className="input-oe" placeholder="Fornitore" value={editData.fornitore ?? ''} onChange={e => setEditData(d => ({ ...d, fornitore: e.target.value }))} />
        <input className="input-oe" placeholder="Barcode" value={editData.barcode ?? ''} onChange={e => setEditData(d => ({ ...d, barcode: e.target.value }))} />
        <input className="input-oe" placeholder="Formato" value={editData.formato ?? ''} onChange={e => setEditData(d => ({ ...d, formato: e.target.value }))} />
        <select className="input-oe" value={editData.ivaPerc ?? 10} onChange={e => setEditData(d => ({ ...d, ivaPerc: parseFloat(e.target.value) }))}>
          <option value={4}>IVA 4%</option>
          <option value={10}>IVA 10%</option>
          <option value={22}>IVA 22%</option>
        </select>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
          <input className="input-oe pl-6" type="number" step="0.01" placeholder="Costo i.i." value={editData.costoIi ?? ''} onChange={e => setEditData(d => ({ ...d, costoIi: parseFloat(e.target.value) }))} />
        </div>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
          <input className="input-oe pl-6" type="number" step="0.01" placeholder="PVP i.i." value={editData.pvpIi ?? ''} onChange={e => setEditData(d => ({ ...d, pvpIi: parseFloat(e.target.value) }))} />
        </div>
        <div className="relative col-span-2">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
          <input className="input-oe pl-6" type="number" step="0.01" placeholder="PVP consigliato" value={editData.pvpConsigliato ?? ''} onChange={e => setEditData(d => ({ ...d, pvpConsigliato: parseFloat(e.target.value) }))} />
        </div>
        <input className="input-oe col-span-2" placeholder="Note" value={editData.note ?? ''} onChange={e => setEditData(d => ({ ...d, note: e.target.value }))} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary text-white text-xs rounded-lg disabled:opacity-50">
          <Check size={12} /> Salva
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 border text-xs rounded-lg">Annulla</button>
      </div>
    </div>
  );
}

function TabProdotti({ prodotti, refetch }: { prodotti: Prodotto[]; refetch: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Prodotto>>({});
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState<Partial<Prodotto>>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filtroFornitore, setFiltroFornitore] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const startEdit = (p: Prodotto) => {
    setEditId(p.id);
    setEditData({ nome: p.nome, barcode: p.barcode ?? '', fornitore: p.fornitore ?? '', formato: p.formato ?? '', ivaPerc: p.ivaPerc, costoIi: p.costoIi, pvpIi: p.pvpIi, pvpConsigliato: p.pvpConsigliato ?? undefined, note: p.note ?? '' });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    await fetch(`/api/oe/alimentari/prodotti/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) });
    setEditId(null);
    setSaving(false);
    refetch();
  };

  const deleteProdotto = async (id: string) => {
    if (!confirm('Eliminare questo prodotto?')) return;
    await fetch(`/api/oe/alimentari/prodotti/${id}`, { method: 'DELETE' });
    refetch();
  };

  const addProdotto = async () => {
    if (!newData.nome?.trim()) return;
    setSaving(true);
    await fetch('/api/oe/alimentari/prodotti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    setAdding(false);
    setNewData({});
    setSaving(false);
    refetch();
  };

  const uploadFoto = async (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/oe/alimentari/upload', { method: 'POST', body: fd });
    if (!res.ok) { alert('Errore upload'); return; }
    const { url } = await res.json();
    await fetch(`/api/oe/alimentari/prodotti/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fotoUrl: url }) });
    refetch();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return prodotti.filter(p => {
      if (filtroFornitore && p.fornitore !== filtroFornitore) return false;
      if (!q) return true;
      return p.nome.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q) ||
        (p.fornitore ?? '').toLowerCase().includes(q) ||
        (p.formato ?? '').toLowerCase().includes(q);
    });
  }, [prodotti, search, filtroFornitore]);

  return (
    <div className="space-y-3">
      {/* Toolbar: search + view toggle + add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-oe pl-7"
            placeholder="Cerca per nome, barcode, fornitore…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
        {/* View toggle */}
        <div className="flex border border-border rounded-lg overflow-hidden flex-shrink-0">
          <button
            onClick={() => setView('grid')}
            className={cn('px-2.5 py-1.5 transition-colors', view === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-600')}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('px-2.5 py-1.5 transition-colors border-l border-border', view === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-600')}
          >
            <List size={14} />
          </button>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:opacity-80 transition-opacity flex-shrink-0">
          <Plus size={13} /> Aggiungi
        </button>
      </div>

      {/* Filtri fornitore */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFiltroFornitore(null)}
          className={cn('px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors', !filtroFornitore ? 'bg-primary text-white border-primary' : 'border-border text-gray-500 hover:border-gray-400')}
        >
          Tutti
        </button>
        {FORNITORI_LIST.map(f => (
          <button
            key={f}
            onClick={() => setFiltroFornitore(filtroFornitore === f ? null : f)}
            className={cn('px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors',
              filtroFornitore === f
                ? cn(fornitoreBadge(f), 'border-transparent')
                : 'border-border text-gray-500 hover:border-gray-400'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Contatore risultati */}
      <p className="text-xs text-gray-400">
        {filtered.length === prodotti.length ? `${prodotti.length} prodotti` : `${filtered.length} di ${prodotti.length}`}
      </p>

      {/* Form aggiungi */}
      {adding && (
        <div className="border border-primary/20 rounded-xl p-4 bg-blue-50 space-y-3">
          <p className="text-xs font-semibold text-primary">Nuovo prodotto</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input-oe" placeholder="Nome *" value={newData.nome ?? ''} onChange={e => setNewData(d => ({ ...d, nome: e.target.value }))} />
            <input className="input-oe" placeholder="Fornitore" value={newData.fornitore ?? ''} onChange={e => setNewData(d => ({ ...d, fornitore: e.target.value }))} />
            <input className="input-oe" placeholder="Barcode" value={newData.barcode ?? ''} onChange={e => setNewData(d => ({ ...d, barcode: e.target.value }))} />
            <input className="input-oe" placeholder="Formato (es. 314 ml)" value={newData.formato ?? ''} onChange={e => setNewData(d => ({ ...d, formato: e.target.value }))} />
            <select className="input-oe" value={newData.ivaPerc ?? 10} onChange={e => setNewData(d => ({ ...d, ivaPerc: parseFloat(e.target.value) }))}>
              <option value={4}>IVA 4%</option>
              <option value={10}>IVA 10%</option>
              <option value={22}>IVA 22%</option>
            </select>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
              <input className="input-oe pl-6" placeholder="Costo i.i." type="number" step="0.01" value={newData.costoIi ?? ''} onChange={e => setNewData(d => ({ ...d, costoIi: parseFloat(e.target.value) }))} />
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
              <input className="input-oe pl-6" placeholder="PVP i.i." type="number" step="0.01" value={newData.pvpIi ?? ''} onChange={e => setNewData(d => ({ ...d, pvpIi: parseFloat(e.target.value) }))} />
            </div>
            <div className="relative col-span-2">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
              <input className="input-oe pl-6 col-span-2" placeholder="PVP consigliato" type="number" step="0.01" value={newData.pvpConsigliato ?? ''} onChange={e => setNewData(d => ({ ...d, pvpConsigliato: parseFloat(e.target.value) }))} />
            </div>
            <input className="input-oe col-span-2" placeholder="Note" value={newData.note ?? ''} onChange={e => setNewData(d => ({ ...d, note: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={addProdotto} disabled={saving} className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg disabled:opacity-50">Salva</button>
            <button onClick={() => { setAdding(false); setNewData({}); }} className="px-3 py-1.5 border text-xs rounded-lg">Annulla</button>
          </div>
        </div>
      )}

      {/* ── Vista Griglia ── */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => {
            const m = margine(p);
            const isEditing = editId === p.id;
            return (
              <div key={p.id} className="border border-border rounded-xl bg-white overflow-hidden">
                <div className="flex gap-3 p-3">
                  <ProdottoFoto p={p} uploadFoto={uploadFoto} fileRefs={fileRefs} />
                  <div className="flex-1 min-w-0">
                    {p.fornitore && (
                      <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1', fornitoreBadge(p.fornitore))}>
                        {p.fornitore}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-primary leading-tight truncate">{p.nome}</p>
                    {p.formato && <p className="text-xs text-gray-400">{p.formato}</p>}
                    {p.barcode && <p className="text-[10px] text-gray-400 font-mono">{p.barcode}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => isEditing ? setEditId(null) : startEdit(p)} className="p-1 text-gray-400 hover:text-primary transition-colors">
                      {isEditing ? <X size={14} /> : <Pencil size={14} />}
                    </button>
                    <button onClick={() => deleteProdotto(p.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {!isEditing && (
                  <div className="px-3 pb-3 flex items-center gap-3 flex-wrap">
                    <div><p className="text-[10px] text-gray-400">Costo</p><p className="text-xs font-medium text-gray-600">{fmt(p.costoIi)}</p></div>
                    <div><p className="text-[10px] text-gray-400">PVP</p><p className="text-xs font-semibold text-green-700">{fmt(p.pvpIi)}</p></div>
                    {p.pvpConsigliato && p.pvpConsigliato !== p.pvpIi && (
                      <div><p className="text-[10px] text-gray-400">Consigliato</p><p className="text-xs text-blue-600">{fmt(p.pvpConsigliato)}</p></div>
                    )}
                    {m !== null && (
                      <div className="ml-auto text-right">
                        <p className="text-[10px] text-gray-400">Margine</p>
                        <p className="text-xs font-semibold text-gray-700">{m}%</p>
                      </div>
                    )}
                    {p.note && <div className="w-full"><p className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">{p.note}</p></div>}
                  </div>
                )}
                {isEditing && <EditForm editData={editData} setEditData={setEditData} onSave={() => saveEdit(p.id)} onCancel={() => setEditId(null)} saving={saving} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vista Lista ── */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.map(p => {
            const m = margine(p);
            const isEditing = editId === p.id;
            return (
              <div key={p.id} className="border border-border rounded-xl bg-white overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <ProdottoFoto p={p} uploadFoto={uploadFoto} fileRefs={fileRefs} />
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.fornitore && (
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', fornitoreBadge(p.fornitore))}>
                          {p.fornitore}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-primary leading-none">{p.nome}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.formato && <span className="text-xs text-gray-400">{p.formato}</span>}
                      {p.barcode && <span className="text-[10px] font-mono text-gray-400">{p.barcode}</span>}
                    </div>
                    {p.note && <p className="text-[10px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 inline-block">{p.note}</p>}
                  </div>
                  {/* Prezzi */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
                    <div><p className="text-[10px] text-gray-400">Costo</p><p className="text-xs text-gray-600 font-medium">{fmt(p.costoIi)}</p></div>
                    <div><p className="text-[10px] text-gray-400">PVP</p><p className="text-xs text-green-700 font-semibold">{fmt(p.pvpIi)}</p></div>
                    {p.pvpConsigliato && p.pvpConsigliato !== p.pvpIi && (
                      <div><p className="text-[10px] text-gray-400">Cons.</p><p className="text-xs text-blue-600">{fmt(p.pvpConsigliato)}</p></div>
                    )}
                    {m !== null && (
                      <div className="text-right"><p className="text-[10px] text-gray-400">Margine</p><p className="text-xs font-semibold text-gray-700">{m}%</p></div>
                    )}
                  </div>
                  {/* Azioni */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => isEditing ? setEditId(null) : startEdit(p)} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                      {isEditing ? <X size={14} /> : <Pencil size={14} />}
                    </button>
                    <button onClick={() => deleteProdotto(p.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {isEditing && <EditForm editData={editData} setEditData={setEditData} onSave={() => saveEdit(p.id)} onCancel={() => setEditId(null)} saving={saving} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Cesti ────────────────────────────────────────────────────────────────

type GiacenzaRow = { cestoCodice: string; negozio: string; qta: number };

function TabCesti() {
  const STORES_ALL = ['CR', 'RE', 'CA', 'VI', 'MN', 'TR', 'HUB'] as const;
  const [editing, setEditing] = useState<{ codice: string; negozio: string } | null>(null);
  const [editVal, setEditVal] = useState('');

  const { data: giacenze = [], refetch } = useQuery<GiacenzaRow[]>({
    queryKey: ['oe-cesti-giacenze'],
    queryFn: async () => {
      const res = await fetch('/api/oe/alimentari/cesti/giacenze');
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000,
  });

  // Mappa (cestoCodice, negozio) → qta
  const gMap = new Map<string, number>();
  giacenze.forEach(r => gMap.set(`${r.cestoCodice}:${r.negozio}`, r.qta));
  const getQta = (codice: string, negozio: string) => gMap.get(`${codice}:${negozio}`) ?? 0;

  const saveGiacenza = async (cestoCodice: string, negozio: string) => {
    await fetch('/api/oe/alimentari/cesti/giacenze', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cestoCodice, negozio, qta: parseInt(editVal) || 0 }),
    });
    setEditing(null);
    refetch();
  };

  // Quanti cesti servono per le strenne
  const cestoCounts: Record<string, number> = {};
  STRENNE.forEach(s => {
    const tot = Object.values(s.qte).reduce((a, b) => a + b, 0);
    cestoCounts[s.cestoCodice] = (cestoCounts[s.cestoCodice] ?? 0) + tot;
  });

  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-700 font-medium">Click su una cella per modificare la giacenza</p>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-border">
              <th className="pb-2 pr-3 font-medium">Codice</th>
              <th className="pb-2 pr-3 font-medium">Descrizione</th>
              <th className="pb-2 pr-3 font-medium">Misure</th>
              <th className="pb-2 pr-3 font-medium text-right">PVP</th>
              <th className="pb-2 pr-3 font-medium text-right">Costo i.e.</th>
              <th className="pb-2 pr-3 font-medium text-right">Costo i.i.</th>
              {STORES_ALL.map(s => (
                <th key={s} className="pb-2 pr-1 font-medium text-center w-10">{s}</th>
              ))}
              <th className="pb-2 pr-3 font-medium text-center">TOT</th>
              <th className="pb-2 pr-3 font-medium text-center">Strenne</th>
              <th className="pb-2 font-medium text-center">Disponibili</th>
            </tr>
          </thead>
          <tbody>
            {CESTI_LICHENS.map(c => {
              const tot = STORES_ALL.reduce((a, s) => a + getQta(c.codice, s), 0);
              const perStrenne = cestoCounts[c.codice] ?? 0;
              const disponibili = tot - perStrenne;
              return (
                <tr key={c.codice} className="border-b border-border/40 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-gray-500">{c.codice}</td>
                  <td className="py-2 pr-3 font-medium text-primary whitespace-nowrap">{c.descrizione}</td>
                  <td className="py-2 pr-3 text-gray-400 whitespace-nowrap">{c.misure || '—'}</td>
                  <td className="py-2 pr-3 text-right font-medium">{fmt(c.pvp)}</td>
                  <td className="py-2 pr-3 text-right text-gray-500">{fmt(c.costo / 1.22)}</td>
                  <td className="py-2 pr-3 text-right text-gray-500">{fmt(c.costo)}</td>
                  {STORES_ALL.map(negozio => {
                    const qta = getQta(c.codice, negozio);
                    const isEd = editing?.codice === c.codice && editing?.negozio === negozio;
                    return (
                      <td key={negozio} className="py-1 pr-1 text-center">
                        {isEd ? (
                          <input
                            autoFocus
                            type="number" min="0"
                            className="w-10 text-center text-xs border border-primary rounded px-1 py-0.5"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={() => saveGiacenza(c.codice, negozio)}
                            onKeyDown={e => e.key === 'Enter' && saveGiacenza(c.codice, negozio)}
                          />
                        ) : (
                          <button
                            onClick={() => { setEditing({ codice: c.codice, negozio }); setEditVal(String(qta)); }}
                            className={cn(
                              'w-full min-w-[28px] py-0.5 rounded hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 transition-all',
                              qta > 0 ? 'font-medium text-gray-700' : 'text-gray-300'
                            )}
                          >
                            {qta}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 pr-3 text-center font-bold">{tot}</td>
                  <td className="py-2 pr-3 text-center">
                    {perStrenne > 0 ? <span className="text-amber-600 font-medium">{perStrenne}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 text-center">
                    <span className={cn('font-semibold', disponibili > 0 ? 'text-green-600' : disponibili < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {disponibili !== 0 ? disponibili : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Anagrafica Drawer ─────────────────────────────────────────────────────────

type AnagraticaState =
  | { kind: 'prodotto'; data: Prodotto }
  | { kind: 'cesto'; data: typeof CESTI_LICHENS[number] };

function ProdottoAnagrafica({ p, onClose }: { p: Prodotto; onClose: () => void }) {
  const iva = p.ivaPerc / 100;
  const costoIe = p.costoIi / (1 + iva);
  const pvpIe = p.pvpIi / (1 + iva);
  const marginePerc = p.pvpIi > 0 ? Math.round(((p.pvpIi - p.costoIi) / p.pvpIi) * 100) : null;
  const margineUnit = p.pvpIi - p.costoIi;

  return (
    <div className="p-5 space-y-4">
      {/* Intestazione */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {p.fornitore && (
            <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1.5', fornitoreBadge(p.fornitore))}>
              {p.fornitore}
            </span>
          )}
          <h2 className="text-xl font-semibold text-primary leading-tight">{p.nome}</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {p.formato && <span className="text-sm text-gray-400">{p.formato}</span>}
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">IVA {p.ivaPerc}%</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={18} />
        </button>
      </div>

      {p.fotoUrl && (
        <img src={p.fotoUrl} alt={p.nome} className="w-full h-44 object-cover rounded-xl" />
      )}

      {/* Prezzi */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Prezzi</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">Costo IVA esclusa</p>
            <p className="text-sm font-semibold text-gray-700">{fmt(costoIe)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">Costo IVA inclusa</p>
            <p className="text-sm font-semibold text-gray-700">{fmt(p.costoIi)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">PVP IVA esclusa</p>
            <p className="text-sm font-semibold text-green-700">{fmt(pvpIe)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">PVP IVA inclusa</p>
            <p className="text-sm font-semibold text-green-700">{fmt(p.pvpIi)}</p>
          </div>
          {p.pvpConsigliato != null && p.pvpConsigliato !== p.pvpIi && (
            <div className="bg-blue-50 rounded-xl p-3 col-span-2">
              <p className="text-[10px] text-blue-400 mb-0.5">PVP consigliato IVA inclusa</p>
              <p className="text-sm font-semibold text-blue-600">{fmt(p.pvpConsigliato)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Margine */}
      {marginePerc !== null && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Margine</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-0.5">Margine %</p>
              <p className="text-sm font-semibold text-gray-700">{marginePerc}%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-0.5">Margine unitario</p>
              <p className="text-sm font-semibold text-gray-700">{fmt(margineUnit)}</p>
            </div>
          </div>
        </div>
      )}

      {p.barcode && (
        <p className="text-xs text-gray-500">Barcode: <span className="font-mono text-gray-700">{p.barcode}</span></p>
      )}
      {p.note && (
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-amber-700">{p.note}</p>
        </div>
      )}
    </div>
  );
}

function CestoAnagrafica({ c, onClose }: { c: typeof CESTI_LICHENS[number]; onClose: () => void }) {
  const costoIe = c.costo / 1.22;
  const costoIi = c.costo;
  const pvpIe   = c.pvp / 1.22;
  const margineIe = pvpIe > 0 ? Math.round(((pvpIe - costoIe) / pvpIe) * 100) : 0;
  const margineUnit = pvpIe - costoIe;
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mb-1.5 bg-amber-50 text-amber-700">
            Cesto Lichens · IVA 22%
          </span>
          <h2 className="text-xl font-semibold text-primary leading-tight">{c.descrizione}</h2>
          {c.misure && <p className="text-sm text-gray-400 mt-0.5">{c.misure}</p>}
          <p className="text-[10px] font-mono text-gray-400 mt-0.5">cod. {c.codice}</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">Costo i.e.</p>
          <p className="text-sm font-semibold">{fmt(costoIe)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">Costo i.i.</p>
          <p className="text-sm font-semibold">{fmt(costoIi)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">PVP i.e.</p>
          <p className="text-sm font-semibold text-green-700">{fmt(pvpIe)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">PVP i.i.</p>
          <p className="text-sm font-semibold text-green-700">{fmt(c.pvp)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">Margine %</p>
          <p className={`text-sm font-bold ${margineIe >= 40 ? 'text-green-600' : margineIe >= 30 ? 'text-amber-600' : 'text-red-500'}`}>{margineIe}%</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-0.5">Margine unit.</p>
          <p className="text-sm font-semibold text-gray-700">{fmt(margineUnit)}</p>
        </div>
      </div>
    </div>
  );
}

function AnagraticaDrawer({ item, onClose }: { item: AnagraticaState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[85vh]">
        {item.kind === 'prodotto'
          ? <ProdottoAnagrafica p={item.data} onClose={onClose} />
          : <CestoAnagrafica c={item.data} onClose={onClose} />
        }
      </div>
    </div>
  );
}

// ── Tab: Strenne ──────────────────────────────────────────────────────────────

type QtaRow = { barcode: string; emporio: string; qta: number };

function TabStrenne({ prodotti }: { prodotti: Prodotto[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [anagratica, setAnagratica] = useState<AnagraticaState | null>(null);
  const [editing, setEditing] = useState<{ barcode: string; emporio: string } | null>(null);
  const [editVal, setEditVal] = useState('');

  const { data: qteRows = [], refetch: refetchQte } = useQuery<QtaRow[]>({
    queryKey: ['oe-strenne-qte'],
    queryFn: async () => {
      const res = await fetch('/api/oe/alimentari/strenne/qte');
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000,
  });

  const qteMap = new Map<string, number>();
  qteRows.forEach(r => qteMap.set(`${r.barcode}:${r.emporio}`, r.qta));
  const getQte = (barcode: string, emporio: string) => qteMap.get(`${barcode}:${emporio}`) ?? 0;

  const saveQte = async (barcode: string, emporio: string) => {
    await fetch('/api/oe/alimentari/strenne/qte', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, emporio, qta: parseInt(editVal) || 0 }),
    });
    setEditing(null);
    refetchQte();
  };

  const openProdotto = (nome: string) => {
    const p = prodotti.find(pd => pd.nome === nome);
    if (p) setAnagratica({ kind: 'prodotto', data: p });
  };

  const openCesto = (codice: string) => {
    const c = CESTI_LICHENS.find(ce => ce.codice === codice);
    if (c) setAnagratica({ kind: 'cesto', data: c as typeof CESTI_LICHENS[number] });
  };

  return (
    <>
    <div className="space-y-3">
      {STRENNE.map((s, i) => {
        const isOpen = openIdx === i;
        const totQte = EMPORI.reduce((a, emp) => a + getQte(s.barcode, emp), 0);
        const cesto = CESTI_LICHENS.find(c => c.codice === s.cestoCodice);
        const costoProdotti = s.prodotti.reduce((acc, sp) => {
          const prod = prodotti.find(p => p.nome === sp.nome);
          return acc + (prod?.costoIi ?? 0);
        }, 0);
        const costoReale = s.costoCesto + costoProdotti;
        return (
          <div key={s.barcode} className="border border-border rounded-xl bg-white overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">€{s.prezzo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary">Strenna {s.prezzo}</p>
                <p className="text-xs text-gray-400">{s.prodotti.length + 1} componenti · costo {fmt(costoReale)} · {fmtN(totQte)} pz tot.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400">{s.barcode}</span>
                {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
            </button>

            {isOpen && (() => {
              // calcoli ie per composizione
              const cestoIe = s.costoCesto / 1.22;
              const cestoPvpIe = (cesto?.pvp ?? 0) / 1.22;
              const cestoPvpIi = cesto?.pvp ?? 0;
              const righe = s.prodotti.map(sp => {
                const prod = prodotti.find(p => p.nome === sp.nome);
                const iva = (prod?.ivaPerc ?? 10) / 100;
                const cIi = prod?.costoIi ?? 0;
                const cIe = cIi / (1 + iva);
                const pIi = prod?.pvpIi ?? 0;
                const pIe = pIi / (1 + iva);
                return { nome: sp.nome, prod, cIi, cIe, pIi, pIe, marg: pIe - cIe };
              });
              const totCIi = righe.reduce((a, r) => a + r.cIi, 0) + s.costoCesto;
              const totCIe = righe.reduce((a, r) => a + r.cIe, 0) + cestoIe;
              const totPIi = righe.reduce((a, r) => a + r.pIi, 0) + cestoPvpIi;
              const totPIe = righe.reduce((a, r) => a + r.pIe, 0) + cestoPvpIe;
              const margTotIe = totPIe - totCIe;
              const margPercIe = totPIe > 0 ? Math.round((margTotIe / totPIe) * 100) : 0;
              const margTotPrev = margTotIe * totQte;
              return (
              <div className="px-4 pb-4 space-y-4 border-t border-border">
                {/* Composizione con prezzi dettagliati */}
                <div className="pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Composizione</p>
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-gray-400 text-right">
                          <th className="pb-1.5 text-left font-medium pr-3">Articolo</th>
                          <th className="pb-1.5 font-medium pr-2">Costo i.e.</th>
                          <th className="pb-1.5 font-medium pr-2">Costo i.i.</th>
                          <th className="pb-1.5 font-medium pr-2">PVP i.e.</th>
                          <th className="pb-1.5 font-medium pr-2">PVP i.i.</th>
                          <th className="pb-1.5 font-medium">Marg. ie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Cesto */}
                        <tr className="border-b border-border/30 hover:bg-gray-50">
                          <td className="py-1.5 pr-3">
                            <button onClick={() => openCesto(s.cestoCodice)} className="text-left text-gray-600 hover:text-primary flex items-center gap-1 group">
                              <span>🧺 {cesto?.descrizione ?? s.cestoCodice}</span>
                              <Info size={10} className="text-gray-300 group-hover:text-primary flex-shrink-0" />
                            </button>
                          </td>
                          <td className="py-1.5 pr-2 text-right text-gray-500">{fmt(cestoIe)}</td>
                          <td className="py-1.5 pr-2 text-right text-gray-500">{fmt(s.costoCesto)}</td>
                          <td className="py-1.5 pr-2 text-right text-gray-500">{fmt(cestoPvpIe)}</td>
                          <td className="py-1.5 pr-2 text-right text-gray-500">{fmt(cestoPvpIi)}</td>
                          <td className="py-1.5 text-right font-medium text-green-700">{fmt(cestoPvpIe - cestoIe)}</td>
                        </tr>
                        {/* Prodotti */}
                        {righe.map(r => (
                          <tr key={r.nome} className="border-b border-border/20 hover:bg-gray-50">
                            <td className="py-1.5 pr-3">
                              <button onClick={() => openProdotto(r.nome)} className="text-left hover:text-primary flex items-center gap-1 group">
                                <span>{r.nome}</span>
                                <Info size={10} className="text-gray-300 group-hover:text-primary flex-shrink-0" />
                              </button>
                            </td>
                            <td className="py-1.5 pr-2 text-right text-gray-500">{r.prod ? fmt(r.cIe) : '—'}</td>
                            <td className="py-1.5 pr-2 text-right text-gray-500">{r.prod ? fmt(r.cIi) : '—'}</td>
                            <td className="py-1.5 pr-2 text-right text-gray-500">{r.prod ? fmt(r.pIe) : '—'}</td>
                            <td className="py-1.5 pr-2 text-right text-gray-500">{r.prod ? fmt(r.pIi) : '—'}</td>
                            <td className="py-1.5 text-right font-medium text-green-700">{r.prod ? fmt(r.marg) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-semibold text-primary text-xs">
                          <td className="pt-1.5 pr-3">Totale</td>
                          <td className="pt-1.5 pr-2 text-right">{fmt(totCIe)}</td>
                          <td className="pt-1.5 pr-2 text-right">{fmt(totCIi)}</td>
                          <td className="pt-1.5 pr-2 text-right">{fmt(totPIe)}</td>
                          <td className="pt-1.5 pr-2 text-right">{fmt(totPIi)}</td>
                          <td className="pt-1.5 text-right text-green-700">{fmt(margTotIe)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Riepilogo margine */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 mb-0.5">Prezzo vendita</p>
                    <p className="text-sm font-bold text-primary">{fmt(s.prezzo)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 mb-0.5">Costo ie totale</p>
                    <p className="text-sm font-semibold">{fmt(totCIe)}</p>
                  </div>
                  <div className={cn('rounded-xl p-3', margPercIe >= 30 ? 'bg-green-50' : 'bg-amber-50')}>
                    <p className="text-[10px] text-gray-500 mb-0.5">Margine ie (1 strenna)</p>
                    <p className={cn('text-sm font-bold', margPercIe >= 30 ? 'text-green-700' : 'text-amber-700')}>{fmt(margTotIe)} <span className="text-xs font-normal">({margPercIe}%)</span></p>
                  </div>
                  <div className={cn('rounded-xl p-3', margPercIe >= 30 ? 'bg-green-50' : 'bg-amber-50')}>
                    <p className="text-[10px] text-gray-500 mb-0.5">Margine ie previsto ({fmtN(totQte)} pz)</p>
                    <p className={cn('text-sm font-bold', margPercIe >= 30 ? 'text-green-700' : 'text-amber-700')}>{fmt(margTotPrev)}</p>
                  </div>
                </div>

                {/* Quantità per emporio — editabili */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quantità per emporio <span className="text-amber-600 font-normal normal-case">(click per modificare)</span></p>
                  <div className="grid grid-cols-5 gap-2">
                    {EMPORI.map(emp => {
                      const qta = getQte(s.barcode, emp);
                      const isEd = editing?.barcode === s.barcode && editing?.emporio === emp;
                      return (
                        <div key={emp} className="text-center bg-gray-50 rounded-lg p-2">
                          <p className="text-[10px] text-gray-400 font-medium mb-1">{emp}</p>
                          {isEd ? (
                            <input
                              autoFocus
                              type="number" min="0"
                              className="w-full text-center text-sm border border-primary rounded px-1 py-0.5 font-bold"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={() => saveQte(s.barcode, emp)}
                              onKeyDown={e => e.key === 'Enter' && saveQte(s.barcode, emp)}
                            />
                          ) : (
                            <button
                              onClick={() => { setEditing({ barcode: s.barcode, emporio: emp }); setEditVal(String(qta)); }}
                              className={cn('w-full py-0.5 rounded text-lg font-bold hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 transition-all', qta > 0 ? 'text-primary' : 'text-gray-300')}
                            >
                              {qta}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-2">Totale: {fmtN(totQte)} pz</p>
                </div>
              </div>
              );
            })()}
          </div>
        );
      })}
    </div>
    {anagratica && <AnagraticaDrawer item={anagratica} onClose={() => setAnagratica(null)} />}
    </>
  );
}

// ── Tab: Fabbisogno ───────────────────────────────────────────────────────────

function TabFabbisogno({ prodotti, refetch }: { prodotti: Prodotto[]; refetch: () => void }) {
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (id: string, field: string, current: number) => {
    setEditing({ id, field });
    setEditVal(String(current));
  };

  const saveEmporio = async (prodottoId: string, emporio: string) => {
    setSaving(true);
    await fetch('/api/oe/alimentari/fabbisogno', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prodottoId, emporio, qta: parseInt(editVal) || 0 }),
    });
    setEditing(null);
    setSaving(false);
    refetch();
  };

  const saveOrdinato = async (prodottoId: string) => {
    setSaving(true);
    await fetch('/api/oe/alimentari/ordinato', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prodottoId, ordinato: parseInt(editVal) || 0 }),
    });
    setEditing(null);
    setSaving(false);
    refetch();
  };

  const cellKey = (id: string, field: string) => `${id}:${field}`;

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span>🔵 Strenne = fabbisogno per assemblare le strenne</span>
        <span>🟡 Empori = vendita libera a scaffale</span>
        <span className="text-amber-700 font-medium">Click su una cella per modificarla</span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-gray-400 border-b-2 border-border">
              <th className="pb-2 pr-3 font-medium min-w-[160px]">Prodotto</th>
              <th className="pb-2 px-2 font-medium text-center text-blue-600">Str.</th>
              {EMPORI.map(e => <th key={e} className="pb-2 px-2 font-medium text-center text-amber-600">{e}</th>)}
              <th className="pb-2 px-2 font-medium text-center text-amber-600">Tot Emp.</th>
              <th className="pb-2 px-2 font-medium text-center font-bold text-gray-700">Totale</th>
              <th className="pb-2 px-2 font-medium text-center text-green-700">Ordinato</th>
              <th className="pb-2 pl-2 font-medium text-center">Da ord.</th>
            </tr>
          </thead>
          <tbody>
            {prodotti.map(p => {
              const fabStr = FABBISOGNO_STRENNE[p.nome] ?? 0;
              const empMap: Record<string, number> = {};
              p.fabbisognoEmpori.forEach(r => { empMap[r.emporio] = r.qta; });
              const totEmp = EMPORI.reduce((a, e) => a + (empMap[e] ?? 0), 0);
              const totale = fabStr + totEmp;
              const ordinato = p.ordinato?.ordinato ?? 0;
              const daOrdinare = totale - ordinato;

              return (
                <tr key={p.id} className="border-b border-border/40 hover:bg-gray-50 group">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      {p.fotoUrl
                        ? <img src={p.fotoUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                        : <div className="w-6 h-6 rounded bg-gray-100 flex-shrink-0" />
                      }
                      <div>
                        <p className="font-medium text-primary leading-tight">{p.nome}</p>
                        {p.fornitore && <p className="text-[10px] text-gray-400">{p.fornitore}</p>}
                        {p.barcode && <p className="text-[10px] font-mono text-gray-300">{p.barcode}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Fabbisogno strenne */}
                  <td className="py-2 px-2 text-center">
                    <span className={cn('font-medium', fabStr > 0 ? 'text-blue-600' : 'text-gray-300')}>
                      {fabStr > 0 ? fabStr : '—'}
                    </span>
                  </td>

                  {/* Fabbisogno empori — editabili */}
                  {EMPORI.map(emp => {
                    const qta = empMap[emp] ?? 0;
                    const key = cellKey(p.id, emp);
                    const isEd = editing?.id === p.id && editing?.field === emp;
                    return (
                      <td key={emp} className="py-2 px-1 text-center">
                        {isEd ? (
                          <input
                            autoFocus
                            type="number" min="0"
                            className="w-12 text-center text-xs border border-primary rounded px-1 py-0.5"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={() => saveEmporio(p.id, emp)}
                            onKeyDown={e => e.key === 'Enter' && saveEmporio(p.id, emp)}
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(p.id, emp, qta)}
                            className={cn('w-full min-w-[28px] py-0.5 rounded hover:bg-amber-50 hover:ring-1 hover:ring-amber-300 transition-all', qta > 0 ? 'text-amber-700 font-medium' : 'text-gray-300')}
                          >
                            {qta > 0 ? qta : '0'}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* Tot empori */}
                  <td className="py-2 px-2 text-center font-medium text-amber-700">{totEmp || '—'}</td>

                  {/* Totale */}
                  <td className="py-2 px-2 text-center font-bold text-primary">{totale || '—'}</td>

                  {/* Ordinato — editabile */}
                  <td className="py-2 px-1 text-center">
                    {editing?.id === p.id && editing?.field === 'ordinato' ? (
                      <input
                        autoFocus
                        type="number" min="0"
                        className="w-14 text-center text-xs border border-green-500 rounded px-1 py-0.5"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onBlur={() => saveOrdinato(p.id)}
                        onKeyDown={e => e.key === 'Enter' && saveOrdinato(p.id)}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(p.id, 'ordinato', ordinato)}
                        className={cn('w-full min-w-[36px] py-0.5 rounded hover:bg-green-50 hover:ring-1 hover:ring-green-300 transition-all font-semibold', ordinato > 0 ? 'text-green-700' : 'text-gray-300')}
                      >
                        {ordinato > 0 ? ordinato : '0'}
                      </button>
                    )}
                  </td>

                  {/* Da ordinare */}
                  <td className="py-2 pl-2 text-center">
                    {daOrdinare > 0
                      ? <span className="font-bold text-red-600">{daOrdinare}</span>
                      : daOrdinare < 0
                      ? <span className="text-xs text-green-600">+{Math.abs(daOrdinare)}</span>
                      : <span className="text-gray-400">✓</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Analisi Commerciale ───────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3.5 border', accent ? 'bg-primary border-primary' : 'bg-white border-border')}>
      <p className={cn('text-[10px] font-medium mb-0.5', accent ? 'text-white/60' : 'text-gray-400')}>{label}</p>
      <p className={cn('text-xl font-bold leading-none', accent ? 'text-white' : 'text-primary')}>{value}</p>
      {sub && <p className={cn('text-[10px] mt-1', accent ? 'text-white/50' : 'text-gray-400')}>{sub}</p>}
    </div>
  );
}

function TabAnalisi({ prodotti }: { prodotti: Prodotto[] }) {
  const STORES_ALL = ['CR', 'RE', 'CA', 'VI', 'MN', 'TR', 'HUB'] as const;

  const { data: giacenze = [] } = useQuery<GiacenzaRow[]>({
    queryKey: ['oe-cesti-giacenze'],
    queryFn: async () => {
      const res = await fetch('/api/oe/alimentari/cesti/giacenze');
      return res.ok ? res.json() : [];
    },
    staleTime: 30_000,
  });

  // ── KPI catalogo ────────────────────────────────────────────────────────────
  const byFornitore: Record<string, Prodotto[]> = {};
  prodotti.forEach(p => {
    const f = p.fornitore ?? 'Sconosciuto';
    if (!byFornitore[f]) byFornitore[f] = [];
    byFornitore[f].push(p);
  });
  const totCostoIi = prodotti.reduce((a, p) => a + p.costoIi, 0);
  const totPvpIi   = prodotti.reduce((a, p) => a + p.pvpIi, 0);
  const margMedio  = totPvpIi > 0 ? Math.round(((totPvpIi - totCostoIi) / totPvpIi) * 100) : 0;

  // ── Strenne ─────────────────────────────────────────────────────────────────
  const strenneKpi = STRENNE.map(s => {
    const totQte    = Object.values(s.qte).reduce((a, b) => a + b, 0);
    // costo reale = costo cesto + somma costoIi dei prodotti (dal DB)
    const costoProdotti = s.prodotti.reduce((acc, sp) => {
      const prod = prodotti.find(p => p.nome === sp.nome);
      return acc + (prod?.costoIi ?? 0);
    }, 0);
    const costoReale = s.costoCesto + costoProdotti;
    const margPerc  = costoReale > 0 ? Math.round(((s.prezzo - costoReale) / s.prezzo) * 100) : 0;
    const margUnit  = s.prezzo - costoReale;
    const fatturato = s.prezzo * totQte;
    const costoTot  = costoReale * totQte;
    return { ...s, costoReale, totQte, margPerc, margUnit, fatturato, costoTot, margTot: fatturato - costoTot };
  });
  const totFatturato     = strenneKpi.reduce((a, s) => a + s.fatturato, 0);
  const totCostoStrenne  = strenneKpi.reduce((a, s) => a + s.costoTot, 0);
  const totMargStrenne   = strenneKpi.reduce((a, s) => a + s.margTot, 0);
  const totPzStrenne     = strenneKpi.reduce((a, s) => a + s.totQte, 0);
  const margStrennePerc  = totFatturato > 0 ? Math.round((totMargStrenne / totFatturato) * 100) : 0;

  // ── Prodotti per margine ─────────────────────────────────────────────────────
  const rankMargine = prodotti
    .filter(p => p.pvpIi > 0 && p.costoIi > 0)
    .map(p => ({
      ...p,
      margPerc: Math.round(((p.pvpIi - p.costoIi) / p.pvpIi) * 100),
      margUnit: p.pvpIi - p.costoIi,
    }))
    .sort((a, b) => b.margPerc - a.margPerc);

  // ── Fabbisogno ordinativo ────────────────────────────────────────────────────
  const ordinativoRighe = prodotti
    .map(p => {
      const fabStr  = FABBISOGNO_STRENNE[p.nome] ?? 0;
      const totEmp  = EMPORI.reduce((s, e) => s + (p.fabbisognoEmpori.find(r => r.emporio === e)?.qta ?? 0), 0);
      const totale  = fabStr + totEmp;
      const ordinato = p.ordinato?.ordinato ?? 0;
      const da       = totale - ordinato;
      return { ...p, totale, ordinato, da };
    })
    .filter(p => p.totale > 0)
    .sort((a, b) => b.da - a.da);
  const totDaOrdinare     = ordinativoRighe.reduce((a, p) => a + Math.max(0, p.da), 0);
  const costoOrdinativo   = ordinativoRighe.reduce((a, p) => a + Math.max(0, p.da) * p.costoIi, 0);

  // ── Cesti ────────────────────────────────────────────────────────────────────
  const gMap = new Map<string, number>();
  giacenze.forEach(r => gMap.set(`${r.cestoCodice}:${r.negozio}`, r.qta));
  const cestoCounts: Record<string, number> = {};
  STRENNE.forEach(s => {
    const tot = Object.values(s.qte).reduce((a, b) => a + b, 0);
    cestoCounts[s.cestoCodice] = (cestoCounts[s.cestoCodice] ?? 0) + tot;
  });
  const cestiKpi = CESTI_LICHENS.map(c => {
    const totGiac     = STORES_ALL.reduce((a, s) => a + (gMap.get(`${c.codice}:${s}`) ?? 0), 0);
    const riservati   = cestoCounts[c.codice] ?? 0;
    return { ...c, totGiac, riservati, disponibili: totGiac - riservati,
      valoreCosto: totGiac * c.costo, valorePvp: totGiac * c.pvp };
  });
  const totValCestiCosto = cestiKpi.reduce((a, c) => a + c.valoreCosto, 0);
  const totValCestiPvp   = cestiKpi.reduce((a, c) => a + c.valorePvp, 0);

  return (
    <div className="space-y-10 pb-8">

      {/* ① KPI catalogo */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Catalogo prodotti</h2>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Prodotti a catalogo" value={fmtN(prodotti.length)} sub={`${fmtN(Object.keys(byFornitore).length)} fornitori`} />
          <KpiCard label="Margine medio" value={`${margMedio}%`} sub="sul catalogo completo" accent />
        </div>
      </section>

      {/* ② Strenne */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Strenne — previsione commerciale</h2>
        <div className="overflow-x-auto -mx-4 px-4 mb-4">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b-2 border-border text-gray-400 text-left">
                <th className="pb-2 pr-3 font-medium">Strenna</th>
                <th className="pb-2 px-2 font-medium text-right">Costo</th>
                <th className="pb-2 px-2 font-medium text-right">Prezzo</th>
                <th className="pb-2 px-2 font-medium text-right">Marg.%</th>
                <th className="pb-2 px-2 font-medium text-right">Marg. unit.</th>
                <th className="pb-2 px-2 font-medium text-right">Pz</th>
                <th className="pb-2 px-2 font-medium text-right">Fatturato</th>
                <th className="pb-2 pl-2 font-medium text-right">Margine tot.</th>
              </tr>
            </thead>
            <tbody>
              {strenneKpi.map(s => (
                <tr key={s.barcode} className="border-b border-border/40 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">Strenna {s.prezzo}</td>
                  <td className="py-2 px-2 text-right text-gray-500">{fmt(s.costoReale)}</td>
                  <td className="py-2 px-2 text-right font-medium">{fmt(s.prezzo)}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={cn('font-semibold', s.margPerc >= 30 ? 'text-green-600' : 'text-amber-600')}>{s.margPerc}%</span>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">{fmt(s.margUnit)}</td>
                  <td className="py-2 px-2 text-right font-medium">{fmtN(s.totQte)}</td>
                  <td className="py-2 px-2 text-right font-medium text-primary">{fmt(s.fatturato)}</td>
                  <td className="py-2 pl-2 text-right font-semibold text-green-700">{fmt(s.margTot)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-primary text-xs">
                <td className="pt-2 pr-3">TOTALE</td>
                <td className="pt-2 px-2 text-right text-gray-600">{fmt(totCostoStrenne)}</td>
                <td className="pt-2 px-2" />
                <td className="pt-2 px-2 text-right text-green-600">{margStrennePerc}%</td>
                <td className="pt-2 px-2" />
                <td className="pt-2 px-2 text-right">{fmtN(totPzStrenne)}</td>
                <td className="pt-2 px-2 text-right">{fmt(totFatturato)}</td>
                <td className="pt-2 pl-2 text-right text-green-700">{fmt(totMargStrenne)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Fatturato previsto" value={fmt(totFatturato)} sub={`${fmtN(totPzStrenne)} strenne totali`} accent />
          <KpiCard label="Investimento" value={fmt(totCostoStrenne)} sub="costo acquisto stock" />
          <KpiCard label="Margine previsto" value={fmt(totMargStrenne)} sub={`${margStrennePerc}% sul fatturato`} accent />
        </div>
      </section>

      {/* ③ Fornitori */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Analisi per fornitore</h2>
        <div className="space-y-2">
          {Object.entries(byFornitore)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([fornitore, prods]) => {
              const valid     = prods.filter(p => p.pvpIi > 0 && p.costoIi > 0);
              const avgMarg   = valid.length ? Math.round(valid.reduce((a, p) => a + ((p.pvpIi - p.costoIi) / p.pvpIi) * 100, 0) / valid.length) : 0;
              const avgPvp    = prods.reduce((a, p) => a + p.pvpIi, 0) / (prods.length || 1);
              const avgCosto  = prods.reduce((a, p) => a + p.costoIi, 0) / (prods.length || 1);
              return (
                <div key={fornitore} className="flex items-center gap-3 bg-white border border-border rounded-xl p-3">
                  <span className={cn('text-[10px] font-medium px-2 py-1 rounded-lg min-w-[110px] text-center flex-shrink-0', fornitoreBadge(fornitore))}>
                    {fornitore}
                  </span>
                  <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400">Prodotti</p>
                      <p className="text-sm font-bold">{prods.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Costo medio</p>
                      <p className="text-sm font-semibold text-gray-600">{fmt(avgCosto)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">PVP medio</p>
                      <p className="text-sm font-semibold">{fmt(avgPvp)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Margine medio</p>
                      <p className={cn('text-sm font-bold', avgMarg >= 45 ? 'text-green-600' : avgMarg >= 35 ? 'text-amber-600' : 'text-red-500')}>
                        {avgMarg}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* ④ Classifica prodotti per margine */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Classifica prodotti per margine</h2>
        <div className="space-y-2">
          {rankMargine.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-border rounded-xl px-3 py-2.5 text-xs">
              <span className="w-5 text-gray-400 text-center font-mono flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary truncate">{p.nome}</p>
                {p.fornitore && <p className="text-[10px] text-gray-400">{p.fornitore}</p>}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-gray-500 flex-shrink-0 text-[10px]">
                <span>Costo {fmt(p.costoIi)}</span>
                <span className="text-gray-300">·</span>
                <span>PVP {fmt(p.pvpIi)}</span>
                <span className="text-gray-300">·</span>
                <span>unit. {fmt(p.margUnit)}</span>
              </div>
              {/* Barra */}
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                <div
                  className={cn('h-full rounded-full', p.margPerc >= 50 ? 'bg-green-500' : p.margPerc >= 35 ? 'bg-amber-400' : 'bg-red-400')}
                  style={{ width: `${Math.min(p.margPerc, 100)}%` }}
                />
              </div>
              <span className={cn('font-bold w-9 text-right flex-shrink-0', p.margPerc >= 50 ? 'text-green-600' : p.margPerc >= 35 ? 'text-amber-600' : 'text-red-500')}>
                {p.margPerc}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ⑤ Fabbisogno ordinativo */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Fabbisogno ordinativo</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <KpiCard label="Pezzi ancora da ordinare" value={fmtN(totDaOrdinare)} sub="su tutto il fabbisogno" />
          <KpiCard label="Valore ordine residuo" value={fmt(costoOrdinativo)} sub="costo IVA inclusa" accent />
        </div>
        <div className="space-y-1.5">
          {ordinativoRighe.map(p => (
            <div key={p.id} className="flex items-center gap-3 text-xs bg-white border border-border rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary truncate">{p.nome}</p>
              </div>
              <span className="text-gray-400 flex-shrink-0">Fabb. {fmtN(p.totale)}</span>
              <span className="text-green-600 flex-shrink-0">Ord. {fmtN(p.ordinato)}</span>
              {p.da > 0
                ? <span className="font-bold text-red-600 flex-shrink-0 min-w-[70px] text-right">Da ord. {fmtN(p.da)}</span>
                : p.da < 0
                ? <span className="text-green-600 flex-shrink-0 min-w-[70px] text-right">Surplus {fmtN(Math.abs(p.da))}</span>
                : <span className="text-gray-400 flex-shrink-0 min-w-[70px] text-right">✓ Ok</span>
              }
            </div>
          ))}
        </div>
      </section>

      {/* ⑥ Cesti — valore giacenze */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Cesti — valore giacenze</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <KpiCard label="Valore giacenza a PVP" value={fmt(totValCestiPvp)} sub={`costo ${fmt(totValCestiCosto)}`} />
          <KpiCard label="Margine sui cesti" value={`${Math.round(((totValCestiPvp - totValCestiCosto) / (totValCestiPvp || 1)) * 100)}%`} sub="sul totale giacenza" accent />
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b-2 border-border text-gray-400 text-left">
                <th className="pb-2 pr-3 font-medium">Cesto</th>
                <th className="pb-2 px-2 font-medium text-right">Giacenza</th>
                <th className="pb-2 px-2 font-medium text-right">Riservati</th>
                <th className="pb-2 px-2 font-medium text-right">Disponibili</th>
                <th className="pb-2 px-2 font-medium text-right">Costo</th>
                <th className="pb-2 px-2 font-medium text-right">PVP unit.</th>
                <th className="pb-2 px-2 font-medium text-right">Val. costo</th>
                <th className="pb-2 pl-2 font-medium text-right">Val. PVP</th>
              </tr>
            </thead>
            <tbody>
              {cestiKpi.map(c => (
                <tr key={c.codice} className="border-b border-border/40 hover:bg-gray-50">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-primary">{c.descrizione}</p>
                    {c.misure && <p className="text-[10px] text-gray-400">{c.misure}</p>}
                  </td>
                  <td className="py-2 px-2 text-right font-medium">{c.totGiac}</td>
                  <td className="py-2 px-2 text-right text-amber-600">{c.riservati || '—'}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={cn('font-semibold', c.disponibili > 0 ? 'text-green-600' : c.disponibili < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {c.disponibili}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-500">{fmt(c.costo)}</td>
                  <td className="py-2 px-2 text-right text-gray-500">{fmt(c.pvp)}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{fmt(c.valoreCosto)}</td>
                  <td className="py-2 pl-2 text-right font-semibold text-primary">{fmt(c.valorePvp)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-primary text-xs">
                <td className="pt-2 pr-3">TOTALE</td>
                <td className="pt-2 px-2 text-right">{cestiKpi.reduce((a, c) => a + c.totGiac, 0)}</td>
                <td className="pt-2 px-2 text-right text-amber-600">{cestiKpi.reduce((a, c) => a + c.riservati, 0)}</td>
                <td className="pt-2 px-2" />
                <td className="pt-2 px-2" /><td className="pt-2 px-2" />
                <td className="pt-2 px-2 text-right">{fmt(totValCestiCosto)}</td>
                <td className="pt-2 pl-2 text-right">{fmt(totValCestiPvp)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────

type Tab = 'prodotti' | 'cesti' | 'strenne' | 'fabbisogno' | 'analisi';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'prodotti', label: 'Prodotti', icon: Package },
  { id: 'cesti', label: 'Cesti', icon: ShoppingBasket },
  { id: 'strenne', label: 'Strenne', icon: Gift },
  { id: 'fabbisogno', label: 'Fabbisogno', icon: BarChart2 },
  { id: 'analisi', label: 'Analisi', icon: TrendingUp },
];

export default function OeAlimentariSection() {
  const [tab, setTab] = useState<Tab>('prodotti');
  const qc = useQueryClient();

  const { data: prodotti = [], isLoading, refetch } = useQuery<Prodotto[]>({
    queryKey: ['oe-alimentari-prodotti'],
    queryFn: async () => {
      const res = await fetch('/api/oe/alimentari/prodotti');
      if (!res.ok) throw new Error('Errore caricamento');
      return res.json();
    },
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-28">
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <p className="text-2xs tracking-[0.2em] uppercase text-gray-400">sezione</p>
        <h1 className="font-display text-3xl font-light tracking-widest leading-tight mt-0.5">OE ALIMENTARI</h1>
        <p className="text-xs text-gray-400 mt-1">Strenne Natale — gestione prodotti e fabbisogno</p>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-[#faf8f5] border-b border-border px-4">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-primary'
              )}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Caricamento...</div>
        ) : tab === 'prodotti' ? (
          <TabProdotti prodotti={prodotti} refetch={refetch} />
        ) : tab === 'cesti' ? (
          <TabCesti />
        ) : tab === 'strenne' ? (
          <TabStrenne prodotti={prodotti} />
        ) : tab === 'fabbisogno' ? (
          <TabFabbisogno prodotti={prodotti} refetch={refetch} />
        ) : (
          <TabAnalisi prodotti={prodotti} />
        )}
      </div>

    </div>
  );
}
