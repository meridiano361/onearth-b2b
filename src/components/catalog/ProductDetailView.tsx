'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { formatCurrency, isValidLotQuantity } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import QuantitySelector from './QuantitySelector';
import { ProductImage } from '@/components/ui/ProductImage';
import type { Product } from '@/types';

interface Props {
  id: string;
}

export default function ProductDetailView({ id }: Props) {
  const router = useRouter();
  const { getItemQuantity, updateQuantity, addItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);
  const tp = useTranslations('product');
  const tf = useTranslations('filters');
  const tg = useTranslations('groupings');
  const locale = useLocale();

  const classFields: { key: keyof Product; label: string }[] = [
    { key: 'gruppoMerceologico', label: tf('gruppoMerceologico') },
    { key: 'famiglia',           label: tf('famiglia') },
    { key: 'classe',             label: tf('classe') },
    { key: 'sottoclasse',        label: tf('sottoclasse') },
    { key: 'gruppoOmogeneo',     label: tf('gruppoOmogeneo') },
    { key: 'nomLinea',           label: tg('nomLinea') },
    { key: 'stagione',           label: tg('stagione') },
    { key: 'collezione',         label: tg('collezione') },
    { key: 'colore',             label: tg('colore') },
    { key: 'temaColore',         label: tg('temaColore') },
  ];

  const detailFields: { key: keyof Product; label: string }[] = [
    { key: 'produttore', label: tf('produttore') },
    { key: 'paese',      label: 'Paese' },
    { key: 'misura',     label: tp('misura') },
    { key: 'lotSize',    label: tp('lotSizeLabel') },
  ];

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
        <LoadingSpinner size="lg" text={tp('loading')} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-gray-400">{tp('notFound')}</p>
        <button
          onClick={() => router.push('/catalog')}
          className="text-sm text-accent hover:underline"
        >
          {tp('backToCatalog')}
        </button>
      </div>
    );
  }

  const activeClassFields = classFields.filter(({ key }) => product[key]);
  const activeDetailFields = detailFields.filter(({ key }) => {
    const v = product[key];
    return v !== null && v !== undefined && v !== '' && v !== 1;
  });

  const localizedDescription = (() => {
    if (locale === 'en' && product.descrizioneEn) return product.descrizioneEn;
    if (locale === 'de' && product.descrizioneDe) return product.descrizioneDe;
    if (locale === 'fr' && product.descrizioneFr) return product.descrizioneFr;
    if (locale === 'es' && product.descrizioneEs) return product.descrizioneEs;
    return product.description || null;
  })();

  const hasBusinessInfo =
    product.fasciaSconto != null ||
    product.fasciaRicarico ||
    product.iva != null;
  const guadagnoPotenziale = Number(product.retailPrice) - Number(product.costPrice);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={13} />
        {tp('backToCatalog')}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10">
        {/* Image */}
        <div className="aspect-square bg-cream rounded overflow-hidden border border-border">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="label-luxury text-accent mb-1">{product.code}</p>

          <h1 className="font-display text-2xl sm:text-3xl text-primary font-light leading-snug mb-3">
            {product.name}
          </h1>

          {localizedDescription && (
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{localizedDescription}</p>
          )}

          <div className="mb-6">
            <p className="text-2xs text-gray-400 uppercase tracking-widest mb-0.5">
              {tp('retailPriceLabel')}
            </p>
            <p className="text-3xl font-semibold text-primary">
              {formatCurrency(product.retailPrice)}
            </p>
            {product.lotSize > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {tp('lotPack', { lotSize: product.lotSize })}
              </p>
            )}
          </div>

          {hasLotWarning && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              {tp('adjustLot', { lotSize: product.lotSize })}
            </div>
          )}

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
                  {tp('inCart', { qty: cartQty })}
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
                    {tp('added')}
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} />
                    {tp('add')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {activeClassFields.length > 0 && (
          <div>
            <h2 className="label-luxury text-gray-400 mb-3">{tp('classification')}</h2>
            <div className="space-y-2">
              {activeClassFields.map(({ key, label }) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                  <span className="text-sm text-primary">{String(product[key])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {(activeDetailFields.length > 0 || product.notes) && (
            <div>
              <h2 className="label-luxury text-gray-400 mb-3">{tp('detailsTitle')}</h2>
              <div className="space-y-2">
                {activeDetailFields.map(({ key, label }) => (
                  <div key={key} className="flex items-baseline gap-2">
                    <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                    <span className="text-sm text-primary">
                      {key === 'lotSize'
                        ? `${product[key]} ${tp('lotUnit')}`
                        : String(product[key])}
                    </span>
                  </div>
                ))}
                {product.notes && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="text-xs text-gray-400 w-32 flex-shrink-0">{tp('notesLabel')}</span>
                    <span className="text-sm text-gray-500 italic">{product.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasBusinessInfo && (
            <div>
              <h2 className="label-luxury text-gray-400 mb-3">Informazioni commerciali</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {product.fasciaSconto != null && (
                  <>
                    <span className="text-xs text-gray-400">Fascia sconto</span>
                    <span className="text-xs font-medium text-primary">{Number(product.fasciaSconto)}%</span>
                  </>
                )}
                {product.fasciaRicarico && (
                  <>
                    <span className="text-xs text-gray-400">Fascia ricarico</span>
                    <span className="text-xs font-medium text-primary">{product.fasciaRicarico}</span>
                  </>
                )}
                {product.iva != null && (
                  <>
                    <span className="text-xs text-gray-400">IVA</span>
                    <span className="text-xs font-medium text-primary">{product.iva}%</span>
                  </>
                )}
                <>
                  <span className="text-xs text-gray-400">Guadagno potenziale</span>
                  <span className="text-xs font-medium text-emerald-600">{formatCurrency(guadagnoPotenziale)}</span>
                </>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
