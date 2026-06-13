'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Film, Globe, Mic, ChevronRight } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { canAccessModa } from '@/lib/modaAccess';

// Inline social SVGs — kept self-contained so this hidden component is fully independent
const SOCIAL_SVG: Record<string, ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z"/>
    </svg>
  ),
};

function RisorseRow({ href, empty }: { href: string; empty?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-gray-50 border-t border-gray-100 transition-colors group"
    >
      <Film size={13} className={empty ? 'text-gray-300 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${empty ? 'text-gray-400' : 'text-gray-700'}`}>
          Risorse e media
        </p>
        <p className="text-2xs text-gray-400 truncate">
          {empty ? 'Nessuna risorsa disponibile' : 'Documenti, foto, video'}
        </p>
      </div>
      <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
    </Link>
  );
}

export default function AdminExperimentalLanding() {
  const { data: session } = useSession();
  const { home: hs, social: ss } = useSettings();

  // Client-side safety guard — server already verified, this is defence-in-depth
  if (!canAccessModa(session?.user?.email)) return null;

  const hasEditorialImage = hs.editorialAttivo && hs.editorialUrl;
  const visibleSocial = ss.ordine.filter((k) => ss.items[k]?.visibile);

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">

        {/* ── Collection cards — 2-column grid ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* ── Moda PE27 ── */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <Link href="/moda" className="group block aspect-square relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#0d0d1a] to-[#000000]" />
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                <span
                  className="text-[5rem] font-extralight text-white/[0.04] leading-none tracking-tighter select-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  27
                </span>
              </div>
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255,255,255,1) 24px, rgba(255,255,255,1) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(255,255,255,1) 24px, rgba(255,255,255,1) 25px)',
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                <p className="text-2xs text-white/40 uppercase tracking-[0.2em]">PE 27</p>
                <p className="text-sm font-light text-white leading-tight mt-0.5">Moda</p>
                <div className="mt-1.5 flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors duration-200">
                  <span className="text-2xs">Esplora</span>
                  <ChevronRight size={11} />
                </div>
              </div>
            </Link>
            <RisorseRow href="/moda/risorse" empty />
          </div>

          {/* ── Casa 2027 ── */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <Link href="/catalog/products" className="group block aspect-square relative overflow-hidden">
              {hasEditorialImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hs.editorialUrl}
                  alt="Casa 2027"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#f0e8de] via-[#e4d5c4] to-[#cdb99e]" />
              )}
              <div className={`absolute inset-0 bg-gradient-to-t ${hasEditorialImage ? 'from-black/70 via-black/10 to-transparent' : 'from-black/30 via-transparent to-transparent'}`} />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className={`text-2xs uppercase tracking-[0.2em] ${hasEditorialImage ? 'text-white/50' : 'text-gray-500'}`}>CA 27</p>
                <p className={`text-sm font-light leading-tight mt-0.5 ${hasEditorialImage ? 'text-white' : 'text-primary'}`}>Casa</p>
                <div className={`mt-1.5 flex items-center gap-1 transition-colors duration-200 ${hasEditorialImage ? 'text-white/30 group-hover:text-white/60' : 'text-gray-400 group-hover:text-primary'}`}>
                  <span className="text-2xs">Esplora</span>
                  <ChevronRight size={11} />
                </div>
              </div>
            </Link>
            <RisorseRow href="/catalog/risorse" />
          </div>

        </div>

        {/* ── Social ── */}
        {visibleSocial.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-5 py-4">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {visibleSocial.map((key) => {
                const url = ss.items[key]?.url;
                if (!url) return null;

                if (key === 'website') {
                  let domain = url;
                  try { domain = new URL(url).hostname.replace('www.', ''); } catch {}
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1.5 text-sm text-black hover:text-gray-600 transition-colors">
                      <Globe size={15} />
                      {domain}
                    </a>
                  );
                }
                if (key === 'podcast') {
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-black bg-white border border-black rounded-lg hover:bg-gray-50 transition-colors">
                      <Mic size={14} />
                      Podcast
                    </a>
                  );
                }
                const svg = SOCIAL_SVG[key];
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
        )}

      </div>
    </div>
  );
}
