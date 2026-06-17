'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Search, Edit2, Trash2, Eye, EyeOff, X, RotateCcw, ImagePlus, ChevronUp, ChevronDown, ChevronsUpDown, Languages, Loader2, Power } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PaeseSelect from '@/components/ui/PaeseSelect';
import ProductImport from './ProductImport';
import BulkImageUpload from './BulkImageUpload';
import ProductForm from './ProductForm';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

type ActiveFilter = 'all' | 'active' | 'inactive';
type FotoFilter = 'all' | 'con-foto' | 'senza-foto' | 'foto-multiple';
type TemaColorePresenzaFilter = 'all' | 'con-tema' | 'senza-tema';
type SortField = 'code' | 'name' | 'produttore' | 'collezione' | 'costPrice' | 'retailPrice';
type SortDir = 'asc' | 'desc';

interface BulkEditValues {
  // Anagrafica
  produttore: string;
  misura: string;
  paese: string;
  // Classificazione
  gruppoMerceologico: string;
  famiglia: string;
  classe: string;
  sottoclasse: string;
  gruppoOmogeneo: string;
  nomLinea: string;
  stagione: string;
  collezione: string;
  colore: string;
  temaColore: string;
  temaColore2: string;
  temaColore3: string;
  temaColore4: string;
  temaColore5: string;
  temaColoreBulkMode: 'sostituisci' | 'aggiungi';
  // Prezzi e logistica
  lotSize: string;
  iva: string;
  costPrice: string;
  retailPrice: string;
  fasciaRicarico: string;
  fasciaSconto: string;
  tranche: string;
  // Altri
  notes: string;
  isActive: '' | 'true' | 'false';
}

const EMPTY_BULK: BulkEditValues = {
  produttore: '', misura: '', paese: '',
  gruppoMerceologico: '', famiglia: '', classe: '', sottoclasse: '', gruppoOmogeneo: '',
  nomLinea: '', stagione: '', collezione: '', colore: '', temaColore: '',
  temaColore2: '', temaColore3: '', temaColore4: '', temaColore5: '', temaColoreBulkMode: 'sostituisci',
  lotSize: '', iva: '', costPrice: '', retailPrice: '', fasciaRicarico: '', fasciaSconto: '', tranche: '',
  notes: '', isActive: '',
};

