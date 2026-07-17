'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent, DragStartEvent,
  useDraggable, useDroppable, pointerWithin, CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, LayoutGrid, List, Pencil, Copy, Trash2,
  GripVertical, X, Search, Check, Download, Loader2, ChevronDown, ChevronRight,
  MoreHorizontal, Flame, Calendar, Layers, ChevronLeft, ExternalLink, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductImage } from '@/components/ui/ProductImage';
import { capitalize } from '@/lib/utils';
import type { DisplayGroup, DisplayGroupItem, DisplayGroupSchedule, OrderItem } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  { label: 'Bianco',       value: '#FFFFFF' },
  { label: 'Grigio chiaro',value: '#F3F4F6' },
  { label: 'Grigio',       value: '#9CA3AF' },
  { label: 'Grigio scuro', value: '#4B5563' },
  { label: 'Nero',         value: '#111827' },
  { label: 'Sabbia',       value: '#D4C4B0' },
  { label: 'Beige',        value: '#F5F0E8' },
  { label: 'Terracotta',   value: '#C17A5A' },
  { label: 'Mattone',      value: '#9B3A2A' },
  { label: 'Rosso',        value: '#EF4444' },
  { label: 'Rosa',         value: '#F9A8D4' },
  { label: 'Fucsia',       value: '#EC4899' },
  { label: 'Lilla',        value: '#C4B5FD' },
  { label: 'Viola',        value: '#7C3AED' },
  { label: 'Cielo',        value: '#93C5FD' },
  { label: 'Blu',          value: '#3B82F6' },
  { label: 'Blu notte',    value: '#1E3A5F' },
  { label: 'Menta',        value: '#6EE7B7' },
  { label: 'Salvia',       value: '#8FAF8F' },
  { label: 'Verde',        value: '#22C55E' },
  { label: 'Ocra',         value: '#F59E0B' },
  { label: 'Arancio',      value: '#F97316' },
  { label: 'Giallo',       value: '#FDE68A' },
];

const COLOR_TEMPLATES = [
  { nome: 'Toni Naturali',  keywords: ['naturale','beige','terra','sabbia','ocra','miele','lino'] },
  { nome: 'Toni Vivaci',    keywords: ['rosso','arancio','giallo','verde','blu','viola','fucsia','turchese'] },
  { nome: 'Toni Freddi',    keywords: ['azzurro','blu','grigio','bianco','ghiaccio','argento','freddo'] },
  { nome: 'Toni Caldi',     keywords: ['rosso','arancio','giallo','rame','terracotta','caldo','ruggine'] },
  { nome: 'Toni Neutri',    keywords: ['bianco','nero','grigio','beige','ecru','panna'] },
] as const;

// ─── Utils ────────────────────────────────────────────────────────────────────

function sortProductsForDisplay(items: DisplayGroupItem[]): DisplayGroupItem[] {
  return [...items].sort((a, b) => {
    const la = a.orderItem.product?.nomLinea ?? '';
    const lb = b.orderItem.product?.nomLinea ?? '';
    if (la !== lb) return la.localeCompare(lb);
    const ca = a.orderItem.product?.colore ?? '';
    const cb = b.orderItem.product?.colore ?? '';
    return ca.localeCompare(cb);
  });
}

function groupByLinea(items: DisplayGroupItem[]): { linea: string; items: DisplayGroupItem[] }[] {
  const map = new Map<string, DisplayGroupItem[]>();
  for (const item of items) {
    const linea = item.orderItem.product?.nomLinea ?? '';
    if (!map.has(linea)) map.set(linea, []);
    map.get(linea)!.push(item);
  }
  return Array.from(map.entries()).map(([linea, lineaItems]) => ({ linea, items: lineaItems }));
}

function getActiveSchedule(schedules: DisplayGroupSchedule[] | undefined): DisplayGroupSchedule | null {
  if (!schedules?.length) return null;
  const year = new Date().getFullYear();
  return schedules.find((s) => s.anno === year) ?? schedules[0];
}

function parseLevelNames(raw: string | null | undefined): Record<number, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

// ─── Custom collision detection ───────────────────────────────────────────────

