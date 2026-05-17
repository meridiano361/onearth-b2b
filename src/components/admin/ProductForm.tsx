'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Product, Category } from '@/types';

const schema = z.object({
  code: z.string().min(1, 'Codice obbligatorio'),
  name: z.string().min(1, 'Nome obbligatorio'),
  description: z.string().optional(),
  costPrice: z.string().min(1, 'Obbligatorio').transform(Number),
  retailPrice: z.string().min(1, 'Obbligatorio').transform(Number),
  lotSize: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  famiglia: z.string().optional(),
  sottofamiglia: z.string().optional(),
  colore: z.string().optional(),
  nomLinea: z.string().optional(),
  misura: z.string().optional(),
  produttore: z.string().optional(),
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

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const categories: Category[] = categoriesData?.data || [];

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
          description: product.description || '',
          costPrice: String(product.costPrice),
          retailPrice: String(product.retailPrice),
          lotSize: String(product.lotSize),
          categoryId: product.categoryId || '',
          notes: product.notes || '',
          imageUrl: product.imageUrl || '',
          isActive: product.isActive,
          famiglia: product.famiglia || '',
          sottofamiglia: product.sottofamiglia || '',
          colore: product.colore || '',
          nomLinea: product.nomLinea || '',
          misura: product.misura || '',
          produttore: product.produttore || '',
        }
      : { isActive: true, lotSize: '1' },
  });

  const watchedImageUrl = watch('imageUrl');
  // Sync preview with the URL input field (debounced via useEffect)
  useEffect(() => {
    // Only update preview if it differs from the current URL (avoids resetting after onError)
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
      // Reset input so the same file can be re-selected
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
          categoryId: parsed.categoryId || null,
          description: parsed.description || null,
          notes: parsed.notes || null,
          imageUrl: parsed.imageUrl || null,
          famiglia: parsed.famiglia || null,
          sottofamiglia: parsed.sottofamiglia || null,
          colore: parsed.colore || null,
          nomLinea: parsed.nomLinea || null,
          misura: parsed.misura || null,
          produttore: parsed.produttore || null,
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
      {/* Identificazione */}
      <SectionLabel>Identificazione</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Codice Prodotto *"
          {...register('code')}
          error={errors.code?.message}
          placeholder="OE-CAT-001"
        />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
            Categoria
          </label>
          <select
            {...register('categoryId')}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Nessuna categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Nome Prodotto *"
        {...register('name')}
        error={errors.name?.message}
        placeholder="Divano Anima 3 Posti"
      />

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          Descrizione
        </label>
        <textarea
          {...register('description')}
          rows={2}
          className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent resize-none"
          placeholder="Descrizione del prodotto..."
        />
      </div>

      {/* Prezzi */}
      <SectionLabel>Prezzi e logistica</SectionLabel>
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Prezzo Costo (€) *"
          type="number"
          step="0.01"
          {...register('costPrice')}
          error={errors.costPrice?.message}
          placeholder="0.00"
        />
        <Input
          label="Prezzo Vendita (€) *"
          type="number"
          step="0.01"
          {...register('retailPrice')}
          error={errors.retailPrice?.message}
          placeholder="0.00"
        />
        <Input
          label="Qtà per Lotto"
          type="number"
          min="1"
          {...register('lotSize')}
          placeholder="1"
        />
      </div>

      {/* Classificazione */}
      <SectionLabel>Classificazione prodotto</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Famiglia"
          {...register('famiglia')}
          placeholder="es. Prodotti tessili casa"
        />
        <Input
          label="Sottofamiglia"
          {...register('sottofamiglia')}
          placeholder="es. Tessili tavola e cucina"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nome Linea"
          {...register('nomLinea')}
          placeholder="es. GEOMETRIC, WAVES, RAGGI"
        />
        <Input
          label="Colore"
          {...register('colore')}
          placeholder="es. blu/bianco, naturale"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Misura"
          {...register('misura')}
          placeholder="es. 40x40 cm"
        />
        <Input
          label="Produttore"
          {...register('produttore')}
          placeholder="Nome del produttore"
        />
      </div>

      {/* Extra */}
      <SectionLabel>Informazioni aggiuntive</SectionLabel>
      <Input
        label="Note"
        {...register('notes')}
        placeholder="Disponibile in 6 opzioni tessuto..."
      />

      {/* Immagine */}
      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          Immagine Prodotto
        </label>
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
              hint="JPG, PNG, WebP, GIF — max 5MB"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="w-4 h-4 accent-accent"
        />
        <label htmlFor="isActive" className="text-sm text-primary">Attivo (visibile in catalogo)</label>
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
