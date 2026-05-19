'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Search, Edit2, Trash2, Eye, EyeOff, X, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProductImport from './ProductImport';
import ProductForm from './ProductForm';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

type ActiveFilter = 'all' | 'active' | 'inactive';

interface BulkEditValues {
  gruppoMerceologico: string;
  famiglia: string;
  classe: string;
  produttore: string;
  isActive: '' | 'true' | 'false';
}

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

  // Modals / edit state
  const [showImport, setShowImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterGruppo, setFilterGruppo] = useState('');
  const [filterFamiglia, setFilterFamiglia] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterProduttore, setFilterProduttore] = useState('');
  const [filterTranche, setFilterTranche] = useState('');
  const [filterActive, setFilterActive] = useState<ActiveFilter>('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<BulkEditValues>({
    gruppoMerceologico: '',
    famiglia: '',
    classe: '',
    produttore: '',
    isActive: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=500');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const allProducts: Product[] = data?.data || [];

  // Dropdown options derived from full list
  const gruppoOptions = useMemo(() => uniqueSorted(allProducts, 'gruppoMerceologico'), [allProducts]);
  const famigliaOptions = useMemo(() => uniqueSorted(allProducts, 'famiglia'), [allProducts]);
  const classeOptions = useMemo(() => uniqueSorted(allProducts, 'classe'), [allProducts]);
  const produttoreOptions = useMemo(() => uniqueSorted(allProducts, 'produttore'), [allProducts]);
  const trancheOptions = useMemo(() => uniqueSorted(allProducts, 'tranche'), [allProducts]);

  // Client-side filtering
  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
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
      if (filterProduttore && p.produttore !== filterProduttore) return false;
      if (filterTranche && p.tranche !== filterTranche) return false;
      if (filterActive === 'active' && !p.isActive) return false;
      if (filterActive === 'inactive' && p.isActive) return false;
      return true;
    });
  }, [allProducts, search, filterGruppo, filterFamiglia, filterClasse, filterProduttore, filterTranche, filterActive]);

  const hasFilters = search || filterGruppo || filterFamiglia || filterClasse || filterProduttore || filterTranche || filterActive !== 'all';

  function resetFilters() {
    setSearch('');
    setFilterGruppo('');
    setFilterFamiglia('');
    setFilterClasse('');
    setFilterProduttore('');
    setFilterTranche('');
    setFilterActive('all');
  }

  // Selection helpers
  const allVisibleSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
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

  async function handleBulkUpdate() {
    const payload: Record<string, unknown> = {};
    if (bulkEditValues.gruppoMerceologico.trim()) payload.gruppoMerceologico = bulkEditValues.gruppoMerceologico.trim();
    if (bulkEditValues.famiglia.trim()) payload.famiglia = bulkEditValues.famiglia.trim();
    if (bulkEditValues.classe.trim()) payload.classe = bulkEditValues.classe.trim();
    if (bulkEditValues.produttore.trim()) payload.produttore = bulkEditValues.produttore.trim();
    if (bulkEditValues.isActive !== '') payload.isActive = bulkEditValues.isActive === 'true';

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
      if (!res.ok) throw new Error('Failed');
      const { updated } = await res.json();
      setShowBulkEdit(false);
      setBulkEditValues({ gruppoMerceologico: '', famiglia: '', classe: '', produttore: '', isActive: '' });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`${updated} prodott${updated === 1 ? 'o aggiornato' : 'i aggiornati'}`);
    } catch {
      toast.error('Impossibile aggiornare i prodotti');
    } finally {
      setIsBulkUpdating(false);
    }
  }

  const selectClass = 'h-8 border border-border rounded px-2 text-xs text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Prodotti</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total || 0} prodotti in collezione</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            icon={<Upload size={13} />}
            onClick={() => setShowImport(true)}
          >
            <span className="hidden sm:inline">Importa</span>
          </Button>
          <Button
            icon={<Plus size={13} />}
            onClick={() => setShowCreateForm(true)}
          >
            <span className="hidden sm:inline">Aggiungi Prodotto</span>
            <span className="sm:hidden">Aggiungi</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Text search */}
          <div className="w-56">
            <Input
              placeholder="Codice, descrizione, produttore..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>

          {/* Gruppo merceologico */}
          <select
            value={filterGruppo}
            onChange={(e) => setFilterGruppo(e.target.value)}
            className={selectClass}
          >
            <option value="">Gruppo merceologico</option>
            {gruppoOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Famiglia */}
          <select
            value={filterFamiglia}
            onChange={(e) => setFilterFamiglia(e.target.value)}
            className={selectClass}
          >
            <option value="">Famiglia</option>
            {famigliaOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Classe */}
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className={selectClass}
          >
            <option value="">Classe</option>
            {classeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Produttore */}
          <select
            value={filterProduttore}
            onChange={(e) => setFilterProduttore(e.target.value)}
            className={selectClass}
          >
            <option value="">Produttore</option>
            {produttoreOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Tranche */}
          <select
            value={filterTranche}
            onChange={(e) => setFilterTranche(e.target.value)}
            className={selectClass}
          >
            <option value="">Tranche</option>
            {trancheOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Attivo toggle */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as ActiveFilter)}
            className={selectClass}
          >
            <option value="all">Tutti</option>
            <option value="active">Attivi</option>
            <option value="inactive">Non attivi</option>
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 h-8 px-2 text-xs text-gray-500 hover:text-primary border border-border rounded hover:bg-cream transition-colors"
            >
              <RotateCcw size={11} />
              Reset filtri
            </button>
          )}
        </div>

        {/* Result count */}
        {hasFilters && (
          <p className="text-xs text-gray-400">
            {products.length} risultat{products.length === 1 ? 'o' : 'i'} su {allProducts.length}
          </p>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-accent/5 border border-accent/20 rounded">
          <span className="text-xs font-medium text-primary">
            {selectedIds.size} prodott{selectedIds.size === 1 ? 'o selezionato' : 'i selezionati'}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBulkEditValues({ gruppoMerceologico: '', famiglia: '', classe: '', produttore: '', isActive: '' });
                setShowBulkEdit(true);
              }}
            >
              Modifica selezionati
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Elimina selezionati
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-gray-400 hover:text-primary"
              title="Deseleziona tutto"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 accent-accent cursor-pointer"
                  disabled={products.length === 0}
                />
              </th>
              <th>Codice</th>
              <th>Descrizione</th>
              <th>Produttore</th>
              <th>Costo i.e.</th>
              <th>Vendita i.i.</th>
              <th>IVA</th>
              <th>% Ric.</th>
              <th>Stato</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <LoadingSpinner className="mx-auto" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                  Nessun prodotto trovato
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const ivaFactor = 1 + (product.iva ?? 22) / 100;
                const pvn = product.retailPrice / ivaFactor;
                const ricarico =
                  product.costPrice > 0
                    ? ((pvn - product.costPrice) / product.costPrice) * 100
                    : null;
                return (
                <tr key={product.id} className={selectedIds.has(product.id) ? 'bg-accent/5' : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-3.5 h-3.5 accent-accent cursor-pointer"
                    />
                  </td>
                  <td>
                    <span className="font-mono text-xs text-gray-500">{product.code}</span>
                  </td>
                  <td>
                    <p className="font-medium text-primary text-xs">{product.name}</p>
                  </td>
                  <td>
                    <span className="text-xs text-gray-500">{product.produttore || '—'}</span>
                  </td>
                  <td className="font-medium text-xs">{formatCurrency(product.costPrice)}</td>
                  <td className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</td>
                  <td className="text-xs text-center text-gray-500">{product.iva ?? 22}%</td>
                  <td className="text-xs text-center">
                    {ricarico !== null ? (
                      <span className={ricarico >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {ricarico >= 0 ? '+' : ''}{ricarico.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={product.isActive ? 'success' : 'default'} size="xs">
                      {product.isActive ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                        title="Modifica"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(product)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                        title={product.isActive ? 'Disattiva' : 'Attiva'}
                      >
                        {product.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Importa Prodotti"
        size="xl"
      >
        <ProductImport
          onSuccess={() => {
            setShowImport(false);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Modifica Prodotto"
        size="lg"
      >
        {editingProduct && (
          <ProductForm
            product={editingProduct}
            onSuccess={() => {
              setEditingProduct(null);
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            }}
            onCancel={() => setEditingProduct(null)}
          />
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Aggiungi Prodotto"
        size="lg"
      >
        <ProductForm
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        title={`Modifica ${selectedIds.size} prodott${selectedIds.size === 1 ? 'o' : 'i'}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Solo i campi compilati verranno aggiornati.</p>

          <div className="space-y-3">
            <Input
              label="Gruppo merceologico"
              value={bulkEditValues.gruppoMerceologico}
              onChange={(e) => setBulkEditValues((v) => ({ ...v, gruppoMerceologico: e.target.value }))}
              placeholder="es. Tessili casa"
            />
            <Input
              label="Famiglia"
              value={bulkEditValues.famiglia}
              onChange={(e) => setBulkEditValues((v) => ({ ...v, famiglia: e.target.value }))}
              placeholder="es. Prodotti tessili"
            />
            <Input
              label="Classe"
              value={bulkEditValues.classe}
              onChange={(e) => setBulkEditValues((v) => ({ ...v, classe: e.target.value }))}
              placeholder="es. Tavola"
            />
            <Input
              label="Produttore"
              value={bulkEditValues.produttore}
              onChange={(e) => setBulkEditValues((v) => ({ ...v, produttore: e.target.value }))}
              placeholder="Nome del produttore"
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stato</label>
              <select
                value={bulkEditValues.isActive}
                onChange={(e) => setBulkEditValues((v) => ({ ...v, isActive: e.target.value as BulkEditValues['isActive'] }))}
                className="w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">— non modificare —</option>
                <option value="true">Attivo</option>
                <option value="false">Non attivo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowBulkEdit(false)}>Annulla</Button>
            <Button onClick={handleBulkUpdate} loading={isBulkUpdating}>
              Applica modifiche
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirm */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title="Conferma eliminazione"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary">
            Sei sicuro di voler eliminare <strong>{selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}</strong>?
            Questa azione non può essere annullata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleBulkDelete}
              loading={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Elimina {selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
