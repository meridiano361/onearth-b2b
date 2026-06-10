'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Film, Music2, File, Plus, Trash2, RefreshCw, Upload, Play, X, ImageIcon, GripVertical, Eye, EyeOff } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ─── DOCUMENTI types & helpers ────────────────────────────────────────────────

type MediaKind = 'pdf' | 'video' | 'audio' | 'other';
type TipoConfig = { bucket: 'documents' | 'media'; maxMB: number; accept: string; fileLabel: string; kind: MediaKind };
const PLAN_MAX_MB = 50;
const TIPO_CONFIG: Record<string, TipoConfig> = {
  'Condizioni Commerciali': { bucket: 'documents', maxMB: 20, accept: '.pdf,application/pdf', fileLabel: 'FILE PDF (MAX 20MB)', kind: 'pdf' },
  'Catalogo PDF':           { bucket: 'documents', maxMB: 20, accept: '.pdf,application/pdf', fileLabel: 'FILE PDF (MAX 20MB)', kind: 'pdf' },
  'Video presentazione':    { bucket: 'media', maxMB: PLAN_MAX_MB, accept: '.mp4,.mov,.avi,.webm,video/*', fileLabel: `FILE VIDEO (MAX ${PLAN_MAX_MB}MB)`, kind: 'video' },
  'Video tutorial':         { bucket: 'media', maxMB: PLAN_MAX_MB, accept: '.mp4,.mov,.avi,.webm,video/*', fileLabel: `FILE VIDEO (MAX ${PLAN_MAX_MB}MB)`, kind: 'video' },
  'Audio / Podcast':        { bucket: 'media', maxMB: PLAN_MAX_MB, accept: '.mp3,.wav,.m4a,.ogg,audio/*', fileLabel: `FILE AUDIO (MAX ${PLAN_MAX_MB}MB)`, kind: 'audio' },
  'Altro':                  { bucket: 'documents', maxMB: PLAN_MAX_MB, accept: '', fileLabel: `TUTTI I FORMATI (MAX ${PLAN_MAX_MB}MB)`, kind: 'other' },
};
const TIPI = Object.keys(TIPO_CONFIG);
function getTipoConfig(tipo: string): TipoConfig { return TIPO_CONFIG[tipo] ?? TIPO_CONFIG['Altro']; }

interface Doc { id: string; nome: string; tipo: string; descrizione?: string | null; url: string; size: number; mimeType?: string | null; visibile: boolean; createdAt: string; }
interface Album { id: string; nome: string; descrizione: string | null; copertina: string | null; visibile: boolean; nFoto: number; ordine: number; createdAt: string; }
interface UploadProgress { percent: number; loaded: number; total: number }

function fmtSize(bytes: number) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024*1024) return (bytes/1024).toFixed(0)+' KB'; return (bytes/(1024*1024)).toFixed(1)+' MB'; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }

function DocIcon({ tipo }: { tipo: string }) {
  const kind = getTipoConfig(tipo).kind;
  if (kind === 'video') return <Film size={13} className="text-blue-400 flex-shrink-0" />;
  if (kind === 'audio') return <Music2 size={13} className="text-purple-400 flex-shrink-0" />;
  if (kind === 'pdf')   return <FileText size={13} className="text-red-400 flex-shrink-0" />;
  return <File size={13} className="text-gray-400 flex-shrink-0" />;
}

