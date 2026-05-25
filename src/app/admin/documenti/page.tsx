'use client';

import { useState } from 'react';
import { FileText, Plus, Trash2, RefreshCw, Upload } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const TIPI = ['Condizioni Commerciali', 'Catalogo PDF', 'Altro'];
const MAX_SIZE_MB = 50;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

interface Doc {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  size: number;
  visibile: boolean;
  createdAt: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Upload diretto su Supabase tramite signed URL ────────────────────────────

async function uploadToSupabase(file: File): Promise<{ url: string; storageKey: string }> {
  // 1. Chiedi un signed upload URL al server
  const res = await fetch('/api/admin/documents/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, size: file.size }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Impossibile ottenere URL firmato');
  }
  const { signedUrl, storageKey, publicUrl } = await res.json();

  // 2. Carica il file direttamente su Supabase (bypass del limite 4.5 MB di Vercel)
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Upload fallito (${uploadRes.status})`);
  }

  return { url: publicUrl, storageKey };
}

// ─── Modal carica ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState(TIPI[0]);
  const [visibile, setVisibile] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error('Seleziona un file PDF'); return; }
    if (!nome.trim()) { toast.error('Inserisci un nome'); return; }
    if (file.size > MAX_SIZE) { toast.error(`File troppo grande (max ${MAX_SIZE_MB} MB)`); return; }

    setLoading(true);
    try {
      setProgress('Caricamento file su storage…');
      const { url, storageKey } = await uploadToSupabase(file);

      setProgress('Salvataggio metadati…');
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), tipo, url, storageKey, size: file.size, visibile }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Errore salvataggio metadati');
      }

      toast.success('Documento caricato');
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? 'Errore upload');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Carica documento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Condizioni Commerciali 2027"
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo *</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white"
            >
              {TIPI.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              File PDF * (max {MAX_SIZE_MB} MB)
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-warm-darker cursor-pointer"
            />
            {file && <p className="text-2xs text-gray-400 mt-1">{file.name} · {fmtSize(file.size)}</p>}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Visibile ai clienti</label>
            <button
              type="button"
              onClick={() => setVisibile((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${visibile ? 'bg-accent' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visibile ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {progress && (
            <p className="text-2xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              {progress}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary transition-colors disabled:opacity-50">Annulla</button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Upload size={13} />
              {loading ? 'Caricamento…' : 'Carica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal sostituisci / modifica ─────────────────────────────────────────────

function ReplaceModal({ doc, onClose, onDone }: { doc: Doc; onClose: () => void; onDone: () => void }) {
  const [nome, setNome] = useState(doc.nome);
  const [tipo, setTipo] = useState(doc.tipo);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let fileFields: Record<string, unknown> = {};

      if (file) {
        if (file.size > MAX_SIZE) throw new Error(`File troppo grande (max ${MAX_SIZE_MB} MB)`);
        setProgress('Caricamento file su storage…');
        const { url, storageKey } = await uploadToSupabase(file);
        fileFields = { url, storageKey, size: file.size };
      }

      setProgress('Salvataggio…');
      const res = await fetch(`/api/admin/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), tipo, ...fileFields }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Errore');
      toast.success('Documento aggiornato');
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? 'Errore');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-sm font-semibold text-primary mb-5">Modifica documento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:border-accent bg-white">
              {TIPI.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-2xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Sostituisci file PDF (opzionale, max {MAX_SIZE_MB} MB)
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:bg-warm-darker cursor-pointer"
            />
            {file && <p className="text-2xs text-gray-400 mt-1">{file.name} · {fmtSize(file.size)}</p>}
          </div>
          {progress && (
            <p className="text-2xs text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              {progress}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-600 hover:text-primary disabled:opacity-50">Annulla</button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-warm-darker disabled:opacity-50 transition-colors">
              {loading ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pagina principale ────────────────────────────────────────────────────────

export default function DocumentiPage() {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<Doc | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Doc[] }>({
    queryKey: ['admin-documents'],
    queryFn: () => fetch('/api/admin/documents').then((r) => r.json()),
  });

  const docs = data?.data ?? [];

  async function toggleVisibile(doc: Doc) {
    try {
      await fetch(`/api/admin/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibile: !doc.visibile }),
      });
      qc.invalidateQueries({ queryKey: ['admin-documents'] });
    } catch {
      toast.error('Errore aggiornamento visibilità');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Documento eliminato');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['admin-documents'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function onModalDone() {
    setShowUpload(false);
    setReplaceDoc(null);
    qc.invalidateQueries({ queryKey: ['admin-documents'] });
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Documenti</h1>
          <p className="text-sm text-gray-400 mt-0.5">PDF visibili ai clienti nel catalogo</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-warm-darker transition-colors"
        >
          <Plus size={14} />
          Carica documento
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessun documento caricato</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream/50">
                <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Data</th>
                <th className="text-left px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Dim.</th>
                <th className="text-center px-4 py-3 text-2xs font-semibold text-gray-400 uppercase tracking-wide">Visibile</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-border/50 last:border-0 hover:bg-cream/30 transition-colors">
                  <td className="px-4 py-3">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:text-accent transition-colors flex items-center gap-2">
                      <FileText size={13} className="text-gray-400 flex-shrink-0" />
                      {doc.nome}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{doc.tipo}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmtDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{fmtSize(doc.size)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleVisibile(doc)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${doc.visibile ? 'bg-accent' : 'bg-gray-200'}`}
                      title={doc.visibile ? 'Nascondi ai clienti' : 'Mostra ai clienti'}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${doc.visibile ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setReplaceDoc(doc)}
                        className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                        title="Modifica / Sostituisci"
                      >
                        <RefreshCw size={13} />
                      </button>
                      {deleteId === doc.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleDelete(doc.id)} className="text-2xs font-medium text-red-600 hover:text-red-800 transition-colors">Elimina</button>
                          <button onClick={() => setDeleteId(null)} className="text-2xs text-gray-400 hover:text-gray-600 transition-colors">Annulla</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={onModalDone} />}
      {replaceDoc && <ReplaceModal doc={replaceDoc} onClose={() => setReplaceDoc(null)} onDone={onModalDone} />}
    </div>
  );
}
