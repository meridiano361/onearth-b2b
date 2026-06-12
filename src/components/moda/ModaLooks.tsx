'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Loader2, Layers } from 'lucide-react';
import { ProductImage } from '@/components/ui/ProductImage';
import toast from 'react-hot-toast';

type LookProduct = {
  product: {
    id: string; code: string; name: string; imageUrl: string | null;
    costPrice: number; retailPrice: number;
  };
};

type Look = {
  id: string;
  titolo: string;
  descrizione: string | null;
  imageUrl: string | null;
  isActive: boolean;
  ordine: number;
  createdAt: string;
  prodotti: LookProduct[];
};

function CreateLookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titolo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/moda/looks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titolo, descrizione, imageUrl }),
      });
      if (!res.ok) throw new Error('Errore durante la creazione');
      toast.success('Look creato');
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
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">Nuovo look</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 block mb-1">Titolo *</label>
            <input
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder="es. Look Estate Bon Ton"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Descrizione</label>
            <textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Nota o mood del look…"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">URL foto di copertina</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving || !titolo.trim()}
              className="flex-1 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Crea look
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ModaLooks() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<{ data: Look[] }>({
    queryKey: ['moda-looks'],
    queryFn: () => fetch('/api/moda/looks').then((r) => r.json()),
    staleTime: 30_000,
  });

  const deleteLook = useMutation({
    mutationFn: (id: string) => fetch(`/api/moda/looks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['moda-looks'] }); toast.success('Look eliminato'); },
    onError: () => toast.error('Errore eliminazione'),
  });

  const looks = data?.data ?? [];

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
            <p className="text-sm font-medium">Total Look</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Plus size={13} /> Nuovo look
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : looks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <Layers size={40} className="mb-4" />
            <p className="text-sm font-medium text-white/40">Nessun look ancora</p>
            <p className="text-xs mt-1">Crea il primo total look PE27</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 px-5 py-2.5 bg-white text-black text-sm rounded-xl font-medium flex items-center gap-2 hover:bg-white/90 transition-colors"
            >
              <Plus size={14} /> Crea look
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {looks.map((look) => (
              <div key={look.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all">
                {/* Cover image */}
                <div
                  className="h-48 bg-[#111] cursor-pointer"
                  onClick={() => router.push(`/moda/looks/${look.id}`)}
                >
                  {look.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={look.imageUrl} alt={look.titolo} className="w-full h-full object-cover" />
                  ) : look.prodotti.length > 0 ? (
                    <div className="grid grid-cols-3 h-full">
                      {look.prodotti.slice(0, 3).map(({ product }) => (
                        <div key={product.id} className="relative overflow-hidden">
                          <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {look.prodotti.length < 3 && Array.from({ length: 3 - look.prodotti.length }).map((_, i) => (
                        <div key={i} className="bg-white/5" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/10">
                      <Layers size={32} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4" onClick={() => router.push(`/moda/looks/${look.id}`)}>
                  <p className="text-sm font-medium text-white cursor-pointer hover:underline underline-offset-2">{look.titolo}</p>
                  {look.descrizione && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{look.descrizione}</p>
                  )}
                  <p className="text-xs text-white/25 mt-1">{look.prodotti.length} prodott{look.prodotti.length === 1 ? 'o' : 'i'}</p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Eliminare il look?')) deleteLook.mutate(look.id);
                  }}
                  className="absolute top-3 right-3 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateLookModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['moda-looks'] })}
        />
      )}
    </div>
  );
}
