'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

type OrgOption = { id: string; nome: string };

type FormValues = {
  orgId: string;
  organizzazioneNuova: string;
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
};

const inputClass =
  'w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20';

const labelClass = 'block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2';

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function OrgDropdown({
  value,
  onChange,
  orgs,
  placeholder,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  orgs: OrgOption[];
  placeholder: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel =
    value === 'new'
      ? '+ Nuova organizzazione'
      : orgs.find((o) => o.nome === value)?.nome ?? '';

  const triggerClass = [
    'w-full px-4 py-3 bg-white border rounded text-sm text-left appearance-none',
    'transition-all duration-150 focus:outline-none flex items-center justify-between',
    error ? 'border-red-400' : open ? 'border-accent ring-1 ring-accent/20' : 'border-border',
    value === 'new' ? 'font-bold text-primary' : selectedLabel ? 'text-primary' : 'text-gray-400',
  ].join(' ');

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={triggerClass}>
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 ml-2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-border rounded shadow-lg max-h-64 overflow-y-auto">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => { onChange(org.nome); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-cream transition-colors flex items-center justify-between"
            >
              <span>{org.nome}</span>
              {value === org.nome && <Check size={12} className="text-accent flex-shrink-0" />}
            </button>
          ))}
          <div className="h-px bg-border mx-3 my-1" />
          <button
            type="button"
            onClick={() => { onChange('new'); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm font-bold text-primary hover:bg-cream transition-colors flex items-center justify-between"
          >
            <span>+ Nuova organizzazione</span>
            {value === 'new' && <Check size={12} className="text-accent flex-shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default function RequestAccessButton() {
  const t = useTranslations('access');
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);

  const schema = useMemo(
    () =>
      z.object({
        orgId: z.string().min(1, t('required')),
        organizzazioneNuova: z.string().optional(),
        nome: z.string().min(1, t('required')),
        cognome: z.string().min(1, t('required')),
        telefono: z.string().optional(),
        email: z.string().email(t('emailInvalid')),
      }).superRefine((data, ctx) => {
        if (data.orgId === 'new' && !data.organizzazioneNuova?.trim()) {
          ctx.addIssue({ code: 'custom', message: t('required'), path: ['organizzazioneNuova'] });
        }
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const orgId = watch('orgId');

  useEffect(() => {
    if (open) {
      fetch('/api/public/organizations')
        .then((r) => r.json())
        .then((json) => setOrgs(json.data || []))
        .catch(() => {});
    }
  }, [open]);

  function openModal() {
    setSent(false);
    reset();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function onSubmit(values: FormValues) {
    const organizzazione =
      values.orgId === 'new' ? (values.organizzazioneNuova || '').trim() : values.orgId;
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizzazione,
          nome: values.nome,
          cognome: values.cognome,
          telefono: values.telefono || undefined,
          email: values.email,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      toast.error(t('errorSend'));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-accent hover:underline cursor-pointer"
      >
        {t('requestLink')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>

            {sent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-light text-primary mb-2">{t('successTitle')}</h3>
                <p className="text-sm text-gray-500">{t('successText')}</p>
                <button
                  onClick={closeModal}
                  className="mt-6 px-6 py-2.5 bg-primary text-background text-sm font-medium rounded hover:bg-warm-darker transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-light text-primary mb-6">{t('title')}</h3>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Hidden input to register orgId with react-hook-form */}
                  <input type="hidden" {...register('orgId')} />

                  {/* Organizzazione custom dropdown */}
                  <div>
                    <label className={labelClass}>{t('orgSelectLabel')}</label>
                    <OrgDropdown
                      value={orgId ?? ''}
                      onChange={(val) => setValue('orgId', val, { shouldValidate: true })}
                      orgs={orgs}
                      placeholder={t('orgSelectPlaceholder')}
                      error={errors.orgId?.message}
                    />
                    {errors.orgId && (
                      <p className="mt-1 text-xs text-red-500">{errors.orgId.message}</p>
                    )}
                  </div>

                  {/* Nuova organizzazione text input */}
                  {orgId === 'new' && (
                    <div>
                      <label className={labelClass}>{t('newOrgLabel')}</label>
                      <input
                        {...register('organizzazioneNuova', {
                          onChange: (e) => setValue('organizzazioneNuova', capitalize(e.target.value)),
                        })}
                        placeholder={t('newOrgPlaceholder')}
                        className={inputClass}
                        autoFocus
                      />
                      {errors.organizzazioneNuova && (
                        <p className="mt-1 text-xs text-red-500">{errors.organizzazioneNuova.message}</p>
                      )}
                    </div>
                  )}

                  {/* Nome + Cognome side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('nomeLabel')}</label>
                      <input
                        {...register('nome', {
                          onChange: (e) => setValue('nome', capitalize(e.target.value)),
                        })}
                        placeholder={t('nomePlaceholder')}
                        className={inputClass}
                      />
                      {errors.nome && (
                        <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>{t('cognomeLabel')}</label>
                      <input
                        {...register('cognome', {
                          onChange: (e) => setValue('cognome', capitalize(e.target.value)),
                        })}
                        placeholder={t('cognomePlaceholder')}
                        className={inputClass}
                      />
                      {errors.cognome && (
                        <p className="mt-1 text-xs text-red-500">{errors.cognome.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Telefono */}
                  <div>
                    <label className={labelClass}>{t('telefonoLabel')}</label>
                    <input
                      {...register('telefono', {
                        onChange: (e) => {
                          const cleaned = e.target.value.replace(/[^\d+\s]/g, '');
                          setValue('telefono', cleaned);
                        },
                      })}
                      placeholder={t('telefonoPlaceholder')}
                      className={inputClass}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelClass}>
                      {t('emailLabel')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      className={inputClass}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-primary text-background text-sm font-semibold tracking-wide rounded transition-all duration-150 hover:bg-warm-darker disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('submitting')}
                      </>
                    ) : (
                      t('submit')
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
