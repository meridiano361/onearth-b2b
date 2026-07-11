'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, FileText, Film, Music2, File as FileIcon,
  Download, Play, X, ChevronLeft, ChevronRight, ImageIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doc {
  id: string; nome: string; tipo: string; cartella?: string | null;
  descrizione?: string | null; url: string; size: number;
  mimeType?: string | null; createdAt: string;
}
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
function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface AlbumFoto { id: string; url: string; didascalia: string | null; ordine: number; }
interface Album { id: string; nome: string; cartella?: string | null; descrizione: string | null; copertina: string | null; nFoto: number; createdAt: string; }
interface AlbumDetail { id: string; nome: string; descrizione: string | null; foto: AlbumFoto[]; }

type Tab = 'documenti' | 'foto' | 'video';

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
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-white font-medium text-sm">{album.nome}</p>
          <p className="text-white/50 text-xs mt-0.5">{idx + 1} / {foto.length}</p>
        </div>
        <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-12 min-h-0">
        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.didascalia ?? ''} className="max-w-full max-h-full object-contain select-none" draggable={false} />
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ChevronRight size={24} />
        </button>
      </div>
      {current.didascalia && (
        <p className="text-center text-white/70 text-sm px-4 py-2 flex-shrink-0">{current.didascalia}</p>
      )}
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

