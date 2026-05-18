'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { generateDefaultPassword } from '@/lib/password';
import type { Customer } from '@/types';

const createSchema = z.object({
  companyName: z.string().min(1, 'Obbligatorio'),
  customerCode: z.string().min(1, 'Obbligatorio'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Minimo 6 caratteri'),
  role: z.enum(['ADMIN', 'CUSTOMER']).default('CUSTOMER'),
  isActive: z.boolean().default(true),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  vatNumber: z.string().optional(),
});

const updateSchema = z.object({
  companyName: z.string().min(1, 'Obbligatorio').optional(),
  email: z.string().email('Email non valida').optional(),
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
    watch,
    setValue,
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
      : { role: 'CUSTOMER', isActive: true },
  });

  // Auto-sync generated password when companyName changes (create mode only)
  const companyName = watch('companyName', '') as string;
  const generatedPassword = generateDefaultPassword(companyName);

  useEffect(() => {
    if (!isEdit) {
      setValue('password' as any, generatedPassword);
    }
  }, [generatedPassword, isEdit, setValue]);

  async function onSubmit(values: CreateValues | UpdateValues) {
    try {
      const url = isEdit ? `/api/customers/${customer!.id}` : '/api/customers';
      const method = isEdit ? 'PATCH' : 'POST';

      const body: any = { ...values };
      if (isEdit && !body.newPassword) delete body.newPassword;
      Object.keys(body).forEach((k) => { if (body[k] === '') body[k] = null; });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      toast.success(isEdit ? 'Cliente aggiornato' : 'Cliente creato');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Operazione fallita');
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(generatedPassword);
    toast.success('Password copiata');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nome Azienda *"
          {...register('companyName')}
          error={(errors as any).companyName?.message}
          placeholder="Studio Design Rossi"
        />
        {!isEdit ? (
          <Input
            label="Codice Cliente *"
            {...register('customerCode')}
            error={(errors as any).customerCode?.message}
            placeholder="ADS001"
          />
        ) : (
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
              Codice Cliente
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
          placeholder="acquisti@azienda.com"
        />

        {/* Create mode: show auto-generated password (read-only) */}
        {!isEdit ? (
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
              Password generata automaticamente
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-cream border border-border rounded">
              <span className={`flex-1 font-mono text-sm ${companyName ? 'text-primary' : 'text-gray-400'}`}>
                {companyName ? generatedPassword : 'onearth_…'}
              </span>
              {companyName && (
                <button
                  type="button"
                  onClick={copyPassword}
                  className="text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                  title="Copia password"
                >
                  <Copy size={13} />
                </button>
              )}
            </div>
            <p className="text-2xs text-gray-400 mt-1">
              Comunica questa password al cliente prima di salvare — non sarà più visibile.
            </p>
            {/* Hidden field carries the value into the form payload */}
            <input type="hidden" {...register('password' as any)} />
          </div>
        ) : (
          <Input
            label="Nuova Password (vuoto = invariata)"
            type="password"
            {...register('newPassword' as any)}
            error={(errors as any).newPassword?.message}
            placeholder="••••••••"
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input label="Telefono" {...register('phone')} placeholder="+39 02 123456" />
        <Input label="Città"    {...register('city')}  placeholder="Milano" />
        <Input label="Paese"    {...register('country')} placeholder="Italia" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Partita IVA" {...register('vatNumber')} placeholder="IT12345678901" />
        <div>
          <label className="block text-xs font-medium tracking-wide uppercase text-gray-600 mb-2">
            Ruolo
          </label>
          <select
            {...register('role')}
            className="w-full px-4 py-2.5 bg-white border border-border rounded text-sm focus:outline-none focus:border-accent"
          >
            <option value="CUSTOMER">Cliente</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-accent" />
        <label htmlFor="isActive" className="text-sm text-primary">Attivo (può accedere)</label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Annulla</Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salva Modifiche' : 'Crea Cliente'}
        </Button>
      </div>
    </form>
  );
}
