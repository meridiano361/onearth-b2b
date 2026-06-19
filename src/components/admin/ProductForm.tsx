'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, Loader2, AlertTriangle, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import PaeseSelect from '@/components/ui/PaeseSelect';
import Combobox from '@/components/ui/Combobox';
import toast from 'react-hot-toast';
import type { Product, ProductPantoneEntry } from '@/types';
import {
  MODA_GRUPPO_MERCEOLOGICO,
  MODA_FAMIGLIE,
  getModaClassi,
  getModaSottoclassi,
  getModaGruppiOmogenei,
} from '@/lib/modaTassonomia';
import {
  FANTASIA_OPTIONS,
  MATERIALE_OPTIONS,
  TAGLIA_OPTIONS,
  CONFERENTE_OPTIONS,
  STAGIONE_OPTIONS,
} from '@/lib/productConstants';
import ProductPantoneForm from './ProductPantoneForm';

const IVA_OPTIONS = [0, 4, 5, 10, 22];

// ── Style tokens ──────────────────────────────────────────────────────────────
const lbl = 'block text-xs font-medium text-gray-600 mb-1';
const sel = 'w-full h-9 border border-border rounded px-2 text-sm text-primary bg-white focus:outline-none focus:ring-1 focus:ring-accent';
const pri = 'w-full h-9 border border-border rounded pl-7 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent';

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-2xs font-semibold tracking-widest text-gray-400 mb-3 pt-2">{children}</p>;
}

function Divider() {
  return <div className="border-t border-border/40 my-1" />;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={lbl}>{label}</p>
      <div className="h-9 bg-gray-50 border border-dashed border-border rounded px-3 flex items-center text-sm font-semibold text-accent">
        {value}
      </div>
    </div>
  );
}

