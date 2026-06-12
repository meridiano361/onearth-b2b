'use client';

import { useMemo, useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Globe, Mic, ShoppingBag, Check, Heart, Film, X, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODA_EMAIL = 'e.mazzolari@meridiano361.it';
import { useCartStore } from '@/store/cartStore';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductImage } from '@/components/ui/ProductImage';
import { useSettings } from '@/contexts/SettingsContext';
import type { Product } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FONT_FAMILIES: Record<string, string> = {
  system: 'Nunito, system-ui, sans-serif',
  nova: '"Cormorant Garamond", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  montserrat: 'Montserrat, "Helvetica Neue", sans-serif',
  lato: 'Lato, "Helvetica Neue", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  futura: '"Futura", "Trebuchet MS", sans-serif',
};

const FONT_WEIGHTS: Record<string, number> = {
  light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
};

const SOCIAL_SVGS: Record<string, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z"/>
    </svg>
  ),
};

function SpotlightCard({ product }: { product: Product }) {
  const { addItem, getItemQuantity } = useCartStore();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const { card: cs } = useSettings();
  const [justAdded, setJustAdded] = useState(false);

  const cartQty = getItemQuantity(product.id);
  const inCart = cartQty > 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.lotSize || 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex-none w-32 sm:w-36 flex flex-col bg-white rounded-lg border border-border overflow-hidden">
      <Link href={`/catalog/${product.id}`} className="block relative group">
        <div className="h-32 w-32 sm:h-36 sm:w-36 relative bg-cream overflow-hidden">
          <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
            className={cn(
              'absolute top-1.5 left-1.5 bg-white/80 backdrop-blur-sm rounded-full p-1 transition-all duration-150',
              isFavorited(product.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Heart size={10} className={isFavorited(product.id) ? 'fill-[#374151] text-[#374151]' : 'text-gray-400'} />
          </button>
          {inCart && (
            <div className="absolute top-1.5 right-1.5 bg-accent rounded-full p-0.5">
              <Check size={8} className="text-white" />
            </div>
          )}
          {cs.badgeNuovo && product.collezione?.toUpperCase() === 'CA27' && (
            <div className="absolute bottom-1.5 left-1.5 bg-black text-white text-2xs font-bold px-1.5 py-0.5 rounded-full tracking-wide leading-none">
              NUOVO
            </div>
          )}
        </div>
      </Link>

      <div className="p-2 flex flex-col flex-1">
        <Link href={`/catalog/${product.id}`}>
          <p
            className="text-xs text-primary mb-2"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '2.5rem',
              maxHeight: '2.5rem',
              lineHeight: '1.25rem',
            }}
          >
            {product.name}
          </p>
        </Link>
        <button
          onClick={handleAdd}
          className={cn(
            'w-full py-1.5 text-2xs font-medium rounded transition-all duration-150 flex items-center justify-center gap-1',
            justAdded
              ? 'bg-accent/20 text-accent'
              : 'bg-primary text-white hover:bg-warm-darker active:scale-95'
          )}
        >
          {justAdded ? <><Check size={10} /> Aggiunto</> : <><ShoppingBag size={10} /> Aggiungi</>}
        </button>
      </div>
    </div>
  );
}

