'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, LayoutGrid, List, MoreHorizontal, Pencil, Copy, Trash2,
  GripVertical, X, Search, Check, Download, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductImage } from '@/components/ui/ProductImage';
import type { DisplayGroup, DisplayGroupItem, OrderItem, DisplayGroupPreset } from '@/types';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  { label: 'Sabbia',     value: '#D4C4B0' },
  { label: 'Terracotta', value: '#C17A5A' },
  { label: 'Salvia',     value: '#8FAF8F' },
  { label: 'Ardesia',    value: '#6B7280' },
  { label: 'Notte',      value: '#1F2937' },
  { label: 'Rosa',       value: '#F9A8D4' },
  { label: 'Cielo',      value: '#93C5FD' },
  { label: 'Ocra',       value: '#F59E0B' },
];

const TEMPLATES = [
  { nome: 'Vetrina Principale', coloreTag: '#D4C4B0' },
  { nome: 'Area Ingresso',      coloreTag: '#8FAF8F' },
  { nome: 'Corner Premium',     coloreTag: '#C17A5A' },
  { nome: 'Scaffale Promozioni',coloreTag: '#F59E0B' },
  { nome: 'Area Stagionale',    coloreTag: '#93C5FD' },
];

// ─── GroupFormModal ────────────────────────────────────────────────────────────

interface GroupFormData {
  nome: string; descrizione: string; coloreTag: string; stagione: string; temaTag: string;
}

