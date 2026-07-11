'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Film, Music2, File, Plus, Trash2, RefreshCw, Upload, Play, X,
  ImageIcon, GripVertical, Eye, EyeOff, Folder, FolderPlus, ChevronDown,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ─── Types & helpers ──────────────────────────────────────────────────────────

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
const TIPI_DOC   = TIPI.filter((t) => TIPO_CONFIG[t].kind !== 'video');
const TIPI_VIDEO = TIPI.filter((t) => TIPO_CONFIG[t].kind === 'video');
function getTipoConfig(tipo: string): TipoConfig { return TIPO_CONFIG[tipo] ?? TIPO_CONFIG['Altro']; }

interface Doc { id: string; nome: string; tipo: string; cartella?: string | null; descrizione?: string | null; url: string; size: number; mimeType?: string | null; visibile: boolean; createdAt: string; }
interface Album { id: string; nome: string; cartella?: string | null; descrizione: string | null; copertina: string | null; visibile: boolean; nFoto: number; ordine: number; createdAt: string; }
interface UploadProgress { percent: number; loaded: number; total: number }

function fmtSize(b: number) { if (b < 1024) return b + ' B'; if (b < 1024*1024) return (b/1024).toFixed(0)+' KB'; return (b/(1024*1024)).toFixed(1)+' MB'; }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
function DocIcon({ tipo }: { tipo: string }) {
  const k = getTipoConfig(tipo).kind;
  if (k === 'video') return <Film size={13} className="text-blue-400 flex-shrink-0" />;
  if (k === 'audio') return <Music2 size={13} className="text-purple-400 flex-shrink-0" />;
  if (k === 'pdf')   return <FileText size={13} className="text-red-400 flex-shrink-0" />;
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

// ─── Modals ───────────────────────────────────────────────────────────────────

function NuovaCartellaModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (nome: string) => void }) {
  const [nome, setNome] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xs p-6">
        <h2 className="text-sm font-semibold text-primary mb-4">Nuova cartella</h2>
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && nome.trim()) onConfirm(nome.trim()); }}
          placeholder="es. PE27, CA27…"
          className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-primary">Annulla</button>
          <button
            disabled={!nome.trim()}
            onClick={() => nome.trim() && onConfirm(nome.trim())}
            className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-40"
          >Crea</button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onDone, defaultCartella, defaultTipo, cartelle }: {
  onClose: () => void; onDone: () => void;
  defaultCartella: string; defaultTipo?: string; cartelle: string[];
}) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState(defaultTipo ?? TIPI[0]);
  const [cartella, setCartella] = useState(defaultCartella);
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
      const res = await fetch('/api/admin/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), tipo, cartella: cartella.trim() || null, descrizione: descrizione.trim() || null, url, storageKey, size: file.size, mimeType: file.type || null, visibile }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Errore salvataggio');
      toast.success('Caricato'); onDone();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Errore upload'); }
    finally { setLoading(false); setStatusMsg(null); setProgress(null); }
  }

  const tipiToShow = cfg.kind === 'video' ? TIPI_VIDEO : TIPI_DOC;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Carica file</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome *</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Catalogo PE27" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo *</label>
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white">
              {TIPI.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cartella</label>
            <input list="cartelle-datalist" value={cartella} onChange={(e) => setCartella(e.target.value)} placeholder="es. PE27" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
            <datalist id="cartelle-datalist">{cartelle.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sottotitolo <span className="normal-case font-normal text-gray-400">(opzionale)</span></label><input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder={`es. ${tipo}`} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">{cfg.fileLabel}</label><input ref={fileInputRef} type="file" accept={cfg.accept || undefined} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-warm-darker cursor-pointer" />{file && <p className="text-2xs text-gray-400 mt-1">{file.name} · {fmtSize(file.size)}</p>}</div>
          <div className="flex items-center gap-3"><label className="text-sm text-gray-600">Visibile ai clienti</label><button type="button" onClick={() => setVisibile((v) => !v)} className={`relative w-10 h-5 rounded-full transition-colors ${visibile ? 'bg-accent' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visibile ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
          <p className="text-2xs text-gray-400 bg-amber-50 border border-amber-200 rounded px-3 py-2">Piano attuale: max {PLAN_MAX_MB} MB per file.</p>
          <ProgressBar progress={progress} label={statusMsg} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50">Annulla</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50 flex items-center gap-2"><Upload size={13} />{loading ? 'Caricamento…' : 'Carica'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReplaceModal({ doc, onClose, onDone, cartelle }: { doc: Doc; onClose: () => void; onDone: () => void; cartelle: string[] }) {
  const [nome, setNome] = useState(doc.nome);
  const [tipo, setTipo] = useState(doc.tipo);
  const [cartella, setCartella] = useState(doc.cartella ?? '');
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
      const res = await fetch(`/api/admin/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), tipo, cartella: cartella.trim() || null, descrizione: descrizione.trim() || null, ...fileFields }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Errore');
      toast.success('Aggiornato'); onDone();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Errore'); }
    finally { setLoading(false); setStatusMsg(null); setProgress(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Modifica file</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</label><select value={tipo} onChange={(e) => { setTipo(e.target.value); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white">{TIPI.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cartella</label>
            <input list="cartelle-replace" value={cartella} onChange={(e) => setCartella(e.target.value)} placeholder="es. PE27" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
            <datalist id="cartelle-replace">{cartelle.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sottotitolo <span className="normal-case font-normal text-gray-400">(opzionale)</span></label><input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder={`es. ${tipo}`} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
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

function CreaAlbumModal({ onClose, onDone, defaultCartella, cartelle }: {
  onClose: () => void; onDone: (id: string) => void;
  defaultCartella: string; cartelle: string[];
}) {
  const [nome, setNome] = useState('');
  const [cartella, setCartella] = useState(defaultCartella);
  const [descrizione, setDescrizione] = useState('');
  const [visibile, setVisibile] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Nome obbligatorio'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/albums', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nome.trim(), cartella: cartella.trim() || null, descrizione: descrizione.trim() || null, visibile }) });
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
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome *</label><input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Shooting PE27 Milano" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" /></div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cartella</label>
            <input list="cartelle-album" value={cartella} onChange={(e) => setCartella(e.target.value)} placeholder="es. PE27" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
            <datalist id="cartelle-album">{cartelle.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div><label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrizione</label><textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} placeholder="Opzionale" className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent resize-none" /></div>
          <div className="flex items-center gap-3"><label className="text-sm text-gray-600">Visibile ai clienti</label><button type="button" onClick={() => setVisibile((v) => !v)} className={`relative w-10 h-5 rounded-full transition-colors ${visibile ? 'bg-accent' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visibile ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50">Annulla</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50">{loading ? 'Creazione…' : 'Crea'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Doc table ────────────────────────────────────────────────────────────────

function DocTable({ items, onReplace, onDelete, onPreview, onToggleVisibile }: {
  items: Doc[];
  onReplace: (doc: Doc) => void;
  onDelete: (id: string) => void;
  onPreview: (doc: Doc) => void;
  onToggleVisibile: (doc: Doc) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  if (items.length === 0) return null;
  return (
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
          {items.map((doc) => {
            const kind = getTipoConfig(doc.tipo).kind;
            const canPreview = kind === 'video' || kind === 'audio';
            return (
              <tr key={doc.id} className="border-b border-border/50 last:border-0 hover:bg-cream/30 transition-colors">
                <td className="px-4 py-3"><a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:text-accent flex items-center gap-2"><DocIcon tipo={doc.tipo} />{doc.nome}</a></td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{doc.tipo}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmtDate(doc.createdAt)}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmtSize(doc.size)}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onToggleVisibile(doc)} className={`relative w-9 h-5 rounded-full transition-colors ${doc.visibile ? 'bg-accent' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${doc.visibile ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    {canPreview && <button onClick={() => onPreview(doc)} className="p-1.5 text-gray-400 hover:text-accent"><Play size={13} /></button>}
                    <button onClick={() => onReplace(doc)} className="p-1.5 text-gray-400 hover:text-primary"><RefreshCw size={13} /></button>
                    {deleteId === doc.id ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { onDelete(doc.id); setDeleteId(null); }} className="text-2xs font-medium text-red-600 hover:text-red-800">Elimina</button>
                        <button onClick={() => setDeleteId(null)} className="text-2xs text-gray-400">Annulla</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Album card ───────────────────────────────────────────────────────────────

function AlbumCard({ album, onOpen, onDelete, onToggleVisibile }: {
  album: Album; onOpen: () => void; onDelete: () => void; onToggleVisibile: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden hover:shadow-sm transition-all group">
      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
        {album.copertina
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={album.copertina} alt={album.nome} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-gray-200" /></div>}
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
          <button onClick={onToggleVisibile} className="p-1.5 text-gray-400 hover:text-primary" title={album.visibile ? 'Nascondi' : 'Mostra'}>
            {album.visibile ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          {confirmDel
            ? <div className="flex items-center gap-1.5"><button onClick={onDelete} className="text-2xs font-medium text-red-600 hover:text-red-800">Elimina</button><button onClick={() => setConfirmDel(false)} className="text-2xs text-gray-400">✕</button></div>
            : <button onClick={() => setConfirmDel(true)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
        </div>
      </div>
    </div>
  );
}

// ─── Cartella view ────────────────────────────────────────────────────────────

const SENZA = '__senza__';

function CartellaView({ cartella, docs, albums, cartelle, onRefreshDocs, onRefreshAlbums }: {
  cartella: string;
  docs: Doc[];
  albums: Album[];
  cartelle: string[];
  onRefreshDocs: () => void;
  onRefreshAlbums: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const isSenza = cartella === SENZA;
  const cartellaValue = isSenza ? null : cartella;

  const docsFiltrati  = docs.filter((d) => isSenza ? !d.cartella : d.cartella === cartella);
  const albumsFiltrati = albums.filter((a) => isSenza ? !a.cartella : a.cartella === cartella);
  const docItems  = docsFiltrati.filter((d) => getTipoConfig(d.tipo).kind !== 'video');
  const videoItems = docsFiltrati.filter((d) => getTipoConfig(d.tipo).kind === 'video');

  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const [replaceDoc, setReplaceDoc] = useState<Doc | null>(null);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [showUploadVideo, setShowUploadVideo] = useState(false);
  const [showCreaAlbum, setShowCreaAlbum] = useState(false);

  const previewKind = previewDoc ? getTipoConfig(previewDoc.tipo).kind : null;

  async function toggleVisibile(doc: Doc) {
    await fetch(`/api/admin/documents/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibile: !doc.visibile }) });
    onRefreshDocs();
  }

  async function deleteDoc(id: string) {
    const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Errore eliminazione'); return; }
    toast.success('Eliminato'); onRefreshDocs();
  }

  async function toggleAlbumVisibile(album: Album) {
    await fetch(`/api/admin/albums/${album.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibile: !album.visibile }) });
    onRefreshAlbums();
  }

  async function deleteAlbum(id: string) {
    await fetch(`/api/admin/albums/${id}`, { method: 'DELETE' });
    toast.success('Album eliminato'); onRefreshAlbums();
  }

  const sectionCls = 'mb-8';
  const sectionHead = 'flex items-center justify-between mb-3';
  const sectionLabel = 'text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2';
  const addBtn = 'flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors';

  return (
    <div>
      {/* Documenti (PDF + audio + altri) */}
      <div className={sectionCls}>
        <div className={sectionHead}>
          <span className={sectionLabel}><FileText size={13} />Documenti</span>
          <button onClick={() => setShowUploadDoc(true)} className={addBtn}><Plus size={12} />Carica</button>
        </div>
        {docItems.length === 0
          ? <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">Nessun documento. <button onClick={() => setShowUploadDoc(true)} className="text-accent hover:underline">Carica</button></p>
          : <DocTable items={docItems} onReplace={setReplaceDoc} onDelete={deleteDoc} onPreview={setPreviewDoc} onToggleVisibile={toggleVisibile} />}
      </div>

      {/* Foto (Album) */}
      <div className={sectionCls}>
        <div className={sectionHead}>
          <span className={sectionLabel}><ImageIcon size={13} />Foto</span>
          <button onClick={() => setShowCreaAlbum(true)} className={addBtn}><Plus size={12} />Nuovo album</button>
        </div>
        {albumsFiltrati.length === 0
          ? <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">Nessun album. <button onClick={() => setShowCreaAlbum(true)} className="text-accent hover:underline">Crea album</button></p>
          : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {albumsFiltrati.map((album) => (
                <AlbumCard key={album.id} album={album}
                  onOpen={() => router.push(`/admin/album/${album.id}`)}
                  onDelete={() => deleteAlbum(album.id)}
                  onToggleVisibile={() => toggleAlbumVisibile(album)}
                />
              ))}
            </div>}
      </div>

      {/* Video */}
      <div className={sectionCls}>
        <div className={sectionHead}>
          <span className={sectionLabel}><Film size={13} />Video</span>
          <button onClick={() => setShowUploadVideo(true)} className={addBtn}><Plus size={12} />Carica</button>
        </div>
        {videoItems.length === 0
          ? <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">Nessun video. <button onClick={() => setShowUploadVideo(true)} className="text-accent hover:underline">Carica</button></p>
          : <DocTable items={videoItems} onReplace={setReplaceDoc} onDelete={deleteDoc} onPreview={setPreviewDoc} onToggleVisibile={toggleVisibile} />}
      </div>

      {/* Modals */}
      {showUploadDoc && <UploadModal defaultCartella={cartellaValue ?? ''} defaultTipo="Catalogo PDF" cartelle={cartelle} onClose={() => setShowUploadDoc(false)} onDone={() => { setShowUploadDoc(false); onRefreshDocs(); }} />}
      {showUploadVideo && <UploadModal defaultCartella={cartellaValue ?? ''} defaultTipo="Video presentazione" cartelle={cartelle} onClose={() => setShowUploadVideo(false)} onDone={() => { setShowUploadVideo(false); onRefreshDocs(); }} />}
      {showCreaAlbum && <CreaAlbumModal defaultCartella={cartellaValue ?? ''} cartelle={cartelle} onClose={() => setShowCreaAlbum(false)} onDone={(id) => { setShowCreaAlbum(false); onRefreshAlbums(); router.push(`/admin/album/${id}`); }} />}
      {replaceDoc && <ReplaceModal doc={replaceDoc} cartelle={cartelle} onClose={() => setReplaceDoc(null)} onDone={() => { setReplaceDoc(null); onRefreshDocs(); }} />}
      {previewDoc && previewKind === 'video' && <VideoModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />}
      {previewDoc && previewKind === 'audio' && <AudioModal url={previewDoc.url} nome={previewDoc.nome} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocumentiPage() {
  const [showNuovaCartella, setShowNuovaCartella] = useState(false);
  // Extra cartelle create localmente ma ancora senza items (spariscono al refresh)
  const [localCartelle, setLocalCartelle] = useState<string[]>([]);
  const [currentCartella, setCurrentCartella] = useState<string | null>(null); // null = non ancora scelto

  const { data: docsData, refetch: refetchDocs } = useQuery<{ data: Doc[] }>({
    queryKey: ['admin-documents'],
    queryFn: () => fetch('/api/admin/documents').then((r) => r.json()),
  });
  const { data: albumsData, refetch: refetchAlbums } = useQuery<{ data: Album[] }>({
    queryKey: ['admin-albums'],
    queryFn: () => fetch('/api/admin/albums').then((r) => r.json()),
  });

  const docs   = docsData?.data   ?? [];
  const albums = albumsData?.data ?? [];

  // Derive cartelle da DB
  const dbCartelle = Array.from(new Set([
    ...docs.map((d) => d.cartella).filter(Boolean) as string[],
    ...albums.map((a) => a.cartella).filter(Boolean) as string[],
  ])).sort();

  const allCartelle = Array.from(new Set([...dbCartelle, ...localCartelle])).sort();
  const hasSenza = docs.some((d) => !d.cartella) || albums.some((a) => !a.cartella);

  // Seleziona cartella di default quando arrivano i dati
  useEffect(() => {
    if (currentCartella !== null) return;
    if (allCartelle.length > 0) setCurrentCartella(allCartelle[0]);
    else if (hasSenza) setCurrentCartella(SENZA);
  }, [allCartelle.length, hasSenza]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNuovaCartella(nome: string) {
    const trimmed = nome.trim();
    if (!allCartelle.includes(trimmed)) setLocalCartelle((prev) => [...prev, trimmed]);
    setCurrentCartella(trimmed);
    setShowNuovaCartella(false);
  }

  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-border hover:border-gray-400'}`;

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Documenti e media</h1>
          <p className="text-sm text-gray-400 mt-0.5">Organizza PDF, foto e video per collezione</p>
        </div>
        <button onClick={() => setShowNuovaCartella(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors flex-shrink-0">
          <FolderPlus size={14} />Nuova cartella
        </button>
      </div>

      {/* Chips cartelle */}
      {(allCartelle.length > 0 || hasSenza) && (
        <div className="flex flex-wrap gap-2 mb-7">
          {allCartelle.map((c) => (
            <button key={c} onClick={() => setCurrentCartella(c)} className={chipCls(currentCartella === c)}>
              <Folder size={12} />{c}
            </button>
          ))}
          {hasSenza && (
            <button onClick={() => setCurrentCartella(SENZA)} className={chipCls(currentCartella === SENZA)}>
              <Folder size={12} />Senza cartella
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {currentCartella === null ? (
        // Empty state iniziale
        <div className="text-center py-20 text-gray-400">
          <FolderPlus size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Nessuna cartella ancora</p>
          <p className="text-xs mt-1">Crea una cartella per cominciare ad organizzare i contenuti.</p>
          <button onClick={() => setShowNuovaCartella(true)} className="mt-4 px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker transition-colors">
            Crea prima cartella
          </button>
        </div>
      ) : (
        <CartellaView
          key={currentCartella}
          cartella={currentCartella}
          docs={docs}
          albums={albums}
          cartelle={allCartelle}
          onRefreshDocs={() => refetchDocs()}
          onRefreshAlbums={() => refetchAlbums()}
        />
      )}

      {/* Modals */}
      {showNuovaCartella && <NuovaCartellaModal onClose={() => setShowNuovaCartella(false)} onConfirm={handleNuovaCartella} />}
    </div>
  );
}