function MessageBox({ cs }: { cs: ReturnType<typeof useSettings>['comunicazione'] }) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `comunicazione-dismissed-${cs.titolo}-${cs.testo}`.slice(0, 80);

  useEffect(() => {
    if (cs.soloUnaVolta && sessionStorage.getItem(storageKey) === '1') {
      setDismissed(true);
    }
  }, [storageKey, cs.soloUnaVolta]);

  if (dismissed) return null;
  if (!cs.attivo || (!cs.titolo && !cs.testo)) return null;
  if (cs.scadenza && Date.now() > new Date(cs.scadenza).getTime()) return null;

  function handleDismiss() {
    setDismissed(true);
    if (cs.soloUnaVolta) sessionStorage.setItem(storageKey, '1');
  }

  const fontFamily = cs.font === 'serif' ? 'Georgia, serif' : cs.font === 'mono' ? 'monospace' : undefined;
  const borderWidth = cs.bordo === 'none' ? 0 : cs.bordo === 'thin' ? 1 : cs.bordo === 'medium' ? 2 : 3;
  const boxShadow = cs.ombra === 'sm' ? '0 1px 3px rgba(0,0,0,0.12)' : cs.ombra === 'md' ? '0 4px 12px rgba(0,0,0,0.15)' : cs.ombra === 'lg' ? '0 8px 24px rgba(0,0,0,0.18)' : undefined;
  const maxWidth = cs.larghezza === 'sm' ? 320 : cs.larghezza === 'md' ? 480 : cs.larghezza === 'lg' ? 640 : undefined;

  const boxStyle: CSSProperties = {
    backgroundColor: cs.sfondo,
    borderRadius: cs.raggio,
    borderWidth: borderWidth || undefined,
    borderStyle: borderWidth > 0 ? 'solid' : undefined,
    borderColor: cs.coloreBordo,
    padding: cs.padding,
    boxShadow,
    maxWidth,
    textAlign: cs.allineamento as CSSProperties['textAlign'],
    position: 'relative',
    fontFamily,
  };

  const titleStyle: CSSProperties = {
    fontSize: cs.fontSizeTitolo,
    fontWeight: cs.pesoTitolo as CSSProperties['fontWeight'],
    fontStyle: cs.corsivoTitolo ? 'italic' : undefined,
    textTransform: cs.trasformazione as CSSProperties['textTransform'],
    color: cs.coloreTitolo,
    margin: 0,
  };

  const textStyle: CSSProperties = {
    fontSize: cs.fontSizeTesto,
    fontWeight: cs.pesoTesto as CSSProperties['fontWeight'],
    fontStyle: cs.corsivoTesto ? 'italic' : undefined,
    color: cs.coloreTesto,
    margin: 0,
  };

  const icon = cs.mostraIcona && cs.icona ? (
    <span style={{ fontSize: cs.fontSizeTitolo + 2, lineHeight: 1 }}>{cs.icona}</span>
  ) : null;

  const titleEl = cs.titolo ? <p style={titleStyle}>{cs.titolo}</p> : null;
  const textEl  = cs.testo  ? <p style={textStyle}>{cs.testo}</p>   : null;

  return (
    <div style={boxStyle}>
      {cs.chiudibile && (
        <button
          onClick={handleDismiss}
          style={{ position: 'absolute', top: 10, right: 10, color: cs.coloreTesto, opacity: 0.5 }}
          aria-label="Chiudi"
        >
          <X size={14} />
        </button>
      )}
      {cs.posizioneIcona === 'before' && icon ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {icon}
          <div style={{ flex: 1 }}>
            {titleEl}
            {titleEl && textEl && <div style={{ height: 4 }} />}
            {textEl}
          </div>
        </div>
      ) : (
        <div>
          {titleEl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: cs.allineamento === 'right' ? 'flex-end' : cs.allineamento === 'center' ? 'center' : 'flex-start' }}>
              {titleEl}
              {cs.posizioneIcona === 'after' && icon}
            </div>
          )}
          {titleEl && textEl && <div style={{ height: 4 }} />}
          {textEl}
        </div>
      )}
    </div>
  );
}

type NotificationItem = {
  id: string;
  titolo: string;
  testo: string;
  icona: string;
  coloreSfondo: string;
  coloreTesto: string;
  linkUrl?: string | null;
  linkTesto?: string | null;
};