function GroupFormModal({
  orderId, group, onClose, onSaved,
}: {
  orderId: string;
  group?: DisplayGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [form, setForm] = useState<GroupFormData>({
    nome: group?.nome ?? '',
    descrizione: group?.descrizione ?? '',
    coloreTag: group?.coloreTag ?? '',
    stagione: group?.stagione ?? '',
    temaTag: group?.temaTag ?? '',
  });
  const [saving, setSaving] = useState(false);

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setForm((f) => ({ ...f, nome: t.nome, coloreTag: t.coloreTag }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error('Nome obbligatorio'); return; }
    setSaving(true);
    try {
      const url = isEdit
        ? `/api/catalog/orders/${orderId}/display-groups/${group!.id}`
        : `/api/catalog/orders/${orderId}/display-groups`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim() || null,
          coloreTag: form.coloreTag || null,
          stagione: form.stagione.trim() || null,
          temaTag: form.temaTag.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(isEdit ? 'Gruppo aggiornato' : 'Gruppo creato');
      onSaved();
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-primary">{isEdit ? 'Modifica mondo' : 'Nuovo mondo espositivo'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1 transition-colors"><X size={16} /></button>
        </div>

        {/* Template rapidi — solo su creazione */}
        {!isEdit && (
          <div className="mb-4">
            <p className="text-2xs text-gray-400 uppercase tracking-wider mb-2">Template rapidi</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.nome}
                  onClick={() => applyTemplate(t)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.coloreTag }} />
                  {t.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Nome *</label>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Vetrina Principale…"
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Descrizione</label>
            <input
              value={form.descrizione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              placeholder="Note opzionali…"
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Stagione</label>
              <input
                value={form.stagione}
                onChange={(e) => setForm((f) => ({ ...f, stagione: e.target.value }))}
                placeholder="SS27…"
                className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-1">Tag tema</label>
              <input
                value={form.temaTag}
                onChange={(e) => setForm((f) => ({ ...f, temaTag: e.target.value }))}
                placeholder="Naturale…"
                className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs text-gray-400 uppercase tracking-wider mb-2">Colore tag</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setForm((f) => ({ ...f, coloreTag: '' }))}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${!form.coloreTag ? 'border-primary' : 'border-transparent hover:border-border'}`}
                style={{ backgroundColor: '#E5E7EB' }}
                title="Nessun colore"
              >
                {!form.coloreTag && <X size={10} className="text-gray-500" />}
              </button>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm((f) => ({ ...f, coloreTag: c.value }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${form.coloreTag === c.value ? 'border-primary scale-110' : 'border-transparent hover:border-border'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream transition-colors">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nome.trim()}
            className="flex-1 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : null}
            {isEdit ? 'Salva modifiche' : 'Crea gruppo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AddItemsModal ─────────────────────────────────────────────────────────────

function AddItemsModal({
  orderId, groupId, orderItems, assignedItemIds, onClose, onAdded,
}: {
  orderId: string;
  groupId: string;
  orderItems: OrderItem[];
  assignedItemIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orderItems.filter((it) =>
      !q ||
      it.product?.code?.toLowerCase().includes(q) ||
      it.product?.name?.toLowerCase().includes(q)
    );
  }, [orderItems, search]);

  function toggleItem(id: string) {
    if (assignedItemIds.has(id)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${groupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selected.size} prodott${selected.size === 1 ? 'o aggiunto' : 'i aggiunti'}`);
      onAdded();
    } catch {
      toast.error('Errore nell\'aggiunta dei prodotti');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-lg sm:rounded-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <p className="text-sm font-semibold text-primary">Aggiungi prodotti al gruppo</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary p-1 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 border border-border rounded px-3 py-2">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per codice o nome…"
              className="flex-1 text-xs outline-none bg-transparent text-primary placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.map((item) => {
            const isAssigned = assignedItemIds.has(item.id);
            const isSelected = selected.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                disabled={isAssigned}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isAssigned ? 'opacity-50 cursor-default' : isSelected ? 'bg-accent/8' : 'hover:bg-cream/50'
                }`}
              >
                <div className="flex-shrink-0 w-4 h-4">
                  {isAssigned
                    ? <Check size={14} className="text-green-500" />
                    : isSelected
                    ? <div className="w-4 h-4 rounded bg-accent flex items-center justify-center"><Check size={10} className="text-white" /></div>
                    : <div className="w-4 h-4 rounded border border-border" />
                  }
                </div>
                {item.product?.imageUrl && (
                  <ProductImage src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-2xs text-gray-400 font-medium">{item.product?.code}</p>
                  <p className="text-xs text-primary truncate">{item.product?.name}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">× {item.quantity}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">Nessun prodotto trovato</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">{selected.size} selezionati</span>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="px-4 py-2 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            Aggiungi selezionati
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GroupCard (board view) ────────────────────────────────────────────────────

function GroupCard({
  group, orderId, orderItems, onEdit, onDuplicate, onDelete, onRefresh,
}: {
  group: DisplayGroup;
  orderId: string;
  orderItems: OrderItem[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const assignedItemIds = useMemo(
    () => new Set(group.prodotti.map((p) => p.orderItemId)),
    [group.prodotti]
  );

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  async function removeItem(item: DisplayGroupItem) {
    setDeletingItemId(item.id);
    try {
      const res = await fetch(
        `/api/catalog/orders/${orderId}/display-groups/${group.id}/items/${item.orderItemId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      toast.error('Errore nella rimozione');
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="bg-white border border-border rounded-lg overflow-hidden flex flex-col">
        {/* Card header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-cream/40">
          <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none">
            <GripVertical size={14} />
          </button>
          {group.coloreTag && (
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.coloreTag }} />
          )}
          <span className="flex-1 text-xs font-semibold text-primary truncate">{group.nome}</span>
          <div className="flex items-center gap-0.5">
            {(group.stagione || group.temaTag) && (
              <span className="text-2xs text-gray-400 bg-white border border-border rounded-full px-2 py-0.5 hidden sm:block truncate max-w-[80px]">
                {group.stagione || group.temaTag}
              </span>
            )}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-gray-400 hover:text-primary rounded hover:bg-white transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded shadow-lg py-1 min-w-[150px]">
                    <button onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-cream transition-colors">
                      <Pencil size={11} />Rinomina
                    </button>
                    <button onClick={() => { setMenuOpen(false); onDuplicate(); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-cream transition-colors">
                      <Copy size={11} />Duplica
                    </button>
                    <button onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={11} />Elimina
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="p-3 flex-1">
          {group.prodotti.length === 0 ? (
            <p className="text-2xs text-gray-300 text-center py-4 italic">Nessun prodotto</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {group.prodotti.map((item) => (
                <div key={item.id} className="relative group/item">
                  <div className="aspect-square rounded overflow-hidden bg-cream">
                    <ProductImage
                      src={item.orderItem.product?.imageUrl ?? ''}
                      alt={item.orderItem.product?.name ?? ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-2xs text-gray-400 truncate mt-0.5">{item.orderItem.product?.code}</p>
                  <button
                    onClick={() => removeItem(item)}
                    disabled={deletingItemId === item.id}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover/item:flex transition-all"
                  >
                    {deletingItemId === item.id ? <Loader2 size={8} className="animate-spin" /> : <X size={8} />}
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setAddItemsOpen(true)}
            className="w-full flex items-center justify-center gap-1 text-2xs text-accent hover:text-accent/80 border border-dashed border-accent/30 hover:border-accent/60 rounded py-1.5 transition-colors"
          >
            <Plus size={10} />
            Aggiungi prodotto
          </button>
        </div>

        <div className="px-3 pb-2.5 text-2xs text-gray-400">
          {group.prodotti.length} prodott{group.prodotti.length !== 1 ? 'i' : 'o'}
        </div>
      </div>

      {addItemsOpen && (
        <AddItemsModal
          orderId={orderId}
          groupId={group.id}
          orderItems={orderItems}
          assignedItemIds={assignedItemIds}
          onClose={() => setAddItemsOpen(false)}
          onAdded={() => { setAddItemsOpen(false); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── GroupRow (list/accordion view) ───────────────────────────────────────────

function GroupRow({
  group, orderId, orderItems, onEdit, onDuplicate, onDelete, onRefresh,
}: {
  group: DisplayGroup;
  orderId: string;
  orderItems: OrderItem[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const [open, setOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const assignedItemIds = useMemo(
    () => new Set(group.prodotti.map((p) => p.orderItemId)),
    [group.prodotti]
  );

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function removeItem(item: DisplayGroupItem) {
    setDeletingItemId(item.id);
    try {
      const res = await fetch(
        `/api/catalog/orders/${orderId}/display-groups/${group.id}/items/${item.orderItemId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      toast.error('Errore nella rimozione');
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="bg-white border border-border rounded-lg overflow-hidden">
        {/* Row header */}
        <div className="flex items-center gap-2 px-3 py-3 hover:bg-cream/30 transition-colors">
          <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none p-0.5">
            <GripVertical size={14} />
          </button>
          {group.coloreTag && (
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.coloreTag }} />
          )}
          <button onClick={() => setOpen(!open)} className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className="flex-1 text-xs font-semibold text-primary truncate">{group.nome}</span>
            <span className="text-2xs text-gray-400 flex-shrink-0">{group.prodotti.length} pz.</span>
            {open ? <ChevronDown size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />}
          </button>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors" title="Modifica">
              <Pencil size={12} />
            </button>
            <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors" title="Duplica">
              <Copy size={12} />
            </button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="Elimina">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {open && (
          <div className="border-t border-border px-3 py-3 space-y-2 bg-cream/20">
            {group.prodotti.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 group/item">
                {item.orderItem.product?.imageUrl && (
                  <ProductImage
                    src={item.orderItem.product.imageUrl}
                    alt={item.orderItem.product.name}
                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-2xs text-gray-400 font-medium">{item.orderItem.product?.code}</p>
                  <p className="text-xs text-primary truncate">{item.orderItem.product?.name}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">× {item.orderItem.quantity}</span>
                <button
                  onClick={() => removeItem(item)}
                  disabled={deletingItemId === item.id}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                >
                  {deletingItemId === item.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                </button>
              </div>
            ))}
            <button
              onClick={() => setAddItemsOpen(true)}
              className="w-full flex items-center justify-center gap-1 text-2xs text-accent hover:text-accent/80 border border-dashed border-accent/30 hover:border-accent/60 rounded py-1.5 transition-colors"
            >
              <Plus size={10} />
              Aggiungi prodotto
            </button>
          </div>
        )}
      </div>

      {addItemsOpen && (
        <AddItemsModal
          orderId={orderId}
          groupId={group.id}
          orderItems={orderItems}
          assignedItemIds={assignedItemIds}
          onClose={() => setAddItemsOpen(false)}
          onAdded={() => { setAddItemsOpen(false); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface DisplayGroupsManagerProps {
  orderId: string;
  orderItems: OrderItem[];
}

export default function DisplayGroupsManager({ orderId, orderItems }: DisplayGroupsManagerProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<DisplayGroup | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data, isLoading } = useQuery<{ groups: DisplayGroup[] }>({
    queryKey: ['display-groups', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups`).then((r) => r.json()),
    staleTime: 10_000,
  });

  const groups = data?.groups ?? [];
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['display-groups', orderId] });
  }, [queryClient, orderId]);

  // Prodotti non assegnati a nessun gruppo
  const assignedOrderItemIds = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => g.prodotti.forEach((p) => set.add(p.orderItemId)));
    return set;
  }, [groups]);

  const unassignedItems = useMemo(
    () => orderItems.filter((it) => !assignedOrderItemIds.has(it.id) && it.product != null),
    [orderItems, assignedOrderItemIds]
  );

  async function handleDelete(group: DisplayGroup) {
    if (!confirm(`Eliminare il gruppo "${group.nome}"?`)) return;
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Gruppo eliminato');
      refresh();
    } catch {
      toast.error('Errore nell\'eliminazione');
    }
  }

  async function handleDuplicate(group: DisplayGroup) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/${group.id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Gruppo duplicato');
      refresh();
    } catch {
      toast.error('Errore nella duplicazione');
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/export-pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mondi-espositivi-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF pronto');
    } catch {
      toast.error('Errore nella generazione del PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groups, oldIndex, newIndex);
    // Optimistic update
    queryClient.setQueryData(['display-groups', orderId], {
      groups: reordered.map((g, i) => ({ ...g, posizione: i })),
    });

    try {
      await fetch(`/api/catalog/orders/${orderId}/display-groups/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gruppi: reordered.map((g, i) => ({ id: g.id, posizione: i })) }),
      });
    } catch {
      toast.error('Errore nel riordinamento');
      refresh();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  const sharedGroupProps = (group: DisplayGroup) => ({
    group,
    orderId,
    orderItems,
    onEdit: () => setEditGroup(group),
    onDuplicate: () => handleDuplicate(group),
    onDelete: () => handleDelete(group),
    onRefresh: refresh,
  });

  return (
    <>
      {/* Modals */}
      {(newGroupOpen || editGroup) && (
        <GroupFormModal
          orderId={orderId}
          group={editGroup ?? undefined}
          onClose={() => { setNewGroupOpen(false); setEditGroup(null); }}
          onSaved={() => { setNewGroupOpen(false); setEditGroup(null); refresh(); }}
        />
      )}

      <div className="px-4 sm:px-6 py-6 pb-32 lg:pb-24">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-primary">Mondi Espositivi</h2>
            <p className="text-2xs text-gray-400 mt-0.5">{groups.length} gruppi · {unassignedItems.length} prodotti non assegnati</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf || groups.length === 0}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary border border-border rounded px-2.5 py-1.5 hover:bg-cream transition-colors disabled:opacity-40"
              title="Esporta PDF"
            >
              {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              PDF
            </button>
            <div className="flex items-center bg-cream rounded border border-border overflow-hidden">
              <button
                onClick={() => setView('board')}
                className={`p-1.5 transition-colors ${view === 'board' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}
                title="Vista board"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 transition-colors ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-primary'}`}
                title="Vista lista"
              >
                <List size={14} />
              </button>
            </div>
            <button
              onClick={() => setNewGroupOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              Nuovo gruppo
            </button>
          </div>
        </div>

        {/* Prodotti non assegnati */}
        {unassignedItems.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              {unassignedItems.length} prodott{unassignedItems.length !== 1 ? 'i non assegnati' : 'o non assegnato'}
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedItems.map((it) => (
                <div key={it.id} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded px-2 py-1">
                  {it.product?.imageUrl && (
                    <ProductImage src={it.product.imageUrl} alt={it.product.name} className="w-6 h-6 object-cover rounded" />
                  )}
                  <span className="text-2xs text-gray-600">{it.product?.code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-cream flex items-center justify-center mb-3">
              <LayoutGrid size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Nessun mondo espositivo</p>
            <p className="text-xs text-gray-400 mb-4">Crea il primo gruppo per organizzare i prodotti dell'ordine</p>
            <button
              onClick={() => setNewGroupOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              Crea primo gruppo
            </button>
          </div>
        )}

        {/* Groups — board or list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {view === 'board' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <GroupCard key={group.id} {...sharedGroupProps(group)} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <GroupRow key={group.id} {...sharedGroupProps(group)} />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