const customCollisionDetection: CollisionDetection = (args) => {
  const activeType = (args.active.data.current as any)?.type;
  if (activeType === 'group') return closestCenter(args);
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

// ─── ProductCardMini (DragOverlay) ────────────────────────────────────────────

function ProductCardMini({ product }: { product: any }) {
  return (
    <div className="bg-white border-2 border-accent/50 rounded-lg p-1.5 shadow-2xl cursor-grabbing w-[72px] rotate-2">
      <div className="h-[48px] overflow-hidden rounded bg-gray-100">
        {product?.imageUrl
          ? <ProductImage src={product.imageUrl} alt={product.name ?? ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-200" />
        }
      </div>
      <p className="text-[9px] text-[#94a3b8] text-center mt-1 truncate leading-none">{product?.code}</p>
    </div>
  );
}

// ─── ProductDetailModal ───────────────────────────────────────────────────────

interface ProductModalState {
  orderItemId: string;
  fromGroupId?: string;
}

function ProductDetailModal({
  state, orderItems, groups, groupCountByOrderItemId, orderId, onClose, onRefresh,
}: {
  state: ProductModalState;
  orderItems: OrderItem[];
  groups: DisplayGroup[];
  groupCountByOrderItemId: Record<string, number>;
  orderId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const orderItem = orderItems.find(it => it.id === state.orderItemId);
  const p = orderItem?.product as any;
  const [photoIdx, setPhotoIdx] = useState(0);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const photos = [p?.imageUrl, p?.imageUrl2, p?.imageUrl3, p?.imageUrl4].filter(Boolean) as string[];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setPhotoIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setPhotoIdx(i => Math.min(photos.length - 1, i + 1));
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, photos.length]);

  async function addToGroup(groupId: string) {
    setAdding(true);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${groupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemIds: [state.orderItemId] }),
      });
      if (!res.ok) throw new Error();
      toast.success('Prodotto aggiunto');
      onRefresh();
    } catch { toast.error('Errore'); }
    finally { setAdding(false); setAddMenuOpen(false); }
  }

  if (!p) return null;

  const themes = [p.temaColore, p.temaColore2, p.temaColore3, p.temaColore4, p.temaColore5].filter(Boolean).map(capitalize).join(', ');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

          {/* Left — photo gallery (60%) */}
          <div className="relative sm:w-[60%] bg-gray-50 flex flex-col flex-shrink-0">
            <div className="flex-1 flex items-center justify-center min-h-[220px] sm:min-h-0 relative">
              {photos.length > 0 ? (
                <ProductImage
                  src={photos[photoIdx]}
                  alt={p.name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-200 p-8">
                  <div className="text-4xl">📷</div>
                  <p className="text-xs">Nessuna foto</p>
                </div>
              )}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                    disabled={photoIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPhotoIdx(i => Math.min(photos.length - 1, i + 1))}
                    disabled={photoIdx === photos.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white disabled:opacity-30 transition"
                  >
                    <ChevronLeft size={16} className="rotate-180" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-1.5 p-2 justify-center border-t border-gray-100 flex-shrink-0">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`w-10 h-10 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${i === photoIdx ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <ProductImage src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — product info (40%) */}
          <div className="sm:w-[40%] flex flex-col overflow-y-auto border-t sm:border-t-0 sm:border-l border-gray-100">
            <div className="p-4 space-y-3 flex-1">
              {/* Code + badges */}
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-2xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{p.code}</span>
                {p.collezione === 'CA27' && (
                  <span className="text-[9px] font-bold bg-accent text-white px-1.5 py-0.5 rounded uppercase tracking-wide">NUOVO</span>
                )}
              </div>

              {/* Name */}
              <p className="text-sm font-semibold text-primary leading-snug">{p.name}</p>
              {p.description && <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>}

              {/* Details grid */}
              <div className="space-y-1.5 text-xs">
                {p.produttore && <Row label="Produttore" value={p.produttore} />}
                {p.paese && <Row label="Paese" value={p.paese} />}
                {p.misura && <Row label="Misura" value={p.misura} />}
                {p.nomLinea && <Row label="Linea" value={p.nomLinea} />}
                {p.collezione && <Row label="Collezione" value={p.collezione} />}
                {p.stagione && <Row label="Stagione" value={p.stagione} />}
                {p.colore && <Row label="Colore" value={capitalize(p.colore)} />}
                {themes && <Row label="Tema colore" value={themes} />}
                {p.classe && <Row label="Classe" value={[p.classe, p.classe2].filter(Boolean).join(' / ')} />}
                {p.sottoclasse && <Row label="Sottoclasse" value={[p.sottoclasse, p.sottoclasse2].filter(Boolean).join(' / ')} />}
                {p.gruppoOmogeneo && <Row label="Gruppo omogeneo" value={[p.gruppoOmogeneo, p.gruppoOmogeneo2].filter(Boolean).join(' / ')} />}
              </div>

              <div className="border-t border-gray-100 pt-2 space-y-1.5 text-xs">
                <Row label="Prezzo costo" value={fmt((() => { const c = Number(p.costoIeConReso); const s = Number(p.costoIeSenzaReso); return c > 0 ? c : s > 0 ? s : Number(p.costPrice); })())} highlight />
                <Row label="PVP" value={fmt(Number(p.retailPrice))} />
                {p.fasciaSconto != null && <Row label="Fascia sconto" value={`${Number(p.fasciaSconto)}%`} />}
                {p.fasciaRicarico && <Row label="Fascia ricarico" value={p.fasciaRicarico} />}
              </div>

              <a
                href={`/admin/products`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ExternalLink size={11} />Vai alla scheda prodotto
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              disabled={adding}
              className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-2 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Aggiungi al gruppo
              <ChevronDown size={10} />
            </button>
            {addMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                <div className="absolute bottom-full mb-1 left-0 z-20 bg-white border border-border rounded-lg shadow-xl py-1 min-w-[200px]">
                  {groups.length === 0 && <p className="px-3 py-2 text-xs text-gray-400 italic">Nessun gruppo</p>}
                  {groups.map(g => {
                    const isIn = g.prodotti.some(pr => pr.orderItemId === state.orderItemId);
                    return (
                      <button
                        key={g.id}
                        onClick={() => !isIn && addToGroup(g.id)}
                        disabled={isIn}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${isIn ? 'opacity-40 cursor-default' : 'hover:bg-cream'}`}
                      >
                        {g.coloreTag
                          ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.coloreTag }} />
                          : <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-200" />}
                        <span className="flex-1 truncate">{g.nome}</span>
                        {isIn && <Check size={10} className="text-green-500" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-primary px-3 py-2 border border-border rounded hover:bg-cream transition-colors">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-gray-400 flex-shrink-0 w-[90px]">{label}</span>
      <span className={`font-medium ${highlight ? 'text-accent' : 'text-primary'} truncate`}>{value}</span>
    </div>
  );
}

// ─── ContextMenuPortal ────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number; y: number; orderItemId: string;
  product: { name: string; code: string | null; imageUrl?: string | null } | null;
  fromGroupId?: string;
}

function ContextMenuPortal({
  state, groups, groupCountByOrderItemId, orderId, onClose, onRefresh,
}: {
  state: ContextMenuState;
  groups: DisplayGroup[];
  groupCountByOrderItemId: Record<string, number>;
  orderId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    function onMouse() { onClose(); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouse);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onMouse); };
  }, [onClose]);

  async function addToGroup(groupId: string) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${groupId}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemIds: [state.orderItemId] }),
      });
      if (!res.ok) throw new Error();
      toast.success('Prodotto aggiunto'); onRefresh();
    } catch { toast.error('Errore'); }
    onClose();
  }

  async function removeFromGroup() {
    if (!state.fromGroupId) return;
    try {
      await fetch(`/api/catalog/orders/${orderId}/display-groups/${state.fromGroupId}/items/${state.orderItemId}`, { method: 'DELETE' });
      toast.success('Rimosso dal gruppo'); onRefresh();
    } catch { toast.error('Errore'); }
    onClose();
  }

  async function removeFromAll() {
    try {
      await Promise.all(
        groups.filter(g => g.prodotti.some(p => p.orderItemId === state.orderItemId))
          .map(g => fetch(`/api/catalog/orders/${orderId}/display-groups/${g.id}/items/${state.orderItemId}`, { method: 'DELETE' }))
      );
      toast.success('Rimosso da tutti i gruppi'); onRefresh();
    } catch { toast.error('Errore'); }
    onClose();
  }

  const groupCount = groupCountByOrderItemId[state.orderItemId] ?? 0;

  return (
    <div
      className="fixed z-[9999] bg-white border border-border rounded-xl shadow-2xl py-1.5 min-w-[220px]"
      style={{ top: state.y, left: state.x }}
      onMouseDown={e => e.stopPropagation()}
    >
      {state.product && (
        <div className="px-3 py-2 border-b border-border mb-1">
          <p className="text-2xs text-gray-400 font-mono">{state.product.code}</p>
          <p className="text-xs font-medium text-primary truncate max-w-[200px]">{state.product.name}</p>
        </div>
      )}
      <p className="px-3 pt-1 pb-0.5 text-2xs text-gray-400 uppercase tracking-wider font-semibold">Aggiungi al gruppo</p>
      {groups.length === 0 && <p className="px-3 py-2 text-xs text-gray-400 italic">Nessun gruppo</p>}
      {groups.map(g => {
        const isIn = g.prodotti.some(p => p.orderItemId === state.orderItemId);
        return (
          <button key={g.id} onClick={() => !isIn && addToGroup(g.id)} disabled={isIn}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${isIn ? 'opacity-50 cursor-default' : 'hover:bg-cream'}`}>
            {g.coloreTag ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.coloreTag }} /> : <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-200" />}
            <span className="flex-1 truncate">{g.nome}</span>
            {isIn && <Check size={10} className="text-green-500 flex-shrink-0" />}
          </button>
        );
      })}
      {groupCount > 0 && (
        <>
          <div className="border-t border-border my-1" />
          {state.fromGroupId && (
            <button onClick={removeFromGroup} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
              <X size={11} />Rimuovi da questo gruppo
            </button>
          )}
          <button onClick={removeFromAll} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={11} />Rimuovi da tutti i gruppi
          </button>
        </>
      )}
    </div>
  );
}

// ─── FlameButton ──────────────────────────────────────────────────────────────

function FlameButton({ isFocus, onToggle, size = 14 }: { isFocus: boolean; onToggle: () => void; size?: number }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onPointerDown={(e) => e.stopPropagation()}
      title={isFocus ? 'Rimuovi focus' : 'Segna come focus'}
      className="transition-opacity hover:opacity-100"
      style={{ opacity: isFocus ? 1 : 0.25 }}
    >
      <Flame size={size} color={isFocus ? '#F97316' : '#6B7280'} fill={isFocus ? '#F97316' : 'none'} />
    </button>
  );
}

// ─── ProductListaView ─────────────────────────────────────────────────────────

