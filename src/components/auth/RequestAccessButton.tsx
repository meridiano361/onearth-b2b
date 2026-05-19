'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

type FormValues = {
  organizzazione: string;
  puntoVendita: string;
  nomeResponsabile: string;
  email: string;
};

const inputClass =
  'w-full px-4 py-3 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 transition-all duration-150 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20';

const labelClass = 'block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2';

export default function RequestAccessButton() {
  const t = useTranslations('access');
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        organizzazione: z.string().min(1, t('required')),
        puntoVendita: z.string().min(1, t('required')),
        nomeResponsabile: z.string().min(1, t('required')),
        email: z.string().email(t('emailInvalid')),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function openModal() {
    setSent(false);
    reset();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
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
                <h3 className="text-lg font-light text-primary mb-1">{t('title')}</h3>
                <p className="text-xs text-gray-400 mb-6">{t('subtitle')}</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className={labelClass}>{t('orgLabel')}</label>
                    <input
                      {...register('organizzazione')}
                      placeholder={t('orgPlaceholder')}
                      className={inputClass}
                    />
                    {errors.organizzazione && (
                      <p className="mt-1 text-xs text-red-500">{errors.organizzazione.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>{t('pvLabel')}</label>
                    <input
                      {...register('puntoVendita')}
                      placeholder={t('pvPlaceholder')}
                      className={inputClass}
                    />
                    {errors.puntoVendita && (
                      <p className="mt-1 text-xs text-red-500">{errors.puntoVendita.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>{t('respLabel')}</label>
                    <input
                      {...register('nomeResponsabile')}
                      placeholder={t('respPlaceholder')}
                      className={inputClass}
                    />
                    {errors.nomeResponsabile && (
                      <p className="mt-1 text-xs text-red-500">{errors.nomeResponsabile.message}</p>
                    )}
                  </div>

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