function uniqueSorted(products: Product[], key: keyof Product): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const v = p[key];
    if (v && typeof v === 'string') set.add(v);
  }
  return Array.from(set).sort();
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkImages, setShowBulkImages] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTranslateConfirm, setShowTranslateConfirm] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterGruppo, setFilterGruppo] = useState('');
  const [filterFamiglia, setFilterFamiglia] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSottoclasse, setFilterSottoclasse] = useState('');
  const [filterGruppoOmogeneo, setFilterGruppoOmogeneo] = useState('');
  const [filterColore, setFilterColore] = useState('');
  const [filterTemaColore, setFilterTemaColore] = useState('');
  const [filterCollezione, setFilterCollezione] = useState('');
  const [filterLinea, setFilterLinea] = useState('');
  const [filterProduttore, setFilterProduttore] = useState('');
  const [filterTranche, setFilterTranche] = useState('');
  const [filterStagione, setFilterStagione] = useState('');
  const [filterActive, setFilterActive] = useState<ActiveFilter>('all');
  const [filterFoto, setFilterFoto] = useState<FotoFilter>('all');
  const [filterTemaColorePresenza, setFilterTemaColorePresenza] = useState<TemaColorePresenzaFilter>('all');
  const [filterFasciaSconto, setFilterFasciaSconto] = useState('');
  const [filterFasciaRicarico, setFilterFasciaRicarico] = useState('');
  const [filterPrezzoCosto, setFilterPrezzoCosto] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<BulkEditValues>(EMPTY_BULK);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=500');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const allProducts: Product[] = data?.data || [];

  const gruppoOptions = useMemo(() => uniqueSorted(allProducts, 'gruppoMerceologico'), [allProducts]);
  const famigliaOptions = useMemo(() => uniqueSorted(allProducts, 'famiglia'), [allProducts]);
  const classeOptions = useMemo(() => uniqueSorted(allProducts, 'classe'), [allProducts]);
  const sottoclasseOptions = useMemo(() => uniqueSorted(allProducts, 'sottoclasse'), [allProducts]);
  const gruppoOmogeneoOptions = useMemo(() => uniqueSorted(allProducts, 'gruppoOmogeneo'), [allProducts]);
  const coloreOptions = useMemo(() => uniqueSorted(allProducts, 'colore'), [allProducts]);
  const temaColoreOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProducts) {
      [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].forEach((v) => { if (v) set.add(v); });
    }
    return Array.from(set).sort();
  }, [allProducts]);
  const collezioneOptions = useMemo(() => uniqueSorted(allProducts, 'collezione'), [allProducts]);
  const lineaOptions = useMemo(() => uniqueSorted(allProducts, 'nomLinea'), [allProducts]);
  const produttoreOptions = useMemo(() => uniqueSorted(allProducts, 'produttore'), [allProducts]);
  const trancheOptions = useMemo(() => uniqueSorted(allProducts, 'tranche'), [allProducts]);
  const stagioneOptions = useMemo(() => uniqueSorted(allProducts, 'stagione'), [allProducts]);

  function hasTemaColore(p: Product): boolean {
    return !!(p.temaColore || p.temaColore2 || p.temaColore3 || p.temaColore4 || p.temaColore5);
  }

  function computeSconto(p: Product): number {
    const fs = Number((p as any).fasciaSconto);
    if (fs > 0) return fs;
    const iva = (p.iva ?? 22);
    const pvn = Number(p.retailPrice) / (1 + iva / 100);
    return pvn > 0 ? (1 - Number(p.costPrice) / pvn) * 100 : 0;
  }

  function computeRicarico(p: Product): number {
    const iva = (p.iva ?? 22);
    const pvn = Number(p.retailPrice) / (1 + iva / 100);
    const cost = Number(p.costPrice);
    return cost > 0 ? ((pvn - cost) / cost) * 100 : 0;
  }

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = allProducts.filter((p) => {
      if (q) {
        const match =
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.produttore?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      if (filterGruppo && p.gruppoMerceologico !== filterGruppo) return false;
      if (filterFamiglia && p.famiglia !== filterFamiglia) return false;
      if (filterClasse && p.classe !== filterClasse) return false;
      if (filterSottoclasse && p.sottoclasse !== filterSottoclasse) return false;
      if (filterGruppoOmogeneo && p.gruppoOmogeneo !== filterGruppoOmogeneo) return false;
      if (filterColore && p.colore !== filterColore) return false;
      if (filterTemaColore && ![p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].includes(filterTemaColore)) return false;
      if (filterCollezione && p.collezione !== filterCollezione) return false;
      if (filterLinea && p.nomLinea !== filterLinea) return false;
      if (filterProduttore && p.produttore !== filterProduttore) return false;
      if (filterTranche && p.tranche !== filterTranche) return false;
      if (filterStagione && p.stagione !== filterStagione) return false;
      if (filterActive === 'active' && !p.isActive) return false;
      if (filterActive === 'inactive' && p.isActive) return false;
      if (filterFoto === 'con-foto' && !p.imageUrl) return false;
      if (filterFoto === 'senza-foto' && p.imageUrl) return false;
      if (filterFoto === 'foto-multiple' && !p.imageUrl2 && !p.imageUrl3 && !p.imageUrl4) return false;
      if (filterFasciaSconto) {
        const sc = computeSconto(p);
        if (filterFasciaSconto === '0-30' && sc >= 30) return false;
        if (filterFasciaSconto === '30-40' && (sc < 30 || sc >= 40)) return false;
        if (filterFasciaSconto === '40-50' && (sc < 40 || sc >= 50)) return false;
        if (filterFasciaSconto === '50-60' && (sc < 50 || sc >= 60)) return false;
        if (filterFasciaSconto === '60+' && sc < 60) return false;
      }
      if (filterFasciaRicarico) {
        const ric = computeRicarico(p);
        if (filterFasciaRicarico === '0-50' && ric >= 50) return false;
        if (filterFasciaRicarico === '50-100' && (ric < 50 || ric >= 100)) return false;
        if (filterFasciaRicarico === '100-150' && (ric < 100 || ric >= 150)) return false;
        if (filterFasciaRicarico === '150+' && ric < 150) return false;
      }
      if (filterPrezzoCosto) {
        const cost = Number(p.costPrice);
        if (filterPrezzoCosto === '0-5' && cost >= 5) return false;
        if (filterPrezzoCosto === '5-10' && (cost < 5 || cost >= 10)) return false;
        if (filterPrezzoCosto === '10-20' && (cost < 10 || cost >= 20)) return false;
        if (filterPrezzoCosto === '20-50' && (cost < 20 || cost >= 50)) return false;
        if (filterPrezzoCosto === '50+' && cost < 50) return false;
      }
      if (filterTemaColorePresenza === 'con-tema' && !hasTemaColore(p)) return false;
      if (filterTemaColorePresenza === 'senza-tema' && hasTemaColore(p)) return false;
      return true;
    });

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField] ?? '';
        const bVal = b[sortField] ?? '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc'
            ? aVal.localeCompare(bVal, 'it', { sensitivity: 'base' })
            : bVal.localeCompare(aVal, 'it', { sensitivity: 'base' });
        }
        return sortDir === 'asc' ? (Number(aVal) - Number(bVal)) : (Number(bVal) - Number(aVal));
      });
    }

    return filtered;
  }, [allProducts, search, filterGruppo, filterFamiglia, filterClasse, filterSottoclasse, filterGruppoOmogeneo, filterColore, filterTemaColore, filterCollezione, filterLinea, filterProduttore, filterTranche, filterStagione, filterActive, filterFoto, filterFasciaSconto, filterFasciaRicarico, filterPrezzoCosto, filterTemaColorePresenza, sortField, sortDir]);

  function handleColumnSort(field: SortField) {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={11} className="ml-1 text-gray-300 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="ml-1 text-accent inline" />
      : <ChevronDown size={11} className="ml-1 text-accent inline" />;
  }

  const hasFilters = search || filterGruppo || filterFamiglia || filterClasse || filterSottoclasse || filterGruppoOmogeneo || filterColore || filterTemaColore || filterCollezione || filterLinea || filterProduttore || filterTranche || filterStagione || filterActive !== 'all' || filterFoto !== 'all' || filterFasciaSconto || filterFasciaRicarico || filterPrezzoCosto || filterTemaColorePresenza !== 'all';

  function resetFilters() {
    setSearch(''); setFilterGruppo(''); setFilterFamiglia('');
    setFilterClasse(''); setFilterSottoclasse(''); setFilterGruppoOmogeneo('');
    setFilterColore(''); setFilterTemaColore(''); setFilterCollezione(''); setFilterLinea('');
    setFilterProduttore(''); setFilterTranche(''); setFilterStagione('');
    setFilterActive('all'); setFilterFoto('all'); setFilterTemaColorePresenza('all');
    setFilterFasciaSconto(''); setFilterFasciaRicarico(''); setFilterPrezzoCosto('');
  }

  const allVisibleSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggleActive(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`Prodotto ${product.isActive ? 'disattivato' : 'attivato'}`);
    } catch {
      toast.error('Impossibile aggiornare il prodotto');
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Eliminare ${product.name}? Questa azione non può essere annullata.`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Prodotto eliminato');
    } catch {
      toast.error('Impossibile eliminare il prodotto');
    }
  }

  async function handleBulkDelete() {
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed');
      const { deleted } = await res.json();
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${deleted} prodott${deleted === 1 ? 'o eliminato' : 'i eliminati'}`);
    } catch {
      toast.error('Impossibile eliminare i prodotti');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function setBulk(k: keyof BulkEditValues, v: string) {
    setBulkEditValues((prev) => ({ ...prev, [k]: v }));
  }

  async function handleBulkUpdate() {
    const b = bulkEditValues;
    const payload: Record<string, unknown> = {};

    const strMap: [keyof BulkEditValues, string][] = [
      ['produttore', b.produttore], ['misura', b.misura], ['paese', b.paese],
      ['gruppoMerceologico', b.gruppoMerceologico], ['famiglia', b.famiglia],
      ['classe', b.classe], ['sottoclasse', b.sottoclasse], ['gruppoOmogeneo', b.gruppoOmogeneo],
      ['nomLinea', b.nomLinea], ['stagione', b.stagione], ['collezione', b.collezione],
      ['colore', b.colore],
      ['fasciaRicarico', b.fasciaRicarico], ['tranche', b.tranche], ['notes', b.notes],
    ];
    for (const [k, v] of strMap) {
      if (v.trim()) payload[k] = v.trim();
    }

    // temaColore — modalità Sostituisci o Aggiungi
    if (b.temaColoreBulkMode === 'sostituisci' && b.temaColore.trim()) {
      payload.temaColore = b.temaColore.trim();
      payload.temaColore2 = b.temaColore2.trim() || null;
      payload.temaColore3 = b.temaColore3.trim() || null;
      payload.temaColore4 = b.temaColore4.trim() || null;
      payload.temaColore5 = b.temaColore5.trim() || null;
    }
    if (b.lotSize.trim()) { const n = parseInt(b.lotSize, 10); if (!isNaN(n) && n > 0) payload.lotSize = n; }
    if (b.iva.trim()) { const n = parseInt(b.iva, 10); if (!isNaN(n)) payload.iva = n; }
    if (b.costPrice.trim()) { const n = parseFloat(b.costPrice); if (!isNaN(n) && n > 0) payload.costPrice = n; }
    if (b.retailPrice.trim()) { const n = parseFloat(b.retailPrice); if (!isNaN(n) && n > 0) payload.retailPrice = n; }
    if (b.fasciaSconto.trim()) { const n = parseFloat(b.fasciaSconto); if (!isNaN(n)) payload.fasciaSconto = n; }
    if (b.isActive !== '') payload.isActive = b.isActive === 'true';

    // Aggiungi mode: per-product update to fill first empty temaColore slot
    if (b.temaColoreBulkMode === 'aggiungi' && b.temaColore.trim()) {
      const newTema = b.temaColore.trim();
      const selectedProds = allProducts.filter((p) => selectedIds.has(p.id));
      if (selectedProds.length === 0) { toast.error('Nessun prodotto selezionato'); return; }
      setIsBulkUpdating(true);
      try {
        let updated = 0;
        await Promise.all(selectedProds.map(async (p) => {
          const slots = ['temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5'] as const;
          const emptySlot = slots.find((s) => !p[s]);
          if (!emptySlot) return;
          await fetch(`/api/products/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [emptySlot]: newTema }),
          });
          updated++;
        }));
        setShowBulkEdit(false);
        setBulkEditValues(EMPTY_BULK);
        setSelectedIds(new Set());
        await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        toast.success(`Tema colore aggiunto a ${updated} prodott${updated === 1 ? 'o' : 'i'}`);
      } catch {
        toast.error('Impossibile aggiornare i prodotti');
      } finally {
        setIsBulkUpdating(false);
      }
      return;
    }

    if (Object.keys(payload).length === 0) {
      toast.error('Compila almeno un campo');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const res = await fetch('/api/products/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), data: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed');
      }
      const { updated } = await res.json();
      setShowBulkEdit(false);
      setBulkEditValues(EMPTY_BULK);
      setSelectedIds(new Set());
      // Se tranche era nel payload, reset del filtro tranche per mostrare i prodotti aggiornati
      if (payload.tranche !== undefined) setFilterTranche('');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${updated} prodott${updated === 1 ? 'o aggiornato' : 'i aggiornati'}`);
    } catch {
      toast.error('Impossibile aggiornare i prodotti');
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleTranslateAll() {
    const missing = allProducts.filter((p) => !(p as any).descrizioneEn);
    if (missing.length === 0) { toast('Tutti i prodotti hanno già le traduzioni'); return; }
    setIsTranslatingAll(true);
    setTranslateProgress({ done: 0, total: missing.length });
    const ids = missing.map((p) => p.id);
    // Invia in batch da 10 per mostrare progress
    const BATCH = 10;
    let done = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      try {
        const res = await fetch('/api/admin/products/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: batch }),
        });
        const data = await res.json();
        done += data.translated ?? batch.length;
      } catch {
        done += batch.length;
      }
      setTranslateProgress({ done, total: missing.length });
    }
    setIsTranslatingAll(false);
    setShowTranslateConfirm(false);
    setTranslateProgress(null);
    toast.success(`Traduzione completata: ${done} prodotti tradotti`);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  }

  const selectClass = 'h-8 border border-border rounded px-2 text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';
  const bulkInputClass = 'w-full h-9 border border-border rounded px-3 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-gray-300';
  const bulkLabelClass = 'block text-xs font-medium text-gray-600 mb-1';
  const bulkSectionClass = 'text-2xs font-semibold tracking-widest uppercase text-gray-400 mb-2 pt-2';

  function thBtn(field: SortField, label: string) {
    return (
      <button
        onClick={() => handleColumnSort(field)}
        className="flex items-center whitespace-nowrap hover:text-accent transition-colors"
      >
        {label}
        <SortIcon field={field} />
      </button>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Prodotti</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLoading ? 'Caricamento...' : [
              `${products.length} prodotti${hasFilters ? ` (su ${allProducts.length})` : ''}`,
              `${products.filter(p => p.isActive).length} attivi`,
              `${products.filter(p => !p.isActive).length} non attivi`,
              `${products.filter(p => !p.imageUrl).length} senza foto`,
            ].join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="secondary" icon={<Upload size={13} />} onClick={() => setShowImport(true)}>
            <span className="hidden sm:inline">Importa da Excel</span>
          </Button>
          <Button variant="secondary" icon={<ImagePlus size={13} />} onClick={() => setShowBulkImages(true)}>
            <span className="hidden sm:inline">Carica foto in blocco</span>
          </Button>
          <Button variant="secondary" icon={<Languages size={13} />} onClick={() => setShowTranslateConfirm(true)}>
            <span className="hidden sm:inline">Traduci tutti</span>
          </Button>
          <Button icon={<Plus size={13} />} onClick={() => setShowCreateForm(true)}>
            <span className="hidden sm:inline">Aggiungi Prodotto</span>
            <span className="sm:hidden">Aggiungi</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-56">
            <Input placeholder="Codice, descrizione, produttore..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} />
          </div>
          <select value={filterGruppo} onChange={(e) => setFilterGruppo(e.target.value)} className={selectClass}>
            <option value="">Gruppo merceologico</option>
            {gruppoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterFamiglia} onChange={(e) => setFilterFamiglia(e.target.value)} className={selectClass}>
            <option value="">Famiglia</option>
            {famigliaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className={selectClass}>
            <option value="">Classe</option>
            {classeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterSottoclasse} onChange={(e) => setFilterSottoclasse(e.target.value)} className={selectClass}>
            <option value="">Sottoclasse</option>
            {sottoclasseOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterGruppoOmogeneo} onChange={(e) => setFilterGruppoOmogeneo(e.target.value)} className={selectClass}>
            <option value="">Gruppo omogeneo</option>
            {gruppoOmogeneoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterColore} onChange={(e) => setFilterColore(e.target.value)} className={selectClass}>
            <option value="">Colore</option>
            {coloreOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterTemaColore} onChange={(e) => setFilterTemaColore(e.target.value)} className={selectClass}>
            <option value="">Tema colore</option>
            {temaColoreOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterTemaColorePresenza} onChange={(e) => setFilterTemaColorePresenza(e.target.value as TemaColorePresenzaFilter)} className={selectClass}>
            <option value="all">Tema: Tutti</option>
            <option value="con-tema">Con tema colore</option>
            <option value="senza-tema">Senza tema colore</option>
          </select>
          <select value={filterCollezione} onChange={(e) => setFilterCollezione(e.target.value)} className={selectClass}>
            <option value="">Collezione</option>
            {collezioneOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterLinea} onChange={(e) => setFilterLinea(e.target.value)} className={selectClass}>
            <option value="">Linea</option>
            {lineaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterProduttore} onChange={(e) => setFilterProduttore(e.target.value)} className={selectClass}>
            <option value="">Produttore</option>
            {produttoreOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterTranche} onChange={(e) => setFilterTranche(e.target.value)} className={selectClass}>
            <option value="">Tranche</option>
            {trancheOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterStagione} onChange={(e) => setFilterStagione(e.target.value)} className={selectClass}>
            <option value="">Stagione</option>
            {stagioneOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterFasciaSconto} onChange={(e) => setFilterFasciaSconto(e.target.value)} className={selectClass}>
            <option value="">Fascia sconto</option>
            <option value="0-30">&lt; 30%</option>
            <option value="30-40">30–40%</option>
            <option value="40-50">40–50%</option>
            <option value="50-60">50–60%</option>
            <option value="60+">&gt; 60%</option>
          </select>
          <select value={filterFasciaRicarico} onChange={(e) => setFilterFasciaRicarico(e.target.value)} className={selectClass}>
            <option value="">Fascia ricarico</option>
            <option value="0-50">&lt; 50%</option>
            <option value="50-100">50–100%</option>
            <option value="100-150">100–150%</option>
            <option value="150+">&gt; 150%</option>
          </select>
          <select value={filterPrezzoCosto} onChange={(e) => setFilterPrezzoCosto(e.target.value)} className={selectClass}>
            <option value="">Prezzo costo</option>
            <option value="0-5">0–5 €</option>
            <option value="5-10">5–10 €</option>
            <option value="10-20">10–20 €</option>
            <option value="20-50">20–50 €</option>
            <option value="50+">&gt; 50 €</option>
          </select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as ActiveFilter)} className={selectClass}>
            <option value="all">Stato: Tutti</option>
            <option value="active">Solo attivi</option>
            <option value="inactive">Solo non attivi</option>
          </select>
          <select value={filterFoto} onChange={(e) => setFilterFoto(e.target.value as FotoFilter)} className={selectClass}>
            <option value="all">Foto: Tutti</option>
            <option value="con-foto">Con foto</option>
            <option value="senza-foto">Senza foto</option>
            <option value="foto-multiple">Con foto multiple</option>
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="flex items-center gap-1 h-8 px-2 text-xs text-gray-500 hover:text-primary border border-border rounded hover:bg-cream transition-colors">
              <RotateCcw size={11} />
              Reset filtri
            </button>
          )}
        </div>
        {hasFilters && (
          <p className="text-xs text-gray-400">{products.length} risultat{products.length === 1 ? 'o' : 'i'} su {allProducts.length}</p>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-accent/5 border border-accent/20 rounded">
          <span className="text-xs font-medium text-primary">
            {selectedIds.size} prodott{selectedIds.size === 1 ? 'o selezionato' : 'i selezionati'}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={() => { setBulkEditValues(EMPTY_BULK); setShowBulkEdit(true); }}>
              Modifica selezionati
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash2 size={12} />} onClick={() => setShowBulkDeleteConfirm(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              Elimina selezionati
            </Button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1 text-gray-400 hover:text-primary" title="Deseleziona tutto">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Riepilogo tema colore */}
      {!isLoading && (
        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
          <button
            onClick={() => setFilterTemaColorePresenza(filterTemaColorePresenza === 'con-tema' ? 'all' : 'con-tema')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${filterTemaColorePresenza === 'con-tema' ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium' : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 text-gray-500'}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="font-medium text-emerald-700">{allProducts.filter(hasTemaColore).length}</span>
            &nbsp;con tema colore
          </button>
          <button
            onClick={() => setFilterTemaColorePresenza(filterTemaColorePresenza === 'senza-tema' ? 'all' : 'senza-tema')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${filterTemaColorePresenza === 'senza-tema' ? 'border-gray-400 bg-gray-100 text-gray-700 font-medium' : 'border-border hover:border-gray-300 hover:bg-gray-50 text-gray-500'}`}
          >
            <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
            <span className="font-medium text-gray-600">{allProducts.filter(p => !hasTemaColore(p)).length}</span>
            &nbsp;senza tema colore
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-3.5 h-3.5 accent-accent cursor-pointer" disabled={products.length === 0} />
              </th>
              <th>{thBtn('code', 'Codice')}</th>
              <th>{thBtn('name', 'Descrizione')}</th>
              <th>{thBtn('produttore', 'Produttore')}</th>
              <th className="hidden sm:table-cell">{thBtn('collezione', 'Collezione')}</th>
              <th className="hidden lg:table-cell">Tema colore</th>
              <th>{thBtn('costPrice', 'Costo i.e.')}</th>
              <th>{thBtn('retailPrice', 'Vendita i.i.')}</th>
              <th>%SC</th>
              <th>% Ric.</th>
              <th className="text-center">Foto</th>
              <th>Stato</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={13} className="py-12 text-center"><LoadingSpinner className="mx-auto" /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={13} className="py-12 text-center text-gray-400 text-sm">Nessun prodotto trovato</td></tr>
            ) : (
              products.map((product) => {
                const ivaFactor = 1 + (product.iva ?? 22) / 100;
                const pvn = product.retailPrice / ivaFactor;
                const ricarico = product.costPrice > 0 ? ((pvn - product.costPrice) / product.costPrice) * 100 : null;
                return (
                  <tr key={product.id} className={selectedIds.has(product.id) ? 'bg-accent/5' : undefined}>
                    <td><input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="w-3.5 h-3.5 accent-accent cursor-pointer" /></td>
                    <td><span className="font-mono text-xs text-gray-500">{product.code}</span></td>
                    <td><p className="font-medium text-primary text-xs">{product.name}</p></td>
                    <td><span className="text-xs text-gray-500">{product.produttore || '—'}</span></td>
                    <td className="hidden sm:table-cell"><span className="text-xs text-gray-500">{product.collezione || '—'}</span></td>
                    <td className="hidden lg:table-cell">
                      {hasTemaColore(product)
                        ? <span className="inline-flex items-center gap-1 text-2xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={[product.temaColore, product.temaColore2, product.temaColore3, product.temaColore4, product.temaColore5].filter(Boolean).join(', ')}>{product.temaColore}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    <td className="font-medium text-xs">{formatCurrency(product.costPrice)}</td>
                    <td className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</td>
                    <td className="text-xs text-center">
                      {(() => {
                        const sc = computeSconto(product);
                        const color = sc > 40 ? 'text-green-600' : sc >= 30 ? 'text-yellow-600' : 'text-red-500';
                        return <span className={color}>{sc.toFixed(1)}%</span>;
                      })()}
                    </td>
                    <td className="text-xs text-center">
                      {ricarico !== null ? (
                        <span className={ricarico >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {ricarico >= 0 ? '+' : ''}{ricarico.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="text-center whitespace-nowrap">
                      {(() => {
                        const cnt = [product.imageUrl, product.imageUrl2, product.imageUrl3, product.imageUrl4].filter(Boolean).length;
                        return cnt > 0
                          ? <span className="text-xs text-green-600">📷 {cnt}</span>
                          : <span className="text-xs text-gray-300">📷</span>;
                      })()}
                    </td>
                    <td><Badge variant={product.isActive ? 'success' : 'default'} size="xs">{product.isActive ? 'Attivo' : 'Inattivo'}</Badge></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPreviewProduct(product)} className="p-1.5 text-gray-400 hover:text-accent rounded hover:bg-cream transition-colors" title="Anteprima"><Eye size={13} /></button>
                        <button onClick={() => setEditingProduct(product)} className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors" title="Modifica"><Edit2 size={13} /></button>
                        <button onClick={() => handleToggleActive(product)} className={`p-1.5 rounded transition-colors ${product.isActive ? 'text-green-500 hover:text-gray-400 hover:bg-gray-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}`} title={product.isActive ? 'Disattiva' : 'Attiva'}>
                          <Power size={13} />
                        </button>
                        <button onClick={() => handleDelete(product)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="Elimina"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={!!previewProduct} onClose={() => setPreviewProduct(null)} title="Anteprima prodotto" size="lg">
        {previewProduct && (() => {
          const p = previewProduct;
          const ivaFactor = 1 + (p.iva ?? 22) / 100;
          const pvn = p.retailPrice / ivaFactor;
          const ricarico = p.costPrice > 0 ? ((pvn - p.costPrice) / p.costPrice) * 100 : null;
          const margine = pvn > 0 ? ((pvn - p.costPrice) / pvn) * 100 : null;
          return (
            <div className="space-y-4">
              <div className="flex gap-4">
                {/* Foto */}
                <div className="w-36 h-36 flex-shrink-0 rounded border border-border bg-cream overflow-hidden">
                  {p.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Nessuna foto</div>
                  }
                </div>
                {/* Dati principali */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{p.code}</span>
                    <Badge variant={p.isActive ? 'success' : 'default'} size="xs">{p.isActive ? 'Attivo' : 'Non attivo'}</Badge>
                  </div>
                  <h3 className="font-semibold text-primary text-sm mb-2 leading-snug">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-500 leading-relaxed mb-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {p.produttore && <span className="text-xs text-gray-500"><span className="text-gray-400">Produttore:</span> {p.produttore}</span>}
                    {p.paese && <span className="text-xs text-gray-500"><span className="text-gray-400">Paese:</span> {p.paese}</span>}
                    {p.misura && <span className="text-xs text-gray-500"><span className="text-gray-400">Misure:</span> {p.misura}</span>}
                    {p.lotSize > 1 && <span className="text-xs text-gray-500"><span className="text-gray-400">Confezione:</span> {p.lotSize} pz</span>}
                  </div>
                </div>
              </div>

              {/* Classificazione */}
              {(p.gruppoMerceologico || p.famiglia || p.classe || p.sottoclasse || p.gruppoOmogeneo || p.nomLinea || p.collezione || p.colore || p.stagione || p.tranche) && (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Classificazione</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                    {p.gruppoMerceologico && <span className="text-xs text-gray-600"><span className="text-gray-400">Gruppo:</span> {p.gruppoMerceologico}</span>}
                    {p.famiglia && <span className="text-xs text-gray-600"><span className="text-gray-400">Famiglia:</span> {p.famiglia}</span>}
                    {p.classe && <span className="text-xs text-gray-600"><span className="text-gray-400">Classe:</span> {p.classe}</span>}
                    {p.sottoclasse && <span className="text-xs text-gray-600"><span className="text-gray-400">Sottoclasse:</span> {p.sottoclasse}</span>}
                    {p.gruppoOmogeneo && <span className="text-xs text-gray-600"><span className="text-gray-400">Gr. omogeneo:</span> {p.gruppoOmogeneo}</span>}
                    {p.nomLinea && <span className="text-xs text-gray-600"><span className="text-gray-400">Linea:</span> {p.nomLinea}</span>}
                    {p.collezione && <span className="text-xs text-gray-600"><span className="text-gray-400">Collezione:</span> {p.collezione}</span>}
                    {p.colore && <span className="text-xs text-gray-600"><span className="text-gray-400">Colore:</span> {p.colore}</span>}
                    {(p as any).stagione && <span className="text-xs text-gray-600"><span className="text-gray-400">Stagione:</span> {(p as any).stagione}</span>}
                    {p.tranche && <span className="text-xs text-gray-600"><span className="text-gray-400">Tranche:</span> {p.tranche}</span>}
                  </div>
                </div>
              )}

              {/* Prezzi */}
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Prezzi</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">Costo i.e.</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(p.costPrice)}</p>
                  </div>
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">PVP i.i.</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(p.retailPrice)}</p>
                  </div>
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">Ricarico</p>
                    <p className={`text-sm font-semibold ${ricarico !== null && ricarico >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {ricarico !== null ? `${ricarico >= 0 ? '+' : ''}${ricarico.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-cream/50 rounded px-3 py-2">
                    <p className="text-2xs text-gray-400 mb-0.5">Margine</p>
                    <p className={`text-sm font-semibold ${margine !== null && margine >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {margine !== null ? `${margine >= 0 ? '+' : ''}${margine.toFixed(1)}%` : '—'}
                    </p>
                  </div>
                </div>
                {((p as any).fasciaSconto != null || (p as any).fasciaRicarico) && (
                  <div className="flex gap-3 mt-2">
                    {(p as any).fasciaSconto != null && <span className="text-xs text-gray-500"><span className="text-gray-400">Fascia sconto:</span> {(p as any).fasciaSconto}%</span>}
                    {(p as any).fasciaRicarico && <span className="text-xs text-gray-500"><span className="text-gray-400">Fascia ricarico:</span> {(p as any).fasciaRicarico}</span>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setPreviewProduct(null); setEditingProduct(p); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Edit2 size={12} />
                  Modifica
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Aggiorna prodotti da Excel" size="xl">
        <ProductImport onSuccess={() => { setShowImport(false); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} />
      </Modal>

      {/* Bulk Images Modal */}
      <Modal isOpen={showBulkImages} onClose={() => setShowBulkImages(false)} title="Carica foto in blocco" size="lg">
        <BulkImageUpload onSuccess={() => { setShowBulkImages(false); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Modifica Prodotto" size="xl">
        {editingProduct && (
          <ProductForm product={editingProduct} onSuccess={() => { setEditingProduct(null); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} onCancel={() => setEditingProduct(null)} />
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="Aggiungi Prodotto" size="xl">
        <ProductForm onSuccess={() => { setShowCreateForm(false); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }} onCancel={() => setShowCreateForm(false)} />
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal isOpen={showBulkEdit} onClose={() => setShowBulkEdit(false)} title={`Modifica ${selectedIds.size} prodott${selectedIds.size === 1 ? 'o' : 'i'}`} size="lg">
        <div className="space-y-2">
          <p className="text-xs text-gray-400 pb-1">Solo i campi compilati verranno aggiornati.</p>

          <p className={bulkSectionClass}>Anagrafica</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={bulkLabelClass}>Produttore</label>
              <input value={bulkEditValues.produttore} onChange={(e) => setBulk('produttore', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Misure</label>
              <input value={bulkEditValues.misura} onChange={(e) => setBulk('misura', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
          </div>
          <PaeseSelect label="Paese" value={bulkEditValues.paese} onChange={(v) => setBulk('paese', v)} placeholder="— non modificare —" />

          <p className={bulkSectionClass}>Classificazione</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['gruppoMerceologico', 'Gruppo merceologico'], ['famiglia', 'Famiglia'],
              ['classe', 'Classe'], ['sottoclasse', 'Sottoclasse'],
              ['gruppoOmogeneo', 'Gruppo omogeneo'], ['nomLinea', 'Linea'],
              ['stagione', 'Stagione'], ['collezione', 'Collezione'],
              ['colore', 'Colore'],
            ] as [keyof BulkEditValues, string][]).map(([k, label]) => (
              <div key={k}>
                <label className={bulkLabelClass}>{label}</label>
                <input value={bulkEditValues[k] as string} onChange={(e) => setBulk(k, e.target.value)} placeholder="—" className={bulkInputClass} />
              </div>
            ))}
          </div>

          {/* Tema colore — Sostituisci / Aggiungi */}
          <div className="border border-border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className={bulkLabelClass + ' mb-0'}>Tema colore</label>
              <div className="flex gap-1">
                {(['sostituisci', 'aggiungi'] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setBulk('temaColoreBulkMode', mode)} className={`text-2xs px-2 py-0.5 rounded transition-colors ${bulkEditValues.temaColoreBulkMode === mode ? 'bg-primary text-white' : 'border border-border text-gray-500 hover:bg-cream'}`}>
                    {mode === 'sostituisci' ? 'Sostituisci' : 'Aggiungi'}
                  </button>
                ))}
              </div>
            </div>
            {bulkEditValues.temaColoreBulkMode === 'sostituisci' ? (
              <div className="grid grid-cols-2 gap-2">
                {(['temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5'] as const).map((k, i) => (
                  <input key={k} value={bulkEditValues[k]} onChange={(e) => setBulk(k, e.target.value)} placeholder={i === 0 ? 'Valore 1' : `Valore ${i + 1} (opz.)`} className={bulkInputClass} />
                ))}
              </div>
            ) : (
              <div>
                <input value={bulkEditValues.temaColore} onChange={(e) => setBulk('temaColore', e.target.value)} placeholder="Valore da aggiungere al primo slot libero" className={bulkInputClass} />
                <p className="text-2xs text-gray-400 mt-1">Aggiunge il valore al primo campo temaColore vuoto di ogni prodotto selezionato.</p>
              </div>
            )}
          </div>

          <p className={bulkSectionClass}>Prezzi e Logistica</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={bulkLabelClass}>Confezione</label>
              <input type="number" min="1" step="1" value={bulkEditValues.lotSize} onChange={(e) => setBulk('lotSize', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>IVA (%)</label>
              <select value={bulkEditValues.iva} onChange={(e) => setBulk('iva', e.target.value)} className="w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="">— non modificare —</option>
                {[0, 4, 5, 10, 22].map((v) => <option key={v} value={String(v)}>{v}%</option>)}
              </select>
            </div>
            <div>
              <label className={bulkLabelClass}>Prezzo costo i.e. (€)</label>
              <input type="number" step="0.01" min="0" value={bulkEditValues.costPrice} onChange={(e) => setBulk('costPrice', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Prezzo vendita i.i. (€)</label>
              <input type="number" step="0.01" min="0" value={bulkEditValues.retailPrice} onChange={(e) => setBulk('retailPrice', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Fascia di ricarico</label>
              <input value={bulkEditValues.fasciaRicarico} onChange={(e) => setBulk('fasciaRicarico', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Fascia di sconto (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={bulkEditValues.fasciaSconto} onChange={(e) => setBulk('fasciaSconto', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
            <div>
              <label className={bulkLabelClass}>Tranche</label>
              <input value={bulkEditValues.tranche} onChange={(e) => setBulk('tranche', e.target.value)} placeholder="—" className={bulkInputClass} />
            </div>
          </div>

          <p className={bulkSectionClass}>Altri</p>
          <div>
            <label className={bulkLabelClass}>Note</label>
            <textarea value={bulkEditValues.notes} onChange={(e) => setBulk('notes', e.target.value)} placeholder="—" rows={2} className="w-full border border-border rounded px-3 py-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-gray-300 resize-none" />
          </div>
          <div>
            <label className={bulkLabelClass}>Stato</label>
            <select value={bulkEditValues.isActive} onChange={(e) => setBulk('isActive', e.target.value as BulkEditValues['isActive'])} className="w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="">— non modificare —</option>
              <option value="true">Attivo</option>
              <option value="false">Non attivo</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setShowBulkEdit(false)}>Annulla</Button>
            <Button onClick={handleBulkUpdate} loading={isBulkUpdating}>Applica modifiche</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirm */}
      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Conferma eliminazione" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-primary">
            Sei sicuro di voler eliminare <strong>{selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}</strong>?
            Questa azione non può essere annullata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>Annulla</Button>
            <Button onClick={handleBulkDelete} loading={isBulkDeleting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
              Elimina {selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Translate Confirm Modal */}
      <Modal isOpen={showTranslateConfirm} onClose={() => !isTranslatingAll && setShowTranslateConfirm(false)} title="Traduci descrizioni prodotti" size="sm">
        <div className="space-y-4">
          {!isTranslatingAll ? (
            <>
              <p className="text-sm text-gray-600">
                Tradurre automaticamente <strong>{allProducts.filter((p) => !(p as any).descrizioneEn).length} prodotti</strong> con traduzioni mancanti?
                Il servizio è gratuito ma potrebbe richiedere alcuni minuti.
              </p>
              <p className="text-xs text-gray-400">Lingue: EN · DE · FR · ES (via MyMemory API)</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowTranslateConfirm(false)}>Annulla</Button>
                <Button icon={<Languages size={13} />} onClick={handleTranslateAll}>
                  Avvia traduzione
                </Button>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <Loader2 size={24} className="animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm font-medium text-primary">
                {translateProgress
                  ? `Tradotti ${translateProgress.done} di ${translateProgress.total} prodotti...`
                  : 'Avvio traduzione...'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Non chiudere questa pagina.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