function ProductListaView({
  items, orderId, groupId, onRemove, onToggleFocus, deletingItemId, onContextMenu, onCardClick,
}: {
  items: DisplayGroupItem[]; orderId: string; groupId: string;
  onRemove: (item: DisplayGroupItem) => void; onToggleFocus: (item: DisplayGroupItem) => void;
  deletingItemId: string | null;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
}) {
  const sorted = sortProductsForDisplay(items);
  const grouped = groupByLinea(sorted);
  return (
    <div className="divide-y divide-border/50 rounded overflow-hidden">
      {grouped.map(({ linea, items: li }) => (
        <div key={linea || '__'}>
          {linea && (
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-100">
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">{linea}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          {li.map((item, idx) => {
            const p = item.orderItem.product;
            return (
              <div key={item.id} onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, item.orderItemId, groupId); }}
                className={`flex items-center gap-2.5 px-2 py-2 group/item cursor-pointer hover:bg-cream/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}
                onClick={() => onCardClick(item.orderItemId, groupId)}
              >
                {p?.imageUrl
                  ? <ProductImage src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                  : <div className="w-12 h-12 bg-cream rounded flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-400">{p?.code}</p>
                  <p className="text-base text-primary truncate leading-tight">{p?.name}</p>
                </div>
                {p?.nomLinea && (
                  <span className="hidden sm:block text-sm font-semibold uppercase text-accent/80 bg-accent/8 px-2 py-0.5 rounded flex-shrink-0 max-w-[100px] truncate">{p.nomLinea}</span>
                )}
                <span className="text-base font-medium text-gray-600 flex-shrink-0">× {item.orderItem.quantity}</span>
                <FlameButton isFocus={item.isFocus} onToggle={() => onToggleFocus(item)} size={13} />
                <button onClick={(e) => { e.stopPropagation(); onRemove(item); }} onPointerDown={(e) => e.stopPropagation()}
                  disabled={deletingItemId === item.id}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100 flex-shrink-0">
                  {deletingItemId === item.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── ProductCard (shared 120×150 card) ────────────────────────────────────────

function ProductCard({
  product, isFocus, groupCount, larger, onFlameToggle, onRemove, deletingItemId,
  dragListeners, dragAttributes, dragRef, isDragging, onCardClick, onContextMenu,
}: {
  product: any; isFocus: boolean; groupCount?: number; larger?: boolean;
  onFlameToggle?: () => void; onRemove?: () => void; deletingItemId?: boolean;
  dragListeners?: any; dragAttributes?: any; dragRef?: any; isDragging?: boolean;
  onCardClick?: () => void; onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const W = larger ? 'w-[144px]' : 'w-[120px]';
  const H = larger ? 'h-[180px]' : 'h-[150px]';
  const imgH = larger ? 'h-[120px]' : 'h-[100px]';
  const txtH = larger ? 'h-[60px]' : 'h-[50px]';

  return (
    <div
      ref={dragRef}
      {...dragAttributes}
      {...dragListeners}
      onContextMenu={onContextMenu}
      onClick={onCardClick}
      style={{
        opacity: isDragging ? 0.35 : 1,
        border: isFocus ? '2px solid #F97316' : '2px solid transparent',
        backgroundColor: larger ? '#FFF8F0' : '#F3F4F6',
        borderRadius: 8,
        cursor: 'grab',
      }}
      className={`relative group/card ${W} ${H} flex-shrink-0 overflow-hidden select-none active:cursor-grabbing hover:shadow-md transition-all`}
    >
      {/* Image */}
      <div className={`w-full ${imgH} overflow-hidden`}>
        {product?.imageUrl
          ? <ProductImage src={product.imageUrl} alt={product?.name ?? ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-300 text-2xs">No foto</div>
        }
      </div>

      {/* Text */}
      <div className={`w-full ${txtH} px-1 py-0.5 flex flex-col justify-between`}>
        <p className="text-[10px] text-[#6B7280] truncate leading-tight">{product?.code}</p>
        <p className="text-[9px] text-gray-400 truncate leading-tight">{product?.nomLinea}</p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-colors rounded-[6px] pointer-events-none" />

      {/* Top-right controls */}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
        {onFlameToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onFlameToggle(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
          >
            <Flame size={10} color={isFocus ? '#F97316' : '#9CA3AF'} fill={isFocus ? '#F97316' : 'none'} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={deletingItemId}
            className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm"
          >
            {deletingItemId ? <Loader2 size={9} className="animate-spin" /> : <X size={9} />}
          </button>
        )}
      </div>

      {/* Group count badge (for available panel) */}
      {groupCount != null && groupCount > 0 && (
        <div className="absolute top-1 left-1">
          <span className="bg-green-500 text-white text-[8px] font-bold px-1 py-px rounded-full leading-none shadow-sm">{groupCount}</span>
        </div>
      )}

      {/* Focus flame (always visible when isFocus) */}
      {isFocus && onFlameToggle && (
        <div className="absolute bottom-[52px] right-1">
          <Flame size={9} color="#F97316" fill="#F97316" className="opacity-80" />
        </div>
      )}

      {/* Larger = focus badge */}
      {larger && (
        <div className="absolute top-1 left-1">
          <span className="bg-amber-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 leading-none shadow-sm">
            <Star size={7} fill="white" />FOCUS
          </span>
        </div>
      )}
    </div>
  );
}

// ─── SortableBoardItem ─────────────────────────────────────────────────────────

function SortableBoardItem({
  item, groupId, larger, onRemove, onToggleFocus, deletingItemId, onContextMenu, onCardClick,
}: {
  item: DisplayGroupItem; groupId: string; larger?: boolean;
  onRemove: (item: DisplayGroupItem) => void; onToggleFocus: (item: DisplayGroupItem) => void;
  deletingItemId: string | null;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'gridItem', groupId, orderItemId: item.orderItemId, livello: item.livello, isFocus: item.isFocus },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };

  return (
    <div style={style}>
      <ProductCard
        product={item.orderItem.product}
        isFocus={item.isFocus}
        larger={larger}
        onFlameToggle={() => onToggleFocus(item)}
        onRemove={() => onRemove(item)}
        deletingItemId={deletingItemId === item.id}
        dragListeners={listeners}
        dragAttributes={attributes}
        dragRef={setNodeRef}
        isDragging={isDragging}
        onCardClick={() => onCardClick(item.orderItemId, groupId)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, item.orderItemId, groupId); }}
      />
    </div>
  );
}

// ─── FocusSection ─────────────────────────────────────────────────────────────

function FocusSection({
  groupId, items, onRemove, onToggleFocus, deletingItemId, onContextMenu, onCardClick,
}: {
  groupId: string; items: DisplayGroupItem[];
  onRemove: (item: DisplayGroupItem) => void; onToggleFocus: (item: DisplayGroupItem) => void;
  deletingItemId: string | null;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `focus-${groupId}`,
    data: { type: 'focusBoard', groupId },
  });

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Flame size={12} className="text-amber-500" fill="#F59E0B" />
        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Focus</span>
        <span className="text-2xs text-amber-400">{items.length} prodott{items.length === 1 ? 'o' : 'i'}</span>
        <div className="flex-1 h-px bg-amber-200" />
      </div>
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-[80px] rounded-xl border-2 border-dashed transition-all p-2 ${
            isOver ? 'border-amber-400 bg-amber-50' : items.length === 0 ? 'border-amber-200 bg-amber-50/40' : 'border-transparent'
          }`}
        >
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-amber-300">
              <p className="text-xs italic">{isOver ? 'Rilascia come focus' : 'Trascina qui un prodotto focus'}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <SortableBoardItem
                  key={item.id} item={item} groupId={groupId} larger
                  onRemove={onRemove} onToggleFocus={onToggleFocus}
                  deletingItemId={deletingItemId} onContextMenu={onContextMenu} onCardClick={onCardClick}
                />
              ))}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── LevelSection ─────────────────────────────────────────────────────────────

function LevelSection({
  groupId, livello, levelName, items, canRemove,
  onRemove, onToggleFocus, deletingItemId, onContextMenu, onCardClick, onRenameLevel, onRemoveLevel,
}: {
  groupId: string; livello: number; levelName: string; items: DisplayGroupItem[]; canRemove: boolean;
  onRemove: (item: DisplayGroupItem) => void; onToggleFocus: (item: DisplayGroupItem) => void;
  deletingItemId: string | null;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
  onRenameLevel: (livello: number, nome: string) => void; onRemoveLevel: (livello: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `level-${groupId}-${livello}`,
    data: { type: 'levelBoard', groupId, livello },
  });
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(levelName);
  useEffect(() => { setNameInput(levelName); }, [levelName]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 px-0.5">
        <Layers size={11} className="text-gray-300 flex-shrink-0" />
        {editing ? (
          <input value={nameInput} onChange={e => setNameInput(e.target.value)}
            onBlur={() => { onRenameLevel(livello, nameInput); setEditing(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { onRenameLevel(livello, nameInput); setEditing(false); }
              if (e.key === 'Escape') { setNameInput(levelName); setEditing(false); }
            }}
            autoFocus
            className="text-[11px] font-semibold border border-accent/40 rounded px-2 py-0.5 outline-none focus:border-accent max-w-[140px]"
          />
        ) : (
          <button onClick={() => setEditing(true)}
            className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide hover:text-primary transition-colors" title="Clicca per rinominare">
            {levelName}
          </button>
        )}
        <span className="text-2xs text-gray-300">{items.length} pz.</span>
        {canRemove && (
          <button onClick={() => onRemoveLevel(livello)} className="ml-auto p-0.5 text-gray-300 hover:text-red-400 transition-colors" title="Rimuovi livello">
            <X size={11} />
          </button>
        )}
      </div>
      <div ref={setNodeRef} className={`min-h-[52px] rounded-lg transition-all ${isOver ? 'ring-2 ring-accent/50 bg-accent/5' : ''}`}>
        {items.length === 0 ? (
          <div className={`flex items-center justify-center h-12 border border-dashed rounded-lg transition-colors ${isOver ? 'border-accent/50 text-accent' : 'border-gray-200 text-gray-300'}`}>
            <p className="text-xs italic">{isOver ? 'Rilascia qui' : 'Vuoto'}</p>
          </div>
        ) : (
          <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <SortableBoardItem
                  key={item.id} item={item} groupId={groupId}
                  onRemove={onRemove} onToggleFocus={onToggleFocus}
                  deletingItemId={deletingItemId} onContextMenu={onContextMenu} onCardClick={onCardClick}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

// ─── ProductBoardView ─────────────────────────────────────────────────────────

function ProductBoardView({
  items, orderId, groupId, numLivelli, levelNames, hasFocusCard,
  onRemove, onToggleFocus, deletingItemId, onContextMenu, onCardClick,
  onRenameLevel, onRemoveLevel, onAddLevel,
}: {
  items: DisplayGroupItem[]; orderId: string; groupId: string;
  numLivelli: number; levelNames: Record<number, string>; hasFocusCard: boolean;
  onRemove: (item: DisplayGroupItem) => void; onToggleFocus: (item: DisplayGroupItem) => void;
  deletingItemId: string | null;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
  onRenameLevel: (livello: number, nome: string) => void;
  onRemoveLevel: (livello: number) => void; onAddLevel: () => void;
}) {
  const focusItems = items.filter(it => it.isFocus);
  const nonFocusItems = items.filter(it => !it.isFocus);
  const levels = Array.from({ length: numLivelli }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {hasFocusCard && (
        <FocusSection
          groupId={groupId} items={focusItems}
          onRemove={onRemove} onToggleFocus={onToggleFocus} deletingItemId={deletingItemId}
          onContextMenu={onContextMenu} onCardClick={onCardClick}
        />
      )}
      {levels.map(livello => {
        const levelItems = nonFocusItems.filter(it => it.livello === livello);
        const levelName = levelNames[livello] ?? `Livello ${livello}`;
        const canRemove = livello === numLivelli && livello > 1 && levelItems.length === 0;
        return (
          <LevelSection
            key={livello} groupId={groupId} livello={livello} levelName={levelName}
            items={levelItems} canRemove={canRemove}
            onRemove={onRemove} onToggleFocus={onToggleFocus} deletingItemId={deletingItemId}
            onContextMenu={onContextMenu} onCardClick={onCardClick}
            onRenameLevel={onRenameLevel} onRemoveLevel={onRemoveLevel}
          />
        );
      })}
      {numLivelli < 5 && (
        <button onClick={onAddLevel}
          className="w-full flex items-center justify-center gap-1 text-2xs text-gray-400 hover:text-accent border border-dashed border-gray-200 hover:border-accent/30 rounded-lg py-2 transition-colors">
          <Plus size={10} />Aggiungi livello
        </button>
      )}
    </div>
  );
}

// ─── DraggableAvailableCard ────────────────────────────────────────────────────

function DraggableAvailableCard({
  item, groupCount, onContextMenu, onCardClick,
}: {
  item: OrderItem; groupCount: number;
  onContextMenu: (e: React.MouseEvent, orderItemId: string) => void;
  onCardClick: (orderItemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `available-${item.id}`,
    data: { type: 'available', orderItemId: item.id },
  });

  return (
    <div style={{ transform: transform ? CSS.Transform.toString(transform) : undefined }}>
      <ProductCard
        product={item.product}
        isFocus={false}
        groupCount={groupCount}
        dragListeners={listeners}
        dragAttributes={attributes}
        dragRef={setNodeRef}
        isDragging={isDragging}
        onCardClick={() => onCardClick(item.id)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, item.id); }}
      />
    </div>
  );
}

// ─── AvailablePanel ────────────────────────────────────────────────────────────

function AvailablePanel({
  items, groupCountByOrderItemId, onContextMenu, onCardClick, mobileOpen, onToggleMobile,
}: {
  items: OrderItem[];
  groupCountByOrderItemId: Record<string, number>;
  onContextMenu: (e: React.MouseEvent, orderItemId: string) => void;
  onCardClick: (orderItemId: string) => void;
  mobileOpen?: boolean;
  onToggleMobile?: () => void;
}) {
  const [search, setSearch] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: 'available-panel', data: { type: 'availablePanel' } });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(it => it.product?.code?.toLowerCase().includes(q) || it.product?.name?.toLowerCase().includes(q));
  }, [items, search]);

  const unassignedCount = items.filter(it => !groupCountByOrderItemId[it.id]).length;

  return (
    <div ref={setNodeRef} className={`flex flex-col h-full overflow-hidden transition-colors ${isOver ? 'bg-blue-100/60' : 'bg-gray-200'}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e2e8f0] flex-shrink-0">
        <span className="text-[#F59E0B] text-sm leading-none">●</span>
        <span className="text-[11px] font-bold text-[#1e293b] flex-1 uppercase tracking-widest">Prodotti</span>
        <span className="bg-[#e2e8f0] text-[#64748b] text-[11px] font-bold px-2 py-0.5 rounded-full">{unassignedCount} liberi</span>
        <button onClick={onToggleMobile} className="md:hidden p-1 text-gray-400 hover:text-primary transition-colors" aria-label={mobileOpen ? 'Chiudi pannello prodotti' : 'Apri pannello prodotti'}>
          <ChevronDown size={14} className={`transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-md px-3 py-2 focus-within:border-accent transition-colors">
          <Search size={12} className="text-gray-400 flex-shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca..."
            className="flex-1 text-[13px] outline-none bg-transparent text-primary placeholder-[#94a3b8]" />
          {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500"><X size={10} /></button>}
        </div>
      </div>
      {isOver && (
        <div className="mx-3 mb-1 flex-shrink-0 border-2 border-dashed border-accent/40 rounded-lg flex items-center justify-center py-2">
          <p className="text-xs text-accent">Rilascia per rimuovere</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">Nessun prodotto</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map(item => (
              <DraggableAvailableCard
                key={item.id} item={item}
                groupCount={groupCountByOrderItemId[item.id] ?? 0}
                onContextMenu={onContextMenu} onCardClick={onCardClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GroupFormModal ────────────────────────────────────────────────────────────

interface GroupFormData { nome: string; descrizione: string; coloreTag: string; stagione: string; temaTag: string; }

function matchesColorTemplate(product: OrderItem['product'], keywords: readonly string[]): boolean {
  if (!product) return false;
  const themes = [product.temaColore, (product as any).temaColore2, (product as any).temaColore3, (product as any).temaColore4, (product as any).temaColore5]
    .filter(Boolean).map((t: string) => t.toLowerCase());
  return keywords.some(kw => themes.some(t => t.includes(kw)));
}

function GroupFormModal({ orderId, group, orderItems, onClose, onSaved }: {
  orderId: string; group?: DisplayGroup; orderItems: OrderItem[]; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!group;
  const [form, setForm] = useState<GroupFormData>({
    nome: group?.nome ?? '', descrizione: group?.descrizione ?? '',
    coloreTag: group?.coloreTag ?? '', stagione: group?.stagione ?? '', temaTag: group?.temaTag ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [templateKeywords, setTemplateKeywords] = useState<readonly string[] | null>(null);
  const [monoColor, setMonoColor] = useState('');

  const uniqueColors = useMemo(() => {
    const set = new Set<string>();
    orderItems.forEach(it => { if (it.product?.colore) set.add(it.product.colore); });
    return [...set].sort();
  }, [orderItems]);

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome obbligatorio'); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/catalog/orders/${orderId}/display-groups/${group!.id}` : `/api/catalog/orders/${orderId}/display-groups`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), descrizione: form.descrizione.trim() || null, coloreTag: form.coloreTag || null, stagione: form.stagione.trim() || null, temaTag: form.temaTag.trim() || null }),
      });
      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();

      if (!isEdit && (templateKeywords || monoColor)) {
        const groupId = resJson?.group?.id;
        if (groupId) {
          const matchingIds = monoColor
            ? orderItems.filter(it => it.product?.colore === monoColor).map(it => it.id)
            : orderItems.filter(it => matchesColorTemplate(it.product, templateKeywords!)).map(it => it.id);
          if (matchingIds.length > 0) {
            await fetch(`/api/catalog/orders/${orderId}/display-groups/${groupId}/items`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderItemIds: matchingIds }),
            });
            toast.success(`${matchingIds.length} prodotti aggiunti automaticamente`);
          } else { toast(`Nessun prodotto corrisponde al template`, { icon: 'ℹ️' }); }
        }
      }
      if (!(!isEdit && (templateKeywords || monoColor))) toast.success(isEdit ? 'Gruppo aggiornato' : 'Gruppo creato');
      onSaved();
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-primary">{isEdit ? 'Modifica esposizione' : 'Nuova esposizione'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1"><X size={16} /></button>
        </div>
        {!isEdit && (
          <div className="mb-4">
            <p className="text-2xs text-gray-400 uppercase tracking-wider mb-2">Template palette colore</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COLOR_TEMPLATES.map((t) => {
                const active = templateKeywords === t.keywords && !monoColor;
                return (
                  <button key={t.nome} onClick={() => { setTemplateKeywords(active ? null : t.keywords); setMonoColor(''); setForm(f => ({ ...f, nome: active ? f.nome : t.nome })); }}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${active ? 'bg-primary text-white border-primary' : 'text-gray-700 border-border hover:border-gray-400 hover:bg-gray-50'}`}>
                    {t.nome}
                  </button>
                );
              })}
              <button onClick={() => { setTemplateKeywords(null); setForm(f => ({ ...f, nome: monoColor ? f.nome : 'Monocromatico' })); setMonoColor(monoColor ? '' : (uniqueColors[0] ?? '')); }}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${monoColor ? 'bg-primary text-white border-primary' : 'text-gray-700 border-border hover:border-gray-400 hover:bg-gray-50'}`}>
                Monocromatico
              </button>
            </div>
            {monoColor && uniqueColors.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xs text-gray-500">Colore:</span>
                <select value={monoColor} onChange={(e) => setMonoColor(e.target.value)} className="text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-accent">
                  {uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            {(templateKeywords || monoColor) && (
              <p className="text-2xs text-accent mt-1.5">
                {(() => {
                  const count = monoColor ? orderItems.filter(it => it.product?.colore === monoColor).length : orderItems.filter(it => matchesColorTemplate(it.product, templateKeywords!)).length;
                  return `${count} prodotti verranno aggiunti automaticamente`;
                })()}
              </p>
            )}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Nome *</label>
            <input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Vetrina Principale…" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" autoFocus />
          </div>
          <div>
            <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Descrizione</label>
            <input value={form.descrizione} onChange={(e) => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Note opzionali…" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Stagione</label>
              <input value={form.stagione} onChange={(e) => setForm(f => ({ ...f, stagione: e.target.value }))} placeholder="SS27…" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Tag tema</label>
              <input value={form.temaTag} onChange={(e) => setForm(f => ({ ...f, temaTag: e.target.value }))} placeholder="Naturale…" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-2">Colore tag</label>
            <div className="grid grid-cols-8 gap-1.5">
              <button onClick={() => setForm(f => ({ ...f, coloreTag: '' }))}
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${!form.coloreTag ? 'border-gray-500 ring-2 ring-offset-1 ring-gray-400' : 'border-gray-200 hover:border-gray-400'}`}
                style={{ backgroundColor: '#E5E7EB' }}><X size={10} className="text-gray-500" /></button>
              {COLOR_PALETTE.map((c) => (
                <button key={c.value} onClick={() => setForm(f => ({ ...f, coloreTag: c.value }))}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${form.coloreTag === c.value ? 'border-gray-600 ring-2 ring-offset-1 ring-gray-500 scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                  style={{ backgroundColor: c.value }} title={c.label}>
                  {form.coloreTag === c.value && <Check size={10} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream">Annulla</button>
          <button onClick={handleSave} disabled={saving || !form.nome.trim()}
            className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 flex items-center justify-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 size={11} className="animate-spin" /> : null}
            {isEdit ? 'Salva modifiche' : 'Crea gruppo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddItemsModal ─────────────────────────────────────────────────────────────

function AddItemsModal({ orderId, groupId, orderItems, assignedItemIds, onClose, onAdded }: {
  orderId: string; groupId: string; orderItems: OrderItem[]; assignedItemIds: Set<string>; onClose: () => void; onAdded: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orderItems.filter(it => !q || it.product?.code?.toLowerCase().includes(q) || it.product?.name?.toLowerCase().includes(q));
  }, [orderItems, search]);

  function toggleItem(id: string) {
    if (assignedItemIds.has(id)) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${groupId}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selected.size} prodott${selected.size === 1 ? 'o aggiunto' : 'i aggiunti'}`);
      onAdded();
    } catch { toast.error('Errore nell\'aggiunta dei prodotti'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-lg sm:rounded-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <p className="text-sm font-semibold text-primary">Aggiungi prodotti al gruppo</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1"><X size={16} /></button>
        </div>
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca per codice o nome…" className="flex-1 text-xs outline-none bg-transparent text-primary placeholder-gray-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.map(item => {
            const isAssigned = assignedItemIds.has(item.id);
            const isSelected = selected.has(item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item.id)} disabled={isAssigned}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isAssigned ? 'opacity-50 cursor-default' : isSelected ? 'bg-accent/8' : 'hover:bg-cream/50'}`}>
                <div className="flex-shrink-0 w-4 h-4">
                  {isAssigned ? <Check size={14} className="text-green-500" />
                    : isSelected ? <div className="w-4 h-4 rounded bg-accent flex items-center justify-center"><Check size={10} className="text-white" /></div>
                    : <div className="w-4 h-4 rounded border border-border" />}
                </div>
                {item.product?.imageUrl && <ProductImage src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 object-cover rounded flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-2xs text-gray-400 font-medium">{item.product?.code}</p>
                  <p className="text-xs text-primary truncate">{item.product?.name}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">× {item.quantity}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Nessun prodotto trovato</p>}
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">{selected.size} selezionati</span>
          <button onClick={handleAdd} disabled={selected.size === 0 || saving}
            className="px-4 py-2 bg-primary text-white text-xs rounded hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50">
            {saving && <Loader2 size={11} className="animate-spin" />}Aggiungi selezionati
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared group logic ───────────────────────────────────────────────────────

function useGroupActions(group: DisplayGroup, orderId: string, onRefresh: () => void, queryClient: ReturnType<typeof useQueryClient>) {
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const maxLivelloFromItems = useMemo(() => Math.max(1, ...group.prodotti.map(p => p.livello)), [group.prodotti]);
  const [numLivelli, setNumLivelli] = useState(maxLivelloFromItems);
  useEffect(() => { setNumLivelli(prev => Math.max(prev, maxLivelloFromItems)); }, [maxLivelloFromItems]);
  const levelNames = useMemo(() => parseLevelNames(group.nomiLivelli), [group.nomiLivelli]);

  async function removeItem(item: DisplayGroupItem) {
    setDeletingItemId(item.id);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}/items/${item.orderItemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch { toast.error('Errore nella rimozione'); }
    finally { setDeletingItemId(null); }
  }

  async function toggleFocus(item: DisplayGroupItem) {
    const newVal = !item.isFocus;
    queryClient.setQueryData(['display-groups', orderId], (old: any) => ({
      ...old,
      groups: old.groups.map((g: DisplayGroup) =>
        g.id === group.id ? { ...g, prodotti: g.prodotti.map(p => p.id === item.id ? { ...p, isFocus: newVal } : p) } : g
      ),
    }));
    try {
      await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}/items/${item.orderItemId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFocus: newVal }),
      });
    } catch { toast.error('Errore'); onRefresh(); }
  }

  async function renameLevel(livello: number, nome: string) {
    const trimmed = nome.trim();
    const updated = { ...levelNames };
    if (trimmed && trimmed !== `Livello ${livello}`) { updated[livello] = trimmed; } else { delete updated[livello]; }
    queryClient.setQueryData(['display-groups', orderId], (old: any) => ({
      ...old,
      groups: old.groups.map((g: DisplayGroup) => g.id === group.id ? { ...g, nomiLivelli: JSON.stringify(updated) } : g),
    }));
    try {
      await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomiLivelli: JSON.stringify(updated) }),
      });
    } catch { onRefresh(); }
  }

  function addLevel() { setNumLivelli(prev => Math.min(prev + 1, 5)); }
  function removeLevel(livello: number) { if (livello !== numLivelli) return; setNumLivelli(prev => Math.max(1, prev - 1)); }

  return { deletingItemId, numLivelli, levelNames, removeItem, toggleFocus, renameLevel, addLevel, removeLevel };
}

// ─── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({
  group, orderId, orderItems, gridItems, onEdit, onDuplicate, onDelete, onRefresh, onContextMenu, onCardClick,
}: {
  group: DisplayGroup; orderId: string; orderItems: OrderItem[]; gridItems: DisplayGroupItem[];
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onRefresh: () => void;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id, data: { type: 'group' } });
  const [menuOpen, setMenuOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [productView, setProductView] = useState<'board' | 'lista'>('board');
  const assignedItemIds = useMemo(() => new Set(group.prodotti.map(p => p.orderItemId)), [group.prodotti]);
  const activeSchedule = getActiveSchedule(group.schedules);
  const { deletingItemId, numLivelli, levelNames, removeItem, toggleFocus, renameLevel, addLevel, removeLevel } = useGroupActions(group, orderId, onRefresh, queryClient);

  return (
    <>
      <div ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, border: '1px solid #E8DDD0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        className="bg-white w-full overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4">
          {/* Row 1 — always visible */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"><GripVertical size={16} /></button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {group.coloreTag && <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.coloreTag }} />}
              <span className="text-xl font-semibold text-primary truncate">{group.nome}</span>
            </div>
            {/* Mobile: count + more menu */}
            <span className="md:hidden text-sm text-gray-400 flex-shrink-0">{group.prodotti.length} pz.</span>
            <div className="relative flex-shrink-0 md:hidden">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"><MoreHorizontal size={16} /></button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
                    <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-cream"><Pencil size={11} />Rinomina</button>
                    <button onClick={() => { setMenuOpen(false); onDuplicate(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-cream"><Copy size={11} />Duplica</button>
                    <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"><Trash2 size={11} />Elimina</button>
                  </div>
                </>
              )}
            </div>
            {/* Desktop: all controls inline */}
            {numLivelli > 1 && <span className="hidden md:flex text-2xs text-gray-400 items-center gap-0.5 flex-shrink-0"><Layers size={10} />{numLivelli} livelli</span>}
            {activeSchedule && (
              <span className="hidden md:flex text-2xs text-[#8FAF8F] bg-[#F0F5F0] border border-[#D0E0D0] rounded px-1.5 py-0.5 items-center gap-0.5 flex-shrink-0">
                <Calendar size={9} />S{activeSchedule.settimanaIn}→S{activeSchedule.settimanaFn}
              </span>
            )}
            <span className="hidden md:block text-sm text-gray-400 flex-shrink-0">{group.prodotti.length} pz.</span>
            <div className="hidden md:flex items-center bg-cream rounded border border-border overflow-hidden flex-shrink-0">
              <button onClick={() => setProductView('lista')} className={`px-2.5 py-1 text-xs flex items-center gap-1 transition-colors ${productView === 'lista' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}><List size={12} />Lista</button>
              <button onClick={() => setProductView('board')} className={`px-2.5 py-1 text-xs flex items-center gap-1 transition-colors ${productView === 'board' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}><LayoutGrid size={12} />Board</button>
            </div>
            <button onClick={() => setAddItemsOpen(true)} className="hidden md:flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors flex-shrink-0"><Plus size={12} />Aggiungi</button>
            <div className="hidden md:block relative flex-shrink-0">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"><MoreHorizontal size={16} /></button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
                    <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-cream"><Pencil size={11} />Rinomina</button>
                    <button onClick={() => { setMenuOpen(false); onDuplicate(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-cream"><Copy size={11} />Duplica</button>
                    <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"><Trash2 size={11} />Elimina</button>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Row 2 — mobile only: badges + view toggle + add */}
          <div className="flex items-center gap-2 mt-2 md:hidden pl-6">
            {numLivelli > 1 && <span className="text-2xs text-gray-400 flex items-center gap-0.5 flex-shrink-0"><Layers size={10} />{numLivelli} livelli</span>}
            {activeSchedule && (
              <span className="text-2xs text-[#8FAF8F] bg-[#F0F5F0] border border-[#D0E0D0] rounded px-1.5 py-0.5 flex items-center gap-0.5 flex-shrink-0">
                <Calendar size={9} />S{activeSchedule.settimanaIn}→S{activeSchedule.settimanaFn}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center bg-cream rounded border border-border overflow-hidden">
                <button onClick={() => setProductView('lista')} className={`px-2 py-1 text-xs flex items-center transition-colors ${productView === 'lista' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}><List size={12} /></button>
                <button onClick={() => setProductView('board')} className={`px-2 py-1 text-xs flex items-center transition-colors ${productView === 'board' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}><LayoutGrid size={12} /></button>
              </div>
              <button onClick={() => setAddItemsOpen(true)} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"><Plus size={12} />Aggiungi</button>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          {group.prodotti.length === 0 ? (
            <LevelSection groupId={group.id} livello={1} levelName="Livello 1" items={[]} canRemove={false}
              onRemove={removeItem} onToggleFocus={toggleFocus} deletingItemId={deletingItemId}
              onContextMenu={onContextMenu} onCardClick={onCardClick} onRenameLevel={renameLevel} onRemoveLevel={removeLevel} />
          ) : productView === 'board' ? (
            <ProductBoardView items={gridItems} orderId={orderId} groupId={group.id}
              numLivelli={numLivelli} levelNames={levelNames} hasFocusCard={group.hasFocusCard}
              onRemove={removeItem} onToggleFocus={toggleFocus} deletingItemId={deletingItemId}
              onContextMenu={onContextMenu} onCardClick={onCardClick}
              onRenameLevel={renameLevel} onRemoveLevel={removeLevel} onAddLevel={addLevel} />
          ) : (
            <ProductListaView items={group.prodotti} orderId={orderId} groupId={group.id}
              onRemove={removeItem} onToggleFocus={toggleFocus} deletingItemId={deletingItemId}
              onContextMenu={onContextMenu} onCardClick={onCardClick} />
          )}
        </div>
      </div>
      {addItemsOpen && (
        <AddItemsModal orderId={orderId} groupId={group.id} orderItems={orderItems} assignedItemIds={assignedItemIds}
          onClose={() => setAddItemsOpen(false)} onAdded={() => { setAddItemsOpen(false); onRefresh(); }} />
      )}
    </>
  );
}

// ─── GroupRow ─────────────────────────────────────────────────────────────────

function GroupRow({
  group, orderId, orderItems, gridItems, onEdit, onDuplicate, onDelete, onRefresh, onContextMenu, onCardClick,
}: {
  group: DisplayGroup; orderId: string; orderItems: OrderItem[]; gridItems: DisplayGroupItem[];
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onRefresh: () => void;
  onContextMenu: (e: React.MouseEvent, orderItemId: string, fromGroupId: string) => void;
  onCardClick: (orderItemId: string, fromGroupId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id, data: { type: 'group' } });
  const [open, setOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [productView, setProductView] = useState<'lista' | 'board'>('lista');
  const assignedItemIds = useMemo(() => new Set(group.prodotti.map(p => p.orderItemId)), [group.prodotti]);
  const activeSchedule = getActiveSchedule(group.schedules);
  const { deletingItemId, numLivelli, levelNames, removeItem, toggleFocus, renameLevel, addLevel, removeLevel } = useGroupActions(group, orderId, onRefresh, queryClient);

  return (
    <>
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-3 hover:bg-cream/30 transition-colors">
          <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none p-0.5"><GripVertical size={14} /></button>
          {group.coloreTag && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.coloreTag }} />}
          <button onClick={() => setOpen(!open)} className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className="flex-1 text-xl font-semibold text-primary truncate">{group.nome}</span>
            {activeSchedule && (
              <span className="text-2xs text-[#8FAF8F] bg-[#F0F5F0] border border-[#D0E0D0] rounded px-1.5 py-0.5 flex items-center gap-0.5 flex-shrink-0 hidden sm:flex">
                <Calendar size={9} />S{activeSchedule.settimanaIn}→S{activeSchedule.settimanaFn}
              </span>
            )}
            <span className="text-sm text-gray-400 flex-shrink-0">{group.prodotti.length} pz.</span>
            {open ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />}
          </button>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream"><Pencil size={12} /></button>
            <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream"><Copy size={12} /></button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 size={12} /></button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border px-3 py-3 bg-cream/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-white rounded border border-border overflow-hidden">
                <button onClick={() => setProductView('lista')} className={`px-3 py-1 text-xs flex items-center gap-1.5 transition-colors ${productView === 'lista' ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary'}`}><List size={12} />Lista</button>
                <button onClick={() => setProductView('board')} className={`px-3 py-1 text-xs flex items-center gap-1.5 transition-colors ${productView === 'board' ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary'}`}><LayoutGrid size={12} />Board</button>
              </div>
              <button onClick={() => setAddItemsOpen(true)} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"><Plus size={11} />Aggiungi</button>
            </div>
            {group.prodotti.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-4 italic">Nessun prodotto</p>
            ) : productView === 'lista' ? (
              <ProductListaView items={group.prodotti} orderId={orderId} groupId={group.id}
                onRemove={removeItem} onToggleFocus={toggleFocus} deletingItemId={deletingItemId}
                onContextMenu={onContextMenu} onCardClick={onCardClick} />
            ) : (
              <ProductBoardView items={gridItems} orderId={orderId} groupId={group.id}
                numLivelli={numLivelli} levelNames={levelNames} hasFocusCard={group.hasFocusCard}
                onRemove={removeItem} onToggleFocus={toggleFocus} deletingItemId={deletingItemId}
                onContextMenu={onContextMenu} onCardClick={onCardClick}
                onRenameLevel={renameLevel} onRemoveLevel={removeLevel} onAddLevel={addLevel} />
            )}
            {group.prodotti.length > 0 && (
              <button onClick={() => setAddItemsOpen(true)} className="w-full flex items-center justify-center gap-1 text-2xs text-accent hover:text-accent/80 border border-dashed border-accent/30 hover:border-accent/60 rounded py-1.5">
                <Plus size={10} />Aggiungi prodotto
              </button>
            )}
          </div>
        )}
      </div>
      {addItemsOpen && (
        <AddItemsModal orderId={orderId} groupId={group.id} orderItems={orderItems} assignedItemIds={assignedItemIds}
          onClose={() => setAddItemsOpen(false)} onAdded={() => { setAddItemsOpen(false); onRefresh(); }} />
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface DisplayGroupsManagerProps { orderId: string; orderItems: OrderItem[]; }

export default function DisplayGroupsManager({ orderId, orderItems }: DisplayGroupsManagerProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<DisplayGroup | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [localGridItems, setLocalGridItems] = useState<Record<string, DisplayGroupItem[]>>({});
  const [activeDragProduct, setActiveDragProduct] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [productModal, setProductModal] = useState<ProductModalState | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const { data, isLoading } = useQuery<{ groups: DisplayGroup[] }>({
    queryKey: ['display-groups', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups`).then(r => r.json()),
    staleTime: 10_000,
  });

  const groups = data?.groups ?? [];

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['display-groups', orderId] });
  }, [queryClient, orderId]);

  useEffect(() => {
    if (!data?.groups) return;
    const next: Record<string, DisplayGroupItem[]> = {};
    data.groups.forEach(g => { next[g.id] = [...g.prodotti].sort((a, b) => a.posizione - b.posizione); });
    setLocalGridItems(next);
  }, [data]);

  const allProductItems = useMemo(() => orderItems.filter(it => it.product != null), [orderItems]);

  const groupCountByOrderItemId = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    groups.forEach(g => g.prodotti.forEach(p => { map[p.orderItemId] = (map[p.orderItemId] ?? 0) + 1; }));
    return map;
  }, [groups]);

  const unassignedCount = allProductItems.filter(it => !groupCountByOrderItemId[it.id]).length;

  function handleContextMenu(e: React.MouseEvent, orderItemId: string, fromGroupId?: string) {
    e.preventDefault();
    const oi = orderItems.find(it => it.id === orderItemId);
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 240),
      y: Math.min(e.clientY, window.innerHeight - 300),
      orderItemId,
      product: oi?.product ? { name: oi.product.name, code: oi.product.code, imageUrl: oi.product.imageUrl } : null,
      fromGroupId,
    });
  }

  function handleCardClick(orderItemId: string, fromGroupId?: string) {
    setProductModal({ orderItemId, fromGroupId });
  }

  async function handleDelete(group: DisplayGroup) {
    if (!confirm(`Eliminare il gruppo "${group.nome}"?`)) return;
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Gruppo eliminato'); refresh();
    } catch { toast.error('Errore nell\'eliminazione'); }
  }

  async function handleDuplicate(group: DisplayGroup) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Gruppo duplicato'); refresh();
    } catch { toast.error('Errore nella duplicazione'); }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/export-pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `mondi-espositivi-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success('PDF pronto');
    } catch { toast.error('Errore nella generazione del PDF'); }
    finally { setExportingPdf(false); }
  }

  function handleGlobalDragStart(event: DragStartEvent) {
    const d = event.active.data.current as any;
    if (d?.type === 'available') {
      setActiveDragProduct(orderItems.find(it => it.id === d.orderItemId)?.product ?? null);
    } else if (d?.type === 'gridItem') {
      setActiveDragProduct((localGridItems[d.groupId] ?? []).find(it => it.orderItemId === d.orderItemId)?.orderItem?.product ?? null);
    }
  }

  async function handleGlobalDragEnd(event: DragEndEvent) {
    setActiveDragProduct(null);
    const { active, over } = event;
    if (!over) return;

    const activeType = (active.data.current as any)?.type as string | undefined;
    const overType = (over.data.current as any)?.type as string | undefined;

    // 1. Group reorder
    if (activeType === 'group') {
      let targetGroupId = over.id as string;
      if (overType === 'gridItem' || overType === 'levelBoard' || overType === 'focusBoard') targetGroupId = (over.data.current as any).groupId;
      if (active.id === targetGroupId) return;
      const oldIndex = groups.findIndex(g => g.id === active.id);
      const newIndex = groups.findIndex(g => g.id === targetGroupId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(groups, oldIndex, newIndex);
      queryClient.setQueryData(['display-groups', orderId], { groups: reordered.map((g, i) => ({ ...g, posizione: i })) });
      try {
        await fetch(`/api/catalog/orders/${orderId}/display-groups/reorder`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gruppi: reordered.map((g, i) => ({ id: g.id, posizione: i })) }),
        });
      } catch { toast.error('Errore nel riordinamento'); refresh(); }
      return;
    }

    // 2. Grid item reorder within same group
    if (activeType === 'gridItem' && overType === 'gridItem') {
      const activeGroupId = (active.data.current as any).groupId as string;
      const overGroupId = (over.data.current as any).groupId as string;
      if (activeGroupId === overGroupId && active.id !== over.id) {
        const items = localGridItems[activeGroupId] ?? [];
        const oldIdx = items.findIndex(i => i.id === active.id);
        const newIdx = items.findIndex(i => i.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return;
        const reordered = arrayMove(items, oldIdx, newIdx);
        setLocalGridItems(prev => ({ ...prev, [activeGroupId]: reordered }));
        try {
          await fetch(`/api/catalog/orders/${orderId}/display-groups/${activeGroupId}/items/reorder`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: reordered.map((it, i) => ({ orderItemId: it.orderItemId, posizione: i })) }),
          });
        } catch { /* silent */ }
        return;
      }
    }

    // 3a. Grid item → focus zone (same group → set isFocus=true)
    if (activeType === 'gridItem' && overType === 'focusBoard') {
      const activeOrderItemId = (active.data.current as any).orderItemId as string;
      const activeGroupId = (active.data.current as any).groupId as string;
      const targetGroupId = (over.data.current as any).groupId as string;
      if (activeGroupId !== targetGroupId) return;
      queryClient.setQueryData(['display-groups', orderId], (old: any) => ({
        ...old,
        groups: old.groups.map((g: DisplayGroup) =>
          g.id === activeGroupId ? { ...g, prodotti: g.prodotti.map(p => p.orderItemId === activeOrderItemId ? { ...p, isFocus: true } : p) } : g
        ),
      }));
      try {
        await fetch(`/api/catalog/orders/${orderId}/display-groups/${activeGroupId}/items/${activeOrderItemId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFocus: true }),
        });
      } catch { refresh(); }
      return;
    }

    // 3b. Grid item → level zone (same or different group)
    if (activeType === 'gridItem' && overType === 'levelBoard') {
      const activeOrderItemId = (active.data.current as any).orderItemId as string;
      const activeGroupId = (active.data.current as any).groupId as string;
      const isActiveFocus = (active.data.current as any).isFocus as boolean;
      const { groupId: targetGroupId, livello } = over.data.current as any;

      if (activeGroupId === targetGroupId) {
        setLocalGridItems(prev => ({
          ...prev,
          [activeGroupId]: (prev[activeGroupId] ?? []).map(it =>
            it.orderItemId === activeOrderItemId ? { ...it, livello, isFocus: false } : it
          ),
        }));
        try {
          await fetch(`/api/catalog/orders/${orderId}/display-groups/${activeGroupId}/items/${activeOrderItemId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ livello, ...(isActiveFocus ? { isFocus: false } : {}) }),
          });
        } catch { refresh(); }
      } else {
        try {
          await fetch(`/api/catalog/orders/${orderId}/display-groups/${activeGroupId}/items/${activeOrderItemId}`, { method: 'DELETE' });
          await fetch(`/api/catalog/orders/${orderId}/display-groups/${targetGroupId}/items`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderItemIds: [activeOrderItemId], livello }),
          });
          toast.success('Prodotto spostato'); refresh();
        } catch { toast.error('Errore nello spostamento'); }
      }
      return;
    }

    // 4. Available card → focus zone (add to group as focus)
    if (activeType === 'available' && overType === 'focusBoard') {
      const orderItemId = (active.data.current as any).orderItemId as string;
      const targetGroupId = (over.data.current as any).groupId as string;
      try {
        await fetch(`/api/catalog/orders/${orderId}/display-groups/${targetGroupId}/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderItemIds: [orderItemId], isFocus: true }),
        });
        toast.success('Prodotto aggiunto come focus'); refresh();
      } catch { toast.error('Errore'); }
      return;
    }

    // 5. Available card → level zone or group (add to group)
    if (activeType === 'available') {
      const orderItemId = (active.data.current as any).orderItemId as string;
      let targetGroupId: string | null = null;
      let livello = 1;
      if (overType === 'levelBoard') { targetGroupId = (over.data.current as any).groupId; livello = (over.data.current as any).livello ?? 1; }
      else if (overType === 'gridItem') { targetGroupId = (over.data.current as any).groupId; livello = (over.data.current as any).livello ?? 1; }
      else if (overType === 'group') { targetGroupId = over.id as string; }
      if (!targetGroupId) return;
      try {
        const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${targetGroupId}/items`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderItemIds: [orderItemId], livello }),
        });
        if (!res.ok) throw new Error();
        toast.success('Prodotto aggiunto al gruppo'); refresh();
      } catch { toast.error('Errore nell\'aggiunta'); }
      return;
    }

    // 6. Grid item → available panel (remove from group)
    if (activeType === 'gridItem' && (over.id === 'available-panel' || overType === 'availablePanel')) {
      const orderItemId = (active.data.current as any).orderItemId as string;
      const groupId = (active.data.current as any).groupId as string;
      try {
        await fetch(`/api/catalog/orders/${orderId}/display-groups/${groupId}/items/${orderItemId}`, { method: 'DELETE' });
        toast.success('Prodotto rimosso dal gruppo'); refresh();
      } catch { toast.error('Errore nella rimozione'); }
      return;
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-gray-300" /></div>;
  }

  const sharedGroupProps = (group: DisplayGroup) => ({
    group, orderId, orderItems,
    gridItems: localGridItems[group.id] ?? [...group.prodotti].sort((a, b) => a.posizione - b.posizione),
    onEdit: () => setEditGroup(group),
    onDuplicate: () => handleDuplicate(group),
    onDelete: () => handleDelete(group),
    onRefresh: refresh,
    onContextMenu: handleContextMenu,
    onCardClick: handleCardClick,
  });

  return (
    <>
      {(newGroupOpen || editGroup) && (
        <GroupFormModal orderId={orderId} group={editGroup ?? undefined} orderItems={orderItems}
          onClose={() => { setNewGroupOpen(false); setEditGroup(null); }}
          onSaved={() => { setNewGroupOpen(false); setEditGroup(null); refresh(); }} />
      )}

      {contextMenu && (
        <ContextMenuPortal state={contextMenu} groups={groups} groupCountByOrderItemId={groupCountByOrderItemId}
          orderId={orderId} onClose={() => setContextMenu(null)} onRefresh={refresh} />
      )}

      {productModal && (
        <ProductDetailModal state={productModal} orderItems={orderItems} groups={groups}
          groupCountByOrderItemId={groupCountByOrderItemId} orderId={orderId}
          onClose={() => setProductModal(null)} onRefresh={refresh} />
      )}

      {/* Header toolbar */}
      <div className="px-4 sm:px-6 pt-6 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold text-[#1e293b] leading-none">Esposizioni</h2>
            <p className="text-[13px] text-[#94a3b8] mt-1">{groups.length} gruppi · {unassignedCount} prodotti non assegnati</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} disabled={exportingPdf || groups.length === 0}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary border border-border rounded px-2.5 py-1.5 hover:bg-cream transition-colors disabled:opacity-40">
              {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}PDF
            </button>
            <div className="flex items-center bg-cream rounded border border-border overflow-hidden">
              <button onClick={() => setView('board')} className={`p-1.5 transition-colors ${view === 'board' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`} title="Vista board"><LayoutGrid size={14} /></button>
              <button onClick={() => setView('list')} className={`p-1.5 transition-colors ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`} title="Vista lista"><List size={14} /></button>
            </div>
            <button onClick={() => setNewGroupOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-primary/90 transition-colors">
              <Plus size={13} />Nuovo gruppo
            </button>
          </div>
        </div>
      </div>

      {/* DnD area */}
      <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleGlobalDragStart} onDragEnd={handleGlobalDragEnd}>
        <div className="flex flex-col-reverse md:flex-row border-t border-[#e2e8f0] overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>

          {/* Left — Prodotti (mobile: collapsible bottom bar, desktop: 2/5) */}
          <div className={`flex-shrink-0 border-t border-[#e2e8f0] md:h-full md:w-2/5 md:border-t-0 md:border-r md:border-[#e2e8f0] transition-[height] duration-200 ${mobilePanelOpen ? 'h-[250px]' : 'h-[44px]'}`}>
            <AvailablePanel
              items={allProductItems}
              groupCountByOrderItemId={groupCountByOrderItemId}
              onContextMenu={(e, orderItemId) => handleContextMenu(e, orderItemId)}
              onCardClick={(orderItemId) => handleCardClick(orderItemId)}
              mobileOpen={mobilePanelOpen}
              onToggleMobile={() => setMobilePanelOpen(v => !v)}
            />
          </div>

          {/* Right — Gruppi (desktop: 3/5) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 bg-white md:w-3/5">
            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-cream flex items-center justify-center mb-3">
                  <LayoutGrid size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">Nessuna esposizione</p>
                <p className="text-xs text-gray-400 mb-4">Crea il primo gruppo per organizzare i prodotti dell&apos;ordine</p>
                <button onClick={() => setNewGroupOpen(true)} className="flex items-center gap-1.5 text-xs bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                  <Plus size={13} />Crea primo gruppo
                </button>
              </div>
            )}
            <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
              {view === 'board' ? (
                <div className="flex flex-col gap-6 w-full">
                  {groups.map(group => <GroupCard key={group.id} {...sharedGroupProps(group)} />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => <GroupRow key={group.id} {...sharedGroupProps(group)} />)}
                </div>
              )}
            </SortableContext>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeDragProduct ? <ProductCardMini product={activeDragProduct} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
