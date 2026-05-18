'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Check } from 'lucide-react';
import { formatCurrency, isValidLotQuantity } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import QuantitySelector from './QuantitySelector';
import type { Product } from '@/types';

interface Props {
  id: string;
}

const CLASS_FIELDS: { key: keyof Product; label: string }[] = [
  { key: 'gruppoMerceologico', label: 'Gruppo merceologico' },
  { key: 'famiglia', label: 'Famiglia' },
  { key: 'classe', label: 'Classe' },
  { key: 'sottoclasse', label: 'Sottoclasse' },
  { key: 'gruppoOmogeneo', label: 'Gruppo omogeneo' },
  { key: 'nomLinea', label: 'Linea' },
  { key: 'stagione', label: 'Stagione' },
  { key: 'collezione', label: 'Collezione' },
  { key: 'colore', label: 'Colore' },
  { key: 'temaColore', label: 'Tema colore' },
];

const DETAIL_FIELDS: { key: keyof Product; label: string }[] = [
  { key: 'produttore', label: 'Produttore' },
  { key: 'misura', label: 'Misure' },
  { key: 'lotSize', label: 'Confezione' },
];

export default function ProductDetailView({ id }: Props) {
  const router = useRouter();
  const { getItemQuantity, updateQuantity, addItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      return json.data as Product;
    },
  });

  const product = data;
  const cartQty = product ? getItemQuantity(product.id) : 0;
  const inCart = cartQty > 0;
  const hasLotWarning = inCart && product ? !isValidLotQuantity(cartQty, product.lotSize) : false;

  function handleAdd() {
    if (!product) return;
    addItem(product, product.lotSize || 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  function handleQuantityChange(qty: number) {
    if (!product) return;
    updateQuantity(product.id, qty);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" text="Caricamento..." />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-gray-400">Prodotto non trovato.</p>
        <button
          onClick={() => router.push('/catalog')}
          className="text-sm text-accent hover:underline"
        >
          Torna al catalogo
        </button>
      </div>
    );
  }

  const classFields = CLASS_FIELDS.filter(({ key }) => product[key]);
  const detailFields = DETAIL_FIELDS.filter(({ key }) => {
    const v = product[key];
    return v !== null && v !== undefined && v !== '' && v !== 1;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={13} />
        Torna al Catalogo
      </button>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10">
        {/* Image */}
        <div className="aspect-square bg-cream rounded overflow-hidden flex items-center justify-center border border-border">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-6xl text-gray-200 tracking-wider">
              {product.code.slice(0, 2)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {/* Code */}
          <p className="label-luxury text-accent mb-1">{product.code}</p>

          {/* Name */}
          <h1 className="font-display text-2xl sm:text-3xl text-primary font-light leading-snug mb-4">
            {product.name}
          </h1>

          {/* Price */}
          <div className="mb-6">
            <p className="text-2xs text-gray-400 uppercase tracking-widest mb-0.5">Prezzo vendita i.i.</p>
            <p className="text-3xl font-semibold text-primary">
              {formatCurrency(product.retailPrice)}
            </p>
            {product.lotSize > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Confezione da {product.lotSize} pz
              </p>
            )}
          </div>

          {/* LOT warning */}
          {hasLotWarning && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              Adatta la quantità al multiplo di {product.lotSize}
            </div>
          )}

          {/* Cart controls */}
          <div className="mt-auto">
            {inCart ? (
              <div className="space-y-2">
                <QuantitySelector
                  value={cartQty}
                  onChange={handleQuantityChange}
                  lotSize={product.lotSize}
                  min={0}
                />
                <p className="text-xs text-center text-gray-400">
                  {cartQty} pz nel tuo ordine
                </p>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="w-full py-3 text-sm font-medium rounded transition-all duration-200 flex items-center justify-center gap-2 bg-primary text-background hover:bg-warm-darker active:scale-95"
              >
                {justAdded ? (
                  <>
                    <Check size={14} />
                    Aggiunto
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} />
                    Aggiungi
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Classificazione */}
        {classFields.length > 0 && (
          <div>
            <h2 className="label-luxury text-gray-400 mb-3">Classificazione</h2>
            <div className="space-y-2">
              {classFields.map(({ key, label }) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="text-sm text-primary">{String(product[key])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dettagli */}
        {(detailFields.length > 0 || product.notes) && (
          <div>
            <h2 className="label-luxury text-gray-400 mb-3">Dettagli</h2>
            <div className="space-y-2">
              {detailFields.map(({ key, label }) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="text-sm text-primary">
                    {key === 'lotSize' ? `${product[key]} pz` : String(product[key])}
                  </span>
                </div>
              ))}
              {product.notes && (
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">Note</span>
                  <span className="text-sm text-gray-500 italic">{product.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
