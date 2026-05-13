'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Customer } from '@/types';

const createSchema = z.object({
  companyName: z.string().min(1, 'Required'),
  customerCode: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  role: z.enum(['ADMIN', 'CUSTOMER']).default('CUSTOMER'),
  isActive: z.boolean().default(true),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
});

const updateSchema = z.object({
  companyName: z.string().min(1, 'Required').optional(),
  email: z.string().email('Invalid email').optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
  newPassword: z.string().min(6).optional().or(z.literal('')),
});

type CreateValues = z.infer<typeof createSchema>;
type UpdateValues = z.infer<typeof updateSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues | UpdateValues>({
    defaultValues: customer
      ? {
          companyName: customer.companyName,
          email: customer.email,
          isActive: customer.isActive,
          role: customer.role,
          phone: customer.phone || '',
          city: customer.city || '',
          country: customer.country || '',
          vatNumber: customer.vatNumber || '',
        }
      : {
          role: 'CUSTOMER',
          isActive: true,
        },
  });

  async function onSubmit(values: CreateValues | UpdateValues) {
    try {
      const url = isEdit ? `/api/customers/${customer!.id}` : '/api/customers';
      const method = isEdit ? 'PATCH' : 'POST';

      const body: any = { ...values };
      // Don't send empty password on edit
      if (isEdit && !body.newPassword) {
        delete body.newPassword;
      }
      // Clean empty optional fields
      Object.keys(body).forEach((k) => {
        if (body[k] === '') body[k] = null;
      });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(isEdit ? 'Customer updated' : 'Customer created');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Company Name *"
          {...register('companyName')}
          error={(errors as any).companyName?.message}
          placeholder="Acme Design Studio"
        />
        {!isEdit && (
          <Input
            label="Customer Code *"
            {...register('customerCode')}
            error={(errors as any).customerCode?.message}
            placeholder="ADS001"
          />
        )}
        {isEdit && (
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
              Customer Code
            </label>
            <p className="px-4 py-2.5 bg-cream border border-border rounded text-sm text-gray-500 font-mono">
              {customer!.customerCode}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email *"
          type="email"
          {...register('email')}
          error={(errors as any).email?.message}
          placeholder="buyer@company.com"
        />
        <Input
          label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
          type="password"
          {...register(isEdit ? 'newPassword' : 'password')}
          error={(errors as any).password?.message || (errors as any).newPassword?.message}
          placeholder="••••••••"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Phone"
          {...register('phone')}
          placeholder="+39 02 123456"
        />
        <Input
          label="City"
          {...register('city')}
          placeholder="Milano"
        />
        <Input
          label="Country"
          {...register('country')}
          placeholder="Italy"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="VAT Number"
          {...register('vatNumber')}
          placeholder="IT12345678901"
        />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
            Role
          </label>
          <select
            {...register('role')}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm focus:outline-none focus:border-accent"
          >
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          {...register('isActive')}
          className="w-4 h-4 accent-accent"
        />
        <label htmlFor="isActive" className="text-sm text-primary">Active (can log in)</label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
}
