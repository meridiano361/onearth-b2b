'use client';

import { useState } from 'react';
import { FileText, Film, Music2, File, Download, Play, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Doc {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  size: number;
  mimeType?: string | null;
  createdAt: string;
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

function KindIcon({ kind, size = 16 }: { kind: MediaKind; size?: number }) {
  if (kind === 'video') return <Film size={size} className="text-blue-500" />;
  if (kind === 'audio') return <Music2 size={size} className="text-purple-500" />;
  if (kind === 'pdf')   return <FileText size={size} className="text-red-500" />;
  return <File size={size} className="text-gray-400" />;
}

function VideoModal({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-black rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium text-white truncate pr-4">{nome}</p>
          <button onClick={onClose} className="text-white/60 hover:text-white flex-shrink-0">
            <X size={18} />
          </button>
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
          <button onClick={onClose} className="text-gray-400 hover:text-primary flex-shrink-0">
            <X size={18} />
          </button>
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

  return (
    <div className="bg-white border border-border rounded-lg p-4 flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">
        <KindIcon kind={kind} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{doc.nome}</p>
        <p className="text-2xs text-gray-400 mt-0.5">{doc.tipo} · {fmtSize(doc.size)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canPlay && (
          <button
            onClick={() => onPreview(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 rounded hover:bg-accent/5 transition-colors"
          >
            <Play size={11} />
            {kind === 'video' ? 'Guarda' : 'Ascolta'}
          </button>
        )}
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-border rounded hover:bg-cream transition-colors"
        >
          <Download size={11} />
          Scarica
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

export default function RisorsePage() {
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);

  const { data, isLoading } = useQuery<{ data: Doc[] }>({
    queryKey: ['public-documents'],
    queryFn: () => fetch('/api/documents').then((r) => r.json()),
    staleTime: 60_000,
  });

  const docs = data?.data ?? [];

  const previewKind = previewDoc ? getKind(previewDoc.tipo) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Risorse</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          Risorse e media
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-lg animate-pulse border border-border" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna risorsa disponibile</p>
        </div>
      ) : (
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
                <div className="space-y-2">
                  {items.map((doc) => (
                    <DocCard key={doc.id} doc={doc} onPreview={setPreviewDoc} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {previewDoc && previewKind === 'video' && (
        <VideoModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />
      )}
      {previewDoc && previewKind === 'audio' && (
        <AudioModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