// Materiale con percentuale (es. "10% Lino") — solo Moda
function MaterialFieldWithPct({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => {
    const m = (v || '').match(/^(\d+(?:\.\d+)?)\s*%\s+(.+)$/);
    return m ? { pct: m[1], mat: m[2] } : { pct: '', mat: v || '' };
  };
  const init = parse(value);
  const isCustomMat = !!init.mat && !(MATERIALE_OPTIONS as readonly string[]).includes(init.mat);
  const [pct, setPct] = useState(init.pct);
  const [selectVal, setSelectVal] = useState(isCustomMat ? 'Altro' : init.mat);
  const [custom, setCustom] = useState(isCustomMat ? init.mat : '');

  function emit(newPct: string, matName: string) {
    if (!matName) { onChange(''); return; }
    onChange(newPct ? `${newPct}% ${matName}` : matName);
  }
  const matName = selectVal === 'Altro' ? custom : selectVal;

  return (
    <div>
      <label className={lbl}>{label}</label>
      <div className="flex gap-1.5">
        <div className="relative w-20 flex-shrink-0">
          <input
            type="number" min="0" max="100" step="1"
            value={pct}
            onChange={(e) => { setPct(e.target.value); emit(e.target.value, matName); }}
            placeholder="0"
            className="w-full h-9 border border-border rounded pl-2 pr-5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
        </div>
        <div className="flex-1">
          <select
            value={selectVal}
            onChange={(e) => {
              const v = e.target.value;
              setSelectVal(v);
              if (v !== 'Altro') { setCustom(''); emit(pct, v); }
            }}
            className={sel}
          >
            <option value="">— nessuno —</option>
            {MATERIALE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="Altro">Altro</option>
          </select>
          {selectVal === 'Altro' && (
            <input
              type="text" value={custom}
              onChange={(e) => { setCustom(e.target.value); emit(pct, e.target.value); }}
              placeholder="Specifica materiale…"
              className="mt-1.5 w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Materiale semplice (Casa)
function MaterialField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isCustom = !!value && !(MATERIALE_OPTIONS as readonly string[]).includes(value);
  const [selectVal, setSelectVal] = useState(isCustom ? 'Altro' : value);
  const [custom, setCustom] = useState(isCustom ? value : '');
  return (
    <div>
      <label className={lbl}>{label}</label>
      <select
        value={selectVal}
        onChange={(e) => { const v = e.target.value; setSelectVal(v); if (v !== 'Altro') { setCustom(''); onChange(v); } }}
        className={sel}
      >
        <option value="">— nessuno —</option>
        {MATERIALE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        <option value="Altro">Altro</option>
      </select>
      {selectVal === 'Altro' && (
        <input
          type="text" value={custom}
          onChange={(e) => { setCustom(e.target.value); onChange(e.target.value); }}
          placeholder="Specifica materiale…"
          className="mt-1.5 w-full h-9 border border-border rounded px-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      )}
    </div>
  );
}

// ── Zod schema ────────────────────────────────────────────────────────────────
const schema = z
  .object({
    code: z.string().min(1, 'Codice obbligatorio'),
    name: z.string().min(1, 'Nome obbligatorio'),
    description: z.string().optional(),
    misura: z.string().optional(),
    taglia: z.string().optional(),
    produttore: z.string().optional(),
    paese: z.string().optional(),
    collezione: z.string().optional(),
    stagione: z.string().optional(),
    gruppoMerceologico: z.string().optional(),
    famiglia: z.string().optional(),
    classe: z.string().optional(),
    sottoclasse: z.string().optional(),
    gruppoOmogeneo: z.string().optional(),
    dettaglio: z.string().optional(),
    nomLinea: z.string().optional(),
    modello: z.string().optional(),
    colore: z.string().optional(),
    lavorazione: z.string().optional(),
    materiale1: z.string().optional(),
    materiale2: z.string().optional(),
    materiale3: z.string().optional(),
    composizione: z.string().optional(),
    certificazione1: z.string().optional(),
    certificazione2: z.string().optional(),
    certificazione3: z.string().optional(),
    fantasia: z.string().optional(),
    temaColore: z.string().optional(),
    temaColore2: z.string().optional(),
    temaColore3: z.string().optional(),
    temaColore4: z.string().optional(),
    temaColore5: z.string().optional(),
    costoIeSenzaReso: z.string().min(1, 'Obbligatorio'),
    costoIeConReso: z.string().optional(),
    costPrice: z.string().optional().transform((v) => (v ? Number(v) : 0)),
    iva: z.string().default('22').transform(Number),
    retailPrice: z.string().min(1, 'Obbligatorio').transform(Number),
    fasciaRicarico: z.string().optional(),
    fasciaSconto: z.string().optional(),
    conferente: z.string().optional(),
    lotSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    tranche: z.string().optional(),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
    imageUrl2: z.string().optional(),
    imageUrl3: z.string().optional(),
    imageUrl4: z.string().optional(),
    imageUrl5: z.string().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (d) => {
      const cost = d.costoIeSenzaReso ? Number(d.costoIeSenzaReso) : 0;
      if (!cost || !d.retailPrice) return true;
      return d.retailPrice >= cost * (1 + d.iva / 100) - 0.001;
    },
    { message: 'Prezzo di vendita i.i. inferiore al costo × (1 + IVA%)', path: ['retailPrice'] }
  );

type FormValues = z.input<typeof schema>;

interface ProductFormProps {
  product?: Product;
  initialValues?: { gruppoMerceologico?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, initialValues, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;
  const queryClient = useQueryClient();
  const p = product as any;

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);
  const fileInputRef4 = useRef<HTMLInputElement>(null);
  const fileInputRef5 = useRef<HTMLInputElement>(null);
  const [imagePreview,  setImagePreview]  = useState<string>(product?.imageUrl || '');
  const [isUploading,   setIsUploading]   = useState(false);
  const [isUploading2,  setIsUploading2]  = useState(false);
  const [isUploading3,  setIsUploading3]  = useState(false);
  const [isUploading4,  setIsUploading4]  = useState(false);
  const [isUploading5,  setIsUploading5]  = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedColorBlocks, setSelectedColorBlocks] = useState<Set<number>>(
    () => new Set<number>(p?.colorBlockIds ?? [])
  );
  const [selectedPantones, setSelectedPantones] = useState<ProductPantoneEntry[]>(
    () => p?.pantoneColors ?? []
  );
  const [pantoneError, setPantoneError] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: colorBlocks } = useQuery<{ id: number; name: string; sort_order: number }[]>({
    queryKey: ['color-blocks'],
    queryFn: async () => (await (await fetch('/api/color-blocks')).json()).data,
    staleTime: 300_000,
  });

  const { data: gmOptions } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ['cls-gm-options'],
    queryFn: async () => (await (await fetch('/api/classificazione/gruppoMerceologico')).json()).data,
    staleTime: 60_000,
  });

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      code: product.code,
      name: product.name,
      description: product.description || '',
      misura: product.misura || '',
      taglia: p.taglia || '',
      produttore: product.produttore || '',
      paese: product.paese || '',
      collezione: product.collezione || '',
      stagione: product.stagione || '',
      gruppoMerceologico: product.gruppoMerceologico || '',
      famiglia: product.famiglia || '',
      classe: product.classe || '',
      sottoclasse: product.sottoclasse || '',
      gruppoOmogeneo: product.gruppoOmogeneo || '',
      dettaglio: p.dettaglio || '',
      nomLinea: product.nomLinea || '',
      modello: p.modello || '',
      colore: product.colore || '',
      lavorazione: p.lavorazione || '',
      materiale1: p.materiale1 || '',
      materiale2: p.materiale2 || '',
      materiale3: p.materiale3 || '',
      composizione: p.composizione || '',
      certificazione1: p.certificazione1 || '',
      certificazione2: p.certificazione2 || '',
      certificazione3: p.certificazione3 || '',
      fantasia: p.fantasia || '',
      temaColore: product.temaColore || '',
      temaColore2: product.temaColore2 || '',
      temaColore3: product.temaColore3 || '',
      temaColore4: product.temaColore4 || '',
      temaColore5: product.temaColore5 || '',
      costoIeSenzaReso: p.costoIeSenzaReso != null ? String(p.costoIeSenzaReso) : String(product.costPrice),
      costoIeConReso: p.costoIeConReso != null ? String(p.costoIeConReso) : '',
      costPrice: p.costoIeSenzaReso != null ? String(p.costoIeSenzaReso) : String(product.costPrice),
      iva: String(product.iva ?? 22),
      retailPrice: String(product.retailPrice),
      fasciaRicarico: product.fasciaRicarico || '',
      fasciaSconto: product.fasciaSconto != null ? String(product.fasciaSconto) : '',
      conferente: p.conferente || '',
      lotSize: String(product.lotSize),
      tranche: product.tranche || '',
      notes: product.notes || '',
      imageUrl: product.imageUrl || '',
      imageUrl2: product.imageUrl2 || '',
      imageUrl3: product.imageUrl3 || '',
      imageUrl4: product.imageUrl4 || '',
      imageUrl5: p.imageUrl5 || '',
      isActive: product.isActive,
    } : { isActive: true, lotSize: '1', iva: '22', gruppoMerceologico: initialValues?.gruppoMerceologico ?? '' },
  });

  // ── Watchers ─────────────────────────────────────────────────────────────
  const watchedGm             = watch('gruppoMerceologico');
  const watchedFamiglia       = watch('famiglia');
  const watchedClasse         = watch('classe');
  const watchedSottoclasse    = watch('sottoclasse');
  const watchedGruppoOmogeneo = watch('gruppoOmogeneo');
  const watchedImageUrl       = watch('imageUrl');
  const watchedProduttore     = watch('produttore');
  const watchedCost           = watch('costPrice');
  const watchedRetail         = watch('retailPrice');
  const watchedIva            = watch('iva');
  const watchedCostoConReso   = watch('costoIeConReso');
  const watchedCode           = watch('code');

  const isModa = (isEdit ? (watchedGm ?? product?.gruppoMerceologico) : watchedGm) === MODA_GRUPPO_MERCEOLOGICO;
  const codeChanged = isEdit && !!product && watchedCode !== product.code;

  const modaClassi         = isModa ? getModaClassi(watchedFamiglia || '') : [];
  const modaSottoclassi    = isModa ? getModaSottoclassi(watchedFamiglia || '', watchedClasse || '') : [];
  const modaGruppiOmogenei = isModa ? getModaGruppiOmogenei(watchedFamiglia || '', watchedClasse || '', watchedSottoclasse || '') : [];

  useEffect(() => {
    setImagePreview((prev) => {
      if (watchedImageUrl && watchedImageUrl !== prev) return watchedImageUrl;
      if (!watchedImageUrl) return '';
      return prev;
    });
  }, [watchedImageUrl]);

  useEffect(() => {
    if (!watchedProduttore?.trim()) return;
    const timer = setTimeout(async () => {
      if (getValues('paese')) return;
      try {
        const res = await fetch(`/api/admin/produttori/paese?nome=${encodeURIComponent(watchedProduttore.trim())}`);
        const { paese } = await res.json();
        if (paese) setValue('paese', paese, { shouldDirty: true });
      } catch { /* silently ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedProduttore]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed price values ─────────────────────────────────────────────────
  const costNum         = parseFloat(String(watchedCost || 0)) || 0;
  const retailNum       = parseFloat(String(watchedRetail || 0)) || 0;
  const ivaNum          = parseInt(String(watchedIva || 22), 10) || 0;
  const pvn             = retailNum > 0 ? retailNum / (1 + ivaNum / 100) : 0;
  const ricarico        = costNum > 0 && pvn > 0 ? ((pvn - costNum) / costNum) * 100 : null;
  const margine         = pvn > 0 && costNum > 0 ? ((pvn - costNum) / pvn) * 100 : null;
  const guadagno        = pvn > 0 && costNum > 0 ? pvn - costNum : null;
  const costoConReso    = parseFloat(String(watchedCostoConReso || 0)) || 0;
  const ricaricoConReso = costoConReso > 0 && pvn > 0 ? ((pvn - costoConReso) / costoConReso) * 100 : null;
  const margineConReso  = pvn > 0 && costoConReso > 0 ? ((pvn - costoConReso) / pvn) * 100 : null;
  const guadagnoConReso = pvn > 0 && costoConReso > 0 ? pvn - costoConReso : null;

  const fmtPct  = (v: number | null) => v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const fmtEuro = (v: number | null) => v === null ? '—' : `€ ${v.toFixed(2)}`;

  // ── Register refs ─────────────────────────────────────────────────────────
  const costPriceReg      = register('costPrice');
  const retailPriceReg    = register('retailPrice');
  const ivaReg            = register('iva');
  const fasciaScReg       = register('fasciaSconto');
  const fasciaRicaricoReg = register('fasciaRicarico');
  const costoSenzaResoReg = register('costoIeSenzaReso');

  // ── Price handlers ────────────────────────────────────────────────────────
  function handleCostoChange(e: React.ChangeEvent<HTMLInputElement>) {
    costoSenzaResoReg.onChange(e);
    const cost = parseFloat(e.target.value);
    setValue('costPrice', e.target.value || '');
    if (!isNaN(cost) && pvn > 0) {
      setValue('fasciaRicarico', ((pvn - cost) / cost * 100).toFixed(1));
      setValue('fasciaSconto',   ((1 - cost / pvn) * 100).toFixed(2));
    } else if (!e.target.value) {
      setValue('fasciaRicarico', '');
      setValue('fasciaSconto', '');
    }
  }

  function handleRetailChange(e: React.ChangeEvent<HTMLInputElement>) {
    retailPriceReg.onChange(e);
    const newRetail = parseFloat(e.target.value);
    const sconto = parseFloat(String(getValues('fasciaSconto') || ''));
    if (!isNaN(sconto) && !isNaN(newRetail) && newRetail > 0) {
      const newPvn  = newRetail / (1 + ivaNum / 100);
      const newCost = Math.max(0, newPvn * (1 - sconto / 100));
      setValue('costPrice', newCost.toFixed(2));
      setValue('costoIeSenzaReso', newCost.toFixed(2));
      if (newCost > 0) setValue('fasciaRicarico', ((newPvn - newCost) / newCost * 100).toFixed(1));
    }
  }

  function handleIvaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    ivaReg.onChange(e);
    const newIva  = parseInt(e.target.value, 10) || 0;
    const sconto  = parseFloat(String(getValues('fasciaSconto') || ''));
    if (!isNaN(sconto) && retailNum > 0) {
      const newPvn  = retailNum / (1 + newIva / 100);
      const newCost = Math.max(0, newPvn * (1 - sconto / 100));
      setValue('costPrice', newCost.toFixed(2));
      setValue('costoIeSenzaReso', newCost.toFixed(2));
      if (newCost > 0) setValue('fasciaRicarico', ((newPvn - newCost) / newCost * 100).toFixed(1));
    }
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  async function uploadFile(
    file: File,
    field: 'imageUrl' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrl5',
    setLoading: (v: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Caricamento fallito');
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

  const handleFile  = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl',  setIsUploading,  fileInputRef); };
  const handleFile2 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl2', setIsUploading2, fileInputRef2); };
  const handleFile3 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl3', setIsUploading3, fileInputRef3); };
  const handleFile4 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl4', setIsUploading4, fileInputRef4); };
  const handleFile5 = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadFile(f, 'imageUrl5', setIsUploading5, fileInputRef5); };

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(values: FormValues) {
    const v = values as unknown as z.output<typeof schema>;

    const isModaProduct = (v.gruppoMerceologico ?? '').toLowerCase() === 'moda';
    if (isModaProduct && selectedPantones.length === 0) {
      setPantoneError('Il Pantone è obbligatorio per i prodotti MODA');
      return;
    }
    setPantoneError(null);

    try {
      const url    = isEdit ? `/api/products/${product!.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...v,
          skipNameNormalization: isEdit,
          description:    (v as any).description    || null,
          misura:         v.misura         || null,
          taglia:         (v as any).taglia         || null,
          produttore:     v.produttore     || null,
          paese:          v.paese          || null,
          collezione:     v.collezione     || null,
          stagione:       v.stagione       || null,
          gruppoMerceologico: v.gruppoMerceologico || null,
          famiglia:       v.famiglia       || null,
          classe:         v.classe         || null,
          sottoclasse:    v.sottoclasse    || null,
          gruppoOmogeneo: v.gruppoOmogeneo || null,
          dettaglio:      (v as any).dettaglio      || null,
          nomLinea:       v.nomLinea       || null,
          modello:        (v as any).modello        || null,
          colore:         v.colore         || null,
          lavorazione:    (v as any).lavorazione    || null,
          materiale1:     (v as any).materiale1     || null,
          materiale2:     (v as any).materiale2     || null,
          materiale3:     (v as any).materiale3     || null,
          composizione:   (v as any).composizione   || null,
          certificazione1:(v as any).certificazione1|| null,
          certificazione2:(v as any).certificazione2|| null,
          certificazione3:(v as any).certificazione3|| null,
          fantasia:       (v as any).fantasia       || null,
          temaColore:     v.temaColore     || null,
          temaColore2:    (v as any).temaColore2    || null,
          temaColore3:    (v as any).temaColore3    || null,
          temaColore4:    (v as any).temaColore4    || null,
          temaColore5:    (v as any).temaColore5    || null,
          costoIeSenzaReso: (v as any).costoIeSenzaReso ? parseFloat((v as any).costoIeSenzaReso) || null : null,
          costoIeConReso:   (v as any).costoIeConReso  ? parseFloat((v as any).costoIeConReso)  || null : null,
          fasciaRicarico: v.fasciaRicarico || null,
          fasciaSconto:   v.fasciaSconto   ? parseFloat(v.fasciaSconto) || null : null,
          conferente:     (v as any).conferente     || null,
          tranche:        v.tranche        || null,
          notes:          v.notes          || null,
          imageUrl:       v.imageUrl       || null,
          imageUrl2:      v.imageUrl2      || null,
          imageUrl3:      v.imageUrl3      || null,
          imageUrl4:      v.imageUrl4      || null,
          imageUrl5:      v.imageUrl5      || null,
          colorBlockIds:   [...selectedColorBlocks],
          pantoneColorIds: selectedPantones.map((p) => p.pantoneColorId),
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

  function clearTemaFrom(n: number) {
    const fields = ['temaColore', 'temaColore2', 'temaColore3', 'temaColore4', 'temaColore5'] as const;
    for (let i = n - 1; i < fields.length; i++) setValue(fields[i], '');
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-2">

      {/* ════════════════════════════════════════════════════════════
          ANAGRAFICA
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Anagrafica</SectionLabel>

      {/* Codice + Nome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Codice *</label>
          <input
            {...register('code')}
            placeholder="OE-CAT-001"
            className="w-full h-9 border border-border rounded px-3 text-sm text-primary bg-white font-mono focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
        </div>
        <Input label="Nome *" {...register('name')} error={errors.name?.message} placeholder="es. Copritavolo GEOMETRIC 140×240" />
      </div>

      {codeChanged && (
        <div className="flex gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle size={14} className="flex-shrink-0 text-amber-500 mt-px" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Stai modificando il codice prodotto</p>
            <p>Le immagini già caricate mantengono il vecchio codice nel filename. Futuri import e caricamenti foto devono usare il <span className="font-semibold">nuovo codice</span>.</p>
          </div>
        </div>
      )}

      {/* ── Moda: Dettaglio + Modello (subito dopo codice/nome) ── */}
      {isModa && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Combobox label="Dettaglio" field="dettaglio" value={watch('dettaglio') || ''} onChange={(v) => setValue('dettaglio', v)} />
          <Combobox label="Modello"   field="modello"   value={watch('modello') || ''}   onChange={(v) => setValue('modello', v)} />
        </div>
      )}

      {/* Casa: Descrizione */}
      {!isModa && (
        <div>
          <label className={lbl}>Descrizione (IT)</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Descrizione italiana del prodotto…"
            className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>
      )}

      {/* Taglia + Misure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Taglia</label>
          <select {...register('taglia')} className={sel}>
            <option value="">— nessuna —</option>
            {TAGLIA_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Input label="Misure" {...register('misura')} placeholder="es. 30×40 cm" />
      </div>

      {/* Produttore + Paese */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Combobox label="Produttore" field="produttore" value={watch('produttore') || ''} onChange={(v) => setValue('produttore', v)} />
        <PaeseSelect label="Paese" value={watch('paese') || ''} onChange={(v) => setValue('paese', v)} />
      </div>

      {/* ── Moda: campi specifici in Anagrafica ── */}
      {isModa && (
        <>
          {/* Colore + Lavorazione */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox label="Colore"     field="colore"     value={watch('colore') || ''}     onChange={(v) => setValue('colore', v)} />
            <Combobox label="Lavorazione" field="lavorazione" value={watch('lavorazione') || ''} onChange={(v) => setValue('lavorazione', v)} />
          </div>

          {/* Pantone FHI-TCX * */}
          <div>
            <label className={lbl}>Pantone FHI-TCX <span className="text-red-400 ml-0.5">*</span></label>
            <ProductPantoneForm
              value={selectedPantones}
              onChange={(v) => { setSelectedPantones(v); if (v.length > 0) setPantoneError(null); }}
            />
            {pantoneError && <p className="mt-1 text-xs text-red-500">{pantoneError}</p>}
          </div>

          {/* % + Materiale 1/2/3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MaterialFieldWithPct label="Materiale 1" value={watch('materiale1') || ''} onChange={(v) => setValue('materiale1', v)} />
            <MaterialFieldWithPct label="Materiale 2" value={watch('materiale2') || ''} onChange={(v) => setValue('materiale2', v)} />
            <MaterialFieldWithPct label="Materiale 3" value={watch('materiale3') || ''} onChange={(v) => setValue('materiale3', v)} />
          </div>

          {/* Composizione */}
          <Input label="Composizione" {...register('composizione')} placeholder="es. 80% cotone, 20% poliestere" />

          {/* Fantasia */}
          <div>
            <label className={lbl}>Fantasia</label>
            <select {...register('fantasia')} className={sel}>
              <option value="">— nessuna —</option>
              {FANTASIA_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Note (in Anagrafica per Moda) */}
          <div>
            <label className={lbl}>Note</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Note aggiuntive…"
              className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>
        </>
      )}

      {/* ── Casa: campi specifici in Anagrafica ── */}
      {!isModa && (
        <>
          <Combobox label="Linea" field="nomLinea" value={watch('nomLinea') || ''} onChange={(v) => setValue('nomLinea', v)} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox label="Colore"      field="colore"      value={watch('colore') || ''}      onChange={(v) => setValue('colore', v)} />
            <Combobox label="Lavorazione" field="lavorazione" value={watch('lavorazione') || ''} onChange={(v) => setValue('lavorazione', v)} />
          </div>

          <div>
            <label className={lbl}>Pantone FHI-TCX</label>
            <ProductPantoneForm
              value={selectedPantones}
              onChange={(v) => { setSelectedPantones(v); if (v.length > 0) setPantoneError(null); }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MaterialField label="Materiale 1" value={watch('materiale1') || ''} onChange={(v) => setValue('materiale1', v)} />
            <MaterialField label="Materiale 2" value={watch('materiale2') || ''} onChange={(v) => setValue('materiale2', v)} />
            <MaterialField label="Materiale 3" value={watch('materiale3') || ''} onChange={(v) => setValue('materiale3', v)} />
          </div>

          <Input label="Composizione" {...register('composizione')} placeholder="es. 80% cotone, 20% poliestere" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Certificazione 1" {...register('certificazione1')} placeholder="es. GOTS" />
            <Input label="Certificazione 2" {...register('certificazione2')} placeholder="es. Oeko-Tex" />
            <Input label="Certificazione 3" {...register('certificazione3')} placeholder="es. Fair Trade" />
          </div>

          <div>
            <label className={lbl}>Fantasia</label>
            <select {...register('fantasia')} className={sel}>
              <option value="">— nessuna —</option>
              {FANTASIA_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Tema colore */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox label="Tema colore" field="temaColore" value={watch('temaColore') || ''} onChange={(v) => { setValue('temaColore', v); if (!v) clearTemaFrom(1); }} />
            {watch('temaColore') ? (
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Combobox label="Tema colore 2" field="temaColore" value={watch('temaColore2') || ''} onChange={(v) => { setValue('temaColore2', v); if (!v) clearTemaFrom(2); }} />
                </div>
                {watch('temaColore2') && (
                  <button type="button" onClick={() => clearTemaFrom(2)} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>
                )}
              </div>
            ) : <div />}
          </div>
          {watch('temaColore2') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Combobox label="Tema colore 3" field="temaColore" value={watch('temaColore3') || ''} onChange={(v) => { setValue('temaColore3', v); if (!v) clearTemaFrom(3); }} />
                </div>
                {watch('temaColore3') && <button type="button" onClick={() => clearTemaFrom(3)} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
              </div>
              {watch('temaColore3') ? (
                <div className="flex items-end gap-1">
                  <div className="flex-1">
                    <Combobox label="Tema colore 4" field="temaColore" value={watch('temaColore4') || ''} onChange={(v) => { setValue('temaColore4', v); if (!v) setValue('temaColore5', ''); }} />
                  </div>
                  {watch('temaColore4') && <button type="button" onClick={() => { setValue('temaColore4', ''); setValue('temaColore5', ''); }} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
                </div>
              ) : <div />}
            </div>
          )}
          {watch('temaColore4') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <Combobox label="Tema colore 5" field="temaColore" value={watch('temaColore5') || ''} onChange={(v) => setValue('temaColore5', v)} />
                </div>
                {watch('temaColore5') && <button type="button" onClick={() => setValue('temaColore5', '')} className="pb-0.5 p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
              </div>
              <div />
            </div>
          )}
        </>
      )}

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          CLASSIFICAZIONE
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Classificazione</SectionLabel>

      {/* Collezione + Stagione */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Combobox label="Collezione" field="collezione" value={watch('collezione') || ''} onChange={(v) => setValue('collezione', v)} />
        <div>
          <label className={lbl}>Stagione</label>
          <select {...register('stagione')} className={sel}>
            <option value="">— nessuna —</option>
            {STAGIONE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Gruppo merceologico + Famiglia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Gruppo merceologico</label>
          <select
            value={watchedGm || ''}
            onChange={(e) => {
              setValue('gruppoMerceologico', e.target.value, { shouldDirty: true });
              if (!isEdit) { setValue('famiglia', ''); setValue('classe', ''); setValue('sottoclasse', ''); setValue('gruppoOmogeneo', ''); }
            }}
            className={sel}
          >
            <option value="">— nessuno —</option>
            {gmOptions?.map((gm) => <option key={gm.id} value={gm.nome}>{gm.nome}</option>)}
          </select>
        </div>

        {isModa ? (
          <div>
            <label className={lbl}>Famiglia</label>
            <select
              value={watchedFamiglia || ''}
              onChange={(e) => { setValue('famiglia', e.target.value); setValue('classe', ''); setValue('sottoclasse', ''); setValue('gruppoOmogeneo', ''); }}
              className={sel}
            >
              <option value="">— seleziona —</option>
              {MODA_FAMIGLIE.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        ) : (
          <Combobox label="Famiglia" field="famiglia" value={watchedFamiglia || ''} onChange={(v) => setValue('famiglia', v, { shouldDirty: true })} />
        )}
      </div>

      {/* Moda: Classe + Sottoclasse + Gruppo omogeneo in 3 colonne */}
      {isModa && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Classe</label>
            <select
              value={watchedClasse || ''}
              onChange={(e) => { setValue('classe', e.target.value); setValue('sottoclasse', ''); setValue('gruppoOmogeneo', ''); }}
              disabled={!watchedFamiglia}
              className={sel}
            >
              <option value="">— seleziona —</option>
              {modaClassi.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Sottoclasse</label>
            <select
              value={watchedSottoclasse || ''}
              onChange={(e) => { setValue('sottoclasse', e.target.value); setValue('gruppoOmogeneo', ''); }}
              disabled={!watchedClasse || modaSottoclassi.length === 0}
              className={sel}
            >
              <option value="">{modaSottoclassi.length === 0 && watchedClasse ? '— nessuna —' : '— seleziona —'}</option>
              {modaSottoclassi.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Gruppo omogeneo</label>
            <select
              value={watchedGruppoOmogeneo || ''}
              onChange={(e) => setValue('gruppoOmogeneo', e.target.value)}
              disabled={!watchedSottoclasse || modaGruppiOmogenei.length === 0}
              className={sel}
            >
              <option value="">{modaGruppiOmogenei.length === 0 && watchedSottoclasse ? '— nessuno —' : '— seleziona —'}</option>
              {modaGruppiOmogenei.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Casa: Classe + Sottoclasse, poi Gruppo omogeneo + Dettaglio */}
      {!isModa && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox label="Classe"      field="classe"      value={watchedClasse || ''}      onChange={(v) => setValue('classe', v, { shouldDirty: true })} />
            <Combobox label="Sottoclasse" field="sottoclasse" value={watchedSottoclasse || ''} onChange={(v) => setValue('sottoclasse', v, { shouldDirty: true })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Combobox label="Gruppo omogeneo" field="gruppoOmogeneo" value={watchedGruppoOmogeneo || ''} onChange={(v) => setValue('gruppoOmogeneo', v, { shouldDirty: true })} />
            <Combobox label="Dettaglio"       field="dettaglio"      value={watch('dettaglio') || ''}     onChange={(v) => setValue('dettaglio', v)} />
          </div>
        </>
      )}

      {/* Moda: Blocchi colore (in Classificazione) */}
      {isModa && colorBlocks && colorBlocks.length > 0 && (
        <div>
          <p className={lbl}>Blocco colore</p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {colorBlocks.map((cb) => {
              const active = selectedColorBlocks.has(cb.id);
              return (
                <button
                  key={cb.id}
                  type="button"
                  onClick={() => {
                    setSelectedColorBlocks((prev) => {
                      const next = new Set(prev);
                      if (next.has(cb.id)) next.delete(cb.id); else next.add(cb.id);
                      return next;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-border hover:border-gray-400'
                  }`}
                >
                  {cb.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          PREZZI
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Prezzi</SectionLabel>

      <input type="hidden" {...costPriceReg} />
      <input type="hidden" {...fasciaScReg} />
      <input type="hidden" {...fasciaRicaricoReg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Costo i.e. senza reso (€) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input type="number" step="0.01" min="0" {...costoSenzaResoReg} onChange={handleCostoChange} className={pri} placeholder="0.00" />
          </div>
          {errors.costoIeSenzaReso && <p className="mt-1 text-xs text-red-500">{errors.costoIeSenzaReso.message}</p>}
        </div>
        <div>
          <label className={lbl}>Costo i.e. con reso (€)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input {...register('costoIeConReso')} type="number" step="0.01" min="0" className={pri} placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>IVA (%)</label>
          <select {...ivaReg} onChange={handleIvaChange} className={sel}>
            {IVA_OPTIONS.map((v) => <option key={v} value={String(v)}>{v}%</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Prezzo di vendita i.i. (€) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            <input type="number" step="0.01" min="0" {...retailPriceReg} onChange={handleRetailChange} className={pri} placeholder="0.00" />
          </div>
          {errors.retailPrice && <p className="mt-1 text-xs text-red-500">{errors.retailPrice.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadOnlyField label="Ricarico senza reso (%)" value={fmtPct(ricarico)} />
        <ReadOnlyField label="Ricarico con reso (%)"   value={fmtPct(ricaricoConReso)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadOnlyField label="Margine senza reso (%)" value={fmtPct(margine)} />
        <ReadOnlyField label="Margine con reso (%)"   value={fmtPct(margineConReso)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ReadOnlyField label="Guadagno senza reso (€)" value={fmtEuro(guadagno)} />
        <ReadOnlyField label="Guadagno con reso (€)"   value={fmtEuro(guadagnoConReso)} />
      </div>

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          LOGISTICA
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Logistica</SectionLabel>

      <div>
        <label className={lbl}>Conferente</label>
        <select {...register('conferente')} className={sel}>
          <option value="">— nessuno —</option>
          {CONFERENTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Confezione" type="number" min="1" step="1" {...register('lotSize')} placeholder="1" />
        <Combobox label="Tranche" field="tranche" value={watch('tranche') || ''} onChange={(v) => setValue('tranche', v)} />
      </div>

      {/* Note per Casa (sezione separata) */}
      {!isModa && (
        <>
          <Divider />
          <SectionLabel>Note</SectionLabel>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Note aggiuntive…"
            className="w-full border border-border rounded px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </>
      )}

      <Divider />

      {/* ════════════════════════════════════════════════════════════
          FOTO
      ════════════════════════════════════════════════════════════ */}
      <SectionLabel>Foto</SectionLabel>
      {(
        [
          { label: 'Foto 1 (principale)', field: 'imageUrl'  as const, ref: fileInputRef,  onChange: handleFile,  loading: isUploading,  preview: imagePreview },
          { label: 'Foto 2',              field: 'imageUrl2' as const, ref: fileInputRef2, onChange: handleFile2, loading: isUploading2, preview: watch('imageUrl2') || '' },
          { label: 'Foto 3',              field: 'imageUrl3' as const, ref: fileInputRef3, onChange: handleFile3, loading: isUploading3, preview: watch('imageUrl3') || '' },
          { label: 'Foto 4',              field: 'imageUrl4' as const, ref: fileInputRef4, onChange: handleFile4, loading: isUploading4, preview: watch('imageUrl4') || '' },
          { label: 'Foto 5',              field: 'imageUrl5' as const, ref: fileInputRef5, onChange: handleFile5, loading: isUploading5, preview: watch('imageUrl5') || '' },
        ] as const
      ).map(({ label, field, ref, onChange, loading, preview }) => (
        <div key={field} className="flex gap-3 items-start">
          <div className="w-14 h-14 flex-shrink-0 border border-border rounded bg-gray-50 overflow-hidden flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={label} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span className="text-gray-300 text-2xs text-center leading-tight px-1">{label.replace('Foto ', '')}</span>
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

      <Divider />

      {/* ── STATO + AZIONI ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-accent" />
        <label htmlFor="isActive" className="text-sm text-primary">Attivo (visibile a catalogo)</label>
      </div>

      <div className="flex justify-between items-center gap-3 pt-1">
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
          <Button variant="ghost" type="button" onClick={onCancel}>Annulla</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Salva modifiche' : 'Crea prodotto'}</Button>
        </div>
      </div>

    </form>
  );
}
