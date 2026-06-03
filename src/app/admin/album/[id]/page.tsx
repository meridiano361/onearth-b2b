'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Trash2, X, GripVertical, ImagePlus } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlbumFoto {
  id: string;
  url: string;
  didascalia: string | null;
  ordine: number;
}

interface Album {
  id: string;
  nome: string;
  descrizione: string | null;
  copertina: string | null;
  visibile: boolean;
  createdAt: string;
  foto: AlbumFoto[];
}

interface UploadingFile {
  id: string;
  name: string;
  percent: number;
  done: boolean;
  error?: string;
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

async function uploadFoto(
  albumId: string,
  file: File,
  onProgress: (p: number) => void,
): Promise<AlbumFoto> {
  // 1. Get signed URL
  const signRes = await fetch(`/api/admin/albums/${albumId}/signed-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, size: file.size }),
  });
  if (!signRes.ok) {
    const e = await signRes.json().catch(() => ({}));
    throw new Error(e.error ?? 'Errore URL firmato');
  }
  const { signedUrl, publicUrl } = await signRes.json();

  // 2. Upload via XHR for progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload fallito (${xhr.status})`));
    });
    xhr.addEventListener('error', () => reject(new Error('Errore di rete')));
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');
    xhr.send(file);
  });

  // 3. Save to DB
  const saveRes = await fetch(`/api/admin/albums/${albumId}/foto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: publicUrl }),
  });
  if (!saveRes.ok) throw new Error('Errore salvataggio foto');
  const { data } = await saveRes.json();
  return data as AlbumFoto;
}

// ─── Photo thumbnail ──────────────────────────────────────────────────────────

function FotoCard({
  foto,
  isFirst,
  isSelected,
  onSelect,
  onDelete,
  onSetCover,
  onDidascalia,
  dragHandleProps,
  isDragging,
}: {
  foto: AlbumFoto;
  isFirst: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSetCover: () => void;
  onDidascalia: (v: string) => void;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(foto.didascalia ?? '');

  function saveDidascalia() {
    setEditing(false);
    if (draft !== (foto.didascalia ?? '')) onDidascalia(draft);
  }

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isSelected ? 'border-accent' : 'border-border'}`}
    >
      {/* Checkbox */}
      <button
        onClick={onSelect}
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-accent border-accent' : 'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <Check size={10} className="text-white" />}
      </button>

      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="absolute top-2 right-8 z-10 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 bg-white/80 rounded"
      >
        <GripVertical size={14} className="text-gray-500" />
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
      >
        <X size={12} />
      </button>

      {/* Image */}
      <div className="aspect-square bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt={foto.didascalia ?? ''} className="w-full h-full object-cover" />
      </div>

      {/* Copertina badge + set cover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isFirst ? (
          <span className="text-2xs font-semibold text-white bg-accent px-1.5 py-0.5 rounded">Copertina</span>
        ) : (
          <button
            onClick={onSetCover}
            className="text-2xs font-medium text-white/80 hover:text-white transition-colors"
          >
            Imposta copertina
          </button>
        )}
      </div>

      {/* Didascalia */}
      <div className="p-2 bg-white border-t border-border">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveDidascalia}
            onKeyDown={(e) => { if (e.key === 'Enter') saveDidascalia(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full text-xs border border-accent rounded px-1.5 py-0.5 outline-none"
            placeholder="Aggiungi didascalia…"
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            className="text-xs text-gray-500 cursor-text hover:text-primary transition-colors truncate min-h-[16px]"
          >
            {foto.didascalia || <span className="text-gray-300 italic">Aggiungi didascalia…</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editingNome, setEditingNome] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftNome, setDraftNome] = useState('');
  const [draftDesc, setDraftDesc] = useState('');

  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [foto, setFoto] = useState<AlbumFoto[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOverId = useRef<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Album }>({
    queryKey: ['admin-album', id],
    queryFn: () => fetch(`/api/admin/albums/${id}`).then((r) => r.json()),
  });
  const album = data?.data;

  useEffect(() => {
    if (album) {
      setFoto(album.foto);
      if (!editingNome) setDraftNome(album.nome);
      if (!editingDesc) setDraftDesc(album.descrizione ?? '');
    }
  }, [album]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inline field save ──────────────────────────────────────────────────────

  async function saveField(field: 'nome' | 'descrizione', value: string) {
    if (!album) return;
    const trimmed = value.trim();
    if (field === 'nome' && !trimmed) return;
    const prev = field === 'nome' ? album.nome : (album.descrizione ?? '');
    if (trimmed === prev) return;

    try {
      await fetch(`/api/admin/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: trimmed || null }),
      });
      qc.invalidateQueries({ queryKey: ['admin-album', id] });
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
    } catch {
      toast.error('Errore salvataggio');
    }
  }

  async function toggleVisibile() {
    if (!album) return;
    const newVal = !album.visibile;
    try {
      await fetch(`/api/admin/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibile: newVal }),
      });

      if (newVal) {
        const notifica = window.confirm(`Vuoi inviare una notifica ai clienti per l'album "${album.nome}"?`);
        if (notifica) {
          await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              icona: '📸',
              titolo: `Nuovo album: ${album.nome}`,
              testo: 'È disponibile un nuovo album fotografico. Scoprilo nella sezione Risorse.',
              linkUrl: '/catalog/risorse',
              linkTesto: 'Apri Risorse',
              attiva: true,
            }),
          });
          toast.success('Notifica inviata');
        }
      }

      qc.invalidateQueries({ queryKey: ['admin-album', id] });
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
    } catch {
      toast.error('Errore');
    }
  }

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) { toast.error('Solo immagini (JPG, PNG, WebP)'); return; }

    const newItems: UploadingFile[] = arr.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      percent: 0,
      done: false,
    }));
    setUploading((prev) => [...prev, ...newItems]);

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const item = newItems[i];
      try {
        const newFoto = await uploadFoto(id, file, (p) => {
          setUploading((prev) => prev.map((u) => u.id === item.id ? { ...u, percent: p } : u));
        });
        setFoto((prev) => [...prev, newFoto]);
        setUploading((prev) => prev.map((u) => u.id === item.id ? { ...u, percent: 100, done: true } : u));
        qc.invalidateQueries({ queryKey: ['admin-albums'] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Errore upload';
        setUploading((prev) => prev.map((u) => u.id === item.id ? { ...u, error: msg } : u));
        toast.error(`${file.name}: ${msg}`);
      }
    }

    setTimeout(() => setUploading((prev) => prev.filter((u) => !u.done)), 2000);
  }, [id, qc]);

  // Drag & drop zone
  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    dropRef.current?.classList.remove('border-accent', 'bg-accent/5');
    handleFiles(e.dataTransfer.files);
  }

  // ── Photo delete ───────────────────────────────────────────────────────────

  async function deleteFoto(fotoId: string) {
    try {
      await fetch(`/api/admin/albums/${id}/foto/${fotoId}`, { method: 'DELETE' });
      setFoto((prev) => prev.filter((f) => f.id !== fotoId));
      setSelected((prev) => { const s = new Set(prev); s.delete(fotoId); return s; });
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-albums'] });
    } catch {
      toast.error('Errore eliminazione');
    }
  }

  async function deleteSelected() {
    if (!selected.size) return;
    for (const fotoId of selected) await deleteFoto(fotoId);
    setSelected(new Set());
  }

  // ── Didascalia ─────────────────────────────────────────────────────────────

  async function saveDidascalia(fotoId: string, didascalia: string) {
    try {
      const res = await fetch(`/api/admin/albums/${id}/foto/${fotoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ didascalia }),
      });
      if (!res.ok) throw new Error();
      setFoto((prev) => prev.map((f) => f.id === fotoId ? { ...f, didascalia: didascalia || null } : f));
    } catch {
      toast.error('Errore salvataggio didascalia');
    }
  }

  // ── Set cover ──────────────────────────────────────────────────────────────

  async function setCover(fotoId: string) {
    const f = foto.find((x) => x.id === fotoId);
    if (!f) return;
    try {
      await fetch(`/api/admin/albums/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copertina: f.url }),
      });
      // Move this photo to ordine 0 by reordering
      const newOrder = [fotoId, ...foto.filter((x) => x.id !== fotoId).map((x) => x.id)];
      await reorderFoto(newOrder);
    } catch {
      toast.error('Errore');
    }
  }

  // ── Drag & drop reorder photos ─────────────────────────────────────────────

  function onPhotoDragStart(fotoId: string) {
    setDraggedId(fotoId);
  }

  function onPhotoDragOver(e: React.DragEvent, fotoId: string) {
    e.preventDefault();
    dragOverId.current = fotoId;
  }

  function onPhotoDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }

    const newOrder = [...foto];
    const fromIdx = newOrder.findIndex((f) => f.id === draggedId);
    const toIdx = newOrder.findIndex((f) => f.id === targetId);
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setFoto(newOrder);
    setDraggedId(null);
    reorderFoto(newOrder.map((f) => f.id));
  }

  async function reorderFoto(ids: string[]) {
    try {
      await fetch(`/api/admin/albums/${id}/reorder-foto`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      qc.invalidateQueries({ queryKey: ['admin-album', id] });
    } catch {
      toast.error('Errore riordinamento');
    }
  }

  // ── Selection helpers ──────────────────────────────────────────────────────

  function toggleSelect(fotoId: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(fotoId)) s.delete(fotoId);
      else s.add(fotoId);
      return s;
    });
  }

  function selectAll() { setSelected(new Set(foto.map((f) => f.id))); }
  function deselectAll() { setSelected(new Set()); }

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map((i) => <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!album) {
    return <div className="p-8 text-gray-400 text-sm">Album non trovato</div>;
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/documenti?tab=album')}
          className="mt-1 flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
          Album
        </button>
        <div className="flex-1 min-w-0">
          {/* Nome inline edit */}
          {editingNome ? (
            <input
              autoFocus
              value={draftNome}
              onChange={(e) => setDraftNome(e.target.value)}
              onBlur={() => { setEditingNome(false); saveField('nome', draftNome); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setEditingNome(false); saveField('nome', draftNome); }
                if (e.key === 'Escape') { setEditingNome(false); setDraftNome(album.nome); }
              }}
              className="text-xl font-semibold text-primary border-b-2 border-accent outline-none bg-transparent w-full"
            />
          ) : (
            <h1
              onClick={() => setEditingNome(true)}
              className="text-xl font-semibold text-primary cursor-text hover:text-accent transition-colors"
              title="Click per modificare"
            >
              {album.nome}
            </h1>
          )}
          {/* Descrizione inline edit */}
          {editingDesc ? (
            <textarea
              autoFocus
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              onBlur={() => { setEditingDesc(false); saveField('descrizione', draftDesc); }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setEditingDesc(false); }
              }}
              rows={2}
              className="mt-1 text-sm text-gray-500 border-b border-accent outline-none bg-transparent w-full resize-none"
              placeholder="Aggiungi una descrizione…"
            />
          ) : (
            <p
              onClick={() => setEditingDesc(true)}
              className="mt-1 text-sm text-gray-400 cursor-text hover:text-gray-600 transition-colors"
              title="Click per modificare"
            >
              {album.descrizione || <span className="italic">Aggiungi una descrizione…</span>}
            </p>
          )}
        </div>
        {/* Visibile toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{album.visibile ? 'Visibile' : 'Nascosto'}</span>
          <button
            onClick={toggleVisibile}
            className={`relative w-10 h-5 rounded-full transition-colors ${album.visibile ? 'bg-accent' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${album.visibile ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('border-accent', 'bg-accent/5'); }}
        onDragLeave={() => dropRef.current?.classList.remove('border-accent', 'bg-accent/5')}
        onDrop={onZoneDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all mb-6"
      >
        <ImagePlus size={32} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Trascina le foto qui o clicca per selezionarle</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 10 MB ciascuna</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="mb-4 space-y-2">
          {uploading.map((u) => (
            <div key={u.id} className="bg-white border border-border rounded-lg px-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate max-w-xs">{u.name}</span>
                {u.error ? (
                  <span className="text-xs text-red-500">{u.error}</span>
                ) : u.done ? (
                  <span className="text-xs text-green-600 font-medium">✓ Caricato</span>
                ) : (
                  <span className="text-xs text-gray-400">{u.percent}%</span>
                )}
              </div>
              {!u.error && (
                <div className="w-full bg-gray-100 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all ${u.done ? 'bg-green-500' : 'bg-accent'}`}
                    style={{ width: `${u.percent}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {foto.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={selected.size === foto.length ? deselectAll : selectAll} className="text-xs text-gray-500 hover:text-primary transition-colors">
            {selected.size === foto.length ? 'Deseleziona tutte' : 'Seleziona tutte'}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-gray-400">{selected.size} selezionate</span>
              {deleting === 'bulk' ? (
                <div className="flex items-center gap-2">
                  <button onClick={deleteSelected} className="text-xs font-medium text-red-600 hover:text-red-800">Conferma eliminazione</button>
                  <button onClick={() => setDeleting(null)} className="text-xs text-gray-400">Annulla</button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleting('bulk')}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={11} />
                  Elimina selezionate ({selected.size})
                </button>
              )}
            </>
          )}
          <span className="ml-auto text-xs text-gray-400">{foto.length} foto</span>
        </div>
      )}

      {/* Photo grid */}
      {foto.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImagePlus size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna foto nell&apos;album</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {foto.map((f, idx) => (
            <div
              key={f.id}
              draggable
              onDragStart={() => onPhotoDragStart(f.id)}
              onDragOver={(e) => onPhotoDragOver(e, f.id)}
              onDrop={(e) => onPhotoDrop(e, f.id)}
            >
              <FotoCard
                foto={f}
                isFirst={idx === 0}
                isSelected={selected.has(f.id)}
                onSelect={() => toggleSelect(f.id)}
                onDelete={() => {
                  if (deleting === f.id) { deleteFoto(f.id); }
                  else setDeleting(f.id);
                  setTimeout(() => setDeleting(null), 3000);
                }}
                onSetCover={() => setCover(f.id)}
                onDidascalia={(v) => saveDidascalia(f.id, v)}
                dragHandleProps={{
                  onMouseDown: (e) => e.stopPropagation(),
                }}
                isDragging={draggedId === f.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
