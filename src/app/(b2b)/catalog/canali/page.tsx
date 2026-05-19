'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Store, ShoppingBag, Building, ShoppingCart, Tag, Radio, Landmark, Globe, Package,
  Plus, Pencil, Trash2, X, Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import type { Canale, CanaleTipo } from '@/types';

const TIPO_ICONS: Record<CanaleTipo, React.ReactNode> = {
  BOTTEGA: <Store size={16} />,
  EMPORIO: <ShoppingBag size={16} />,
  DISTRETTO: <Building size={16} />,
  STORE: <ShoppingCart size={16} />,
  OUTLET: <Tag size={16} />,
  TENDONE: <Radio size={16} />,
  FIERA: <Landmark size={16} />,
  ONLINE: <Globe size={16} />,
  ALTRO: <Package size={16} />,
};

const TIPO_KEYS = ['BOTTEGA', 'EMPORIO', 'DISTRETTO', 'STORE', 'OUTLET', 'TENDONE', 'FIERA', 'ONLINE', 'ALTRO'] as const;

interface CanaleFormState {
  nome: string;
  tipo: CanaleTipo;
  citta: string;
  indirizzo: string;
}

const EMPTY_FORM: CanaleFormState = { nome: '', tipo: 'BOTTEGA', citta: '', indirizzo: '' };

export default function CanaliPage() {
  const t = useTranslations('channels');
  const tt = useTranslations('channelTypes');
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; canale?: Canale } | null>(null);
  const [form, setForm] = useState<CanaleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: canali = [], isLoading } = useQuery<Canale[]>({
    queryKey: ['catalog-canali'],
    queryFn: () =>
      fetch('/api/catalog/canali')
        .then((r) => r.json())
        .then((d) => d.data as Canale[]),
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add' });
  }

  function openEdit(canale: Canale) {
    setForm({ nome: canale.nome, tipo: canale.tipo, citta: canale.citta || '', indirizzo: canale.indirizzo || '' });
    setModal({ mode: 'edit', canale });
  }

  function closeModal() {
    setModal(null);
  }

  async function handleSave() {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const isEdit = modal?.mode === 'edit';
      const url = isEdit ? `/api/catalog/canali/${modal!.canale!.id}` : '/api/catalog/canali';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, tipo: form.tipo, citta: form.citta || null, indirizzo: form.indirizzo || null }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Errore');
      }
      toast.success(isEdit ? t('updateSuccess') : t('createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['catalog-canali'] });
      closeModal();
    } catch (e: any) {
      toast.error(e.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/catalog/canali/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Errore');
      toast.success(t('deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['catalog-canali'] });
    } catch {
      toast.error('Errore');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">B2B</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          {t('title')}
        </h1>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : canali.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-10 text-center">
          <Store size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">{t('noChannels')}</p>
          <button
            onClick={openAdd}
            className="mt-5 inline-flex items-center px-4 py-2 bg-primary text-background text-xs font-medium rounded hover:bg-warm-darker transition-colors"
          >
            {t('add')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {canali.map((canale) => {
            const isConfirming = confirmId === canale.id;
            const isDeleting = deletingId === canale.id;

            return (
              <div
                key={canale.id}
                className="bg-white border border-border rounded-lg px-5 py-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-cream border border-border flex items-center justify-center text-gray-500 flex-shrink-0">
                  {TIPO_ICONS[canale.tipo]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{canale.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tt(canale.tipo)}{canale.citta ? ` · ${canale.citta}` : ''}
                  </p>
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500 hidden sm:block">{t('deleteConfirm')}</span>
                    <button
                      onClick={() => handleDelete(canale.id)}
                      disabled={isDeleting}
                      className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={11} className="animate-spin" /> : t('deleteYes')}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={isDeleting}
                      className="text-xs border border-border rounded px-2.5 py-1.5 text-gray-500 hover:bg-cream transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(canale)}
                      className="flex items-center gap-1 text-xs border border-border rounded px-2.5 py-1.5 text-gray-500 hover:text-primary hover:bg-cream transition-colors"
                    >
                      <Pencil size={11} />
                      <span className="hidden sm:inline">{t('edit')}</span>
                    </button>
                    <button
                      onClick={() => setConfirmId(canale.id)}
                      className="flex items-center gap-1 text-xs border border-red-200 rounded px-2.5 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={11} />
                      <span className="hidden sm:inline">{t('delete')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 z-10">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-semibold text-primary mb-4 tracking-wide">
              {modal.mode === 'add' ? t('addTitle') : t('editTitle')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
                  {t('nameLabel')}
                </label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder={t('namePlaceholder')}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
                  {t('typeLabel')}
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as CanaleTipo }))}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
                >
                  {TIPO_KEYS.map((k) => (
                    <option key={k} value={k}>{tt(k)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
                  {t('cityLabel')}
                </label>
                <input
                  value={form.citta}
                  onChange={(e) => setForm((f) => ({ ...f, citta: e.target.value }))}
                  placeholder={t('cityPlaceholder')}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
                  {t('addressLabel')}
                </label>
                <input
                  value={form.indirizzo}
                  onChange={(e) => setForm((f) => ({ ...f, indirizzo: e.target.value }))}
                  placeholder={t('addressPlaceholder')}
                  className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary placeholder-gray-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-xs font-medium rounded border border-border text-gray-500 hover:bg-cream transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim()}
                className="flex-1 py-2.5 text-xs font-medium rounded bg-primary text-background hover:bg-warm-darker transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  modal.mode === 'add' ? t('create') : t('save')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
