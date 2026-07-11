'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Film, Music2, File, Download, Play, X, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// ─── Document types ───────────────────────────────────────────────────────────

interface Doc { id: string; nome: string; tipo: string; cartella?: string | null; descrizione?: string | null; url: string; size: number; mimeType?: string | null; createdAt: string; }
type MediaKind = 'pdf' | 'video' | 'audio' | 'other';
const VIDEO_TIPI = ['Video presentazione', 'Video tutorial'];
const AUDIO_TIPI = ['Audio / Podcast'];
const PDF_TIPI   = ['Condizioni Commerciali', 'Catalogo PDF'];
function getKind(tipo: string): MediaKind {
  if (PDF_TIPI.includes(tipo))   return 'pdf';
  if (VIDEO_TIPI.includes(tipo)) return 'video';
  if (AUDIO_TIPI.includes(tipo)) return 'audio';
  return 'other';
}
function fmtSize(bytes: number) { if (bytes < 1024*1024) return (bytes/1024).toFixed(0)+' KB'; return (bytes/(1024*1024)).toFixed(1)+' MB'; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }); }

function KindIcon({ kind, size = 16 }: { kind: MediaKind; size?: number }) {
  if (kind === 'video') return <Film size={size} className="text-blue-500" />;
  if (kind === 'audio') return <Music2 size={size} className="text-purple-500" />;
  if (kind === 'pdf')   return <FileText size={size} className="text-red-500" />;
  return <File size={size} className="text-gray-400" />;
}

// ─── Album types ──────────────────────────────────────────────────────────────

