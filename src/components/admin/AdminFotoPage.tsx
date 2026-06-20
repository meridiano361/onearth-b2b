'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ImageIcon, Trash2, Link2, Unlink, X, Search, Upload,
  ZoomIn, ExternalLink, Loader2, CheckSquare, Square, ImagePlus, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import BulkImageUpload from './BulkImageUpload';

// ── Types ────────────────────────────────────────────────────────────────────

type PhotoProduct = { id: string; code: string; name: string; slot: number };

type Photo = {
  path: string;
  name: string;
  size: number;
  createdAt: string;
  url: string;
  status: 'in-uso' | 'da-collegare' | 'orfana';
  parsedCode: string | null;
  parsedSlot: number | null;
  product: PhotoProduct | null;
};

// ── Utils ────────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  photo,
  onClose,
  onDelete,
  onUnlink,
}: {
  photo: Photo;
  onClose: () => void;
  onDelete: (path: string) => Promise<void>;
  onUnlink: (productId: string) => Promise<void>;
}) {
  const [delConfirm, setDelConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await onDelete(photo.path);
    setLoading(false);
    onClose();
  }

  async function handleUnlink() {
    if (!photo.product) return;
    setLoading(true);
    await onUnlink(photo.product.id);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Image */}
        <div className="bg-gray-100 flex items-center justify-center" style={{ height: 320 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.name} className="max-h-full max-w-full object-contain" />
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary break-all">{photo.name}</p>
              <p className="text-2xs text-gray-400 mt-0.5">
                {fmtSize(photo.size)} · {fmtDate(photo.createdAt)}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-primary flex-shrink-0 p-1">
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xs text-gray-400 break-all flex-1 font-mono">{photo.url}</span>
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary flex-shrink-0"
            >
              <ExternalLink size={13} />
            </a>
          </div>

          {photo.product ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-3">
              <div>
                <p className="text-xs font-medium text-green-700">In uso — foto {photo.product.slot}</p>
                <p className="text-2xs text-gray-600 mt-0.5">
                  <span className="font-mono">{photo.product.code}</span> — {photo.product.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/admin/products?id=${photo.product.id}`}
                  className="text-xs text-accent hover:underline flex-shrink-0"
                >
                  Vedi prodotto
                </a>
                <button
                  onClick={handleUnlink}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  <Unlink size={11} />
                  Scollega
                </button>
              </div>
            </div>
          ) : photo.status === 'da-collegare' ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-xs font-medium text-amber-700">Da collegare</p>
              {photo.parsedCode && (
                <p className="text-2xs text-gray-600 mt-0.5">
                  Codice rilevato dal filename: <span className="font-mono font-medium">{photo.parsedCode}</span>
                  {photo.parsedSlot ? ` (foto ${photo.parsedSlot})` : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs font-medium text-red-600">Orfana — nessun prodotto la usa</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            {delConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Eliminare questa foto?</span>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {loading ? <Loader2 size={11} className="animate-spin" /> : null}
                  Elimina
                </button>
                <button onClick={() => setDelConfirm(false)} className="text-xs text-gray-500 hover:text-primary">
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDelConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-3 py-1.5 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} />
                Elimina foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Collega modal ─────────────────────────────────────────────────────────────

function CollegaModal({
  photo,
  onClose,
  onLinked,
}: {
  photo: Photo;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debRef = useRef<ReturnType<typeof setTimeout>>();
  const [loading, setLoading] = useState(false);

  function handleSearch(v: string) {
    setSearch(v);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDebouncedSearch(v), 300);
  }

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-link-search', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '30', active: 'true' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/products?${params}`);
      return (await res.json()).data as { id: string; code: string; name: string; imageUrl: string | null }[];
    },
    staleTime: 15_000,
  });
  const products = productsData ?? [];

  async function handleLink(productId: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/foto/collega', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, photoUrl: photo.url }),
      });
      if (!res.ok) throw new Error();
      toast.success('Foto collegata al prodotto');
      onLinked();
      onClose();
    } catch {
      toast.error('Errore nel collegamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-primary">Collega a prodotto</p>
            <p className="text-2xs text-gray-400 mt-0.5 font-mono">{photo.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca per codice o nome prodotto..."
              className="flex-1 text-xs outline-none text-primary placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-gray-400" />
            </div>
          )}
          {!isLoading && products.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-8">Nessun prodotto trovato</p>
          )}
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLink(p.id)}
              disabled={loading}
              className="flex items-center gap-3 w-full px-5 py-3 border-b border-border/50 hover:bg-cream/50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-8 h-8 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.code} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={11} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xs font-mono text-gray-400">{p.code}</p>
                <p className="text-xs text-primary truncate">{p.name}</p>
              </div>
              {p.imageUrl && (
                <span className="text-2xs text-orange-500 flex-shrink-0">Sostituirà foto attuale</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Upload modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-semibold text-primary">Carica foto</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1">
            <X size={16} />
          </button>
        </div>
        <BulkImageUpload onSuccess={onDone} />
      </div>
    </div>
  );
}

