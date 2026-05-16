'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, FolderOpen, Folder } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Category } from '@/types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  parentId: z.string().optional(),
  order: z.string().optional().transform((v) => (v ? parseInt(v) : 0)),
});

type FormValues = z.input<typeof schema>;

interface CategoryFormProps {
  category?: Category;
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}

function CategoryForm({ category, categories, onSuccess, onCancel }: CategoryFormProps) {
  const isEdit = !!category;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: category
      ? {
          name: category.name,
          parentId: category.parentId || '',
          order: String(category.order),
        }
      : { order: '0' },
  });

  async function onSubmit(values: FormValues) {
    try {
      const parsed = schema.parse(values);
      const url = isEdit ? `/api/categories/${category!.id}` : '/api/categories';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.name,
          parentId: (values.parentId || null),
          order: parsed.order,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(isEdit ? 'Categoria aggiornata' : 'Categoria creata');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  // All flat categories for parent selector (excluding self)
  const flat = categories.filter((c) => c.id !== category?.id);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nome Categoria *"
        {...register('name')}
        error={errors.name?.message}
        placeholder="Soggiorno, Outdoor, ecc."
      />

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          Categoria Padre
        </label>
        <select
          {...register('parentId')}
          className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm focus:outline-none focus:border-accent"
        >
          <option value="">— Categoria principale —</option>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <Input
        label="Ordine di Visualizzazione"
        type="number"
        {...register('order')}
        placeholder="0"
        hint="I numeri più bassi appaiono prima"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Annulla</Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salva Modifiche' : 'Crea Categoria'}
        </Button>
      </div>
    </form>
  );
}

interface TreeNodeProps {
  category: Category;
  allCategories: Category[];
  level?: number;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function TreeNode({ category, allCategories, level = 0, onEdit, onDelete }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = allCategories.filter((c) => c.parentId === category.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-cream/50 rounded group transition-colors"
        style={{ paddingLeft: `${(level * 20) + 12}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 w-4 flex-shrink-0"
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <div className="w-3" />
          )}
        </button>

        <div className="text-gray-400 flex-shrink-0">
          {children.length > 0 ? (
            <FolderOpen size={14} className="text-accent" />
          ) : (
            <Folder size={14} className="text-gray-300" />
          )}
        </div>

        <span className="flex-1 text-sm text-primary">{category.name}</span>
        <span className="text-2xs text-gray-400 font-mono">{category.slug}</span>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={() => onEdit(category)}
            className="p-1 text-gray-400 hover:text-primary rounded hover:bg-white transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div>
          {children
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <TreeNode
                key={child.id}
                category={child}
                allCategories={allCategories}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const categories: Category[] = data?.data || [];
  // Flatten all categories for the form
  function flatten(cats: Category[]): Category[] {
    return cats.flatMap((c) => [c, ...(c.children ? flatten(c.children) : [])]);
  }
  const flatCategories = flatten(categories);

  // Root-level categories
  const rootCategories = flatCategories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.order - b.order);

  async function handleDelete(category: Category) {
    const childCount = flatCategories.filter((c) => c.parentId === category.id).length;
    const msg = childCount > 0
      ? `Eliminare "${category.name}" e tutte le sue ${childCount} sottocategorie?`
      : `Eliminare la categoria "${category.name}"?`;

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast.success('Categoria eliminata');
    } catch {
      toast.error('Impossibile eliminare la categoria');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Categorie</h1>
          <p className="text-sm text-gray-400 mt-0.5">{flatCategories.length} categorie in collezione</p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
          Aggiungi Categoria
        </Button>
      </div>

      <div className="bg-white border border-border rounded p-3">
        {isLoading ? (
          <LoadingSpinner className="mx-auto my-8" />
        ) : rootCategories.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Nessuna categoria ancora</p>
        ) : (
          rootCategories.map((cat) => (
            <TreeNode
              key={cat.id}
              category={cat}
              allCategories={flatCategories}
              onEdit={setEditingCategory}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Aggiungi Categoria"
      >
        <CategoryForm
          categories={flatCategories}
          onSuccess={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title="Modifica Categoria"
      >
        {editingCategory && (
          <CategoryForm
            category={editingCategory}
            categories={flatCategories}
            onSuccess={() => {
              setEditingCategory(null);
              queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
            }}
            onCancel={() => setEditingCategory(null)}
          />
        )}
      </Modal>
    </div>
  );
}
