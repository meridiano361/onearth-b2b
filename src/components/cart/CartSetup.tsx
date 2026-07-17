'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MapPin, Plus, ShoppingCart, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useCollectionRoutes } from '@/hooks/useCollectionRoutes';
import type { Cart, Destinazione } from '@/types';

const CANAL_TIPI = ['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO'] as const;

/** Loads the active cart from server on login, handles collection switching, and shows the select-cart modal when needed. */
export default function CartSetup() {
  const { status, data: session } = useSession();
  const routes = useCollectionRoutes();
  const { collectionId } = routes;
  const isOperator = session?.user?.role === 'OPERATOR';

  const {
    setCart,
    setCurrentCollection,
    pendingProduct,
    setPendingProduct,
    pendingVariants,
    setPendingVariants,
    addVariants,
    showCartPicker,
    setShowCartPicker,
  } = useCartStore();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== 'authenticated') return;
    setCurrentCollection(collectionId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, collectionId]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    migrateOldCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function migrateOldCart() {
    const MIGRATION_DONE_KEY = 'onearth-cart-migrated';
    if (localStorage.getItem(MIGRATION_DONE_KEY)) return;
    localStorage.setItem(MIGRATION_DONE_KEY, '1');

    try {
      const raw = localStorage.getItem('onearth-cart');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const legacyItems: { productId: string; quantity: number }[] = parsed?.state?.items ?? [];
      if (legacyItems.length === 0) return;

      const res = await fetch('/api/catalog/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bozza recuperata', collectionId }),
      });
      if (!res.ok) return;
      const { data: newCart } = await res.json();

      await Promise.all(
        legacyItems.map(({ productId, quantity }) =>
          fetch(`/api/catalog/carts/${newCart.id}/items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity }),
          }).catch(() => {})
        )
      );

      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      toast.success('Carrello precedente recuperato come "Bozza recuperata"');
      localStorage.removeItem('onearth-cart');
    } catch { /* silently ignore */ }
  }

  // ── Select-cart modal ─────────────────────────────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newCanaleId, setNewCanaleId] = useState('');
  const [budgetChoice, setBudgetChoice] = useState<'dest' | 'custom' | null>(null);
  const [budgetCustom, setBudgetCustom] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewDest, setShowNewDest] = useState(false);
  const [newDestTipo, setNewDestTipo] = useState<typeof CANAL_TIPI[number]>('BOTTEGA');
  const [newDestCitta, setNewDestCitta] = useState('');
  const [newDestNome, setNewDestNome] = useState('');
  const [deletingDestId, setDeletingDestId] = useState<string | null>(null);

  const { data: carts = [] } = useQuery<Cart[]>({
    queryKey: ['my-carts', collectionId],
    queryFn: () =>
      fetch(`/api/catalog/carts?collection=${collectionId}`)
        .then((r) => r.json())
        .then((d) => d.data as Cart[]),
    enabled: status === 'authenticated',
  });

  const { data: destinazioni = [] } = useQuery<Destinazione[]>({
    queryKey: ['destinazioni'],
    queryFn: () => fetch('/api/catalog/destinazioni').then(r => r.json()).then(d => d.data ?? []),
    enabled: status === 'authenticated',
  });

  const selectedDest = useMemo(() => destinazioni.find(d => d.id === newCanaleId) ?? null, [destinazioni, newCanaleId]);
  const destBudget = selectedDest?.budget ?? null;

  // Reset budget choice when destination changes
  useEffect(() => {
    setBudgetChoice(null);
    setBudgetCustom(destBudget != null ? String(destBudget) : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCanaleId]);

  // Auto-fill name from destination
  useEffect(() => {
    if (selectedDest && !newName) {
      setNewName(selectedDest.nome || selectedDest.tipo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCanaleId]);

  if (!pendingProduct && !pendingVariants && !showCartPicker) return null;

  const pendingName = pendingProduct?.product.name ?? pendingVariants?.product.name;
  const isPickerOnly = showCartPicker && !pendingProduct && !pendingVariants;

  function closePending() {
    setPendingProduct(null);
    setPendingVariants(null);
    setShowCartPicker(false);
  }

  async function handleSelectCart(cart: Cart) {
    setCart(cart);
    if (isPickerOnly) {
      setShowCartPicker(false);
      return;
    }
    if (pendingVariants) {
      const { product, variants } = pendingVariants;
      setPendingVariants(null);
      addVariants(product, variants);
      const totalPz = variants.reduce((s, v) => s + v.quantity, 0);
      toast.success(`Aggiunte ${totalPz} pz a "${cart.name}"`);
      return;
    }
    setPendingProduct(null);
    const effectiveQty = pendingProduct!.quantity;
    const product = pendingProduct!.product;
    fetch(`/api/catalog/carts/${cart.id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: effectiveQty }),
    }).catch(() => {});
    setCart({ ...cart, items: [...(cart.items ?? []), { productId: product.id, product, quantity: effectiveQty }] });
    toast.success(`Aggiunto a "${cart.name}"`);
  }

  function handleDestSelect(val: string) {
    setBudgetChoice(null);
    setBudgetCustom('');
    if (val === '__new__') {
      setNewCanaleId('__new__');
      setShowNewDest(true);
    } else {
      setNewCanaleId(val);
      setShowNewDest(false);
    }
  }

  async function handleDeleteDest(id: string) {
    try {
      const res = await fetch(`/api/catalog/destinazioni/${id}`, { method: 'DELETE' });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Errore eliminazione'); }
      queryClient.invalidateQueries({ queryKey: ['destinazioni'] });
      if (newCanaleId === id) { setNewCanaleId(''); setShowNewDest(false); }
    } catch (e: any) {
      toast.error(e.message ?? 'Errore eliminazione destinazione');
    } finally {
      setDeletingDestId(null);
    }
  }

  function resetCreateForm() {
    setShowCreate(false);
    setNewName('');
    setNewCanaleId('');
    setBudgetChoice(null);
    setBudgetCustom('');
    setShowNewDest(false);
    setNewDestTipo('BOTTEGA');
    setNewDestCitta('');
    setNewDestNome('');
    setDeletingDestId(null);
  }

  const budgetFinal: number | null = isOperator
    ? (budgetChoice === 'dest' && destBudget != null ? destBudget : parseFloat(budgetCustom) || null)
    : null;

  const canCreate = !!newName.trim() && (!isOperator || (!!newCanaleId && newCanaleId !== '__new__') || showNewDest);

  async function handleCreateAndAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      let resolvedCanaleId = newCanaleId !== '__new__' ? (newCanaleId || null) : null;

      if (showNewDest) {
        const destRes = await fetch('/api/catalog/destinazioni', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: newDestNome.trim() || undefined,
            tipo: newDestTipo,
            citta: newDestCitta.trim() || undefined,
          }),
        });
        const destBody = await destRes.json();
        if (!destRes.ok) throw new Error(destBody.error ?? 'Errore creazione destinazione');
        resolvedCanaleId = destBody.data.id;
        queryClient.invalidateQueries({ queryKey: ['destinazioni'] });
      }

      const body: any = { name: newName.trim(), collectionId };
      if (resolvedCanaleId) {
        body.canaleId = resolvedCanaleId;
        if (isOperator && budgetFinal != null && !isNaN(budgetFinal)) body.budgetPersonalizzato = budgetFinal;
      }

      const res = await fetch('/api/catalog/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resBody = await res.json();
      if (!res.ok) throw new Error(resBody.error ?? 'Errore');
      queryClient.invalidateQueries({ queryKey: ['my-carts'] });
      resetCreateForm();
      await handleSelectCart(resBody.data as Cart);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closePending} />
      <div className="relative z-10 bg-white w-full sm:max-w-sm sm:rounded-lg shadow-xl max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className="text-gray-500" />
            <p className="text-sm font-semibold text-primary">{isPickerOnly ? 'Cambia carrello' : 'In quale carrello?'}</p>
          </div>
          <button onClick={closePending} className="text-gray-400 hover:text-primary p-1">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {isPickerOnly ? (
            <p className="text-xs text-gray-500">Scegli il carrello attivo o creane uno nuovo.</p>
          ) : (
            <p className="text-xs text-gray-500">
              Scegli un carrello esistente o creane uno nuovo per aggiungere{' '}
              <span className="font-medium text-primary">{pendingName}</span>.
            </p>
          )}

          {carts.length > 0 && (
            <div className="space-y-2">
              {carts.map((cart) => (
                <button
                  key={cart.id}
                  onClick={() => handleSelectCart(cart)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-border rounded text-left hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-primary">{cart.name}</p>
                    <p className="text-2xs text-gray-400">
                      {(cart.items?.length ?? 0)} articoli
                      {cart.canale ? ` · ${cart.canale.nome || cart.canale.tipo}${cart.canale.citta ? ` · ${cart.canale.citta}` : ''}` : ''}
                    </p>
                  </div>
                  <Check size={13} className="text-accent opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {showCreate ? (
            <div className="space-y-3 pt-1">
              {/* Destination — all users */}
              <div>
                <label className="block text-2xs text-gray-500 uppercase tracking-wide mb-1">
                  Destinazione{isOperator ? ' *' : ''}
                </label>
                {destinazioni.length > 0 && (
                  <div className="border border-border rounded overflow-hidden divide-y divide-border mb-2 max-h-36 overflow-y-auto">
                    {destinazioni.map(d => (
                      <div key={d.id} className={`flex items-center ${newCanaleId === d.id ? 'bg-accent/10' : 'hover:bg-cream/50'}`}>
                        {deletingDestId === d.id ? (
                          <div className="flex-1 flex items-center gap-2 px-3 py-2">
                            <span className="text-xs text-red-600 flex-1">Eliminare questa destinazione?</span>
                            <button type="button" onClick={() => handleDeleteDest(d.id)} className="text-xs font-semibold text-red-600 hover:underline px-1">Sì</button>
                            <button type="button" onClick={() => setDeletingDestId(null)} className="text-xs text-gray-500 hover:underline px-1">No</button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => { setNewCanaleId(d.id); setShowNewDest(false); setBudgetChoice(null); setBudgetCustom(''); }}
                              className="flex-1 text-left px-3 py-2 text-sm text-primary"
                            >
                              {d.nome || d.tipo}{d.citta ? ` — ${d.citta}` : ''}
                              {newCanaleId === d.id && <span className="ml-1.5 text-accent text-xs">✓</span>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingDestId(d.id)}
                              className="px-2.5 py-2 text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!showNewDest && (
                  <button
                    type="button"
                    onClick={() => handleDestSelect('__new__')}
                    className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                  >
                    <Plus size={11} /> Nuova destinazione
                  </button>
                )}
              </div>

              {/* Inline new destination form */}
              {showNewDest && (
                <div className="border border-accent/30 rounded-lg p-3 space-y-2.5 bg-accent/5">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-accent flex-shrink-0" />
                    <p className="text-2xs font-semibold text-accent uppercase tracking-wide">Nuova destinazione</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-2xs text-gray-500 mb-1">Tipo</label>
                      <select
                        value={newDestTipo}
                        onChange={e => setNewDestTipo(e.target.value as typeof CANAL_TIPI[number])}
                        className="w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                      >
                        {CANAL_TIPI.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-2xs text-gray-500 mb-1">Città</label>
                      <input
                        type="text"
                        value={newDestCitta}
                        onChange={e => setNewDestCitta(e.target.value)}
                        placeholder="es. Milano"
                        className="w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-2xs text-gray-500 mb-1">Nome (opzionale)</label>
                    <input
                      type="text"
                      value={newDestNome}
                      onChange={e => setNewDestNome(e.target.value)}
                      placeholder={newDestCitta ? `${newDestTipo} — ${newDestCitta}` : newDestTipo}
                      className="w-full h-8 border border-border rounded px-2 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-2xs text-gray-500 uppercase tracking-wide mb-1">Nome carrello *</label>
                <input
                  autoFocus={false}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreateAndAdd(); if (e.key === 'Escape') resetCreateForm(); }}
                  placeholder="es. Primavera Bottega…"
                  className="w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Budget — only for operators with a destination */}
              {isOperator && newCanaleId && (
                <div>
                  <label className="block text-2xs text-gray-500 uppercase tracking-wide mb-2">Budget ordine</label>
                  {destBudget != null ? (
                    <div className="space-y-1.5">
                      <label className={`flex items-center gap-2.5 border rounded p-2.5 cursor-pointer transition-colors ${budgetChoice === 'dest' ? 'border-accent bg-accent/5' : 'border-border hover:bg-cream/50'}`}>
                        <input type="radio" name="budgetSetup" checked={budgetChoice === 'dest'} onChange={() => setBudgetChoice('dest')} className="accent-primary" />
                        <span className="text-xs text-primary">Budget destinazione: <strong>{formatCurrency(destBudget)}</strong></span>
                      </label>
                      <label className={`flex items-start gap-2.5 border rounded p-2.5 cursor-pointer transition-colors ${budgetChoice === 'custom' ? 'border-accent bg-accent/5' : 'border-border hover:bg-cream/50'}`}>
                        <input type="radio" name="budgetSetup" checked={budgetChoice === 'custom'} onChange={() => setBudgetChoice('custom')} className="accent-primary mt-0.5" />
                        <div className="flex-1" onClick={e => e.stopPropagation()}>
                          <p className="text-xs text-primary mb-1.5">Budget personalizzato</p>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                            <input
                              type="number" min="0" step="100"
                              value={budgetCustom}
                              onChange={e => { setBudgetCustom(e.target.value); setBudgetChoice('custom'); }}
                              onFocus={() => setBudgetChoice('custom')}
                              placeholder={String(destBudget)}
                              className="w-full pl-6 pr-2 py-1.5 border border-border rounded text-xs text-primary focus:outline-none focus:border-accent bg-white"
                            />
                          </div>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                      <input
                        type="number" min="0" step="100"
                        value={budgetCustom}
                        onChange={e => setBudgetCustom(e.target.value)}
                        placeholder="es. 3000 (opzionale)"
                        className="w-full pl-6 pr-2 h-9 border border-border rounded text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={resetCreateForm} className="flex-1 py-2 text-xs border border-border rounded text-gray-500 hover:bg-cream">
                  Annulla
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={creating || !canCreate}
                  className="flex-1 py-2 text-xs bg-primary text-background rounded hover:bg-warm-darker disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Crea e aggiungi
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs border border-dashed border-border rounded text-gray-500 hover:border-accent hover:text-accent transition-colors"
            >
              <Plus size={12} /> Nuovo carrello
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
