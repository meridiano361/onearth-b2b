'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

const schema = z.object({
  // Anagrafica
  code: z.string().min(1, 'Codice obbligatorio'),
  name: z.string().min(1, 'Descrizione obbligatoria'),
  misura: z.string().optional(),
  produttore: z.string().optional(),
  // Classificazione
  gruppoMerceologico: z.string().optional(),
  famiglia: z.string().optional(),
  classe: z.string().optional(),
  sottoclasse: z.string().optional(),
  gruppoOmogeneo: z.string().optional(),
  nomLinea: z.string().optional(),
  stagione: z.string().optional(),
  collezione: z.string().optional(),
  colore: z.string().optional(),
  temaColore: z.string().optional(),
  // Prezzi e logistica
  lotSize: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  costPrice: z.string().min(1, 'Obbligatorio').transform(Number),
  retailPrice: z.string().min(1, 'Obbligatorio').transform(Number),
  fasciaRicarico: z.string().optional(),
  notes: z.string().optional(),
  // Foto
  imageUrl: z.string().optional(),
  // Stato
  isActive: z.boolean().default(true),
});

type FormValues = z.input<typeof schema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-semibold tracking-widest uppercase text-gray-400 mb-3 pt-1">
      {children}
    </p>
  );
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: product
      ? {
          code: product.code,
          name: product.name,
          misura: product.misura || '',
          produttore: product.produttore || '',
          gruppoMerceologico: product.gruppoMerceologico || '',
          famiglia: product.famiglia || '',
          classe: product.classe || '',
          sottoclasse: product.sottoclasse || '',
          gruppoOmogeneo: product.gruppoOmogeneo || '',
          nomLinea: product.nomLinea || '',
          stagione: product.stagione || '',
          collezione: product.collezione || '',
          colore: product.colore || '',
          temaColore: product.temaColore || '',
          lotSize: String(product.lotSize),
          costPrice: String(product.costPrice),
          retailPrice: String(product.retailPrice),
          fasciaRicarico: product.fasciaRicarico || '',
          notes: product.notes || '',
          imageUrl: product.imageUrl || '',
          isActive: product.isActive,
        }
      : { isActive: true, lotSize: '1' },
  });

  const watchedImageUrl = watch('imageUrl');
  useEffect(() => {
    setImagePreview((prev) => {
      if (watchedImageUrl && watchedImageUrl !== prev) return watchedImageUrl;
      if (!watchedImageUrl) return '';
      return prev;
    });
  }, [watchedImageUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Caricamento fallito');
      }

      const { url } = await res.json();
      setValue('imageUrl', url, { shouldDirty: true });
      toast.success('Immagine caricata');
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il caricamento');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const parsed = schema.parse(values);
      const url = isEdit ? `/api/products/${product!.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed,
          misura: parsed.misura || null,
          produttore: parsed.produttore || null,
          gruppoMerceologico: parsed.gruppoMerceologico || null,
          famiglia: parsed.famiglia || null,
          classe: parsed.classe || null,
          sottoclasse: parsed.sottoclasse || null,
          gruppoOmogeneo: parsed.gruppoOmogeneo || null,
          nomLinea: parsed.nomLinea || null,
          stagione: parsed.stagione || null,
          collezione: parsed.collezione || null,
          colore: parsed.colore || null,
          temaColore: parsed.temaColore || null,
          fasciaRicarico: parsed.fasciaRicarico || null,
          notes: parsed.notes || null,
          imageUrl: parsed.imageUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(isEdit ? 'Prodotto aggiornato' : 'Prodotto creato');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Impossibile salvare il prodotto');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* ── Anagrafica ── */}
      <SectionLabel>Anagrafica</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Codice *"
          {...register('code')}
          error={errors.code?.message}
          placeholder="OE-CAT-001"
        />
        <Input
          label="Descrizione *"
          {...register('name')}
          error={errors.name?.message}
          placeholder="es. Copritavolo GEOMETRIC 140x240"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Misure"
          {...register('misura')}
          placeholder="es. 40x40 cm"
        />
        <Input
          label="Produttore"
          {...register('produttore')}
          placeholder="Nome del produttore"
        />
      </div>

      {/* ── Classificazione Prodotto ── */}
      <SectionLabel>Classificazione Prodotto</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Gruppo merceologico"
          {...register('gruppoMerceologico')}
          placeholder="es. Tessili casa"
        />
        <Input
          label="Famiglia"
          {...register('famiglia')}
          placeholder="es. Prodotti tessili"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Classe"
          {...register('classe')}
          placeholder="es. Tavola"
        />
        <Input
          label="Sottoclasse"
          {...register('sottoclasse')}
          placeholder="es. Tovaglie"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Gruppo omogeneo"
          {...register('gruppoOmogeneo')}
          placeholder="es. Tovaglie stampate"
        />
        <Input
          label="Linea"
          {...register('nomLinea')}
          placeholder="es. GEOMETRIC, WAVES"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Stagione"
          {...register('stagione')}
          placeholder="es. PE25, AI25"
        />
        <Input
          label="Collezione"
          {...register('collezione')}
          placeholder="es. Spring Collection 2025"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Colore"
          {...register('colore')}
          placeholder="es. blu/bianco, naturale"
        />
        <Input
          label="Tema colore"
          {...register('temaColore')}
          placeholder="es. Neutri, Vivaci"
        />
      </div>

      {/* ── Prezzi e Logistica ── */}
      <SectionLabel>Prezzi e Logistica</SectionLabel>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Confezione"
          type="number"
          min="1"
          {...register('lotSize')}
          placeholder="1"
        />
        <Input
          label="Prezzo costo i.e. (€) *"
          type="number"
          step="0.01"
          {...register('costPrice')}
          error={errors.costPrice?.message}
          placeholder="0.00"
        />
        <Input
          label="Prezzo vendita i.i. (€) *"
          type="number"
          step="0.01"
          {...register('retailPrice')}
          error={errors.retailPrice?.message}
          placeholder="0.00"
        />
      </div>
      <Input
        label="Fascia di ricarico"
        {...register('fasciaRicarico')}
        placeholder="es. Bassa, Media, Alta"
      />
      <Input
        label="Note"
        {...register('notes')}
        placeholder="Note aggiuntive sul prodotto..."
      />

      {/* ── Foto ── */}
      <SectionLabel>Foto</SectionLabel>
      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div className="w-24 h-24 flex-shrink-0 border border-border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imagePreview}
              src={imagePreview}
              alt="Anteprima prodotto"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-gray-300 text-xs text-center leading-tight px-1">
              Nessuna<br />immagine
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading
              ? 'Caricamento...'
              : imagePreview
                ? 'Cambia immagine'
                : 'Carica immagine'}
          </Button>

          {imagePreview && (
            <button
              type="button"
              onClick={() => setValue('imageUrl', '', { shouldDirty: true })}
              className="text-xs text-red-500 hover:text-red-700 text-left"
            >
              Rimuovi immagine
            </button>
          )}

          <Input
            {...register('imageUrl')}
            placeholder="oppure incolla un URL esterno..."
            hint="JPG, PNG, WebP — max 5MB"
          />
        </div>
      </div>

      {/* ── Stato ── */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="w-4 h-4 accent-accent"
        />
        <label htmlFor="isActive" className="text-sm text-primary">
          Attivo (visibile a catalogo)
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salva Modifiche' : 'Crea Prodotto'}
        </Button>
      </div>
    </form>
  );
}
