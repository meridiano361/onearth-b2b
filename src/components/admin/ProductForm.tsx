'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, Loader2, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import PaeseSelect from '@/components/ui/PaeseSelect';
import Combobox from '@/components/ui/Combobox';
import toast from 'react-hot-toast';
import type { Product } from '@/types';
import {
  MODA_GRUPPO_MERCEOLOGICO,
  MODA_FAMIGLIE,
  getModaClassi,
  getModaSottoclassi,
  getModaGruppiOmogenei,
} from '@/lib/modaTassonomia';

const IVA_OPTIONS = [0, 4, 5, 10, 22];

const schema = z
  .object({
    code: z.string().min(1, 'Codice obbligatorio'),
    name: z.string().min(1, 'Nome obbligatorio'),
    description: z.string().optional(),
    misura: z.string().optional(),
    produttore: z.string().optional(),
    gruppoMerceologico: z.string().optional(),
    famiglia: z.string().optional(),
    classe: z.string().optional(),
    classe2: z.string().optional(),
    sottoclasse: z.string().optional(),
    sottoclasse2: z.string().optional(),
    gruppoOmogeneo: z.string().optional(),
    gruppoOmogeneo2: z.string().optional(),
    nomLinea: z.string().optional(),
    stagione: z.string().optional(),
    collezione: z.string().optional(),
    colore: z.string().optional(),
    temaColore: z.string().optional(),
    temaColore2: z.string().optional(),
    temaColore3: z.string().optional(),
    temaColore4: z.string().optional(),
    temaColore5: z.string().optional(),
    lotSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    iva: z.string().default('22').transform(Number),
    costPrice: z.string().min(1, 'Obbligatorio').transform(Number),
    retailPrice: z.string().min(1, 'Obbligatorio').transform(Number),
    fasciaRicarico: z.string().optional(),
    fasciaSconto: z.string().optional(),
    tranche: z.string().optional(),
    paese: z.string().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
    imageUrl2: z.string().optional(),
    imageUrl3: z.string().optional(),
    imageUrl4: z.string().optional(),
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

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  const fileInputRef4 = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const [isUploading3, setIsUploading3] = useState(false);
  const [isUploading4, setIsUploading4] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          code: product.code,
          name: product.name,
          description: product.description || '',
          misura: product.misura || '',
          produttore: product.produttore || '',
          gruppoMerceologico: product.gruppoMerceologico || '',
          famiglia: product.famiglia || '',
          classe: product.classe || '',
          classe2: (product as any).classe2 || '',
          sottoclasse: product.sottoclasse || '',
          sottoclasse2: (product as any).sottoclasse2 || '',
          gruppoOmogeneo: product.gruppoOmogeneo || '',
          gruppoOmogeneo2: (product as any).gruppoOmogeneo2 || '',
          nomLinea: product.nomLinea || '',
          stagione: product.stagione || '',
          collezione: product.collezione || '',
          colore: product.colore || '',
          temaColore: product.temaColore || '',
          temaColore2: product.temaColore2 || '',
          temaColore3: product.temaColore3 || '',
          temaColore4: product.temaColore4 || '',
          temaColore5: product.temaColore5 || '',
          lotSize: String(product.lotSize),
          iva: String(product.iva ?? 22),
          costPrice: String(product.costPrice),
          retailPrice: String(product.retailPrice),
          fasciaRicarico: product.fasciaRicarico || '',
          fasciaSconto: product.fasciaSconto != null ? String(product.fasciaSconto) : '',
          tranche: product.tranche || '',
          paese: product.paese || '',
          notes: product.notes || '',
          imageUrl: product.imageUrl || '',
          imageUrl2: product.imageUrl2 || '',
          imageUrl3: product.imageUrl3 || '',
          imageUrl4: product.imageUrl4 || '',
          isActive: product.isActive,
        }
      : { isActive: true, lotSize: '1', iva: '22' },
  });

  // ── Gruppo merceologico options from classification tables ────
  const { data: gmOptions } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['cls-gm-options'],
    queryFn: async () => {
      const res = await fetch('/api/classificazione/gruppoMerceologico');
      return (await res.json()).data as { id: string; nome: string }[];
    },
    staleTime: 60_000,
  });

  // ── MODA dependent selects ────────────────────────────────────
  const watchedGm = watch('gruppoMerceologico');
  const watchedFamiglia = watch('famiglia');
  const watchedClasse = watch('classe');
  const watchedSottoclasse = watch('sottoclasse');
  const isModa = watchedGm === MODA_GRUPPO_MERCEOLOGICO;

  const modaClassi = isModa ? getModaClassi(watchedFamiglia || '') : [];
  const modaSottoclassi = isModa ? getModaSottoclassi(watchedFamiglia || '', watchedClasse || '') : [];
  const modaGruppiOmogenei = isModa ? getModaGruppiOmogenei(watchedFamiglia || '', watchedClasse || '', watchedSottoclasse || '') : [];

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
  const pvn = retailNum > 0 ? retailNum / (1 + ivaNum / 100) : 0;
  const ricarico = costNum > 0 && pvn > 0 ? ((pvn - costNum) / costNum) * 100 : null;
  const margine = pvn > 0 ? ((pvn - costNum) / pvn) * 100 : null;
  const fmtPct = (v: number | null) =>
    v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  // Pre-computed register objects so we can override onChange
  const costPriceReg = register('costPrice');
  const retailPriceReg = register('retailPrice');
  const ivaReg = register('iva');
  const fasciaScReg = register('fasciaSconto');

  async function uploadFile(
    file: File,
    field: 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4',
    setLoading: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Caricamento fallito');
      }
      const { url } = await res.json();
      setValue(field, url, { shouldDirty: true });
      toast.success('Immagine caricata');
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, 'imageUrl', setIsUploading, fileInputRef);
  }
  function handleFileChange2(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, 'imageUrl2', setIsUploading2, fileInputRef2);
  }
  function handleFileChange3(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, 'imageUrl3', setIsUploading3, fileInputRef3);
  }
  function handleFileChange4(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, 'imageUrl4', setIsUploading4, fileInputRef4);
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
          skipNameNormalization: isEdit,
          description: (v as any).description || null,
          misura: v.misura || null,
          produttore: v.produttore || null,
          gruppoMerceologico: v.gruppoMerceologico || null,
          famiglia: v.famiglia || null,
          classe: v.classe || null,
          classe2: (v as any).classe2 || null,
          sottoclasse: v.sottoclasse || null,
          sottoclasse2: (v as any).sottoclasse2 || null,
          gruppoOmogeneo: v.gruppoOmogeneo || null,
          gruppoOmogeneo2: (v as any).gruppoOmogeneo2 || null,
          nomLinea: v.nomLinea || null,
          stagione: v.stagione || null,
          collezione: v.collezione || null,
          colore: v.colore || null,
          temaColore: v.temaColore || null,
          temaColore2: (v as any).temaColore2 || null,
          temaColore3: (v as any).temaColore3 || null,
          temaColore4: (v as any).temaColore4 || null,
          temaColore5: (v as any).temaColore5 || null,
          fasciaRicarico: v.fasciaRicarico || null,
          fasciaSconto: v.fasciaSconto ? parseFloat(v.fasciaSconto) || null : null,
          tranche: v.tranche || null,
          paese: v.paese || null,
          notes: v.notes || null,
          imageUrl: v.imageUrl || null,
          imageUrl2: v.imageUrl2 || null,
          imageUrl3: v.imageUrl3 || null,
          imageUrl4: v.imageUrl4 || null,
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
          label="Nome prodotto *"
          {...register('name')}
          error={errors.name?.message}
          placeholder="es. Copritavolo GEOMETRIC 140x240"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione (IT)</label>
        <textarea
          {...register('description')}
          placeholder="Descrizione italiana del prodotto..."
          rows={3}
          className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Misure"
          {...register('misura')}
          placeholder="es. 30x40 cm"
        />
        <Combobox
          label="Produttore"
          field="produttore"
          value={watch('produttore') || ''}
          onChange={(v) => setValue('produttore', v)}
        />
      </div>
      <PaeseSelect
        label="Paese di origine"
        value={watch('paese') || ''}
        onChange={(v) => setValue('paese', v)}
      />

      {/* ── Classificazione gerarchica ── */}
      <SectionLabel>Classificazione</SectionLabel>

      {/* Gruppo merceologico — select da tabelle classificazione */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gruppo merceologico</label>
          <select
            value={watch('gruppoMerceologico') || ''}
            onChange={(e) => {
              setValue('gruppoMerceologico', e.target.value);
              // Cascade reset dei livelli inferiori al cambio GM
              setValue('famiglia', '');
              setValue('classe', '');
              setValue('sottoclasse', '');
              setValue('gruppoOmogeneo', '');
            }}
            className={selectClass}
          >
            <option value="">— nessuno —</option>
            {gmOptions?.map((gm) => (
              <option key={gm.id} value={gm.nome}>{gm.nome}</option>
            ))}
          </select>
        </div>

        {/* Famiglia */}
        {isModa ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Famiglia</label>
            <select
              value={watchedFamiglia || ''}
              onChange={(e) => {
                setValue('famiglia', e.target.value);
                setValue('classe', '');
                setValue('sottoclasse', '');
                setValue('gruppoOmogeneo', '');
              }}
              className={selectClass}
            >
              <option value="">— seleziona —</option>
              {MODA_FAMIGLIE.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        ) : (
          <Combobox
            label="Famiglia"
            field="famiglia"
            value={watch('famiglia') || ''}
            onChange={(v) => setValue('famiglia', v)}
          />
        )}
      </div>

      {/* Classe + Sottoclasse */}
      <div className="grid grid-cols-2 gap-4">
        {isModa ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
            <select
              value={watchedClasse || ''}
              onChange={(e) => {
                setValue('classe', e.target.value);
                setValue('sottoclasse', '');
                setValue('gruppoOmogeneo', '');
              }}
              disabled={!watchedFamiglia}
              className={selectClass}
            >
              <option value="">— seleziona —</option>
              {modaClassi.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ) : (
          <Combobox
            label="Classe"
            field="classe"
            value={watch('classe') || ''}
            onChange={(v) => setValue('classe', v)}
          />
        )}

        {isModa ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sottoclasse</label>
            <select
              value={watchedSottoclasse || ''}
              onChange={(e) => {
                setValue('sottoclasse', e.target.value);
                setValue('gruppoOmogeneo', '');
              }}
              disabled={!watchedClasse || modaSottoclassi.length === 0}
              className={selectClass}
            >
              <option value="">
                {modaSottoclassi.length === 0 && watchedClasse ? '— nessuna sottoclasse —' : '— seleziona —'}
              </option>
              {modaSottoclassi.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ) : (
          <Combobox
            label="Sottoclasse"
            field="sottoclasse"
            value={watch('sottoclasse') || ''}
            onChange={(v) => setValue('sottoclasse', v)}
          />
        )}
      </div>

      {/* Gruppo omogeneo — solo MODA mostra select dipendente */}
      <div className="grid grid-cols-2 gap-4">
        {isModa ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gruppo omogeneo</label>
            <select
              value={watch('gruppoOmogeneo') || ''}
              onChange={(e) => setValue('gruppoOmogeneo', e.target.value)}
              disabled={!watchedSottoclasse || modaGruppiOmogenei.length === 0}
              className={selectClass}
            >
              <option value="">
                {modaGruppiOmogenei.length === 0 && watchedSottoclasse ? '— nessuno —' : '— seleziona —'}
              </option>
              {modaGruppiOmogenei.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        ) : (
          <Combobox
            label="Gruppo omogeneo"
            field="gruppoOmogeneo"
            value={watch('gruppoOmogeneo') || ''}
            onChange={(v) => setValue('gruppoOmogeneo', v)}
          />
        )}
        <Combobox
          label="Linea"
          field="nomLinea"
          value={watch('nomLinea') || ''}
          onChange={(v) => setValue('nomLinea', v)}
        />
      </div>

      {/* Classe 2 / Sottoclasse 2 / Gruppo omogeneo 2 — nascosti per MODA */}
      {!isModa && (
        <div className="grid grid-cols-3 gap-4">
          <Combobox
            label="Classe 2"
            field="classe"
            value={(watch as any)('classe2') || ''}
            onChange={(v) => (setValue as any)('classe2', v)}
          />
          <Combobox
            label="Sottoclasse 2"
            field="sottoclasse"
            value={(watch as any)('sottoclasse2') || ''}
            onChange={(v) => (setValue as any)('sottoclasse2', v)}
          />
          <Combobox
            label="Gruppo omogeneo 2"
            field="gruppoOmogeneo"
            value={(watch as any)('gruppoOmogeneo2') || ''}
            onChange={(v) => (setValue as any)('gruppoOmogeneo2', v)}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Combobox
          label="Stagione"
          field="stagione"
          value={watch('stagione') || ''}
          onChange={(v) => setValue('stagione', v)}
        />
        <Combobox
          label="Collezione"
          field="collezione"
          value={watch('collezione') || ''}
          onChange={(v) => setValue('collezione', v)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Combobox label="Colore" field="colore" value={watch('colore') || ''} onChange={(v) => setValue('colore', v)} />
        <Combobox
          label="Tema colore"
          field="temaColore"
          value={watch('temaColore') || ''}
          onChange={(v) => { setValue('temaColore', v); if (!v) { setValue('temaColore2', ''); setValue('temaColore3', ''); setValue('temaColore4', ''); setValue('temaColore5', ''); } }}
        />
      </div>
      {watch('temaColore') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <Combobox label="Tema colore 2" field="temaColore" value={watch('temaColore2') || ''} onChange={(v) => { setValue('temaColore2', v); if (!v) { setValue('temaColore3', ''); setValue('temaColore4', ''); setValue('temaColore5', ''); } }} />
            </div>
            {watch('temaColore2') && <button type="button" onClick={() => { setValue('temaColore2', ''); setValue('temaColore3', ''); setValue('temaColore4', ''); setValue('temaColore5', ''); }} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
          </div>
          {watch('temaColore2') ? (
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <Combobox label="Tema colore 3" field="temaColore" value={watch('temaColore3') || ''} onChange={(v) => { setValue('temaColore3', v); if (!v) { setValue('temaColore4', ''); setValue('temaColore5', ''); } }} />
              </div>
              {watch('temaColore3') && <button type="button" onClick={() => { setValue('temaColore3', ''); setValue('temaColore4', ''); setValue('temaColore5', ''); }} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
            </div>
          ) : <div />}
        </div>
      )}
      {watch('temaColore2') && watch('temaColore3') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-end gap-1">
            <div className="flex-1">
              <Combobox label="Tema colore 4" field="temaColore" value={watch('temaColore4') || ''} onChange={(v) => { setValue('temaColore4', v); if (!v) setValue('temaColore5', ''); }} />
            </div>
            {watch('temaColore4') && <button type="button" onClick={() => { setValue('temaColore4', ''); setValue('temaColore5', ''); }} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
          </div>
          {watch('temaColore4') ? (
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <Combobox label="Tema colore 5" field="temaColore" value={watch('temaColore5') || ''} onChange={(v) => setValue('temaColore5', v)} />
              </div>
              {watch('temaColore5') && <button type="button" onClick={() => setValue('temaColore5', '')} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
            </div>
          ) : <div />}
        </div>
      )}

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
          <select
            {...ivaReg}
            onChange={(e) => {
              ivaReg.onChange(e);
              const newIva = parseInt(e.target.value, 10) || 0;
              const sconto = parseFloat(String(getValues('fasciaSconto') || ''));
              if (!isNaN(sconto) && retailNum > 0) {
                const newPvn = retailNum / (1 + newIva / 100);
                setValue('costPrice', Math.max(0, newPvn * (1 - sconto / 100)).toFixed(2));
              }
            }}
            className={selectClass}
          >
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
              {...costPriceReg}
              onChange={(e) => {
                costPriceReg.onChange(e);
                const cost = parseFloat(e.target.value);
                if (!isNaN(cost) && pvn > 0) {
                  setValue('fasciaSconto', ((1 - cost / pvn) * 100).toFixed(2));
                } else if (!e.target.value) {
                  setValue('fasciaSconto', '');
                }
              }}
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
              {...retailPriceReg}
              onChange={(e) => {
                retailPriceReg.onChange(e);
                const newRetail = parseFloat(e.target.value);
                const sconto = parseFloat(String(getValues('fasciaSconto') || ''));
                if (!isNaN(sconto) && !isNaN(newRetail) && newRetail > 0) {
                  const newPvn = newRetail / (1 + ivaNum / 100);
                  setValue('costPrice', Math.max(0, newPvn * (1 - sconto / 100)).toFixed(2));
                }
              }}
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
        <Combobox
          label="Fascia di ricarico"
          field="fasciaRicarico"
          value={watch('fasciaRicarico') || ''}
          onChange={(v) => setValue('fasciaRicarico', v)}
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fascia di sconto (%)</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...fasciaScReg}
              onChange={(e) => {
                fasciaScReg.onChange(e);
                const sconto = parseFloat(e.target.value);
                if (!isNaN(sconto) && pvn > 0) {
                  setValue('costPrice', Math.max(0, pvn * (1 - sconto / 100)).toFixed(2));
                }
              }}
              className="w-full h-9 border border-border rounded pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="es. 48"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Combobox
          label="Tranche"
          field="tranche"
          value={watch('tranche') || ''}
          onChange={(v) => setValue('tranche', v)}
        />
        <div />
      </div>
      <div>
        <Input
          label="Note"
          {...register('notes')}
          placeholder="Note aggiuntive..."
        />
      </div>

      {/* ── Foto ── */}
      <SectionLabel>Foto</SectionLabel>
      {(
        [
          { label: 'Foto 1 (principale)', field: 'imageUrl' as const, ref: fileInputRef, onChange: handleFileChange, loading: isUploading, preview: imagePreview },
          { label: 'Foto 2', field: 'imageUrl2' as const, ref: fileInputRef2, onChange: handleFileChange2, loading: isUploading2, preview: watch('imageUrl2') || '' },
          { label: 'Foto 3', field: 'imageUrl3' as const, ref: fileInputRef3, onChange: handleFileChange3, loading: isUploading3, preview: watch('imageUrl3') || '' },
          { label: 'Foto 4', field: 'imageUrl4' as const, ref: fileInputRef4, onChange: handleFileChange4, loading: isUploading4, preview: watch('imageUrl4') || '' },
        ] as const
      ).map(({ label, field, ref, onChange, loading, preview }) => (
        <div key={field} className="flex gap-3 items-start">
          <div className="w-16 h-16 flex-shrink-0 border border-border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={label} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="text-gray-300 text-2xs text-center leading-tight px-1">{label.split(' ').slice(-1)}</span>
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-2xs font-medium text-gray-500">{label}</p>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" loading={loading} onClick={() => ref.current?.click()}>
                {loading ? 'Caricamento…' : preview ? 'Cambia' : 'Carica'}
              </Button>
              {preview && (
                <button type="button" onClick={() => setValue(field, '', { shouldDirty: true })} className="text-xs text-red-500 hover:text-red-700">
                  Rimuovi
                </button>
              )}
            </div>
            <Input {...register(field)} placeholder="oppure incolla URL esterno…" />
          </div>
        </div>
      ))}

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

      <div className="flex justify-between items-center gap-3 pt-2">
        {isEdit && (
          <button
            type="button"
            disabled={isTranslating}
            onClick={async () => {
              setIsTranslating(true);
              try {
                const res = await fetch('/api/admin/products/translate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productId: product!.id }),
                });
                if (!res.ok) throw new Error((await res.json()).error || 'Errore');
                toast.success('Descrizioni tradotte e salvate');
                queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              } catch (e: any) {
                toast.error(e.message || 'Errore nella traduzione');
              } finally {
                setIsTranslating(false);
              }
            }}
            className="flex items-center gap-1.5 text-xs border border-border rounded px-3 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors disabled:opacity-50"
          >
            {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            Traduci automaticamente
          </button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salva Modifiche' : 'Crea Prodotto'}
          </Button>
        </div>
      </div>
    </form>
  );
}
