'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, X, ArrowLeft, Sparkles, Star, Search, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HUE_FAMILIES, type HueFamily } from '@/lib/colorHarmony';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  imageUrl: string | null;  // already resolved to first available url by API
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

// ── SVG wheel constants ────────────────────────────────────────────────────────

const CX = 200, CY = 200;
const R_OUT  = 175; // outer edge
const R_LGHT = 148; // light / medium boundary
const R_MDDK = 116; // medium / dark boundary
const R_IN    = 84;  // inner edge of chromatic rings (white fill up to here)
const R_NEU_3 = 52;  // outer edge of neutral area
const R_NEU_2 = 36;  // light / medium neutral boundary
const R_NEU_1 = 20;  // medium / dark neutral boundary (innermost circle)

// Dot-center radii (midpoints of chromatic rings)
const R_D_LGHT = (R_OUT + R_LGHT) / 2;  // 161.5
const R_D_MED  = (R_LGHT + R_MDDK) / 2; // 132
const R_D_DARK = (R_MDDK + R_IN) / 2;   // 100

const N_SEG   = 24;
const SEG_DEG = 360 / N_SEG; // 15° per segment
const SEG_GAP = 0.8;          // gap between segments (degrees)

// ── SVG helpers ────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number, rOut: number, rIn: number): string {
  const p1 = polar(CX, CY, rOut, startDeg);
  const p2 = polar(CX, CY, rOut, endDeg);
  const p3 = polar(CX, CY, rIn,  endDeg);
  const p4 = polar(CX, CY, rIn,  startDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return (
    `M${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
    `A${rOut} ${rOut} 0 ${lg} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ` +
    `L${p3.x.toFixed(2)} ${p3.y.toFixed(2)} ` +
    `A${rIn} ${rIn} 0 ${lg} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}Z`
  );
}

function segColor(segIdx: number, ring: 'light' | 'med' | 'dark'): string {
  const h = segIdx * SEG_DEG;
  if (ring === 'light') return `hsl(${h},55%,84%)`;
  if (ring === 'med')   return `hsl(${h},80%,52%)`;
  return                       `hsl(${h},68%,28%)`;
}

function dotRadius(lightness: number): number {
  if (lightness > 65) return R_D_LGHT;
  if (lightness > 35) return R_D_MED;
  return R_D_DARK;
}

// Deterministic pseudo-random [0,1] from string seed
function hash01(seed: string): number {
  let h = 5381;
  for (const c of seed) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0) % 10000 / 9999;
}

// ── Harmony labels / colors ────────────────────────────────────────────────────

const HARMONY_LABELS: Record<string, string> = {
  identical:             'Identici',
  analogous:             'Analoghi',
  'split-complementary': 'Semi-complementari',
  complementary:         'Complementari',
  triadic:               'Triadici',
  neutral:               'Neutri compatibili',
  discordant:            'Discordanti',
};

const HARMONY_COLORS: Record<string, string> = {
  identical:             'bg-emerald-100 text-emerald-800',
  analogous:             'bg-blue-100 text-blue-800',
  'split-complementary': 'bg-violet-100 text-violet-800',
  complementary:         'bg-orange-100 text-orange-800',
  triadic:               'bg-pink-100 text-pink-800',
  neutral:               'bg-gray-100 text-gray-700',
};

// ── Main component ────────────────────────────────────────────────────────────

type SortKey = 'code' | 'name' | 'colore' | 'price';

export default function ColorWheelView() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId');
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [selectedFamilyId, setSelectedFamilyId]   = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialProductId);
  const [hoveredProductId, setHoveredProductId]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery]             = useState('');
  const [sortBy, setSortBy]                       = useState<SortKey>('code');

  // Auto-scroll to suggestions panel when arriving from a product link
  useEffect(() => {
    if (initialProductId && suggestionsRef.current) {
      suggestionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialProductId, suggestionsRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: wheelData, isLoading: wheelLoading, isError, error, refetch } = useQuery<{ families: WheelFamily[] }>({
    queryKey: ['moda-color-wheel'],
    queryFn: async () => {
      const res = await fetch('/api/moda/color-wheel');
      if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`); }
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

  const families    = wheelData?.families ?? [];
  const chromatic   = HUE_FAMILIES.filter((f) => f.id !== 'neutral');
  const neutralFam  = families.find((f) => f.id === 'neutral');

  const totalProducts = useMemo(
    () => families.reduce((s, f) => s + f.products.length, 0),
    [families]
  );

  const productMap = useMemo(() => {
    const map = new Map<string, WheelProduct>();
    for (const f of families) for (const p of f.products) map.set(p.id, p);
    return map;
  }, [families]);

  const selectedProduct = selectedProductId ? productMap.get(selectedProductId) : null;
  const hoveredProduct  = hoveredProductId  ? productMap.get(hoveredProductId)  : null;

  const visibleProducts = selectedFamilyId
    ? (families.find((f) => f.id === selectedFamilyId)?.products ?? [])
    : families.flatMap((f) => f.products);

  const filteredProducts = useMemo(() => {
    let list = visibleProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.colore && p.colore.toLowerCase().includes(q)) ||
        (p.primaryPantone?.name && p.primaryPantone.name.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name, 'it');
      if (sortBy === 'colore') return (a.colore ?? '').localeCompare(b.colore ?? '', 'it');
      if (sortBy === 'price')  return a.costPrice - b.costPrice;
      return a.code.localeCompare(b.code);
    });
  }, [visibleProducts, searchQuery, sortBy]);

  const allDots = families.flatMap((f) => f.products);

  function handleFamilyClick(familyId: string) {
    setSelectedFamilyId((prev) => (prev === familyId ? null : familyId));
    setSelectedProductId(null);
  }

  function handleProductClick(productId: string) {
    setSelectedProductId((prev) => (prev === productId ? null : productId));
  }

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
        <button onClick={() => refetch()} className="text-xs underline text-gray-500 hover:text-primary">Riprova</button>
      </div>
    );
  }

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
        {/* ── Left: Wheel + legends ───────────────────────────────── */}
        <div className="xl:w-[460px] flex-shrink-0 border-b xl:border-b-0 xl:border-r border-border/50 p-4 sm:p-6 flex flex-col items-center gap-4">

          {/* SVG Color Wheel */}
          <svg viewBox="0 0 400 400" className="w-full max-w-[380px]" style={{ overflow: 'visible' }}>

            {/* 24 segments × 3 rings */}
            {Array.from({ length: N_SEG }).map((_, si) => {
              const startDeg  = si * SEG_DEG;
              const endDeg    = startDeg + SEG_DEG - SEG_GAP;
              const familyIdx = Math.floor(si / 2);
              const familyId  = chromatic[familyIdx]?.id ?? '';
              const isSelected = selectedFamilyId === familyId;
              const dimmed    = !!selectedFamilyId && !isSelected;
              const opacity   = dimmed ? 0.2 : 1;

              return (
                <g key={si} onClick={() => handleFamilyClick(familyId)} className="cursor-pointer">
                  <path d={arcPath(startDeg, endDeg, R_OUT,  R_LGHT)} fill={segColor(si, 'light')} opacity={opacity} />
                  <path d={arcPath(startDeg, endDeg, R_LGHT, R_MDDK)} fill={segColor(si, 'med')}   opacity={opacity} />
                  <path d={arcPath(startDeg, endDeg, R_MDDK, R_IN)}   fill={segColor(si, 'dark')}  opacity={opacity} />
                  {/* Selection outline — drawn once per family (even si only) */}
                  {isSelected && si % 2 === 0 && (
                    <path
                      d={arcPath(startDeg - 0.5, startDeg + SEG_DEG * 2 - SEG_GAP + 0.5, R_OUT + 8, R_IN - 6)}
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      opacity={0.9}
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}

            {/* Subtle ring separators */}
            <circle cx={CX} cy={CY} r={R_LGHT} fill="none" stroke="white" strokeWidth="1"   opacity={0.2} className="pointer-events-none" />
            <circle cx={CX} cy={CY} r={R_MDDK} fill="none" stroke="white" strokeWidth="1"   opacity={0.2} className="pointer-events-none" />

            {/* White gap — covers 0..R_IN */}
            <circle cx={CX} cy={CY} r={R_IN} fill="white" className="pointer-events-none" />

            {/* Neutral area — 3 concentric rings (chiaro / medio / scuro) */}
            <g
              onClick={() => handleFamilyClick('neutral')}
              className="cursor-pointer"
              opacity={selectedFamilyId === 'neutral' ? 1 : selectedFamilyId ? 0.3 : 0.88}
            >
              {/* Outer ring: light neutrals */}
              <circle cx={CX} cy={CY} r={R_NEU_3} fill="#D4D4D4" />
              {/* Middle ring: medium neutrals */}
              <circle cx={CX} cy={CY} r={R_NEU_2} fill="#9E9E9E" />
              {/* Inner circle: dark neutrals */}
              <circle cx={CX} cy={CY} r={R_NEU_1} fill="#5A5A5A" />
              {/* Ring separator lines */}
              <circle cx={CX} cy={CY} r={R_NEU_2} fill="none" stroke="white" strokeWidth="1.2" opacity={0.5} className="pointer-events-none" />
              <circle cx={CX} cy={CY} r={R_NEU_1} fill="none" stroke="white" strokeWidth="1.2" opacity={0.5} className="pointer-events-none" />
              {/* Selection outline */}
              {selectedFamilyId === 'neutral' && (
                <circle cx={CX} cy={CY} r={R_NEU_3 + 5} fill="none" stroke="white" strokeWidth="2.5" className="pointer-events-none" />
              )}
              {/* Count label in center */}
              <text x={CX} y={CY + 3} textAnchor="middle" fontSize={8} fontWeight="700" fill="white" opacity={0.9} className="pointer-events-none">
                {neutralFam?.products.length ?? 0}
              </text>
            </g>

            {/* Product dots */}
            {allDots.map((product) => {
              let dotX: number, dotY: number;

              if (product.isNeutral) {
                const angle = hash01(product.id + 'a') * 360;
                const [rOut, rIn] = product.lightness > 65
                  ? [R_NEU_3 - 3, R_NEU_2 + 3]
                  : product.lightness > 35
                    ? [R_NEU_2 - 3, R_NEU_1 + 3]
                    : [R_NEU_1 - 3, 4];
                const r  = rIn + hash01(product.id + 'r') * (rOut - rIn);
                const pt = polar(CX, CY, r, angle);
                dotX = pt.x; dotY = pt.y;
              } else {
                const angJitter = (hash01(product.id + 'j') - 0.5) * 10;
                const radJitter = (hash01(product.id + 'k') - 0.5) * 14;
                const pt = polar(CX, CY, dotRadius(product.lightness) + radJitter, product.hue + angJitter);
                dotX = pt.x; dotY = pt.y;
              }

              const hex      = product.primaryPantone?.hex_code ?? '#9E9E9E';
              const isHov    = hoveredProductId  === product.id;
              const isSel    = selectedProductId === product.id;
              const inFamily = !selectedFamilyId || selectedFamilyId === product.hueFamilyId;
              const r        = isSel ? 5.5 : isHov ? 4.5 : 3.5;

              return (
                <g
                  key={product.id}
                  onMouseEnter={() => setHoveredProductId(product.id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                  onClick={() => handleProductClick(product.id)}
                  className="cursor-pointer"
                >
                  {/* Wider invisible hit area */}
                  <circle cx={dotX} cy={dotY} r={9} fill="transparent" />
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={r}
                    fill={hex}
                    stroke={isSel ? '#111' : 'white'}
                    strokeWidth={isSel ? 1.5 : 0.8}
                    opacity={inFamily ? 1 : 0.12}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover info bar */}
          <div className="w-full min-h-[40px]">
            {hoveredProduct && (
              <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border border-border text-xs">
                {hoveredProduct.primaryPantone && (
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 border border-border/50"
                    style={{ backgroundColor: hoveredProduct.primaryPantone.hex_code }}
                  />
                )}
                <span className="font-mono font-semibold text-primary">{hoveredProduct.code}</span>
                <span className="text-gray-400 truncate flex-1">{hoveredProduct.name}</span>
                {hoveredProduct.primaryPantone && (
                  <span className="text-gray-400 flex-shrink-0 text-2xs">{hoveredProduct.primaryPantone.code}</span>
                )}
              </div>
            )}
          </div>

          {/* ── Come si legge ─────────────────────────────────────── */}
          <div className="w-full rounded-lg border border-border bg-gray-50/60 px-3 py-2.5 space-y-1.5 text-xs text-gray-600">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Come si legge</p>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
              <span>Ogni <strong className="text-gray-700">punto</strong> è un prodotto, posizionato per tinta e luminosità Pantone</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: 'hsl(200,70%,55%)' }} />
              <span>Clicca un <strong className="text-gray-700">settore</strong> per filtrare quella famiglia cromatica</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-2 h-2 rounded-full border border-gray-400 flex-shrink-0" />
              <span>Clicca un <strong className="text-gray-700">punto</strong> per scoprire gli abbinamenti armonici</span>
            </div>
          </div>

          {/* ── Anelli tonali ─────────────────────────────────────── */}
          <div className="w-full">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Anelli tonali <span className="font-normal text-gray-300 ml-1">— luminosità Pantone</span>
            </p>
            <div className="space-y-1.5">
              {(
                [
                  { label: 'Chiaro',         position: 'anello esterno',          bg: 'hsl(220,50%,82%)', range: 'L > 65%'    },
                  { label: 'Medio',          position: 'anello centrale',         bg: 'hsl(220,75%,50%)', range: '35–65%'     },
                  { label: 'Scuro',          position: 'anello interno',          bg: 'hsl(220,62%,28%)', range: 'L < 35%'    },
                  { label: 'Neutro chiaro',  position: 'cerchio — fascia esterna', bg: '#D4D4D4',          range: 'L > 65%'    },
                  { label: 'Neutro medio',   position: 'cerchio — fascia centrale', bg: '#9E9E9E',         range: '35–65%'     },
                  { label: 'Neutro scuro',   position: 'cerchio — fascia interna', bg: '#5A5A5A',          range: 'L < 35%'    },
                ] as const
              ).map(({ label, position, bg, range }, i) => (
                <div key={label} className={`flex items-center gap-2.5 text-xs ${i === 3 ? 'mt-1 pt-1 border-t border-border/40' : ''}`}>
                  <span className="w-7 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: bg }} />
                  <span className="font-medium text-gray-700 w-24 flex-shrink-0 leading-tight">{label}</span>
                  <span className="text-gray-400 flex-1 leading-tight">{position}</span>
                  <span className="text-gray-400 text-2xs tabular-nums">{range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Famiglie cromatiche ───────────────────────────────── */}
          <div className="w-full">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
              Famiglie cromatiche
              <span className="font-normal text-gray-300 ml-1">— clicca per filtrare</span>
            </p>
            <div className="grid grid-cols-2 gap-0.5">
              {HUE_FAMILIES.map((f) => {
                const count    = families.find((ff) => ff.id === f.id)?.products.length ?? 0;
                const isActive = selectedFamilyId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFamilyClick(f.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                      isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: f.hexColor }} />
                    <span className="text-gray-700 truncate">{f.label}</span>
                    {count > 0 && <span className="ml-auto text-gray-400 text-2xs pl-1">{count}</span>}
                  </button>
                );
              })}
            </div>
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

        {/* ── Right: Products + Suggestions ───────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* Search + Sort toolbar */}
          <div className="sticky top-0 z-10 bg-white border-b border-border/50 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
            {/* Family label */}
            {selectedFamilyId && (() => {
              const fam = HUE_FAMILIES.find((f) => f.id === selectedFamilyId);
              return fam ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: fam.hexColor }} />
                  <span className="text-sm font-semibold text-primary">{fam.label}</span>
                </div>
              ) : null;
            })()}

            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca per codice, nome, colore…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-7 py-1.5 text-xs border border-border rounded focus:outline-none focus:border-accent bg-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-border rounded bg-white focus:outline-none focus:border-accent"
              >
                <option value="code">Codice</option>
                <option value="name">Nome</option>
                <option value="colore">Colore</option>
                <option value="price">Prezzo</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Count */}
            <span className="text-2xs text-gray-400 flex-shrink-0 tabular-nums">
              {filteredProducts.length}{visibleProducts.length !== filteredProducts.length ? `/${visibleProducts.length}` : ''} prodotti
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                {searchQuery ? 'Nessun prodotto trovato per questa ricerca' : 'Nessun prodotto in questa famiglia colore'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
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
            <div ref={suggestionsRef} className="border-t border-border/50 p-4 sm:p-6 bg-gray-50/50">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-accent flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary leading-snug">
                      Abbinamenti per {selectedProduct.name}
                    </p>
                    <p className="text-xs font-mono text-gray-400 leading-none mt-0.5">{selectedProduct.code}</p>
                    {selectedProduct.primaryPantone && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-border/40"
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
                <div className="space-y-6">

                  {/* ── Set per esposizione (enlarged) ── */}
                  {suggestionsData.groups.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={14} className="text-accent" />
                        <p className="text-sm font-semibold text-primary">Set per esposizione</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {suggestionsData.groups.slice(0, 4).map((group) => {
                          const groupProducts = group.productIds
                            .map((id) => productMap.get(id))
                            .filter(Boolean) as WheelProduct[];
                          return (
                            <div key={group.type} className="bg-white rounded-xl border border-border shadow-luxury overflow-hidden">
                              <div className="px-4 pt-4 pb-2 border-b border-border/40">
                                <p className="text-sm font-semibold text-primary leading-tight">{group.label}</p>
                                <p className="text-xs text-gray-400 leading-snug mt-0.5">{group.description}</p>
                              </div>
                              <div className="p-3">
                                <div className="grid grid-cols-4 gap-2">
                                  {groupProducts.slice(0, 8).map((p) => (
                                    <button
                                      key={p.id}
                                      onClick={() => handleProductClick(p.id)}
                                      className={`group rounded-lg overflow-hidden border transition-all ${
                                        selectedProductId === p.id ? 'border-accent ring-1 ring-accent/20' : 'border-border hover:border-accent/40'
                                      }`}
                                      title={`${p.code} — ${p.name}`}
                                    >
                                      <div className="aspect-square bg-gray-50">
                                        {p.imageUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={p.imageUrl} alt={p.code} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                          <div className="w-full h-full" style={{ backgroundColor: p.primaryPantone?.hex_code ?? '#e5e5e5' }} />
                                        )}
                                      </div>
                                      <div className="px-1 py-0.5 bg-white">
                                        <p className="text-2xs font-mono font-semibold text-primary leading-none truncate">{p.code}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                {groupProducts.length > 8 && (
                                  <p className="text-2xs text-gray-400 mt-2 text-right">+{groupProducts.length - 8} altri</p>
                                )}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                                  <div className="flex gap-1">
                                    {groupProducts.slice(0, 6).map((p) => (
                                      <span
                                        key={p.id}
                                        className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                                        style={{ backgroundColor: p.primaryPantone?.hex_code ?? '#ccc' }}
                                        title={p.primaryPantone?.code}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-2xs text-gray-400 tabular-nums">{groupProducts.length} pz</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Armonie cromatiche ── */}
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

                  {suggestionsData.suggestions.length === 0 && suggestionsData.groups.length === 0 && (
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
  const router = useRouter();

  return (
    <button
      onClick={onClick}
      onDoubleClick={() => router.push(`/catalog/${product.id}`)}
      className={`group text-left rounded-lg overflow-hidden border transition-all ${
        isSelected
          ? 'border-accent ring-2 ring-accent/20 shadow-sm'
          : 'border-border hover:border-accent/40'
      }`}
    >
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : product.primaryPantone ? (
          <div className="w-full h-full" style={{ backgroundColor: product.primaryPantone.hex_code }} />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 text-xs">—</div>
        )}
        {product.primaryPantone && (
          <div className="absolute bottom-1 right-1 flex items-center gap-1">
            <div
              className="w-4 h-4 rounded border border-[#3a3a3a]/60 shadow-sm"
              style={{ backgroundColor: product.primaryPantone.hex_code }}
              title={`${product.primaryPantone.code} — ${product.primaryPantone.name}`}
            />
            {isSelected && <Star size={10} className="text-accent fill-accent" />}
          </div>
        )}
      </div>
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