function uploadWithProgress(url: string, file: File, mimeType: string, onProgress: (p: UploadProgress) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) onProgress({ percent: Math.round((e.loaded/e.total)*100), loaded: e.loaded, total: e.total }); });
    xhr.addEventListener('load', () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload fallito (${xhr.status})`)); });
    xhr.addEventListener('error', () => reject(new Error('Errore di rete')));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.send(file);
  });
}

async function uploadToSupabase(file: File, tipo: string, onProgress: (p: UploadProgress) => void): Promise<{ url: string; storageKey: string }> {
  const ensureRes = await fetch('/api/admin/documents/ensure-buckets', { method: 'POST' });
  if (!ensureRes.ok) { const err = await ensureRes.json().catch(() => ({})); throw new Error(err.error || 'Impossibile creare i bucket'); }
  const res = await fetch('/api/admin/documents/signed-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, size: file.size, tipo }) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Impossibile ottenere URL firmato'); }
  const { signedUrl, storageKey, publicUrl } = await res.json();
  await uploadWithProgress(signedUrl, file, file.type || 'application/octet-stream', onProgress);
  return { url: publicUrl, storageKey };
}

function ProgressBar({ progress, label }: { progress: UploadProgress | null; label: string | null }) {
  if (progress !== null) return (
    <div className="space-y-1.5">
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="bg-accent h-1.5 rounded-full transition-all duration-200" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="flex items-center justify-between text-2xs text-gray-400">
        <span>{label}</span>
        <span>{fmtSize(progress.loaded)} / {fmtSize(progress.total)} ({progress.percent}%)</span>
      </div>
    </div>
  );
  if (label) return <p className="text-2xs text-gray-400 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />{label}</p>;
  return null;
}

// ─── Modals Documenti ─────────────────────────────────────────────────────────

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState(TIPI[0]);
  const [descrizione, setDescrizione] = useState('');
  const [visibile, setVisibile] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cfg = getTipoConfig(tipo);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error('Seleziona un file'); return; }
    if (!nome.trim()) { toast.error('Inserisci un nome'); return; }
    if (file.size > cfg.maxMB * 1024 * 1024) { toast.error(`File troppo grande (max ${cfg.maxMB} MB)`); return; }
    setLoading(true);
    try {
      setStatusMsg('Preparazione upload…');
      const { url, storageKey } = await uploadToSupabase(file, tipo, (p) => { setStatusMsg('Caricamento…'); setProgress(p); });
      setProgress(null); setStatusMsg('Salvataggio metadati…');
      const res = await fetch('/api/admin/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), tipo, descrizione: descrizione.trim() || null, url, storageKey, size: file.size, mimeType: file.type || null, visibile }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Errore salvataggio');
      toast.success('Documento caricato'); onDone();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Errore upload'); }
    finally { setLoading(false); setStatusMsg(null); setProgress(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Carica documento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome *</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Condizioni Commerciali 2027" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo *</label><select value={tipo} onChange={(e) => { setTipo(e.target.value); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white">{TIPI.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sottotitolo <span className="normal-case font-normal text-gray-400">(etichetta visibile ai clienti — opzionale)</span></label><input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder={`es. ${tipo}`} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">{cfg.fileLabel}</label><input ref={fileInputRef} type="file" accept={cfg.accept || undefined} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-warm-darker cursor-pointer" />{file && <p className="text-2xs text-gray-400 mt-1">{file.name} · {fmtSize(file.size)}</p>}</div>
          <div className="flex items-center gap-3"><label className="text-sm text-gray-600">Visibile ai clienti</label><button type="button" onClick={() => setVisibile((v) => !v)} className={`relative w-10 h-5 rounded-full transition-colors ${visibile ? 'bg-accent' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visibile ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
          <p className="text-2xs text-gray-400 bg-amber-50 border border-amber-200 rounded px-3 py-2">Piano attuale: max {PLAN_MAX_MB} MB per file.</p>
          <ProgressBar progress={progress} label={statusMsg} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50">Annulla</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50 transition-colors flex items-center gap-2"><Upload size={13} />{loading ? 'Caricamento…' : 'Carica'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReplaceModal({ doc, onClose, onDone }: { doc: Doc; onClose: () => void; onDone: () => void }) {
  const [nome, setNome] = useState(doc.nome);
  const [tipo, setTipo] = useState(doc.tipo);
  const [descrizione, setDescrizione] = useState(doc.descrizione ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cfg = getTipoConfig(tipo);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let fileFields: Record<string, unknown> = {};
      if (file) {
        if (file.size > cfg.maxMB * 1024 * 1024) throw new Error(`File troppo grande (max ${cfg.maxMB} MB)`);
        setStatusMsg('Preparazione upload…');
        const { url, storageKey } = await uploadToSupabase(file, tipo, (p) => { setStatusMsg('Caricamento…'); setProgress(p); });
        setProgress(null);
        fileFields = { url, storageKey, size: file.size, mimeType: file.type || null };
      }
      setStatusMsg('Salvataggio…');
      const res = await fetch(`/api/admin/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), tipo, descrizione: descrizione.trim() || null, ...fileFields }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Errore');
      toast.success('Documento aggiornato'); onDone();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Errore'); }
    finally { setLoading(false); setStatusMsg(null); setProgress(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Modifica documento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</label><select value={tipo} onChange={(e) => { setTipo(e.target.value); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white">{TIPI.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sottotitolo <span className="normal-case font-normal text-gray-400">(etichetta visibile ai clienti — opzionale)</span></label><input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder={`es. ${tipo}`} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sostituisci file — {cfg.fileLabel}</label><input ref={fileInputRef} type="file" accept={cfg.accept || undefined} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-warm-darker cursor-pointer" />{file && <p className="text-2xs text-gray-400 mt-1">{file.name} · {fmtSize(file.size)}</p>}</div>
          <ProgressBar progress={progress} label={statusMsg} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50">Annulla</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50">{loading ? 'Salvataggio…' : 'Salva'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VideoModal({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-black rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-black/80"><p className="text-sm font-medium text-white truncate pr-4">{nome}</p><button onClick={onClose} className="text-white/60 hover:text-white flex-shrink-0"><X size={18} /></button></div>
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
        <div className="flex items-center justify-between mb-4"><p className="text-sm font-medium text-primary truncate pr-4">{nome}</p><button onClick={onClose} className="text-gray-400 hover:text-primary flex-shrink-0"><X size={18} /></button></div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls autoPlay className="w-full" src={url} />
      </div>
    </div>
  );
}

// ─── Album section ────────────────────────────────────────────────────────────

function CreaAlbumModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [visibile, setVisibile] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Nome obbligatorio'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/albums', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), descrizione: descrizione.trim() || null, visibile }) });
      if (!res.ok) throw new Error((await res.json()).error);
      const { data } = await res.json();
      toast.success('Album creato'); onDone(data.id);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Errore'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Nuovo album fotografico</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome *</label><input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Fiera Milano 2027" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrizione</label><textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} placeholder="Opzionale" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent resize-none" /></div>
          <div className="flex items-center gap-3"><label className="text-sm text-gray-600">Visibile ai clienti</label><button type="button" onClick={() => setVisibile((v) => !v)} className={`relative w-10 h-5 rounded-full transition-colors ${visibile ? 'bg-accent' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visibile ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50">Annulla</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50 transition-colors">{loading ? 'Creazione…' : 'Crea'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AlbumCard({ album, onOpen, onDelete, onToggleVisibile, isDragging }: {
  album: Album; onOpen: () => void; onDelete: () => void; onToggleVisibile: () => void; isDragging: boolean;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className={`bg-white border border-border rounded-xl overflow-hidden transition-all group ${isDragging ? 'opacity-50 scale-95 shadow-lg' : 'hover:shadow-sm'}`}>
      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
        {album.copertina ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.copertina} alt={album.nome} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-gray-200" /></div>
        )}
        <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 p-1 bg-white/80 rounded">
          <GripVertical size={14} className="text-gray-500" />
        </div>
        <div className={`absolute top-2 right-2 text-2xs font-medium px-2 py-0.5 rounded-full ${album.visibile ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {album.visibile ? 'Visibile' : 'Nascosto'}
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-primary truncate">{album.nome}</p>
        <p className="text-2xs text-gray-400 mt-0.5">{album.nFoto} foto · {fmtDate(album.createdAt)}</p>
        {album.descrizione && <p className="text-2xs text-gray-500 mt-1 line-clamp-2">{album.descrizione}</p>}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={onOpen} className="flex-1 text-xs font-medium text-center px-2 py-1.5 bg-primary text-white rounded hover:bg-warm-darker transition-colors">Apri</button>
          <button onClick={onToggleVisibile} className="p-1.5 text-gray-400 hover:text-primary transition-colors" title={album.visibile ? 'Nascondi' : 'Mostra'}>
            {album.visibile ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1.5">
              <button onClick={onDelete} className="text-2xs font-medium text-red-600 hover:text-red-800">Elimina</button>
              <button onClick={() => setConfirmDel(false)} className="text-2xs text-gray-400">✕</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

function AlbumTab() {
  const qc = useQueryClient();
  const router = useRouter();
  const [showCrea, setShowCrea] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Album[] }>({
    queryKey: ['admin-albums'],
    queryFn: () => fetch('/api/admin/albums').then((r) => r.json()),
  });

  useEffect(() => { if (data?.data) setAlbums(data.data); }, [data]);

  async function toggleVisibile(album: Album) {
    try {
      await fetch(`/api/admin/albums/${album.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibile: !album.visibile }) });
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
    } catch { toast.error('Errore'); }
  }

  async function deleteAlbum(id: string) {
    try {
      await fetch(`/api/admin/albums/${id}`, { method: 'DELETE' });
      toast.success('Album eliminato'); qc.invalidateQueries({ queryKey: ['admin-albums'] });
    } catch { toast.error('Errore eliminazione'); }
  }

  function onDragStart(id: string) { setDraggedId(id); }

  function onDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const newOrder = [...albums];
    const fromIdx = newOrder.findIndex((a) => a.id === draggedId);
    const toIdx = newOrder.findIndex((a) => a.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setAlbums(newOrder);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDraggedId(null);
    try {
      await fetch('/api/admin/albums/reorder', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: albums.map((a) => a.id) }) });
    } catch { toast.error('Errore riordinamento'); }
  }

  function handleAlbumCreated(id: string) {
    setShowCrea(false);
    qc.invalidateQueries({ queryKey: ['admin-albums'] });
    router.push(`/admin/album/${id}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">{albums.length} album fotografici</p>
        <button onClick={() => setShowCrea(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors"><Plus size={14} />Nuovo album</button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{[1,2,3,4].map((i) => <div key={i} className="aspect-[4/3] bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Nessun album</p>
          <button onClick={() => setShowCrea(true)} className="mt-3 text-sm text-accent hover:underline">Crea il primo album</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          {albums.map((album) => (
            <div key={album.id} draggable onDragStart={() => onDragStart(album.id)} onDragOver={(e) => onDragOver(e, album.id)}>
              <AlbumCard album={album} isDragging={draggedId === album.id}
                onOpen={() => router.push(`/admin/album/${album.id}`)}
                onDelete={() => deleteAlbum(album.id)}
                onToggleVisibile={() => toggleVisibile(album)}
              />
            </div>
          ))}
        </div>
      )}
      {showCrea && <CreaAlbumModal onClose={() => setShowCrea(false)} onDone={handleAlbumCreated} />}
    </div>
  );
}

// ─── Tab Documenti ────────────────────────────────────────────────────────────

function DocumentiTab() {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<Doc | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);

  const { data, isLoading } = useQuery<{ data: Doc[] }>({
    queryKey: ['admin-documents'],
    queryFn: () => fetch('/api/admin/documents').then((r) => r.json()),
  });
  const docs = data?.data ?? [];

  async function toggleVisibile(doc: Doc) {
    try {
      await fetch(`/api/admin/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibile: !doc.visibile }) });
      qc.invalidateQueries({ queryKey: ['admin-documents'] });
    } catch { toast.error('Errore aggiornamento visibilità'); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Documento eliminato'); setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['admin-documents'] });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Errore'); }
  }

  function onModalDone() { setShowUpload(false); setReplaceDoc(null); qc.invalidateQueries({ queryKey: ['admin-documents'] }); }
  const previewKind = previewDoc ? getTipoConfig(previewDoc.tipo).kind : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">PDF, video e audio visibili ai clienti</p>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors"><Plus size={14} />Carica</button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><FileText size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Nessun documento caricato</p></div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-cream/50">
              <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
              <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
              <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Data</th>
              <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Dim.</th>
              <th className="text-center px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide">Visibile</th>
              <th className="px-4 py-3" />
            </tr></thead>
            <tbody>
              {docs.map((doc) => {
                const kind = getTipoConfig(doc.tipo).kind;
                const canPreview = kind === 'video' || kind === 'audio';
                return (
                  <tr key={doc.id} className="border-b border-border/50 last:border-0 hover:bg-cream/30 transition-colors">
                    <td className="px-4 py-3"><a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:text-accent transition-colors flex items-center gap-2"><DocIcon tipo={doc.tipo} />{doc.nome}</a></td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{doc.tipo}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmtDate(doc.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmtSize(doc.size)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleVisibile(doc)} className={`relative w-9 h-5 rounded-full transition-colors ${doc.visibile ? 'bg-accent' : 'bg-gray-200'}`} title={doc.visibile ? 'Nascondi' : 'Mostra'}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${doc.visibile ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {canPreview && <button onClick={() => setPreviewDoc(doc)} className="p-1.5 text-gray-400 hover:text-accent transition-colors"><Play size={13} /></button>}
                        <button onClick={() => setReplaceDoc(doc)} className="p-1.5 text-gray-400 hover:text-primary transition-colors"><RefreshCw size={13} /></button>
                        {deleteId === doc.id ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleDelete(doc.id)} className="text-2xs font-medium text-red-600 hover:text-red-800">Elimina</button>
                            <button onClick={() => setDeleteId(null)} className="text-2xs text-gray-400">Annulla</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteId(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={onModalDone} />}
      {replaceDoc && <ReplaceModal doc={replaceDoc} onClose={() => setReplaceDoc(null)} onDone={onModalDone} />}
      {previewDoc && previewKind === 'video' && <VideoModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />}
      {previewDoc && previewKind === 'audio' && <AudioModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}

// ─── Pagina principale ────────────────────────────────────────────────────────

type TabId = 'documenti' | 'album';

export default function DocumentiPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab: TabId = searchParams.get('tab') === 'album' ? 'album' : 'documenti';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  function switchTab(tab: TabId) {
    setActiveTab(tab);
    router.replace(`/admin/documenti${tab === 'album' ? '?tab=album' : ''}`);
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Documenti e media</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestisci i contenuti condivisi con i clienti</p>
      </div>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {(['documenti', 'album'] as TabId[]).map((id) => (
          <button key={id} onClick={() => switchTab(id)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}`}>
            {id === 'documenti' ? 'Documenti e media' : 'Album fotografici'}
          </button>
        ))}
      </div>
      {activeTab === 'documenti' ? <DocumentiTab /> : <AlbumTab />}
    </div>
  );
}
