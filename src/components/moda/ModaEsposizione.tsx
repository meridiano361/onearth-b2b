'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Loader2, LayoutGrid, ChevronRight } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import { PE27_COLOR_PALETTES, FANTASIA_OPTIONS, type ColorSwatch } from '@/lib/modaEsposizioneConfig';
import toast from 'react-hot-toast';

type OutfitItem = {
  product: { id: string; imageUrl: string | null; name: string };
  zona: string;
};

type Outfit = {
  id: string;
  titolo: string;
  descrizione: string | null;
  coloriGuida: ColorSwatch[];
  fantasia: string | null;
  imageUrl: string | null;
  items: OutfitItem[];
};

function ColorStrip({ swatches }: { swatches: ColorSwatch[] }) {
  if (!swatches.length) return null;
  return (
    <div className="flex gap-1 mt-2">
      {swatches.slice(0, 5).map((s, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0"
          style={{ backgroundColor: s.hex }}
          title={s.label}
        />
      ))}
    </div>
  );
}

function CreateOutfitModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [fantasia, setFantasia] = useState('');
  const [selectedPalette, setSelectedPalette] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const swatches = selectedPalette !== null ? PE27_COLOR_PALETTES[selectedPalette].swatches : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titolo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/moda/esposizione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titolo, descrizione, coloriGuida: swatches, fantasia }),
      });
      if (!res.ok) throw new Error();
      toast.success('Outfit creato');
      onCreated();
      onClose();
    } catch {
      toast.error('Errore durante la creazione');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">Nuovo outfit espositivo</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 block mb-1">Titolo *</label>
            <input
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder="es. Look Estivo Naturale"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Descrizione</label>
            <textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Note sul concept dell'outfit…"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Palette selection */}
          <div>
            <label className="text-xs text-white/40 block mb-2">Palette colori PE27</label>
            <div className="grid grid-cols-1 gap-2">
              {PE27_COLOR_PALETTES.map((pal, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedPalette(i === selectedPalette ? null : i)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors text-left ${
                    selectedPalette === i ? 'border-white/30 bg-white/5' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex gap-1 flex-shrink-0">
                    {pal.swatches.map((s, j) => (
                      <div key={j} className="w-4 h-4 rounded-full" style={{ backgroundColor: s.hex }} />
                    ))}
                  </div>
                  <span className="text-xs text-white/70">{pal.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fantasia */}
          <div>
            <label className="text-xs text-white/40 block mb-1">Fantasia / Texture dominante</label>
            <select
              value={fantasia}
              onChange={(e) => setFantasia(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              <option value="" className="bg-[#111]">— Nessuna —</option>
              {FANTASIA_OPTIONS.map((f) => (
                <option key={f} value={f} className="bg-[#111]">{f}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:border-white/20">
              Annulla
            </button>
            <button type="submit" disabled={saving || !titolo.trim()}
              className="flex-1 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Crea outfit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ModaEsposizione() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<{ data: Outfit[] }>({
    queryKey: ['moda-esposizione'],
    queryFn: () => fetch('/api/moda/esposizione').then((r) => r.json()),
    staleTime: 30_000,
  });

  const deleteOutfit = useMutation({
    mutationFn: (id: string) => fetch(`/api/moda/esposizione/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['moda-esposizione'] }); toast.success('Outfit eliminato'); },
    onError: () => toast.error('Errore eliminazione'),
  });

  const outfits = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link href="/moda" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="text-xs text-white/40 uppercase tracking-widest">Moda PE27</p>
            <p className="text-sm font-medium">Esposizione a parete</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90"
          >
            <Plus size={13} /> Nuovo outfit
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : outfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <LayoutGrid size={40} className="mb-4" />
            <p className="text-sm font-medium text-white/40">Nessun outfit ancora</p>
            <p className="text-xs mt-1">Crea il primo outfit a parete PE27</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 px-5 py-2.5 bg-white text-black text-sm rounded-xl font-medium flex items-center gap-2 hover:bg-white/90"
            >
              <Plus size={14} /> Crea outfit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {outfits.map((outfit) => {
              const centro = outfit.items.filter((i) => i.zona === 'centro');
              const destra = outfit.items.filter((i) => i.zona === 'destra');
              return (
                <div
                  key={outfit.id}
                  className="group relative rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/moda/esposizione/${outfit.id}`)}
                >
                  {/* Color strip top */}
                  {outfit.coloriGuida.length > 0 && (
                    <div className="flex h-1.5">
                      {outfit.coloriGuida.map((s, i) => (
                        <div key={i} className="flex-1" style={{ backgroundColor: s.hex }} />
                      ))}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{outfit.titolo}</p>
                        {outfit.fantasia && (
                          <p className="text-xs text-white/35 mt-0.5 italic">{outfit.fantasia}</p>
                        )}
                        {outfit.descrizione && (
                          <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{outfit.descrizione}</p>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 flex-shrink-0 ml-2 mt-0.5" />
                    </div>

                    {/* Color swatches */}
                    <ColorStrip swatches={outfit.coloriGuida} />

                    {/* Product previews — 2 zones */}
                    <div className="flex gap-2 mt-3">
                      {/* Centro preview */}
                      <div className="flex-1">
                        <p className="text-2xs text-white/25 mb-1.5">Capi · {centro.length}</p>
                        <div className="flex gap-1 flex-wrap">
                          {centro.slice(0, 3).map(({ product }) => (
                            <div key={product.id} className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {centro.length === 0 && (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                              <Plus size={10} className="text-white/20" />
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Destra preview */}
                      <div className="flex-1">
                        <p className="text-2xs text-white/25 mb-1.5">Accessori · {destra.length}</p>
                        <div className="flex gap-1 flex-wrap">
                          {destra.slice(0, 3).map(({ product }) => (
                            <div key={product.id} className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {destra.length === 0 && (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                              <Plus size={10} className="text-white/20" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Eliminare l\'outfit?')) deleteOutfit.mutate(outfit.id); }}
                    className="absolute top-3 right-3 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateOutfitModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['moda-esposizione'] })}
        />
      )}
    </div>
  );
}
