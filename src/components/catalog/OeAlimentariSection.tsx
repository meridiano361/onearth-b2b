'use client';

import { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera, Pencil, Trash2, Plus, X, Check, ChevronDown, ChevronUp,
  Package, ShoppingBasket, Gift, BarChart2, LayoutGrid, List, Search,
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

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

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
        <input className="input-oe" type="number" step="0.01" placeholder="Costo i.i." value={editData.costoIi ?? ''} onChange={e => setEditData(d => ({ ...d, costoIi: parseFloat(e.target.value) }))} />
        <input className="input-oe" type="number" step="0.01" placeholder="PVP i.i." value={editData.pvpIi ?? ''} onChange={e => setEditData(d => ({ ...d, pvpIi: parseFloat(e.target.value) }))} />
        <input className="input-oe" type="number" step="0.01" placeholder="PVP cons." value={editData.pvpConsigliato ?? ''} onChange={e => setEditData(d => ({ ...d, pvpConsigliato: parseFloat(e.target.value) }))} />
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
            <input className="input-oe" placeholder="Costo i.i. €" type="number" step="0.01" value={newData.costoIi ?? ''} onChange={e => setNewData(d => ({ ...d, costoIi: parseFloat(e.target.value) }))} />
            <input className="input-oe" placeholder="PVP i.i. €" type="number" step="0.01" value={newData.pvpIi ?? ''} onChange={e => setNewData(d => ({ ...d, pvpIi: parseFloat(e.target.value) }))} />
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

function TabCesti() {
  const STORES_ALL = ['CR', 'RE', 'CA', 'VI', 'MN', 'TR', 'HUB'] as const;

  // Quanti cesti vengono usati nelle strenne
  const cestoCounts: Record<string, number> = {};
  STRENNE.forEach(s => {
    const tot = Object.values(s.qte).reduce((a, b) => a + b, 0);
    cestoCounts[s.cestoCodice] = (cestoCounts[s.cestoCodice] ?? 0) + tot;
  });

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400 border-b border-border">
            <th className="pb-2 pr-3 font-medium">Codice</th>
            <th className="pb-2 pr-3 font-medium">Descrizione</th>
            <th className="pb-2 pr-3 font-medium">Misure</th>
            <th className="pb-2 pr-3 font-medium text-right">PVP</th>
            <th className="pb-2 pr-3 font-medium text-right">Costo</th>
            {STORES_ALL.map(s => <th key={s} className="pb-2 pr-2 font-medium text-center w-8">{s}</th>)}
            <th className="pb-2 pr-3 font-medium text-center">TOT</th>
            <th className="pb-2 pr-3 font-medium text-center">Strenne</th>
            <th className="pb-2 font-medium text-center">Disponibili</th>
          </tr>
        </thead>
        <tbody>
          {CESTI_LICHENS.map(c => {
            const tot = Object.values(c.giacenze as Record<string, number>).reduce((a, b) => a + b, 0);
            const perStrenne = cestoCounts[c.codice] ?? 0;
            const disponibili = tot - perStrenne;
            return (
              <tr key={c.codice} className="border-b border-border/40 hover:bg-gray-50">
                <td className="py-2 pr-3 font-mono text-gray-500">{c.codice}</td>
                <td className="py-2 pr-3 font-medium text-primary">{c.descrizione}</td>
                <td className="py-2 pr-3 text-gray-400">{c.misure}</td>
                <td className="py-2 pr-3 text-right font-medium">{fmt(c.pvp)}</td>
                <td className="py-2 pr-3 text-right text-gray-500">{fmt(c.costo)}</td>
                {STORES_ALL.map(s => (
                  <td key={s} className="py-2 pr-2 text-center">
                    <span className={cn('font-medium', (c.giacenze as Record<string, number>)[s] > 0 ? 'text-gray-700' : 'text-gray-300')}>
                      {(c.giacenze as Record<string, number>)[s] ?? 0}
                    </span>
                  </td>
                ))}
                <td className="py-2 pr-3 text-center font-bold">{tot}</td>
                <td className="py-2 pr-3 text-center">
                  {perStrenne > 0 ? <span className="text-amber-600 font-medium">{perStrenne}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2 text-center">
                  <span className={cn('font-semibold', disponibili > 0 ? 'text-green-600' : 'text-gray-400')}>
                    {disponibili > 0 ? disponibili : '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Strenne ──────────────────────────────────────────────────────────────

function TabStrenne() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {STRENNE.map((s, i) => {
        const isOpen = openIdx === i;
        const totQte = Object.values(s.qte).reduce((a, b) => a + b, 0);
        const cesto = CESTI_LICHENS.find(c => c.codice === s.cestoCodice);
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
                <p className="font-semibold text-primary">Strenna {fmt(s.prezzo)}</p>
                <p className="text-xs text-gray-400">{s.prodotti.length + 1} componenti · costo {fmt(s.totCosto)} · {totQte} pz tot.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-400">{s.barcode}</span>
                {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-4 border-t border-border">
                {/* Composizione */}
                <div className="pt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Composizione</p>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-sm text-gray-600">🧺 Cesto {cesto?.descrizione ?? s.cestoCodice} ({s.cestoCodice})</span>
                    <span className="text-xs text-gray-500">{fmt(s.costoCesto)}</span>
                  </div>
                  {s.prodotti.map(p => (
                    <div key={p.nome} className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-sm">{p.nome}</span>
                      <span className="text-xs text-gray-500">{fmt(p.pvp)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 font-semibold">
                    <span className="text-sm">Totale costo</span>
                    <span className="text-sm text-primary">{fmt(s.totCosto)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-green-700">
                    <span className="text-sm">Prezzo vendita</span>
                    <span className="text-sm">{fmt(s.prezzo)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs">Margine</span>
                    <span className="text-xs font-medium">{Math.round(((s.prezzo - s.totCosto) / s.prezzo) * 100)}%</span>
                  </div>
                </div>

                {/* Quantità per emporio */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quantità per emporio</p>
                  <div className="grid grid-cols-5 gap-2">
                    {EMPORI.map(emp => (
                      <div key={emp} className="text-center bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 font-medium">{emp}</p>
                        <p className="text-lg font-bold text-primary">{(s.qte as Record<string, number>)[emp] ?? 0}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-2">Totale: {totQte} pz</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
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

// ── Main Section ──────────────────────────────────────────────────────────────

type Tab = 'prodotti' | 'cesti' | 'strenne' | 'fabbisogno';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'prodotti', label: 'Prodotti', icon: Package },
  { id: 'cesti', label: 'Cesti', icon: ShoppingBasket },
  { id: 'strenne', label: 'Strenne', icon: Gift },
  { id: 'fabbisogno', label: 'Fabbisogno', icon: BarChart2 },
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
          <TabStrenne />
        ) : (
          <TabFabbisogno prodotti={prodotti} refetch={refetch} />
        )}
      </div>

    </div>
  );
}
