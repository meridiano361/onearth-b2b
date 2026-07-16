'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import type { CategoriaGioiello, SupportoEspositivo, CompositeResponse } from '@/types/jewelry';
import { LABEL_CATEGORIA, SUPPORTI_COMPATIBILI } from '@/types/jewelry';

interface Product {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
  imageUrl4: string | null;
  imageUrl5: string | null;
  costPrice: number;
  costoIeConReso: number | null;
  costoIeSenzaReso: number | null;
}

const CATEGORIE: CategoriaGioiello[] = ['collana', 'bracciale', 'orecchino', 'anello'];

function getPhotos(p: Product): string[] {
  return [p.imageUrl, p.imageUrl2, p.imageUrl3, p.imageUrl4, p.imageUrl5].filter(Boolean) as string[];
}

export default function ModaVisualBigiotteria() {
  const [categoria, setCategoria] = useState<CategoriaGioiello>('collana');
  const [search, setSearch]       = useState('');
  const [selectedProduct,   setSelectedProduct]   = useState<Product | null>(null);
  const [selectedPhotoUrl,  setSelectedPhotoUrl]  = useState<string | null>(null);
  const [selectedSupportoId, setSelectedSupportoId] = useState<string | null>(null);
  const [result,   setResult]   = useState<CompositeResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const { data: products = [], isFetching: loadingProducts } = useQuery<Product[]>({
    queryKey: ['moda-bigiotteria-products', search],
    queryFn: async () => {
      const params = new URLSearchParams({ active: 'true', limit: '500' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      return (json.data ?? []) as Product[];
    },
    staleTime: 60_000,
  });

  const { data: supporti = [] } = useQuery<SupportoEspositivo[]>({
    queryKey: ['jewelry-supporti-b2b', categoria],
    queryFn: async () => {
      const res = await fetch('/api/jewelry/supporti');
      const json = await res.json();
      const tipiOk = SUPPORTI_COMPATIBILI[categoria];
      return (json.data as SupportoEspositivo[]).filter((s) => tipiOk.includes(s.tipo));
    },
    staleTime: 120_000,
  });

  function selectProduct(p: Product) {
    setSelectedProduct(p);
    const first = getPhotos(p)[0] ?? null;
    setSelectedPhotoUrl(first);
    setResult(null);
    setError(null);
  }

  function changeCategory(cat: CategoriaGioiello) {
    setCategoria(cat);
    setSelectedSupportoId(null);
    setResult(null);
    setError(null);
  }

  async function generate() {
    if (!selectedProduct || !selectedPhotoUrl || !selectedSupportoId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/jewelry/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productImageUrl: selectedPhotoUrl,
          supportoId: selectedSupportoId,
          categoria,
        }),
      });
      const json: CompositeResponse = await res.json();
      if (!res.ok || json.stato === 'failed') {
        setError((json as any).errore ?? (json as any).error ?? 'Errore sconosciuto');
      } else {
        setResult(json);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = !!selectedProduct && !!selectedPhotoUrl && !!selectedSupportoId && !loading;

  const visibleProducts = products.filter((p) => getPhotos(p).length > 0);

  return (
    <div className="min-h-full flex flex-col">
      {/* Category tabs */}
      <div className="flex gap-2 px-6 pt-5 pb-4 border-b border-border bg-white flex-shrink-0">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider self-center mr-2">Categoria</p>
        {CATEGORIE.map((cat) => (
          <button
            key={cat}
            onClick={() => changeCategory(cat)}
            className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
              categoria === cat
                ? 'bg-primary text-white'
                : 'bg-cream text-gray-600 hover:text-primary'
            }`}
          >
            {LABEL_CATEGORIA[cat]}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left column: products */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex-shrink-0">
            <input
              type="search"
              placeholder="Cerca prodotto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border border-border rounded px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loadingProducts && (
              <p className="text-xs text-gray-400 text-center py-6">Caricamento…</p>
            )}
            {!loadingProducts && visibleProducts.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8 px-4">
                {search ? 'Nessun risultato.' : 'Nessun prodotto con foto.'}
              </p>
            )}
            {visibleProducts.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              const photos = getPhotos(p);
              return (
                <div
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-cream' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex gap-2 items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {photos[0] && (
                      <img
                        src={photos[0]}
                        alt=""
                        className="w-10 h-10 object-cover rounded border border-border flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-2xs text-gray-400 mt-0.5">{p.code}</p>
                      <p className="text-2xs font-semibold text-primary mt-0.5">
                        {formatCurrency(
                          (p.costoIeConReso ?? 0) > 0 ? p.costoIeConReso! :
                          (p.costoIeSenzaReso ?? 0) > 0 ? p.costoIeSenzaReso! :
                          p.costPrice
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Photo picker when product is selected and has multiple photos */}
                  {isSelected && photos.length > 1 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {photos.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          onClick={(e) => { e.stopPropagation(); setSelectedPhotoUrl(url); setResult(null); }}
                          className={`w-10 h-10 object-cover rounded cursor-pointer border-2 transition-colors ${
                            selectedPhotoUrl === url ? 'border-primary' : 'border-transparent hover:border-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: stands + generate + result */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Stands */}
          <section>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              Supporto espositivo — {LABEL_CATEGORIA[categoria]}
            </p>
            {supporti.length === 0 ? (
              <p className="text-xs text-gray-400">
                Nessun supporto compatibile. Aggiungine uno in Admin → Visual → Bigiotteria.
              </p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {supporti.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSupportoId(s.id); setResult(null); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded border transition-colors w-28 ${
                      selectedSupportoId === s.id
                        ? 'border-primary bg-cream'
                        : 'border-border hover:border-gray-400'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.immagineUrl} alt="" className="w-16 h-20 object-contain" />
                    <p className="text-2xs text-center text-gray-700 leading-tight">{s.nome}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Generate */}
          <section className="flex flex-col gap-2">
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="w-fit px-6 py-2.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Generazione in corso…' : 'Genera anteprima'}
            </button>
            {!selectedProduct && (
              <p className="text-2xs text-gray-400">Seleziona un prodotto dalla lista a sinistra.</p>
            )}
            {selectedProduct && !selectedSupportoId && (
              <p className="text-2xs text-gray-400">Seleziona un supporto espositivo.</p>
            )}
          </section>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
              {error}
            </div>
          )}

          {/* Result */}
          {result?.risultatoUrl && (
            <section className="border border-border rounded overflow-hidden max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.risultatoUrl}
                alt="Anteprima su supporto"
                className="w-full object-contain"
              />
              <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-3 bg-white">
                <p className="text-xs text-gray-500 truncate">
                  {selectedProduct?.name} · {LABEL_CATEGORIA[categoria]}
                </p>
                <a
                  href={result.risultatoUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-medium hover:underline flex-shrink-0"
                >
                  Scarica
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
