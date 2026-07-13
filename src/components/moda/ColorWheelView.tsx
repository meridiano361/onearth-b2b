'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, X, ArrowLeft, Sparkles, Star, Search, ChevronDown, ChevronRight, Plus, Palette } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HUE_FAMILIES, type HueFamily, harmonyScore, getHarmonyType } from '@/lib/colorHarmony';
import { isAdminRole } from '@/lib/roles';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PrimaryPantone {
  pantoneColorId?: number;
  code: string;
  name: string;
  hex_code: string;
  hue_angle: number;
  lightness: number;
  is_neutral: boolean;
  inferred?: boolean;
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

// Full product type returned by allScored (includes taxonomy)
interface ScoredProduct {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  colore: string | null;
  famiglia: string | null;
  sottofamiglia: string | null;
  classe: string | null;
  sottoclasse: string | null;
  gruppoOmogeneo: string | null;
  costPrice: number;
  retailPrice: number;
  primaryPantone: { code: string; name: string; hex_code: string; inferred?: boolean };
  harmonyType: string;
  score: number;
  hueFamilyId: string;
}

interface HeroData {
  productId: string;
  code: string;
  name: string;
  imageUrl: string | null;
  famiglia: string | null;
  sottofamiglia: string | null;
  classe: string | null;
  sottoclasse: string | null;
  gruppoOmogeneo: string | null;
  primaryPantone: PrimaryPantone | null;
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

interface SuggestionsResponse {
  hero: HeroData | null;
  suggestions: SuggestionGroup[];
  groups: DisplayGroup[];
  allScored: ScoredProduct[];
}

// ── Display group definitions ─────────────────────────────────────────────────

const DISPLAY_GROUPS: { type: string; label: string; description: string }[] = [
  { type: 'tono-su-tono', label: 'Tono su tono',  description: 'Colori identici o quasi — profondità monocromatica.' },
  { type: 'analoghi',      label: 'Analoghi',       description: 'Colori vicini sulla ruota — armonia morbida e naturale.' },
  { type: 'complementari', label: 'A contrasto',    description: 'Colori opposti sulla ruota — massimo impatto visivo.' },
  { type: 'hero-neutrals', label: 'Hero + Neutri',  description: 'Colore forte con fondali neutri — elegante e versatile.' },
];

const GROUP_HARMONY_MAP: Record<string, string[]> = {
  'tono-su-tono':  ['identical', 'analogous'],
  'analoghi':      ['analogous', 'split-complementary'],
  'complementari': ['complementary'],
  'hero-neutrals': ['neutral'],
};

// ── SVG wheel constants ────────────────────────────────────────────────────────

const CX = 200, CY = 200;
const R_OUT  = 175;
const R_LGHT = 148;
const R_MDDK = 116;
const R_IN    = 84;
const R_NEU_3 = 52;
const R_NEU_2 = 36;
const R_NEU_1 = 20;

const R_D_LGHT = (R_OUT + R_LGHT) / 2;
const R_D_MED  = (R_LGHT + R_MDDK) / 2;
const R_D_DARK = (R_MDDK + R_IN) / 2;

const N_SEG   = 24;
const SEG_DEG = 360 / N_SEG;
const SEG_GAP = 0.8;

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

// ── Taxonomy filter chips ─────────────────────────────────────────────────────

function FilterChips({
  label, values, active, onSelect,
}: {
  label: string;
  values: string[];
  active: string | null;
  onSelect: (v: string | null) => void;
}) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-2xs text-gray-400 font-medium mr-1">{label}:</span>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(active === v ? null : v)}
          className={`px-2 py-0.5 rounded-full text-2xs transition-colors ${
            active === v
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

// ── Focused product view ───────────────────────────────────────────────────────

function FocusProductView({
  suggestionsData,
  suggestionsLoading,
  onExit,
  pareteId,
  pareteBackHref,
  addToParete,
  addingProductId,
}: {
  suggestionsData: SuggestionsResponse | undefined;
  suggestionsLoading: boolean;
  onExit: () => void;
  pareteId?: string | null;
  pareteBackHref?: string;
  addToParete?: (p: { id: string; code: string; name: string; imageUrl: string | null; hex?: string }) => void;
  addingProductId?: string | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role);
  const [activeGroupType, setActiveGroupType] = useState<string | null>(null);
  const [famFilter,        setFamFilter]       = useState<string | null>(null);
  const [classeFilter,     setClasseFilter]    = useState<string | null>(null);
  const [sottoclasseFilter, setSottoclasseFilter] = useState<string | null>(null);
  const [gruppoFilter,     setGruppoFilter]    = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset filters when changing group
  function selectGroup(type: string) {
    if (activeGroupType === type) {
      setActiveGroupType(null);
    } else {
      setActiveGroupType(type);
      setFamFilter(null); setClasseFilter(null); setSottoclasseFilter(null); setGruppoFilter(null);
    }
  }

  useEffect(() => {
    if (activeGroupType && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeGroupType]);

  const allScored = suggestionsData?.allScored ?? [];
  const hero = suggestionsData?.hero ?? null;

  // Products for active group (all harmony types that belong to it)
  const activeProducts = useMemo(() => {
    if (!activeGroupType) return [];
    const harmonyTypes = GROUP_HARMONY_MAP[activeGroupType] ?? [];
    return allScored.filter((p) => harmonyTypes.includes(p.harmonyType));
  }, [activeGroupType, allScored]);

  // Filtered by taxonomy chips
  const filteredProducts = useMemo(() => {
    let list = activeProducts;
    if (famFilter)         list = list.filter((p) => p.famiglia     === famFilter);
    if (classeFilter)      list = list.filter((p) => p.classe       === classeFilter);
    if (sottoclasseFilter) list = list.filter((p) => p.sottoclasse  === sottoclasseFilter);
    if (gruppoFilter)      list = list.filter((p) => p.gruppoOmogeneo === gruppoFilter);
    return list;
  }, [activeProducts, famFilter, classeFilter, sottoclasseFilter, gruppoFilter]);

  // Unique taxonomy values for filter chips (from unfiltered active products)
  const famiglie    = useMemo(() => [...new Set(activeProducts.map((p) => p.famiglia).filter(Boolean) as string[])].sort(), [activeProducts]);
  const classi      = useMemo(() => [...new Set(activeProducts.map((p) => p.classe).filter(Boolean) as string[])].sort(), [activeProducts]);
  const sottoclassi = useMemo(() => [...new Set(activeProducts.map((p) => p.sottoclasse).filter(Boolean) as string[])].sort(), [activeProducts]);
  const gruppi      = useMemo(() => [...new Set(activeProducts.map((p) => p.gruppoOmogeneo).filter(Boolean) as string[])].sort(), [activeProducts]);

  // Preview swatches + count per group card
  const groupMeta = useMemo(() => {
    return DISPLAY_GROUPS.map((g) => {
      const harmonyTypes = GROUP_HARMONY_MAP[g.type] ?? [];
      const products = allScored.filter((p) => harmonyTypes.includes(p.harmonyType));
      return {
        ...g,
        count: products.length,
        swatches: products.slice(0, 6).map((p) => p.primaryPantone.hex_code),
        previewImages: products.filter((p) => p.imageUrl).slice(0, 3).map((p) => p.imageUrl as string),
      };
    });
  }, [allScored]);

  const hasFilters = famFilter || classeFilter || sottoclasseFilter || gruppoFilter;

  return (
    <div className="flex flex-col h-full">
      {/* Parete context banner */}
      {pareteId && pareteBackHref && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary text-white text-xs">
          <span className="flex-1">
            Stai aggiungendo prodotti alla parete — premi <strong>+</strong> su un prodotto per aggiungerlo
          </span>
          <a href={pareteBackHref} className="underline hover:no-underline flex-shrink-0">
            ← Torna alla parete
          </a>
        </div>
      )}
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/50 flex items-center gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} /> Ruota Cromatica
        </button>
        <div className="flex-1 min-w-0">
          <p className="label-luxury text-accent">Moda PE27</p>
          <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide leading-tight">
            Abbinamenti cromatici
          </h1>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">

        {/* Hero product card */}
        {suggestionsLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
            <Loader2 size={14} className="animate-spin" /> Caricamento abbinamenti…
          </div>
        ) : hero ? (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-border shadow-sm">
            {hero.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.imageUrl}
                alt={hero.code}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0 border border-border/40"
              />
            ) : hero.primaryPantone ? (
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0 border border-border/40"
                style={{ backgroundColor: hero.primaryPantone.hex_code }}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-mono font-semibold text-primary text-sm">{hero.code}</p>
              <p className="text-sm text-gray-600 leading-snug mt-0.5 truncate">{hero.name}</p>
              {hero.primaryPantone && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-border/40"
                    style={{ backgroundColor: hero.primaryPantone.hex_code }}
                  />
                  <span className="text-xs text-gray-500 truncate">
                    {hero.primaryPantone.code ? `${hero.primaryPantone.code} — ` : ''}{hero.primaryPantone.name}
                  </span>
                  {hero.primaryPantone.inferred && isAdmin && (
                    <span className="ml-0.5 px-1 py-0.5 rounded text-2xs font-medium bg-amber-100 text-amber-700 flex-shrink-0" title="Pantone generato automaticamente dal campo colore — non assegnato da un operatore">
                      Auto
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-1.5">
                {hero.famiglia && (
                  <span className="px-1.5 py-0.5 bg-white border border-border rounded text-2xs text-gray-500">{hero.famiglia}</span>
                )}
                {hero.classe && (
                  <span className="px-1.5 py-0.5 bg-white border border-border rounded text-2xs text-gray-500">{hero.classe}</span>
                )}
                {hero.sottoclasse && (
                  <span className="px-1.5 py-0.5 bg-white border border-border rounded text-2xs text-gray-500">{hero.sottoclasse}</span>
                )}
                {hero.gruppoOmogeneo && (
                  <span className="px-1.5 py-0.5 bg-white border border-border rounded text-2xs text-gray-500">{hero.gruppoOmogeneo}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push(`/moda/product/${hero.productId}`)}
              className="flex-shrink-0 text-xs text-gray-400 hover:text-primary transition-colors"
              title="Vai alla scheda prodotto"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}

        {/* 4 set cards */}
        {!suggestionsLoading && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-accent flex-shrink-0" />
              <p className="text-sm font-semibold text-primary">Set espositivi</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {groupMeta.map((g) => (
                <button
                  key={g.type}
                  type="button"
                  onClick={() => selectGroup(g.type)}
                  className={`text-left p-3 sm:p-4 rounded-xl border transition-all ${
                    activeGroupType === g.type
                      ? 'border-accent ring-1 ring-accent/20 bg-accent/5'
                      : g.count === 0
                        ? 'border-border bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-border hover:border-accent/50 bg-white hover:shadow-sm'
                  }`}
                  disabled={g.count === 0}
                >
                  <p className="text-sm font-semibold text-primary leading-tight">{g.label}</p>
                  <p className="text-2xs text-gray-400 mt-0.5 leading-snug">{g.description}</p>
                  {/* Color swatches */}
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {g.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    {g.swatches.length === 0 && (
                      <span className="text-2xs text-gray-300">Nessun prodotto</span>
                    )}
                  </div>
                  <p className="text-2xs text-gray-400 mt-1.5 tabular-nums">
                    {g.count} prodott{g.count === 1 ? 'o' : 'i'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expanded filter + product panel */}
        {activeGroupType && (
          <div ref={panelRef} className="space-y-4">
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-primary">
                  {DISPLAY_GROUPS.find((g) => g.type === activeGroupType)?.label}
                  <span className="ml-2 text-xs font-normal text-gray-400 tabular-nums">
                    {filteredProducts.length}{hasFilters ? `/${activeProducts.length}` : ''} prodotti
                  </span>
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => { setFamFilter(null); setClasseFilter(null); setSottoclasseFilter(null); setGruppoFilter(null); }}
                    className="text-2xs text-gray-400 hover:text-primary flex items-center gap-1"
                  >
                    <X size={11} /> Rimuovi filtri
                  </button>
                )}
              </div>

              {/* Taxonomy filter chips */}
              <div className="space-y-2 mb-4">
                <FilterChips label="Famiglia"       values={famiglie}    active={famFilter}         onSelect={setFamFilter} />
                <FilterChips label="Classe"         values={classi}      active={classeFilter}      onSelect={setClasseFilter} />
                <FilterChips label="Sottoclasse"    values={sottoclassi} active={sottoclasseFilter} onSelect={setSottoclasseFilter} />
                <FilterChips label="Gr. Omogeneo"   values={gruppi}      active={gruppoFilter}      onSelect={setGruppoFilter} />
              </div>

              {/* Product grid */}
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  Nessun prodotto per i filtri selezionati
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredProducts.map((p) => (
                    <div key={p.id} className="relative group/fp">
                      <button
                        type="button"
                        onClick={() => router.push(`/moda/product/${p.id}`)}
                        className="w-full text-left rounded-lg overflow-hidden border border-border hover:border-accent/40 transition-all hover:shadow-sm"
                        title={`${p.code} — ${p.name}`}
                      >
                        <div className="aspect-square bg-gray-50 overflow-hidden">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.code}
                              className="w-full h-full object-cover group-hover/fp:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full" style={{ backgroundColor: p.primaryPantone?.hex_code ?? '#e5e5e5' }} />
                          )}
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-2xs font-mono font-semibold text-primary leading-none">{p.code}</p>
                          <p className="text-2xs text-gray-500 truncate mt-0.5 leading-tight">{p.name}</p>
                          {p.primaryPantone && (
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0 border border-border/40"
                                style={{ backgroundColor: p.primaryPantone.hex_code }}
                              />
                              <span className="text-2xs text-gray-400 truncate">
                                {p.primaryPantone.code || p.primaryPantone.name}
                              </span>
                              {p.primaryPantone.inferred && isAdmin && (
                                <span className="px-0.5 rounded text-2xs font-medium bg-amber-100 text-amber-700 flex-shrink-0">Auto</span>
                              )}
                            </div>
                          )}
                          {(p.famiglia || p.classe) && (
                            <p className="text-2xs text-gray-300 truncate mt-0.5">
                              {[p.famiglia, p.classe].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </button>
                      {addToParete && (
                        <button
                          type="button"
                          onClick={() => addToParete({ id: p.id, code: p.code, name: p.name, imageUrl: p.imageUrl, hex: p.primaryPantone?.hex_code })}
                          disabled={addingProductId === p.id}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-sm"
                          title="Aggiungi alla parete"
                        >
                          {addingProductId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type SortKey = 'code' | 'name' | 'colore' | 'price';

export default function ColorWheelView() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role);
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId');
  const pareteId    = searchParams.get('pareteId');
  const elementId   = searchParams.get('elementId');
  const elementTipo = searchParams.get('elementTipo');
  const sourceTipo  = searchParams.get('sourceTipo');

  const [focusMode, setFocusMode] = useState(!!initialProductId);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [selectedFamilyId, setSelectedFamilyId]   = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialProductId);
  const [hoveredProductId, setHoveredProductId]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery]             = useState('');
  const [sortBy, setSortBy]                       = useState<SortKey>('code');
  const [addingProductId, setAddingProductId]     = useState<string | null>(null);
  const [palettaCategoria, setPalettaCategoria]   = useState<string | null>(null);
  const [palettaPantoneKey, setPalettaPantoneKey] = useState<string | null>(null);

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

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<SuggestionsResponse>({
    queryKey: ['color-wheel-suggestions', selectedProductId],
    queryFn: async () => {
      const res = await fetch(`/api/moda/color-wheel/suggestions?productId=${selectedProductId}`);
      if (!res.ok) throw new Error('Failed to load suggestions');
      return res.json();
    },
    enabled: !!selectedProductId,
    staleTime: 120_000,
  });

  // Auto-scroll to suggestions panel in normal mode
  useEffect(() => {
    if (!focusMode && selectedProductId && suggestionsRef.current) {
      suggestionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusMode, selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── All derived state (useMemo) must run unconditionally before any early return ──

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

  // ── Palette per categoria ─────────────────────────────────────────────────────

  type PantoneSummary = {
    key: string; hex: string; code: string; name: string;
    productIds: string[]; hue: number; lightness: number; isNeutral: boolean;
  };

  const famiglieConPalette = useMemo((): { famiglia: string; pantones: PantoneSummary[] }[] => {
    const map = new Map<string, Map<string, PantoneSummary>>();
    for (const wf of families) {
      for (const p of wf.products) {
        if (!p.famiglia || !p.primaryPantone) continue;
        const pt = p.primaryPantone;
        const key = pt.code || pt.hex_code;
        if (!map.has(p.famiglia)) map.set(p.famiglia, new Map());
        const pMap = map.get(p.famiglia)!;
        if (!pMap.has(key)) {
          pMap.set(key, { key, hex: pt.hex_code, code: pt.code, name: pt.name, productIds: [], hue: pt.hue_angle, lightness: pt.lightness, isNeutral: pt.is_neutral });
        }
        const entry = pMap.get(key)!;
        if (!entry.productIds.includes(p.id)) entry.productIds.push(p.id);
      }
    }
    return Array.from(map.entries())
      .map(([famiglia, pMap]) => ({
        famiglia,
        pantones: Array.from(pMap.values()).sort((a, b) =>
          a.isNeutral !== b.isNeutral ? (a.isNeutral ? 1 : -1) : a.hue - b.hue
        ),
      }))
      .filter(f => f.pantones.length > 0)
      .sort((a, b) => a.famiglia.localeCompare(b.famiglia, 'it'));
  }, [families]);

  const selectedHero = selectedProductId ? productMap.get(selectedProductId) : null;

  type ScoredPantone = PantoneSummary & { score: number | null; harmonyType: string | null };

  const scoredPaletteItems = useMemo((): ScoredPantone[] => {
    const pantones = famiglieConPalette.find(f => f.famiglia === palettaCategoria)?.pantones ?? [];
    if (!selectedHero) return pantones.map(p => ({ ...p, score: null, harmonyType: null }));
    return pantones
      .map(pt => ({
        ...pt,
        score: harmonyScore(selectedHero.hue, pt.hue, selectedHero.isNeutral, pt.isNeutral, selectedHero.lightness, pt.lightness),
        harmonyType: getHarmonyType(selectedHero.hue, pt.hue, selectedHero.isNeutral, pt.isNeutral),
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [famiglieConPalette, palettaCategoria, selectedHero]);

  // ─────────────────────────────────────────────────────────────────────────────

  function handleFamilyClick(familyId: string) {
    setSelectedFamilyId((prev) => (prev === familyId ? null : familyId));
    setSelectedProductId(null);
  }

  function handleProductClick(productId: string) {
    setSelectedProductId((prev) => (prev === productId ? null : productId));
  }

  const addToParete = useCallback(async (p: { id: string; code: string; name: string; imageUrl: string | null; hex?: string }) => {
    if (!pareteId || !elementId) return;
    setAddingProductId(p.id);
    try {
      const res = await fetch(`/api/moda/pareti/${pareteId}`);
      if (!res.ok) throw new Error('Parete non trovata');
      const { data: parete } = await res.json();
      const config: import('@/types').ElementoParete[] = parete.configurazione ?? [];
      const elIdx = config.findIndex((e) => e.id === elementId);
      if (elIdx === -1) throw new Error('Elemento non trovato');
      const el = config[elIdx];
      const newItem: import('@/types').ItemParete = {
        id: nanoid(8),
        tipo: (sourceTipo as import('@/types').TipoCapo) ?? (elementTipo === 'mensola' ? 'borsa' : elementTipo === 'barra' ? 'top' : 'abito'),
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        imageUrl: p.imageUrl ?? undefined,
        coloreHex: p.hex,
        pezzi: [],
      };
      let updatedEl: import('@/types').ElementoParete;
      if (el.tipo === 'mensola') {
        if (el.mensole?.length) {
          const mensole = el.mensole.map((m, i) => i === 0 ? { ...m, items: [...m.items, newItem] } : m);
          updatedEl = { ...el, mensole };
        } else {
          updatedEl = { ...el, items: [...el.items, newItem] };
        }
      } else {
        updatedEl = { ...el, items: [...el.items, newItem] };
      }
      const newConfig = config.map((e, i) => i === elIdx ? updatedEl : e);
      const patchRes = await fetch(`/api/moda/pareti/${pareteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurazione: newConfig }),
      });
      if (!patchRes.ok) throw new Error('Salvataggio fallito');
      toast.success(`${p.code} aggiunto alla parete`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setAddingProductId(null);
    }
  }, [pareteId, elementId, elementTipo, sourceTipo]);

  // ── Early returns (all hooks above this line) ─────────────────────────────

  if (focusMode) {
    return (
      <FocusProductView
        suggestionsData={suggestionsData}
        suggestionsLoading={suggestionsLoading}
        onExit={() => { setFocusMode(false); }}
        pareteId={pareteId}
        pareteBackHref={pareteId ? `/moda/pareti/${pareteId}` : undefined}
        addToParete={pareteId ? addToParete : undefined}
        addingProductId={addingProductId}
      />
    );
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
    <div className="flex flex-col h-full">
      {/* Parete context banner */}
      {pareteId && elementId && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary text-white text-xs">
          <span className="flex-1">
            Stai aggiungendo prodotti alla parete — seleziona con <strong>+</strong> accanto al prodotto
          </span>
          <a href={`/moda/pareti/${pareteId}`} className="underline hover:no-underline flex-shrink-0">
            ← Torna alla parete
          </a>
        </div>
      )}
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/50">
        <p className="label-luxury text-accent">Moda PE27</p>
        <h1 className="font-display text-xl sm:text-2xl text-primary font-light tracking-wide">
          Ruota Cromatica
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">{totalProducts} prodotti</p>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 overflow-hidden">
        {/* ── Left: Wheel + legends ───────────────────────────────── */}
        <div className="xl:w-[460px] flex-shrink-0 border-b xl:border-b-0 xl:border-r border-border/50 p-4 sm:p-6 flex flex-col items-center gap-4 overflow-y-auto">

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

            {/* White gap */}
            <circle cx={CX} cy={CY} r={R_IN} fill="white" className="pointer-events-none" />

            {/* Neutral area */}
            <g
              onClick={() => handleFamilyClick('neutral')}
              className="cursor-pointer"
              opacity={selectedFamilyId === 'neutral' ? 1 : selectedFamilyId ? 0.3 : 0.88}
            >
              <circle cx={CX} cy={CY} r={R_NEU_3} fill="#D4D4D4" />
              <circle cx={CX} cy={CY} r={R_NEU_2} fill="#9E9E9E" />
              <circle cx={CX} cy={CY} r={R_NEU_1} fill="#5A5A5A" />
              <circle cx={CX} cy={CY} r={R_NEU_2} fill="none" stroke="white" strokeWidth="1.2" opacity={0.5} className="pointer-events-none" />
              <circle cx={CX} cy={CY} r={R_NEU_1} fill="none" stroke="white" strokeWidth="1.2" opacity={0.5} className="pointer-events-none" />
              {selectedFamilyId === 'neutral' && (
                <circle cx={CX} cy={CY} r={R_NEU_3 + 5} fill="none" stroke="white" strokeWidth="2.5" className="pointer-events-none" />
              )}
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
                  <span className="text-gray-400 flex-shrink-0 text-2xs">
                    {hoveredProduct.primaryPantone.code || hoveredProduct.primaryPantone.name}
                    {hoveredProduct.primaryPantone.inferred && isAdmin && (
                      <span className="ml-1 px-1 rounded bg-amber-100 text-amber-700">Auto</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Come si legge */}
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

          {/* Anelli tonali */}
          <div className="w-full">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Anelli tonali <span className="font-normal text-gray-300 ml-1">— luminosità Pantone</span>
            </p>
            <div className="space-y-1.5">
              {(
                [
                  { label: 'Chiaro',         position: 'anello esterno',           bg: 'hsl(220,50%,82%)', range: 'L > 65%'    },
                  { label: 'Medio',          position: 'anello centrale',          bg: 'hsl(220,75%,50%)', range: '35–65%'     },
                  { label: 'Scuro',          position: 'anello interno',           bg: 'hsl(220,62%,28%)', range: 'L < 35%'    },
                  { label: 'Neutro chiaro',  position: 'cerchio — fascia esterna', bg: '#D4D4D4',          range: 'L > 65%'    },
                  { label: 'Neutro medio',   position: 'cerchio — fascia centrale',bg: '#9E9E9E',          range: '35–65%'     },
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

          {/* Famiglie cromatiche */}
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
            {selectedFamilyId && (() => {
              const fam = HUE_FAMILIES.find((f) => f.id === selectedFamilyId);
              return fam ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: fam.hexColor }} />
                  <span className="text-sm font-semibold text-primary">{fam.label}</span>
                </div>
              ) : null;
            })()}

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
                    onAddToParete={pareteId ? () => addToParete({ id: product.id, code: product.code, name: product.name, imageUrl: product.imageUrl, hex: product.primaryPantone?.hex_code }) : undefined}
                    isAdding={addingProductId === product.id}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Palette Pantone per categoria */}
          {!wheelLoading && famiglieConPalette.length > 0 && (
            <div className="border-t border-border/50 p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <Palette size={14} className="text-accent flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-primary">Palette Pantone per categoria</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedHero
                      ? `Abbinamenti di ${selectedHero.code} nelle altre categorie`
                      : 'Colori Pantone disponibili per famiglia merceologica'}
                  </p>
                </div>
              </div>

              {/* Family tab chips */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {famiglieConPalette.map(f => (
                  <button
                    key={f.famiglia}
                    onClick={() => {
                      setPalettaCategoria(prev => prev === f.famiglia ? null : f.famiglia);
                      setPalettaPantoneKey(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      palettaCategoria === f.famiglia
                        ? 'bg-primary text-background border-primary'
                        : 'bg-white text-gray-600 border-border hover:border-primary/30 hover:bg-cream'
                    }`}
                  >
                    {f.famiglia}
                    <span className={`tabular-nums text-2xs ${palettaCategoria === f.famiglia ? 'text-background/70' : 'text-gray-400'}`}>
                      {f.pantones.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Overview cards — no category selected */}
              {!palettaCategoria && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {famiglieConPalette.map(f => (
                    <button
                      key={f.famiglia}
                      onClick={() => { setPalettaCategoria(f.famiglia); setPalettaPantoneKey(null); }}
                      className="text-left p-3 rounded-xl border border-border hover:border-accent/40 bg-white hover:shadow-sm transition-all"
                    >
                      <p className="text-xs font-semibold text-primary mb-2 truncate">{f.famiglia}</p>
                      <div className="flex flex-wrap gap-1">
                        {f.pantones.slice(0, 14).map(pt => (
                          <span
                            key={pt.key}
                            className="w-4 h-4 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: pt.hex }}
                            title={`${pt.code} — ${pt.name}`}
                          />
                        ))}
                        {f.pantones.length > 14 && (
                          <span className="text-2xs text-gray-400 self-center ml-0.5">+{f.pantones.length - 14}</span>
                        )}
                      </div>
                      <p className="text-2xs text-gray-400 mt-2 tabular-nums">
                        {f.pantones.length} colori · {f.pantones.reduce((s, p) => s + p.productIds.length, 0)} prodotti
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected category palette */}
              {palettaCategoria && scoredPaletteItems.length > 0 && (
                <div>
                  {selectedHero && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-border/40"
                        style={{ backgroundColor: selectedHero.primaryPantone?.hex_code ?? '#9E9E9E' }}
                      />
                      <span>
                        Abbinamenti cromatici di <strong className="text-primary">{selectedHero.code}</strong> con i prodotti di <strong className="text-primary">{palettaCategoria}</strong>
                      </span>
                    </div>
                  )}

                  {selectedHero && (
                    <div className="flex items-center gap-4 text-2xs text-gray-400 mb-3 px-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Alta armonia
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> Compatibile
                      </span>
                      <span className="flex items-center gap-1 opacity-50">
                        <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Bassa armonia
                      </span>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    {scoredPaletteItems.map(pt => {
                      const isHarmonic   = pt.score !== null && pt.score >= 70;
                      const isCompatible = pt.score !== null && pt.score >= 50 && pt.score < 70;
                      const opacity = pt.score === null ? 1
                        : isHarmonic ? 1
                        : isCompatible ? 0.6
                        : 0.25;
                      const isExpanded = palettaPantoneKey === pt.key;

                      return (
                        <div key={pt.key}>
                          <button
                            onClick={() => setPalettaPantoneKey(prev => prev === pt.key ? null : pt.key)}
                            style={{ opacity }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                              isExpanded ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white shadow"
                              style={{ backgroundColor: pt.hex }}
                            />
                            <span className="font-mono text-2xs text-gray-500 w-20 flex-shrink-0 truncate">{pt.code || '—'}</span>
                            <span className="text-xs text-gray-700 flex-1 truncate">{pt.name}</span>
                            <span className="text-2xs text-gray-400 tabular-nums flex-shrink-0">{pt.productIds.length} prod.</span>
                            {isHarmonic && pt.harmonyType && (
                              <span className={`text-2xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${HARMONY_COLORS[pt.harmonyType] ?? 'bg-gray-100 text-gray-600'}`}>
                                {HARMONY_LABELS[pt.harmonyType] ?? pt.harmonyType}
                              </span>
                            )}
                          </button>

                          {/* Expanded products */}
                          {isExpanded && (
                            <div className="ml-8 pl-3 border-l-2 border-border/30 py-2 mb-1">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {pt.productIds.slice(0, 9).map(pid => {
                                  const prod = productMap.get(pid);
                                  if (!prod) return null;
                                  return (
                                    <button
                                      key={pid}
                                      onClick={() => handleProductClick(pid)}
                                      className="flex items-center gap-1.5 text-left p-1 rounded hover:bg-white transition-colors"
                                    >
                                      {prod.imageUrl
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={prod.imageUrl} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0 border border-border/40" />
                                        : <div className="w-8 h-8 rounded flex-shrink-0" style={{ backgroundColor: pt.hex }} />
                                      }
                                      <div className="min-w-0">
                                        <p className="font-mono font-semibold text-primary text-2xs truncate leading-tight">{prod.code}</p>
                                        <p className="text-gray-400 text-2xs truncate leading-tight">{prod.name}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              {pt.productIds.length > 9 && (
                                <p className="text-2xs text-gray-400 mt-1">+{pt.productIds.length - 9} altri prodotti</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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
                          {selectedProduct.primaryPantone.code
                            ? `${selectedProduct.primaryPantone.code} — ${selectedProduct.primaryPantone.name}`
                            : selectedProduct.primaryPantone.name}
                        </span>
                        {selectedProduct.primaryPantone.inferred && isAdmin && (
                          <span className="px-1 py-0.5 rounded text-2xs font-medium bg-amber-100 text-amber-700 flex-shrink-0" title="Colore generato automaticamente — non assegnato da un operatore">
                            Auto
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setFocusMode(true); }}
                    className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                    title="Apri vista abbinamenti"
                  >
                    <Sparkles size={12} /> Vista abbinamenti
                  </button>
                  <button
                    onClick={() => setSelectedProductId(null)}
                    className="text-gray-400 hover:text-primary transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {suggestionsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" /> Calcolo abbinamenti…
                </div>
              ) : suggestionsData ? (
                <div className="space-y-6">

                  {/* Set per esposizione */}
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
                                    <div key={p.id} className="relative group">
                                      <button
                                        onClick={() => handleProductClick(p.id)}
                                        className={`w-full rounded-lg overflow-hidden border transition-all ${
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
                                      {pareteId && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); addToParete({ id: p.id, code: p.code, name: p.name, imageUrl: p.imageUrl, hex: p.primaryPantone?.hex_code }); }}
                                          disabled={addingProductId === p.id}
                                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-sm"
                                          title="Aggiungi alla parete"
                                        >
                                          {addingProductId === p.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                        </button>
                                      )}
                                    </div>
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

                  {/* Armonie cromatiche */}
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
                          <div key={p.id} className="flex items-center gap-1">
                            <button
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
                            {pareteId && (
                              <button
                                onClick={() => addToParete({ id: p.id, code: p.code, name: p.name, imageUrl: p.imageUrl, hex: p.primaryPantone?.hex_code })}
                                disabled={addingProductId === p.id}
                                className="w-6 h-6 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-primary hover:text-white hover:border-primary transition-colors flex-shrink-0"
                                title="Aggiungi alla parete"
                              >
                                {addingProductId === p.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                              </button>
                            )}
                          </div>
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
  onAddToParete,
  isAdding,
  isAdmin,
}: {
  product: WheelProduct;
  isSelected: boolean;
  onClick: () => void;
  onAddToParete?: () => void;
  isAdding?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="relative group/card">
      <button
        onClick={onClick}
        onDoubleClick={() => router.push(`/moda/product/${product.id}`)}
        className={`w-full text-left rounded-lg overflow-hidden border transition-all ${
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
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
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
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-2xs text-gray-400 truncate flex-1">
                {product.primaryPantone.code || product.primaryPantone.name}
              </p>
              {product.primaryPantone.inferred && isAdmin && (
                <span className="px-0.5 rounded text-2xs font-medium bg-amber-100 text-amber-700 flex-shrink-0" title="Colore generato automaticamente — non assegnato da un operatore">
                  Auto
                </span>
              )}
            </div>
          )}
        </div>
      </button>
      {onAddToParete && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddToParete(); }}
          disabled={isAdding}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-primary hover:text-white hover:border-primary transition-colors shadow-sm opacity-0 group-hover/card:opacity-100"
          title="Aggiungi alla parete"
        >
          {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        </button>
      )}
    </div>
  );
}
