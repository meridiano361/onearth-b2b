'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, X, ArrowLeft, Sparkles, Star } from 'lucide-react';
import { HUE_FAMILIES, type HueFamily } from '@/lib/colorHarmony';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrimaryPantone {
  pantoneColorId: number;
  code: string;
  name: string;
  hex_code: string;
  hue_angle: number;
  lightness: number;
  is_neutral: boolean;
}

interface WheelProduct {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  colore: string | null;
  famiglia: string | null;
  costPrice: number;
  retailPrice: number;
  primaryPantone: PrimaryPantone | null;
  hueFamilyId: string;
  hue: number;
  lightness: number;
  isNeutral: boolean;
}

interface WheelFamily extends HueFamily {
  products: WheelProduct[];
}

interface SuggestionGroup {
  harmonyType: string;
  products: WheelProduct[];
}

interface DisplayGroup {
  type: string;
  label: string;
  description: string;
  productIds: string[];
  score: number;
}

// ── SVG color wheel ───────────────────────────────────────────────────────────

const CX = 200, CY = 200, R_OUT = 175, R_IN = 75, R_NEUTRAL = 55;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number, rOuter: number, rInner: number): string {
  const s1 = polar(CX, CY, rOuter, startDeg);
  const e1 = polar(CX, CY, rOuter, endDeg);
  const s2 = polar(CX, CY, rInner, endDeg);
  const e2 = polar(CX, CY, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
    `L ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const HARMONY_LABELS: Record<string, string> = {
  identical:           'Identici',
  analogous:           'Analoghi',
  'split-complementary': 'Semi-complementari',
  complementary:       'Complementari',
  triadic:             'Triadici',
  neutral:             'Neutri compatibili',
  discordant:          'Discordanti',
};

const HARMONY_COLORS: Record<string, string> = {
  identical:           'bg-emerald-100 text-emerald-800',
  analogous:           'bg-blue-100 text-blue-800',
  'split-complementary': 'bg-violet-100 text-violet-800',
  complementary:       'bg-orange-100 text-orange-800',
  triadic:             'bg-pink-100 text-pink-800',
  neutral:             'bg-gray-100 text-gray-700',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ColorWheelView() {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: wheelData, isLoading: wheelLoading, isError, error, refetch } = useQuery<{ families: WheelFamily[] }>({
    queryKey: ['moda-color-wheel'],
    queryFn: async () => {
      const res = await fetch('/api/moda/color-wheel');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<{
    hero: { productId: string; primaryPantone: PrimaryPantone };
    suggestions: SuggestionGroup[];
    groups: DisplayGroup[];
  }>({
    queryKey: ['color-wheel-suggestions', selectedProductId],
    queryFn: async () => {
      const res = await fetch(`/api/moda/color-wheel/suggestions?productId=${selectedProductId}`);
      if (!res.ok) throw new Error('Failed to load suggestions');
      return res.json();
    },
    enabled: !!selectedProductId,
    staleTime: 120_000,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const families = wheelData?.families ?? [];

  const totalProducts = useMemo(
    () => families.reduce((s, f) => s + f.products.length, 0),
    [families]
  );

  const selectedFamily = families.find((f) => f.id === selectedFamilyId) ?? null;
  const visibleProducts = selectedFamily ? selectedFamily.products : families.flatMap((f) => f.products);

  const productMap = useMemo(() => {
    const map = new Map<string, WheelProduct>();
    for (const f of families) for (const p of f.products) map.set(p.id, p);
    return map;
  }, [families]);

  const selectedProduct = selectedProductId ? productMap.get(selectedProductId) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleFamilyClick(familyId: string) {
    setSelectedFamilyId((prev) => (prev === familyId ? null : familyId));
    setSelectedProductId(null);
  }

  function handleProductClick(productId: string) {
    setSelectedProductId((prev) => (prev === productId ? null : productId));
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  if (wheelLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <p className="text-sm text-red-600 font-medium">Errore nel caricamento della ruota cromatica</p>
        <p className="text-xs text-gray-500 font-mono max-w-md break-all">{String(error)}</p>
        <button onClick={() => refetch()} className="text-xs underline text-gray-500 hover:text-primary">
          Riprova
        </button>
      </div>
    );
  }

  const chromatic = HUE_FAMILIES.filter((f) => f.id !== 'neutral');
  const neutralFamily = families.find((f) => f.id === 'neutral');

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/50">
        <p className="label-luxury text-accent">Moda PE27</p>
        <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide">
          Ruota Cromatica
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{totalProducts} prodotti con colore Pantone</p>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 overflow-hidden">
        {/* ── Left: Wheel + legend ─────────────────────────────────── */}
        <div className="xl:w-[420px] flex-shrink-0 border-b xl:border-b-0 xl:border-r border-border/50 p-4 sm:p-6 flex flex-col items-center gap-4">

          {/* SVG Color Wheel */}
          <svg
            viewBox="0 0 400 400"
            className="w-full max-w-[360px]"
            style={{ overflow: 'visible' }}
          >
            {/* Chromatic segments */}
            {chromatic.map((family, i) => {
              const startAngle = i * 30;
              const endAngle = startAngle + 30;
              const midAngle = startAngle + 15;
              const isSelected = selectedFamilyId === family.id;
              const count = families.find((f) => f.id === family.id)?.products.length ?? 0;
              const midPt = polar(CX, CY, (R_OUT + R_IN) / 2, midAngle);
              const labelPt = polar(CX, CY, R_OUT + 22, midAngle);

              return (
                <g key={family.id} onClick={() => handleFamilyClick(family.id)} className="cursor-pointer">
                  <path
                    d={arcPath(startAngle, endAngle - 2, R_OUT, R_IN)}
                    fill={family.hexColor}
                    opacity={isSelected ? 1 : selectedFamilyId ? 0.35 : 0.75}
                    className="transition-opacity duration-200"
                  />
                  {isSelected && (
                    <path
                      d={arcPath(startAngle - 1, endAngle - 1, R_OUT + 10, R_IN - 6)}
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      opacity={0.9}
                    />
                  )}
                  {/* Product count dot */}
                  {count > 0 && (
                    <g>
                      <circle cx={midPt.x} cy={midPt.y} r={12} fill="white" fillOpacity={0.85} />
                      <text x={midPt.x} y={midPt.y + 4} textAnchor="middle" fontSize={10} fontWeight="600" fill="#111">
                        {count}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Center circle — Neutrals */}
            <g onClick={() => handleFamilyClick('neutral')} className="cursor-pointer">
              <circle
                cx={CX} cy={CY} r={R_NEUTRAL}
                fill="#B0BEC5"
                opacity={selectedFamilyId === 'neutral' ? 1 : selectedFamilyId ? 0.4 : 0.8}
                className="transition-opacity duration-200"
              />
              {selectedFamilyId === 'neutral' && (
                <circle cx={CX} cy={CY} r={R_NEUTRAL + 4} fill="none" stroke="white" strokeWidth="3" />
              )}
              <text x={CX} y={CY - 6} textAnchor="middle" fontSize={11} fontWeight="600" fill="white">Neutri</text>
              <text x={CX} y={CY + 8} textAnchor="middle" fontSize={10} fill="white" opacity={0.85}>
                {neutralFamily?.products.length ?? 0}
              </text>
            </g>

            {/* White gap ring */}
            <circle cx={CX} cy={CY} r={R_IN} fill="white" className="pointer-events-none" />
          </svg>

          {/* Legend */}
          <div className="w-full grid grid-cols-2 gap-1.5">
            {HUE_FAMILIES.map((f) => {
              const count = families.find((ff) => ff.id === f.id)?.products.length ?? 0;
              const isActive = selectedFamilyId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleFamilyClick(f.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-left transition-colors ${
                    isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: f.hexColor }}
                  />
                  <span className="text-gray-700 truncate">{f.label}</span>
                  {count > 0 && <span className="ml-auto text-gray-400 text-2xs">{count}</span>}
                </button>
              );
            })}
          </div>

          {selectedFamilyId && (
            <button
              onClick={() => { setSelectedFamilyId(null); setSelectedProductId(null); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Mostra tutti
            </button>
          )}
        </div>

        {/* ── Right: Products + Suggestions ────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Products grid */}
          <div className="p-4 sm:p-6">
            {selectedFamily && (
              <div className="flex items-center gap-2 mb-4">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedFamily.hexColor }} />
                <h2 className="text-sm font-semibold text-primary">{selectedFamily.label}</h2>
                <span className="text-xs text-gray-400">— {selectedFamily.products.length} prodotti</span>
              </div>
            )}

            {visibleProducts.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                Nessun prodotto in questa famiglia colore
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedProductId === product.id}
                    onClick={() => handleProductClick(product.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Suggestions panel */}
          {selectedProduct && (
            <div className="border-t border-border/50 p-4 sm:p-6 bg-gray-50/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-accent flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Abbinamenti per {selectedProduct.code}
                    </p>
                    {selectedProduct.primaryPantone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-3 h-3 rounded-full border border-border/40"
                          style={{ backgroundColor: selectedProduct.primaryPantone.hex_code }}
                        />
                        <span className="text-xs text-gray-500">
                          {selectedProduct.primaryPantone.code} — {selectedProduct.primaryPantone.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="text-gray-400 hover:text-primary transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {suggestionsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Calcolo abbinamenti…
                </div>
              ) : suggestionsData ? (
                <div className="space-y-5">
                  {/* Display groups */}
                  {suggestionsData.groups.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Set per esposizione
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {suggestionsData.groups.slice(0, 4).map((group) => {
                          const groupProducts = group.productIds
                            .map((id) => productMap.get(id))
                            .filter(Boolean) as WheelProduct[];
                          return (
                            <div key={group.type} className="bg-white rounded-lg border border-border p-3">
                              <p className="text-xs font-semibold text-primary mb-0.5">{group.label}</p>
                              <p className="text-2xs text-gray-400 mb-2 leading-snug">{group.description}</p>
                              <div className="flex gap-1 flex-wrap">
                                {groupProducts.slice(0, 5).map((p) => (
                                  <div
                                    key={p.id}
                                    className="w-6 h-6 rounded border border-border/50 overflow-hidden bg-gray-50"
                                    title={p.code}
                                  >
                                    {p.imageUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={p.imageUrl} alt={p.code} className="w-full h-full object-cover" />
                                    ) : (
                                      <span
                                        className="w-full h-full block"
                                        style={{ backgroundColor: p.primaryPantone?.hex_code ?? '#ccc' }}
                                      />
                                    )}
                                  </div>
                                ))}
                                <span className="text-2xs text-gray-400 self-center ml-1">
                                  {groupProducts.length} pz — score {group.score}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Harmony suggestions by type */}
                  {suggestionsData.suggestions.map(({ harmonyType, products }) => (
                    <div key={harmonyType}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${HARMONY_COLORS[harmonyType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {HARMONY_LABELS[harmonyType] ?? harmonyType}
                        </span>
                        <span className="text-2xs text-gray-400">{products.length} prodotti</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {products.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleProductClick(p.id)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 bg-white border rounded-lg text-left hover:border-accent/50 transition-colors ${
                              selectedProductId === p.id ? 'border-accent' : 'border-border'
                            }`}
                          >
                            {p.primaryPantone && (
                              <span
                                className="w-4 h-4 rounded-full flex-shrink-0 border border-border/40"
                                style={{ backgroundColor: p.primaryPantone.hex_code }}
                              />
                            )}
                            <div>
                              <p className="text-2xs font-semibold text-primary leading-none">{p.code}</p>
                              <p className="text-2xs text-gray-400 leading-tight max-w-[80px] truncate">{p.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {suggestionsData.suggestions.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Nessun abbinamento trovato — aggiungi Pantone agli altri prodotti Moda.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  isSelected,
  onClick,
}: {
  product: WheelProduct;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-lg overflow-hidden border transition-all ${
        isSelected
          ? 'border-accent ring-2 ring-accent/20 shadow-sm'
          : 'border-border hover:border-accent/40'
      }`}
    >
      {/* Image / pantone swatch */}
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : product.primaryPantone ? (
          <div
            className="w-full h-full"
            style={{ backgroundColor: product.primaryPantone.hex_code }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
            —
          </div>
        )}
        {/* Pantone swatch overlay */}
        {product.primaryPantone && (
          <div className="absolute bottom-1 right-1 flex items-center gap-1">
            <div
              className="w-4 h-4 rounded border border-white/70 shadow-sm"
              style={{ backgroundColor: product.primaryPantone.hex_code }}
              title={`${product.primaryPantone.code} — ${product.primaryPantone.name}`}
            />
            {isSelected && <Star size={10} className="text-accent fill-accent" />}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 bg-white">
        <p className="text-2xs font-mono font-semibold text-primary leading-none">{product.code}</p>
        <p className="text-2xs text-gray-500 truncate mt-0.5 leading-tight">{product.name}</p>
        {product.primaryPantone && (
          <p className="text-2xs text-gray-400 mt-0.5 truncate">{product.primaryPantone.code}</p>
        )}
      </div>
    </button>
  );
}
