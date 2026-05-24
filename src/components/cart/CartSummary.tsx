'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useSettings } from '@/contexts/SettingsContext';

export function computeProjections(items: ReturnType<typeof useCartStore.getState>['items']) {
  let costTotal = 0;
  let venditeII = 0;
  let venditeIE = 0;

  for (const { product, quantity } of items) {
    const cost   = Number(product.costPrice);
    const retail = Number(product.retailPrice);
    const iva    = product.iva ?? 22;
    costTotal += cost * quantity;
    venditeII += retail * quantity;
    venditeIE += (retail * quantity) / (1 + iva / 100);
  }

  const guadagno = venditeIE - costTotal;
  const margine  = venditeIE > 0 ? (guadagno / venditeIE) * 100 : 0;
  return { costTotal, venditeII, venditeIE, guadagno, margine };
}

export default function CartSummary() {
  const { items, getTotalItems, getTotalLines } = useCartStore();
  const t = useTranslations('cartSummary');
  const { ordine } = useSettings();

  const totalItems = getTotalItems();
  const totalLines = getTotalLines();
  const { costTotal, venditeII, guadagno, margine } = computeProjections(items);

  return (
    <div className="px-4 py-4 border-t border-border bg-cream/30">
      <div className="space-y-1.5">
        {/* Stats row */}
        <div className="flex justify-between text-2xs text-gray-400 mb-2">
          <span>{t('lines')}: <span className="font-medium text-primary">{totalLines}</span></span>
          <span>{t('totalPieces')}: <span className="font-medium text-primary">{totalItems}</span></span>
        </div>

        <div className="h-px bg-border/60 mb-2" />

        {/* Costo ordine */}
        {ordine.mostraCosto && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 uppercase tracking-wide text-2xs">{t('costOrder')}</span>
            <span className="font-semibold text-primary">{formatCurrency(costTotal)}</span>
          </div>
        )}

        {ordine.mostraCosto && ordine.mostraVendite && <div className="h-px bg-border/40 my-2" />}

        {/* Vendite potenziali */}
        {ordine.mostraVendite && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 uppercase tracking-wide text-2xs">{t('potentialSales')}</span>
            <span className="font-medium text-primary">
              {formatCurrency(venditeII)} <span className="text-gray-400 text-2xs">(i.i.)</span>
            </span>
          </div>
        )}

        {/* Guadagno */}
        {ordine.mostraGuadagno && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 uppercase tracking-wide text-2xs">{t('potentialGain')}</span>
            <span className={`font-medium ${guadagno >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(guadagno)}
            </span>
          </div>
        )}

        {/* Margine */}
        {ordine.mostraMargine && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 uppercase tracking-wide text-2xs">{t('avgMargin')}</span>
            <span className="font-medium text-primary">{margine.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
