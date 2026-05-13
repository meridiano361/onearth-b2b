'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Product, Category } from '@/types';

const schema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  costPrice: z.string().min(1, 'Required').transform(Number),
  retailPrice: z.string().min(1, 'Required').transform(Number),
  lotSize: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.input<typeof schema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;

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
        }
      : { isActive: true, lotSize: '1' },
  });

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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(isEdit ? 'Product updated' : 'Product created');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save product');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Product Code *"
          {...register('code')}
          error={errors.code?.message}
          placeholder="OE-CAT-001"
        />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
            Category
          </label>
          <select
            {...register('categoryId')}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Product Name *"
        {...register('name')}
        error={errors.name?.message}
        placeholder="Anima Sofa 3-Seater"
      />

      <div>
        <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={2}
          className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm text-primary focus:outline-none focus:border-accent resize-none"
          placeholder="Product description..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Cost Price (€) *"
          type="number"
          step="0.01"
          {...register('costPrice')}
          error={errors.costPrice?.message}
          placeholder="0.00"
        />
        <Input
          label="Retail Price (€) *"
          type="number"
          step="0.01"
          {...register('retailPrice')}
          error={errors.retailPrice?.message}
          placeholder="0.00"
        />
        <Input
          label="Lot Size"
          type="number"
          min="1"
          {...register('lotSize')}
          placeholder="1"
        />
      </div>

      <Input
        label="Notes"
        {...register('notes')}
        placeholder="Available in 6 fabric options..."
      />

      <Input
        label="Image URL"
        {...register('imageUrl')}
        placeholder="https://..."
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="w-4 h-4 accent-accent"
        />
        <label htmlFor="isActive" className="text-sm text-primary">Active (visible in catalog)</label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
