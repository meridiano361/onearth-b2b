'use client';

import { useState, useRef } from 'react';
import { ImagePlus, CheckCircle, AlertCircle, X, Upload, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface FileEntry {
  file: File;
  preview: string;
  code: string;
}

interface UploadResult {
  uploaded: number;
  notFound: string[];
  errors: Array<{ file: string; message: string }>;
  total: number;
}

interface BulkImageUploadProps {
  onSuccess: () => void;
}

export default function BulkImageUpload({ onSuccess }: BulkImageUploadProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newEntries: FileEntry[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const code = file.name.replace(/\.[^/.]+$/, '').toUpperCase().trim();
      const preview = URL.createObjectURL(file);
      newEntries.push({ file, preview, code });
    }
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.code));
      return [...prev, ...newEntries.filter((e) => !existing.has(e.code))];
    });
  }

  function removeEntry(code: string) {
    setEntries((prev) => prev.filter((e) => e.code !== code));
  }

  async function handleUpload() {
    if (!entries.length) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const entry of entries) formData.append('files', entry.file, entry.file.name);

      const res = await fetch('/api/admin/products/import-images', { method: 'POST', body: formData });
      const data: UploadResult = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Upload fallito');

      setResult(data);
      if (data.uploaded > 0) {
        toast.success(`${data.uploaded} foto caricate con successo`);
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il caricamento');
    } finally {
      setIsUploading(false);
    }
  }

  function reset() {
    entries.forEach((e) => URL.revokeObjectURL(e.preview));
    setEntries([]);
    setResult(null);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {result.uploaded > 0 ? (
            <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
          ) : (
            <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-primary">Caricamento completato</p>
            <p className="text-sm text-gray-500">
              {result.uploaded} foto caricate · {result.notFound.length} codici non trovati · {result.errors.length} errori
            </p>
          </div>
        </div>

        {result.notFound.length > 0 && (
          <div className="border border-amber-200 rounded bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-700 mb-1">Codici non trovati nel DB:</p>
            <div className="flex flex-wrap gap-1.5">
              {result.notFound.map((code) => (
                <span key={code} className="px-2 py-0.5 bg-white border border-amber-200 rounded text-2xs font-mono text-amber-700">{code}</span>
              ))}
            </div>
          </div>
        )}

        {result.errors.length > 0 && (
          <div className="border border-red-100 rounded bg-red-50 p-3">
            <p className="text-xs font-medium text-red-600 mb-1">Errori:</p>
            {result.errors.map((e, i) => (
              <p key={i} className="text-2xs text-red-600">{e.file}: {e.message}</p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={reset}>Carica altri file</Button>
          <Button onClick={onSuccess}>Fine</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone / file picker */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-cream/50 transition-all"
      >
        <ImagePlus size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-medium text-primary mb-1">Seleziona le immagini</p>
        <p className="text-xs text-gray-400">Il nome del file deve corrispondere al codice prodotto</p>
        <p className="text-2xs text-gray-300 mt-1">es. HUBM300007830.jpg → prodotto con codice HUBM300007830</p>
        <button className="mt-4 px-4 py-2 text-xs font-semibold bg-primary text-background rounded hover:bg-warm-darker transition-colors">
          Sfoglia file
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-primary">{entries.length} file selezionati:</p>
          {entries.map((entry) => (
            <div key={entry.code} className="flex items-center gap-3 p-2 border border-border rounded bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.preview} alt={entry.code} className="w-10 h-10 object-cover rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-primary truncate">{entry.code}</p>
                <p className="text-2xs text-gray-400 truncate">{entry.file.name}</p>
              </div>
              <button onClick={() => removeEntry(entry.code)} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={reset} disabled={!entries.length}>Azzera</Button>
        <Button
          onClick={handleUpload}
          disabled={!entries.length || isUploading}
          icon={isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        >
          {isUploading ? 'Caricamento...' : `Carica ${entries.length} foto`}
        </Button>
      </div>
    </div>
  );
}