function AlbumCard({ album, loading, onClick }: { album: Album; loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white border border-border rounded-xl overflow-hidden text-left hover:shadow-md transition-all group w-full relative">
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
      {loading && (
        <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}

// ─── Doc card ─────────────────────────────────────────────────────────────────

function KindIcon({ kind, size = 16 }: { kind: MediaKind; size?: number }) {
  if (kind === 'video') return <Film size={size} className="text-blue-500" />;
  if (kind === 'audio') return <Music2 size={size} className="text-purple-500" />;
  if (kind === 'pdf')   return <FileText size={size} className="text-red-500" />;
  return <FileIcon size={size} className="text-gray-400" />;
}

function DocCard({ doc, onPreview }: { doc: Doc; onPreview: (doc: Doc) => void }) {
  const kind = getKind(doc.tipo);
  const canPlay = kind === 'video' || kind === 'audio';
  return (
    <div className="bg-white border border-border rounded-lg p-4 flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0"><KindIcon kind={kind} size={18} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{doc.nome}</p>
        <p className="text-2xs text-gray-400 mt-0.5">{doc.descrizione || doc.tipo} · {fmtSize(doc.size)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canPlay && (
          <button
            onClick={() => kind === 'video' ? window.open(doc.url, '_blank') : onPreview(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:opacity-80 transition-opacity"
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

function VideoCard({ doc }: { doc: Doc }) {
  return (
    <div className="bg-white border border-border rounded-lg p-4 flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0"><Film size={18} className="text-blue-500" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{doc.nome}</p>
        <p className="text-2xs text-gray-400 mt-0.5">{doc.descrizione || doc.tipo} · {fmtSize(doc.size)}</p>
      </div>
      <a
        href={doc.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded hover:opacity-80 transition-opacity flex-shrink-0"
      >
        <Play size={11} />Guarda
      </a>
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <Icon size={36} className="text-gray-200 mb-4" />
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
}

// ─── Cartella section wrapper ─────────────────────────────────────────────────

function CartellaSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</h2>
        <span className="flex-1 h-px bg-border" />
      </div>
      {children}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModaRisorse() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && ['documenti', 'foto', 'video'].includes(rawTab) ? rawTab : 'documenti';

  const [audioDoc, setAudioDoc] = useState<Doc | null>(null);
  const [openAlbum, setOpenAlbum] = useState<AlbumDetail | null>(null);
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);

  const { data: docsData, isLoading: docsLoading } = useQuery<{ data: Doc[] }>({
    queryKey: ['public-documents', 'moda'],
    queryFn: () => fetch('/api/documents?collezione=moda').then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: albumsData, isLoading: albumsLoading } = useQuery<{ data: Album[] }>({
    queryKey: ['public-albums', 'moda'],
    queryFn: () => fetch('/api/albums?collezione=moda').then((r) => r.json()),
    staleTime: 60_000,
  });

  const allDocs = docsData?.data ?? [];
  const allAlbums = albumsData?.data ?? [];

  const docItems  = allDocs.filter((d) => !['video', 'audio'].includes(getKind(d.tipo)) || getKind(d.tipo) === 'pdf');
  const videoItems = allDocs.filter((d) => getKind(d.tipo) === 'video');
  const audioItems = allDocs.filter((d) => getKind(d.tipo) === 'audio');
  const docsTabItems = allDocs.filter((d) => getKind(d.tipo) !== 'video' && getKind(d.tipo) !== 'audio');

  const isLoading = docsLoading || albumsLoading;

  function setTab(tab: Tab) {
    router.replace(`/moda/risorse?tab=${tab}`);
  }

  async function openAlbumDetail(album: Album) {
    setLoadingAlbumId(album.id);
    try {
      const res = await fetch(`/api/albums/${album.id}`);
      const { data } = await res.json();
      setOpenAlbum(data);
    } catch {
      setOpenAlbum({ id: album.id, nome: album.nome, descrizione: album.descrizione, foto: [] });
    } finally {
      setLoadingAlbumId(null);
    }
  }

  function renderCartelle<T extends { cartella?: string | null }>(
    items: T[],
    renderItems: (items: T[]) => React.ReactNode,
  ) {
    const cartelle = Array.from(new Set(items.map((i) => i.cartella).filter(Boolean) as string[])).sort();
    const hasCartelle = cartelle.length > 0;

    if (!hasCartelle) return renderItems(items);

    const senza = items.filter((i) => !i.cartella);
    return (
      <div className="space-y-8">
        {cartelle.map((c) => {
          const sub = items.filter((i) => i.cartella === c);
          if (sub.length === 0) return null;
          return <CartellaSection key={c} label={c}>{renderItems(sub)}</CartellaSection>;
        })}
        {senza.length > 0 && (
          <CartellaSection label="Generale">{renderItems(senza)}</CartellaSection>
        )}
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'documenti', label: 'Documenti' },
    { id: 'foto',      label: 'Foto' },
    { id: 'video',     label: 'Video' },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-primary pb-28">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <Link href="/moda" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors text-xs mb-8">
          <ArrowLeft size={13} /> MODA PE27
        </Link>
        <p className="text-2xs tracking-[0.2em] uppercase text-gray-400">collezione</p>
        <h1 className="font-display text-2xl font-light tracking-wide text-primary mt-0.5">Risorse e media</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-1 border-b border-border">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white rounded-lg animate-pulse border border-border" />
            ))}
          </div>
        ) : activeTab === 'documenti' ? (
          docsTabItems.length === 0 ? (
            <EmptyState icon={FileText} message="Nessun documento disponibile" />
          ) : (
            renderCartelle(docsTabItems, (items) => (
              <div className="space-y-2">
                {items.map((doc) => <DocCard key={doc.id} doc={doc} onPreview={(d) => setAudioDoc(d)} />)}
              </div>
            ))
          )
        ) : activeTab === 'foto' ? (
          allAlbums.length === 0 ? (
            <EmptyState icon={ImageIcon} message="Nessuna foto disponibile" />
          ) : (
            renderCartelle(allAlbums, (items) => (
              <div className="grid grid-cols-2 gap-3">
                {items.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    loading={loadingAlbumId === album.id}
                    onClick={() => openAlbumDetail(album)}
                  />
                ))}
              </div>
            ))
          )
        ) : (
          // video tab
          videoItems.length === 0 && audioItems.length === 0 ? (
            <EmptyState icon={Film} message="Nessun video disponibile" />
          ) : (
            <div className="space-y-8">
              {videoItems.length > 0 && renderCartelle(videoItems, (items) => (
                <div className="space-y-2">
                  {items.map((doc) => <VideoCard key={doc.id} doc={doc} />)}
                </div>
              ))}
              {audioItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Music2 size={12} className="text-purple-500" />
                    <span className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">Audio e podcast</span>
                  </div>
                  {renderCartelle(audioItems, (items) => (
                    <div className="space-y-2">
                      {items.map((doc) => <DocCard key={doc.id} doc={doc} onPreview={(d) => setAudioDoc(d)} />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {audioDoc && <AudioModal url={audioDoc.url} nome={audioDoc.nome} onClose={() => setAudioDoc(null)} />}
      {openAlbum && <Lightbox album={openAlbum} onClose={() => setOpenAlbum(null)} />}
    </div>
  );
}