interface AlbumFoto { id: string; url: string; didascalia: string | null; ordine: number; }
interface Album { id: string; nome: string; descrizione: string | null; copertina: string | null; nFoto: number; createdAt: string; }
interface AlbumDetail { id: string; nome: string; descrizione: string | null; foto: AlbumFoto[]; }

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ album, onClose }: { album: AlbumDetail; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const foto = album.foto;
  const current = foto[idx];

  const prev = useCallback(() => setIdx((i) => (i - 1 + foto.length) % foto.length), [foto.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % foto.length), [foto.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onClose]);

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-white font-medium text-sm">{album.nome}</p>
          <p className="text-white/50 text-xs mt-0.5">{idx + 1} / {foto.length}</p>
        </div>
        <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
          <X size={22} />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative px-12 min-h-0">
        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full">
          <ChevronLeft size={24} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.didascalia ?? ''}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Caption */}
      {current.didascalia && (
        <p className="text-center text-white/70 text-sm px-4 py-2 flex-shrink-0">{current.didascalia}</p>
      )}

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 flex-shrink-0 scrollbar-hide">
        {foto.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setIdx(i)}
            className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${i === idx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-75'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Album card ───────────────────────────────────────────────────────────────

function AlbumCard({ album, onClick }: { album: Album; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-border rounded-xl overflow-hidden text-left hover:shadow-md transition-all group w-full"
    >
      <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
        {album.copertina ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.copertina} alt={album.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-gray-200" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-primary truncate">{album.nome}</p>
        <p className="text-2xs text-gray-400 mt-0.5">{album.nFoto} foto · {fmtDate(album.createdAt)}</p>
        {album.descrizione && <p className="text-2xs text-gray-500 mt-1 line-clamp-2">{album.descrizione}</p>}
      </div>
    </button>
  );
}

// ─── Doc & media components ───────────────────────────────────────────────────

function VideoModal({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-black rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium text-white truncate pr-4">{nome}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white flex-shrink-0"><X size={18} /></button>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls autoPlay className="w-full max-h-[70vh] bg-black" src={url} />
      </div>
    </div>
  );
}

function AudioModal({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-primary truncate pr-4">{nome}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-primary flex-shrink-0"><X size={18} /></button>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls autoPlay className="w-full" src={url} />
      </div>
    </div>
  );
}

function DocCard({ doc, onPreview }: { doc: Doc; onPreview: (doc: Doc) => void }) {
  const kind = getKind(doc.tipo);
  const canPlay = kind === 'video' || kind === 'audio';
  const subtitle = doc.descrizione || doc.tipo;
  return (
    <div className="bg-white border border-border rounded-lg p-4 flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0"><KindIcon kind={kind} size={18} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{doc.nome}</p>
        <p className="text-2xs text-gray-400 mt-0.5">{subtitle} · {fmtSize(doc.size)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canPlay && (
          <button
            onClick={() => kind === 'video' ? window.open(doc.url, '_blank') : onPreview(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:bg-warm-darker transition-colors"
          >
            <Play size={11} />{kind === 'video' ? 'Guarda' : 'Ascolta'}
          </button>
        )}
        <a href={doc.url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-border rounded hover:bg-cream transition-colors">
          <Download size={11} />Scarica
        </a>
      </div>
    </div>
  );
}

type Section = { label: string; kinds: MediaKind[] };
const SECTIONS: Section[] = [
  { label: 'Video', kinds: ['video'] },
  { label: 'Audio e podcast', kinds: ['audio'] },
  { label: 'Documenti PDF', kinds: ['pdf', 'other'] },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RisorsePage() {
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [openAlbum, setOpenAlbum] = useState<AlbumDetail | null>(null);
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);

  const { data: docsData, isLoading: docsLoading } = useQuery<{ data: Doc[] }>({
    queryKey: ['public-documents'],
    queryFn: () => fetch('/api/documents').then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: albumsData, isLoading: albumsLoading } = useQuery<{ data: Album[] }>({
    queryKey: ['public-albums'],
    queryFn: () => fetch('/api/albums').then((r) => r.json()),
    staleTime: 60_000,
  });

  const docs = docsData?.data ?? [];
  const albums = albumsData?.data ?? [];

  async function openAlbumDetail(album: Album) {
    setLoadingAlbumId(album.id);
    try {
      const res = await fetch(`/api/albums/${album.id}`);
      const { data } = await res.json();
      setOpenAlbum(data);
    } catch {
      // fallback: open with no photos
      setOpenAlbum({ id: album.id, nome: album.nome, descrizione: album.descrizione, foto: [] });
    } finally {
      setLoadingAlbumId(null);
    }
  }

  const previewKind = previewDoc ? getKind(previewDoc.tipo) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Risorse</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">Risorse e media</h1>
      </div>

      {/* ── Album fotografici ── */}
      {(albumsLoading || albums.length > 0) && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon size={14} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Album fotografici</h2>
          </div>
          {albumsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="aspect-[4/3] bg-white rounded-xl animate-pulse border border-border" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {albums.map((album) => (
                <div key={album.id} className="relative">
                  <AlbumCard album={album} onClick={() => openAlbumDetail(album)} />
                  {loadingAlbumId === album.id && (
                    <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                      <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Documenti e media ── */}
      {docsLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-white rounded-lg animate-pulse border border-border" />)}</div>
      ) : docs.length === 0 && albums.length === 0 && !albumsLoading ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna risorsa disponibile</p>
        </div>
      ) : docs.length > 0 ? (() => {
        const cartelle = Array.from(new Set(docs.map((d) => d.cartella).filter(Boolean) as string[])).sort();
        const senzaCartella = docs.filter((d) => !d.cartella);
        const hasCartelle = cartelle.length > 0;

        function DocsByKind({ items }: { items: Doc[] }) {
          return (
            <div className="space-y-6">
              {SECTIONS.map(({ label, kinds }) => {
                const sub = items.filter((d) => kinds.includes(getKind(d.tipo)));
                if (sub.length === 0) return null;
                return (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <KindIcon kind={kinds[0]} size={12} />
                      <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="space-y-2">{sub.map((doc) => <DocCard key={doc.id} doc={doc} onPreview={setPreviewDoc} />)}</div>
                  </div>
                );
              })}
            </div>
          );
        }

        if (!hasCartelle) {
          return (
            <div className="space-y-8">
              {SECTIONS.map(({ label, kinds }) => {
                const items = docs.filter((d) => kinds.includes(getKind(d.tipo)));
                if (items.length === 0) return null;
                return (
                  <section key={label}>
                    <div className="flex items-center gap-2 mb-3">
                      <KindIcon kind={kinds[0]} size={14} />
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</h2>
                    </div>
                    <div className="space-y-2">{items.map((doc) => <DocCard key={doc.id} doc={doc} onPreview={setPreviewDoc} />)}</div>
                  </section>
                );
              })}
            </div>
          );
        }

        return (
          <div className="space-y-10">
            {cartelle.map((c) => {
              const items = docs.filter((d) => d.cartella === c);
              if (items.length === 0) return null;
              return (
                <section key={c}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{c}</h2>
                    <span className="flex-1 h-px bg-border" />
                  </div>
                  <DocsByKind items={items} />
                </section>
              );
            })}
            {senzaCartella.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Generale</h2>
                  <span className="flex-1 h-px bg-border" />
                </div>
                <DocsByKind items={senzaCartella} />
              </section>
            )}
          </div>
        );
      })() : null}

      {/* Modals */}
      {previewDoc && previewKind === 'video' && <VideoModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />}
      {previewDoc && previewKind === 'audio' && <AudioModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />}
      {openAlbum && <Lightbox album={openAlbum} onClose={() => setOpenAlbum(null)} />}
    </div>
  );
}