function NotificationPopup({ notification, onClose }: { notification: NotificationItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  async function handleClose() {
    onClose();
    try {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
    } catch {}
  }

  return (
    <div
      className="fixed left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 rounded-xl shadow-xl overflow-hidden"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)',
        backgroundColor: notification.coloreSfondo,
        color: notification.coloreTesto,
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {notification.icona && (
            <span className="text-2xl flex-shrink-0 leading-none">{notification.icona}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{notification.titolo}</p>
            {notification.testo && (
              <p className="text-sm mt-1 leading-relaxed break-words whitespace-normal opacity-90">
                {notification.testo}
              </p>
            )}
            {notification.linkUrl && (
              <a
                href={notification.linkUrl}
                onClick={handleClose}
                className="inline-block mt-2 text-sm font-medium underline underline-offset-2"
                style={{ color: notification.coloreTesto }}
              >
                {notification.linkTesto || 'Scopri di più'}
              </a>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -mt-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Chiudi"
            style={{ color: notification.coloreTesto }}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerHome() {
  const th = useTranslations('home');
  const { home: hs, social: ss, comunicazione: cs, comunicazione2: cs2 } = useSettings();
  const { data: session } = useSession();
  const isModaUser = session?.user?.email === MODA_EMAIL;

  const [popupDismissed, setPopupDismissed] = useState(false);

  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const popupNotification = (() => {
    if (popupDismissed || !notifications?.length) return null;
    const first = notifications[0];
    const key = `notif-popup-${first.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key) === '1') return null;
    return first;
  })();

  function handlePopupClose() {
    setPopupDismissed(true);
    if (popupNotification) {
      sessionStorage.setItem(`notif-popup-${popupNotification.id}`, '1');
    }
  }

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['home-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?active=true&limit=500', { cache: 'no-store' });
      if (!res.ok) return [] as Product[];
      return (await res.json()).data as Product[];
    },
    staleTime: 0,
    gcTime: 0,
  });

  const spotlightProducts = useMemo(() => {
    if (!productsData?.length) return [];
    const filtered = hs.scrollCollezione
      ? productsData.filter((p) => p.collezione === hs.scrollCollezione)
      : productsData;
    return shuffle(filtered.length > 0 ? filtered : productsData).slice(0, hs.scrollNumero);
  }, [productsData, hs.scrollCollezione, hs.scrollNumero]);

  const titolo1Style: CSSProperties = {
    fontFamily: FONT_FAMILIES[hs.titolo1Font] ?? FONT_FAMILIES.system,
    fontWeight: FONT_WEIGHTS[hs.titolo1Weight] ?? 300,
    fontSize: hs.titolo1Size,
    lineHeight: hs.titolo1LineHeight,
    letterSpacing: `${hs.titolo1LetterSpacing}px`,
    textTransform: hs.titolo1Transform as CSSProperties['textTransform'],
    color: hs.titolo1Colore,
  };
  const titolo2Style: CSSProperties = {
    fontFamily: FONT_FAMILIES[hs.titolo2Font] ?? FONT_FAMILIES.system,
    fontWeight: FONT_WEIGHTS[hs.titolo2Weight] ?? 300,
    fontSize: hs.titolo2Size,
    lineHeight: hs.titolo2LineHeight,
    letterSpacing: `${hs.titolo2LetterSpacing}px`,
    textTransform: hs.titolo2Transform as CSSProperties['textTransform'],
    color: hs.titolo2Colore,
  };

  const commBox = <MessageBox cs={cs} />;
  const isBannerTop    = cs.posizione === 'banner-top';
  const isBannerBottom = cs.posizione === 'banner-bottom';

  const commBox2 = <MessageBox cs={cs2} />;
  const isBannerTop2    = cs2.posizione === 'banner-top';
  const isBannerBottom2 = cs2.posizione === 'banner-bottom';

  return (
    <div className="min-h-screen bg-cream">

      {/* ── Comunicazione: banner fisso in alto ─────────────── */}
      {isBannerTop && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-safe pb-2 flex justify-center">
          {commBox}
        </div>
      )}
      {isBannerTop2 && (
        <div className="fixed top-0 left-0 right-0 z-49 px-4 pt-safe pb-2 flex justify-center" style={{ top: isBannerTop ? 48 : 0 }}>
          {commBox2}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-10" style={isBannerTop ? { paddingTop: 60 } : undefined}>

        {/* ── Comunicazione: in cima ───────────────────────────── */}
        {cs.posizione === 'top' && <section>{commBox}</section>}
        {cs2.posizione === 'top' && <section>{commBox2}</section>}

        {/* ── Selettore collezione (solo per e.mazzolari@meridiano361.it) ── */}
        {isModaUser && (
          <section className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-primary bg-primary text-white cursor-default">
              <Home size={16} className="flex-shrink-0 opacity-80" />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-none">Casa 27</p>
                <p className="text-2xs opacity-60 mt-0.5">In corso</p>
              </div>
            </div>
            <Link
              href="/moda"
              className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-border bg-white hover:border-primary/50 transition-colors group"
            >
              <Sparkles size={16} className="flex-shrink-0 text-gray-400 group-hover:text-primary transition-colors" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary leading-none">Moda PE27</p>
                <p className="text-2xs text-gray-400 mt-0.5">Collezione Moda</p>
              </div>
            </Link>
          </section>
        )}

        {/* ── Top CTA ─────────────────────────────────────────── */}
        <div className="flex justify-center">
          <Link
            href="/catalog/products"
            className="bg-black text-white rounded-xl px-8 py-3 text-sm font-semibold hover:bg-gray-800 transition-all duration-150"
          >
            {hs.cta}
          </Link>
        </div>

        {/* ── Comunicazione: dopo CTA ──────────────────────────── */}
        {cs.posizione === 'after-cta' && <section>{commBox}</section>}
        {cs2.posizione === 'after-cta' && <section>{commBox2}</section>}

        {/* ── Scopri la collezione ─────────────────────────────── */}
        {hs.scrollAttivo && (
        <section>
          <div className="mb-4 text-center">
            <p style={titolo1Style}>{hs.titolo1}</p>
            <p style={{ ...titolo2Style, marginTop: '0.25rem' }}>{hs.titolo2}</p>
          </div>

          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {Array.from({ length: hs.scrollNumero }).map((_, i) => (
                <div key={i} className="flex-none w-36 h-52 bg-white rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
              {spotlightProducts.map((product) => (
                <div key={product.id} className="snap-start">
                  <SpotlightCard product={product} />
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {/* ── Foto editoriale ──────────────────────────────────── */}
        {hs.editorialAttivo && hs.editorialUrl && (
          <section>
            <div className="relative rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hs.editorialUrl}
                alt={hs.editorialCaption || 'Editorial'}
                className="w-full h-52 sm:h-72 object-cover"
              />
              {hs.editorialCaption && (
                <div className="absolute bottom-0 left-0 right-0 px-3 py-3 sm:px-5 sm:py-4 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs sm:text-sm font-light tracking-wide">{hs.editorialCaption}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Comunicazione: dopo prodotti ─────────────────────── */}
        {cs.posizione === 'after-products' && <section>{commBox}</section>}
        {cs2.posizione === 'after-products' && <section>{commBox2}</section>}

        {/* ── Risorse e media ──────────────────────────────────── */}
        <section>
          <Link
            href="/catalog/risorse"
            className="flex items-center gap-3 bg-white border border-gray-200 shadow-sm rounded-xl px-5 py-4 hover:border-primary/30 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
              <Film size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Risorse e media</p>
              <p className="text-xs text-gray-400">Documenti PDF, foto, video e altro</p>
            </div>
            <span className="ml-auto text-gray-300 group-hover:text-primary transition-colors">›</span>
          </Link>
        </section>

        {/* ── Social links ───────────────────────────────────── */}
        <section>
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-5 py-4">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {ss.ordine
                .filter((key) => ss.items[key]?.visibile)
                .map((key) => {
                  const url = ss.items[key].url;
                  if (key === 'website') {
                    let domain = url;
                    try { domain = new URL(url).hostname.replace('www.', ''); } catch {}
                    return (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 text-sm text-black hover:text-gray-600 transition-colors whitespace-nowrap">
                        <Globe size={16} />
                        {domain}
                      </a>
                    );
                  }
                  if (key === 'podcast') {
                    return (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
                        <Mic size={16} />
                        Podcast MATERIA
                      </a>
                    );
                  }
                  const svg = SOCIAL_SVGS[key];
                  if (!svg) return null;
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                       className="text-black hover:text-gray-600 transition-colors" aria-label={key}>
                      {svg}
                    </a>
                  );
                })}
            </div>
          </div>
        </section>

        {/* ── Comunicazione: in fondo ──────────────────────────── */}
        {cs.posizione === 'bottom' && <section>{commBox}</section>}
        {cs2.posizione === 'bottom' && <section>{commBox2}</section>}

      </div>

      {/* ── Comunicazione: banner fisso in basso ────────────── */}
      {isBannerBottom && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2 flex justify-center">
          {commBox}
        </div>
      )}
      {isBannerBottom2 && (
        <div className="fixed left-0 right-0 z-49 px-4 pb-safe pt-2 flex justify-center" style={{ bottom: isBannerBottom ? 48 : 0 }}>
          {commBox2}
        </div>
      )}

      {/* ── Notifica popup ──────────────────────────────────── */}
      {popupNotification && (
        <NotificationPopup notification={popupNotification} onClose={handlePopupClose} />
      )}

    </div>
  );
}
