'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ManagedSelect from '@/components/admin/ManagedSelect';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

const IVA_OPTIONS = [0, 4, 5, 10, 22];

const schema = z
  .object({
    code: z.string().min(1, 'Codice obbligatorio'),
    name: z.string().min(1, 'Descrizione obbligatoria'),
    misura: z.string().optional(),
    produttore: z.string().optional(),
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
    lotSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    iva: z.string().default('22').transform(Number),
    costPrice: z.string().min(1, 'Obbligatorio').transform(Number),
    retailPrice: z.string().min(1, 'Obbligatorio').transform(Number),
    fasciaRicarico: z.string().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (d) => {
      if (!d.costPrice || !d.retailPrice) return true;
      return d.retailPrice >= d.costPrice * (1 + d.iva / 100) - 0.001;
    },
    {
      message: 'Prezzo vendita i.i. inferiore al costo × (1 + IVA%)',
      path: ['retailPrice'],
    }
  );

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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <div className="h-9 bg-gray-50 border border-dashed border-border rounded px-3 flex items-center text-sm font-semibold text-accent">
        {value}
      </div>
    </div>
  );
}

function CascadeSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (nome: string, id: string) => void;
  options: { id: string; nome: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const selected = options.find((o) => o.nome === e.target.value);
          onChange(e.target.value, selected?.id ?? '');
        }}
        className="w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.nome}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);

  // IDs for cascade filtering
  const [gmId, setGmId] = useState('');
  const [famId, setFamId] = useState('');
  const [clsId, setClsId] = useState('');
  const [scId, setScId] = useState('');

  // ── Hierarchy queries ─────────────────────────────────────────
  const { data: gmData } = useQuery({
    queryKey: ['cls', 'gruppoMerceologico'],
    queryFn: () =>
      fetch('/api/classificazione/gruppoMerceologico').then((r) => r.json()) as Promise<{
        data: { id: string; nome: string }[];
      }>,
  });

  const { data: famData } = useQuery({
    queryKey: ['cls', 'famiglia', gmId],
    queryFn: () =>
      fetch(`/api/classificazione/famiglia?parentId=${gmId}`).then((r) => r.json()) as Promise<{
        data: { id: string; nome: string }[];
      }>,
    enabled: !!gmId,
  });

  const { data: clsData } = useQuery({
    queryKey: ['cls', 'classe', famId],
    queryFn: () =>
      fetch(`/api/classificazione/classe?parentId=${famId}`).then((r) => r.json()) as Promise<{
        data: { id: string; nome: string }[];
      }>,
    enabled: !!famId,
  });

  const { data: scData } = useQuery({
    queryKey: ['cls', 'sottoclasse', clsId],
    queryFn: () =>
      fetch(`/api/classificazione/sottoclasse?parentId=${clsId}`).then((r) => r.json()) as Promise<{
        data: { id: string; nome: string }[];
      }>,
    enabled: !!clsId,
  });

  const { data: goData } = useQuery({
    queryKey: ['cls', 'gruppoOmogeneo', scId],
    queryFn: () =>
      fetch(`/api/classificazione/gruppoOmogeneo?parentId=${scId}`).then((r) => r.json()) as Promise<{
        data: { id: string; nome: string }[];
      }>,
    enabled: !!scId,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
          iva: String(product.iva ?? 22),
          costPrice: String(product.costPrice),
          retailPrice: String(product.retailPrice),
          fasciaRicarico: product.fasciaRicarico || '',
          notes: product.notes || '',
          imageUrl: product.imageUrl || '',
          isActive: product.isActive,
        }
      : { isActive: true, lotSize: '1', iva: '22' },
  });

  // ── Edit mode: resolve hierarchy IDs from stored names ────────
  useEffect(() => {
    if (!isEdit || !product?.gruppoMerceologico || !gmData?.data) return;
    const found = gmData.data.find((g) => g.nome === product.gruppoMerceologico);
    if (found) setGmId(found.id);
  }, [gmData]);

  useEffect(() => {
    if (!isEdit || !product?.famiglia || !famData?.data) return;
    const found = famData.data.find((f) => f.nome === product.famiglia);
    if (found) setFamId(found.id);
  }, [famData]);

  useEffect(() => {
    if (!isEdit || !product?.classe || !clsData?.data) return;
    const found = clsData.data.find((c) => c.nome === product.classe);
    if (found) setClsId(found.id);
  }, [clsData]);

  useEffect(() => {
    if (!isEdit || !product?.sottoclasse || !scData?.data) return;
    const found = scData.data.find((s) => s.nome === product.sottoclasse);
    if (found) setScId(found.id);
  }, [scData]);

  // ── Cascade handlers ──────────────────────────────────────────
  function handleGmChange(nome: string, id: string) {
    setValue('gruppoMerceologico', nome);
    setGmId(id);
    setValue('famiglia', ''); setFamId('');
    setValue('classe', '');   setClsId('');
    setValue('sottoclasse', ''); setScId('');
    setValue('gruppoOmogeneo', '');
  }

  function handleFamChange(nome: string, id: string) {
    setValue('famiglia', nome);
    setFamId(id);
    setValue('classe', '');   setClsId('');
    setValue('sottoclasse', ''); setScId('');
    setValue('gruppoOmogeneo', '');
  }

  function handleClsChange(nome: string, id: string) {
    setValue('classe', nome);
    setClsId(id);
    setValue('sottoclasse', ''); setScId('');
    setValue('gruppoOmogeneo', '');
  }

  function handleScChange(nome: string, id: string) {
    setValue('sottoclasse', nome);
    setScId(id);
    setValue('gruppoOmogeneo', '');
  }

  // ── Image preview sync ────────────────────────────────────────
  const watchedImageUrl = watch('imageUrl');
  const watchedCost = watch('costPrice');
  const watchedRetail = watch('retailPrice');
  const watchedIva = watch('iva');

  useEffect(() => {
    setImagePreview((prev) => {
      if (watchedImageUrl && watchedImageUrl !== prev) return watchedImageUrl;
      if (!watchedImageUrl) return '';
      return prev;
    });
  }, [watchedImageUrl]);

  const costNum = parseFloat(String(watchedCost || 0)) || 0;
  const retailNum = parseFloat(String(watchedRetail || 0)) || 0;
  const ivaNum = parseInt(String(watchedIva || 22), 10) || 0;
  const pvn = retailNum / (1 + ivaNum / 100);
  const ricarico = costNum > 0 ? ((pvn - costNum) / costNum) * 100 : null;
  const margine = pvn > 0 ? ((pvn - costNum) / pvn) * 100 : null;
  const fmtPct = (v: number | null) =>
    v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

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
    const v = values as unknown as z.output<typeof schema>;
    try {
      const url = isEdit ? `/api/products/${product!.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...v,
          misura: v.misura || null,
          produttore: v.produttore || null,
          gruppoMerceologico: v.gruppoMerceologico || null,
          famiglia: v.famiglia || null,
          classe: v.classe || null,
          sottoclasse: v.sottoclasse || null,
          gruppoOmogeneo: v.gruppoOmogeneo || null,
          nomLinea: v.nomLinea || null,
          stagione: v.stagione || null,
          collezione: v.collezione || null,
          colore: v.colore || null,
          temaColore: v.temaColore || null,
          fasciaRicarico: v.fasciaRicarico || null,
          notes: v.notes || null,
          imageUrl: v.imageUrl || null,
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

  const selectClass =
    'w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';
  const priceInputClass =
    'w-full h-9 border border-border rounded pl-7 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent';

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
        <ManagedSelect
          entita="misura"
          label="Misure"
          value={watch('misura') || ''}
          onChange={(v) => setValue('misura', v)}
        />
        <ManagedSelect
          entita="produttore"
          label="Produttore"
          value={watch('produttore') || ''}
          onChange={(v) => setValue('produttore', v)}
        />
      </div>

      {/* ── Classificazione gerarchica ── */}
      <SectionLabel>Classificazione</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <CascadeSelect
          label="Gruppo merceologico"
          value={watch('gruppoMerceologico') || ''}
          onChange={handleGmChange}
          options={gmData?.data || []}
        />
        <CascadeSelect
          label="Famiglia"
          value={watch('famiglia') || ''}
          onChange={handleFamChange}
          options={famData?.data || []}
          disabled={!gmId}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <CascadeSelect
          label="Classe"
          value={watch('classe') || ''}
          onChange={handleClsChange}
          options={clsData?.data || []}
          disabled={!famId}
        />
        <CascadeSelect
          label="Sottoclasse"
          value={watch('sottoclasse') || ''}
          onChange={handleScChange}
          options={scData?.data || []}
          disabled={!clsId}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <CascadeSelect
          label="Gruppo omogeneo"
          value={watch('gruppoOmogeneo') || ''}
          onChange={(nome) => setValue('gruppoOmogeneo', nome)}
          options={goData?.data || []}
          disabled={!scId}
        />
        <ManagedSelect
          entita="linea"
          label="Linea"
          value={watch('nomLinea') || ''}
          onChange={(v) => setValue('nomLinea', v)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ManagedSelect
          entita="stagione"
          label="Stagione"
          value={watch('stagione') || ''}
          onChange={(v) => setValue('stagione', v)}
        />
        <ManagedSelect
          entita="collezione"
          label="Collezione"
          value={watch('collezione') || ''}
          onChange={(v) => setValue('collezione', v)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ManagedSelect
          entita="colore"
          label="Colore"
          value={watch('colore') || ''}
          onChange={(v) => setValue('colore', v)}
        />
        <ManagedSelect
          entita="temaColore"
          label="Tema colore"
          value={watch('temaColore') || ''}
          onChange={(v) => setValue('temaColore', v)}
        />
      </div>

      {/* ── Prezzi e Logistica ── */}
      <SectionLabel>Prezzi e Logistica</SectionLabel>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Confezione"
          type="number"
          min="1"
          step="1"
          {...register('lotSize')}
          placeholder="1"
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">IVA (%)</label>
          <select {...register('iva')} className={selectClass}>
            {IVA_OPTIONS.map((v) => (
              <option key={v} value={String(v)}>
                {v}%
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Prezzo costo i.e. (€) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('costPrice')}
              className={priceInputClass}
              placeholder="0.00"
            />
          </div>
          {errors.costPrice && (
            <p className="text-xs text-red-500 mt-0.5">{errors.costPrice.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Prezzo vendita i.i. (€) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('retailPrice')}
              className={priceInputClass}
              placeholder="0.00"
            />
          </div>
          {errors.retailPrice && (
            <p className="text-xs text-red-500 mt-0.5">{errors.retailPrice.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ReadOnlyField label="% Ricarico" value={fmtPct(ricarico)} />
        <ReadOnlyField label="% Margine" value={fmtPct(margine)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ManagedSelect
          entita="fasciaRicarico"
          label="Fascia di ricarico"
          value={watch('fasciaRicarico') || ''}
          onChange={(v) => setValue('fasciaRicarico', v)}
        />
        <Input
          label="Note"
          {...register('notes')}
          placeholder="Note aggiuntive..."
        />
      </div>

      {/* ── Foto ── */}
      <SectionLabel>Foto</SectionLabel>
      <div className="flex gap-4 items-start">
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
              Nessuna
              <br />
              immagine
            </span>
          )}
        </div>

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
            {isUploading ? 'Caricamento...' : imagePreview ? 'Cambia immagine' : 'Carica immagine'}
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
