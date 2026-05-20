'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, ChevronDown } from 'lucide-react';
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

const selectClass =
  'w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary appearance-none transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 pr-10';

const labelClass = 'block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2';

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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
                  {/* Organizzazione select */}
                  <div>
                    <label className={labelClass}>{t('orgSelectLabel')}</label>
                    <div className="relative">
                      <select {...register('orgId')} className={selectClass} defaultValue="">
                        <option value="" disabled>{t('orgSelectPlaceholder')}</option>
                        {orgs.map((o) => (
                          <option key={o.id} value={o.nome}>{o.nome}</option>
                        ))}
                        <option value="new">{t('newOrgOption')}</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
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
                    <label className={labelClass}>{t('emailLabel')}</label>
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