// ── Photo card ────────────────────────────────────────────────────────────────

function PhotoCard({
  photo,
  selected,
  onSelect,
  onDetail,
  onDelete,
  onCollega,
}: {
  photo: Photo;
  selected: boolean;
  onSelect: (path: string, v: boolean) => void;
  onDetail: (photo: Photo) => void;
  onDelete: (path: string) => void;
  onCollega: (photo: Photo) => void;
}) {
  const isOrphan = photo.status === 'orfana';

  return (
    <div
      className={`relative group bg-white border rounded-lg overflow-hidden transition-all ${
        selected ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-gray-300'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(photo.path, !selected); }}
        className="absolute top-2 left-2 z-10 bg-white/90 rounded p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {selected ? (
          <CheckSquare size={14} className="text-accent" />
        ) : (
          <Square size={14} className="text-gray-400" />
        )}
      </button>
      {selected && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(photo.path, false); }}
          className="absolute top-2 left-2 z-10 bg-white/90 rounded p-0.5 shadow-sm"
        >
          <CheckSquare size={14} className="text-accent" />
        </button>
      )}

      {/* Status badge */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className={`text-2xs font-medium px-1.5 py-0.5 rounded ${
            photo.status === 'in-uso'
              ? 'bg-green-100 text-green-700'
              : photo.status === 'da-collegare'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {photo.status === 'in-uso' ? 'In uso' : photo.status === 'da-collegare' ? 'Da collegare' : 'Orfana'}
        </span>
      </div>

      {/* Thumbnail */}
      <button
        onClick={() => onDetail(photo)}
        className="block w-full aspect-square bg-gray-100 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn size={20} className="text-white drop-shadow-md" />
        </div>
      </button>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        <p className="text-2xs font-mono text-gray-500 truncate" title={photo.name}>{photo.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xs text-gray-400">{fmtSize(photo.size)}</span>
          <span className="text-2xs text-gray-400">{fmtDate(photo.createdAt)}</span>
        </div>
        {photo.product ? (
          <p className="text-2xs text-primary truncate" title={photo.product.name}>
            <span className="font-mono text-gray-400">{photo.product.code}</span>{' '}
            {photo.product.name}
          </p>
        ) : (
          <p className="text-2xs text-gray-300 italic">Nessun prodotto</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-2.5 pb-2.5 flex items-center gap-1.5">
        {isOrphan && (
          <button
            onClick={() => onCollega(photo)}
            className="flex items-center gap-1 text-2xs text-accent hover:text-primary border border-accent/30 hover:border-accent rounded px-2 py-1 transition-colors flex-1 justify-center"
          >
            <Link2 size={10} />
            Collega
          </button>
        )}
        <button
          onClick={() => onDelete(photo.path)}
          className="flex items-center gap-1 text-2xs text-gray-400 hover:text-red-500 border border-border hover:border-red-200 rounded px-2 py-1 transition-colors"
          title="Elimina"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminFotoPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<{ data: Photo[] }>({
    queryKey: ['admin-foto'],
    queryFn: () => fetch('/api/admin/foto').then((r) => r.json()),
  });
  const allPhotos = data?.data ?? [];

  // ── Filters & sort ────────────────────────────────────────────────────────
  const [filterMode, setFilterMode] = useState<'all' | 'orphan' | 'in-use'>('all');
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState<'date' | 'name' | 'size'>('date');

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Modals ────────────────────────────────────────────────────────────────
  const [detailPhoto, setDetailPhoto]   = useState<Photo | null>(null);
  const [collegaPhoto, setCollegaPhoto] = useState<Photo | null>(null);
  const [showUpload, setShowUpload]     = useState(false);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // ── Collega tutte ─────────────────────────────────────────────────────────
  const [collegandoTutte, setCollegandoTutte] = useState(false);

  // ── Ottimizza ─────────────────────────────────────────────────────────────
  const [ottimizzando, setOttimizzando] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-foto'] });
    setSelected(new Set());
  }

  async function handleOttimizza() {
    setOttimizzando(true);
    try {
      const res = await fetch('/api/admin/foto/ottimizza', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const msg = `Ottimizzate ${json.processed} foto`
        + (json.errors > 0 ? ` · ${json.errors} errori` : '')
        + ` · ${json.skipped} già ok`;
      toast.success(msg, { duration: 5000 });
      refresh();
    } catch {
      toast.error('Errore durante l\'ottimizzazione');
    } finally {
      setOttimizzando(false);
    }
  }

  async function handleCollegaTutte() {
    setCollegandoTutte(true);
    try {
      const res = await fetch('/api/admin/foto/collega-tutti', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Collegate ${json.linked} foto${json.slotTaken ? ` · ${json.slotTaken} slot già occupati` : ''}`);
      refresh();
    } catch {
      toast.error('Errore nel collegamento automatico');
    } finally {
      setCollegandoTutte(false);
    }
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = allPhotos.length;
    const inUse      = allPhotos.filter((p) => p.status === 'in-uso').length;
    const orphan     = allPhotos.filter((p) => p.status === 'orfana').length;
    const heavy      = allPhotos.filter((p) => p.size > 200 * 1024).length;
    const totalBytes = allPhotos.reduce((s, p) => s + p.size, 0);
    return { total, inUse, orphan, heavy, totalBytes };
  }, [allPhotos]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const photos = useMemo(() => {
    let list = allPhotos;
    if (filterMode === 'orphan')  list = list.filter((p) => p.status === 'orfana');
    if (filterMode === 'in-use')  list = list.filter((p) => p.status === 'in-uso');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.product?.code.toLowerCase().includes(q) ?? false) ||
          (p.product?.name.toLowerCase().includes(q) ?? false)
      );
    }
    if (sortBy === 'date') list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    if (sortBy === 'size') list = [...list].sort((a, b) => b.size - a.size);
    return list;
  }, [allPhotos, filterMode, search, sortBy]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  function toggleSelect(path: string, v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      v ? next.add(path) : next.delete(path);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.map((p) => p.path)));
  }

  function selectOrphans() {
    setSelected(new Set(allPhotos.filter((p) => p.status === 'orfana').map((p) => p.path)));
  }

  // ── Delete handler ────────────────────────────────────────────────────────
  async function handleDelete(paths: string[]) {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/foto', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${paths.length} foto eliminat${paths.length === 1 ? 'a' : 'e'}`);
      refresh();
    } catch {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
      setDeleteTargets(null);
    }
  }

  async function handleSingleDelete(path: string) {
    await handleDelete([path]);
  }

  // ── Unlink handler ────────────────────────────────────────────────────────
  async function handleUnlink(productId: string) {
    try {
      const res = await fetch('/api/admin/foto/collega', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, photoUrl: null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Foto scollegata dal prodotto');
      qc.invalidateQueries({ queryKey: ['admin-foto'] });
    } catch {
      toast.error('Errore nel collegamento');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">Gestione foto</h1>
          <p className="text-sm text-gray-400 mt-0.5">Immagini nel bucket Supabase "products"</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOttimizza}
            disabled={ottimizzando || stats.heavy === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-amber-300 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40"
            title="Comprimi a ≤200 KB / 1500×1500 px tutte le foto che superano il limite"
          >
            {ottimizzando ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            <span className="hidden sm:inline">
              {ottimizzando ? 'Ottimizzazione…' : `Ottimizza${stats.heavy > 0 ? ` (${stats.heavy})` : ''}`}
            </span>
          </button>
          <button
            onClick={handleCollegaTutte}
            disabled={collegandoTutte}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-white text-gray-600 rounded-lg hover:bg-cream transition-colors disabled:opacity-50"
            title="Collega automaticamente tutte le foto da-collegare ai prodotti corrispondenti"
          >
            {collegandoTutte ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            <span className="hidden sm:inline">Collega tutte</span>
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors"
          >
            <ImagePlus size={14} />
            <span className="hidden sm:inline">Carica foto</span>
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Totale foto',     value: String(stats.total) },
          { label: 'In uso',          value: String(stats.inUse),  color: 'text-green-600' },
          { label: 'Orfane',          value: String(stats.orphan), color: stats.orphan > 0 ? 'text-red-500' : undefined },
          { label: 'Da ottimizzare',  value: String(stats.heavy),  color: stats.heavy > 0 ? 'text-amber-500' : 'text-green-600' },
          { label: 'Spazio occupato', value: fmtSize(stats.totalBytes) },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-border rounded-lg px-4 py-3">
            <p className="text-2xs text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-semibold text-primary mt-0.5 ${color ?? ''}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Mode tabs */}
        <div className="flex border border-border rounded overflow-hidden">
          {(['all', 'in-use', 'orphan'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === mode
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:bg-cream'
              }`}
            >
              {mode === 'all' ? 'Tutte' : mode === 'in-use' ? 'In uso' : 'Orfane'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border border-border rounded px-3 py-1.5 bg-white flex-1 min-w-40">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca nome file o codice prodotto..."
            className="text-xs outline-none text-primary placeholder-gray-400 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="text-xs border border-border rounded px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none"
        >
          <option value="date">Più recenti</option>
          <option value="name">Nome</option>
          <option value="size">Dimensione</option>
        </select>
      </div>

      {/* ── Bulk selection bar ───────────────────────────────────────────── */}
      {selected.size > 0 ? (
        <div className="flex items-center gap-3 bg-accent/10 border border-accent/20 rounded-lg px-4 py-2.5 mb-4">
          <span className="text-sm font-medium text-primary">
            {selected.size} foto selezionat{selected.size === 1 ? 'a' : 'e'}
          </span>
          <button
            onClick={() => setDeleteTargets([...selected])}
            className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
          >
            <Trash2 size={12} />
            Elimina selezionate
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-500 hover:text-primary transition-colors ml-auto"
          >
            Deseleziona tutte
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={selectAll}
            className="text-xs text-gray-500 hover:text-primary transition-colors"
          >
            Seleziona tutte ({photos.length})
          </button>
          {stats.orphan > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <button
                onClick={selectOrphans}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Seleziona solo orfane ({stats.orphan})
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg aspect-square animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Errore nel caricamento delle foto</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {filterMode !== 'all' || search ? 'Nessuna foto trovata con i filtri selezionati' : 'Nessuna foto nel bucket'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.path}
              photo={photo}
              selected={selected.has(photo.path)}
              onSelect={toggleSelect}
              onDetail={setDetailPhoto}
              onDelete={(path) => setDeleteTargets([path])}
              onCollega={setCollegaPhoto}
            />
          ))}
        </div>
      )}

      {/* ── Delete confirm dialog ────────────────────────────────────────── */}
      {deleteTargets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setDeleteTargets(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-primary mb-2">Elimina foto</h3>
            <p className="text-sm text-gray-600 mb-5">
              Sei sicuro di voler eliminare{' '}
              <strong>{deleteTargets.length} foto</strong>?{' '}
              Questa azione è irreversibile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargets(null)}
                disabled={deleting}
                className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(deleteTargets)}
                disabled={deleting}
                className="flex-1 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {detailPhoto && (
        <DetailModal
          photo={detailPhoto}
          onClose={() => setDetailPhoto(null)}
          onDelete={handleSingleDelete}
          onUnlink={handleUnlink}
        />
      )}

      {collegaPhoto && (
        <CollegaModal
          photo={collegaPhoto}
          onClose={() => setCollegaPhoto(null)}
          onLinked={() => {
            qc.invalidateQueries({ queryKey: ['admin-foto'] });
            setCollegaPhoto(null);
          }}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
