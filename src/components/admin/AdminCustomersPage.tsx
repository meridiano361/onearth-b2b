'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CustomerForm from './CustomerForm';
import type { Customer } from '@/types';
import toast from 'react-hot-toast';

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const customers: (Customer & { orderCount?: number })[] = data?.data || [];

  async function handleToggleActive(customer: Customer) {
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success(`Cliente ${customer.isActive ? 'disattivato' : 'attivato'}`);
    } catch {
      toast.error('Impossibile aggiornare il cliente');
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Eliminare ${customer.companyName}? Questa azione non può essere annullata.`)) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Cliente eliminato');
    } catch (err: any) {
      toast.error(err.message || 'Impossibile eliminare il cliente');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Clienti</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total || 0} account registrati</p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
          <span className="hidden sm:inline">Aggiungi Cliente</span>
          <span className="sm:hidden">Aggiungi</span>
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Cerca per nome, email o codice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={14} />}
        />
      </div>

      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[700px]">
          <thead>
            <tr>
              <th>Azienda</th>
              <th>Codice</th>
              <th>Email</th>
              <th>Città</th>
              <th>Ruolo</th>
              <th>Ordini</th>
              <th>Stato</th>
              <th>Registrato</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <LoadingSpinner className="mx-auto" />
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                  Nessun cliente trovato
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <p className="font-medium text-primary text-xs">{customer.companyName}</p>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-gray-500">{customer.customerCode}</span>
                  </td>
                  <td className="text-xs text-gray-600">{customer.email}</td>
                  <td className="text-xs text-gray-500">{customer.city || '—'}</td>
                  <td>
                    <Badge
                      variant={customer.role === 'ADMIN' ? 'accent' : 'default'}
                      size="xs"
                    >
                      {customer.role}
                    </Badge>
                  </td>
                  <td className="text-center">
                    <span className="text-xs font-medium text-gray-500">
                      {(customer as any).orderCount || 0}
                    </span>
                  </td>
                  <td>
                    <Badge
                      variant={customer.isActive ? 'success' : 'default'}
                      size="xs"
                    >
                      {customer.isActive ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </td>
                  <td className="text-xs text-gray-400">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCustomer(customer)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(customer)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                        title={customer.isActive ? 'Disattiva' : 'Attiva'}
                      >
                        {customer.isActive
                          ? <ToggleRight size={14} className="text-green-500" />
                          : <ToggleLeft size={14} />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Aggiungi Cliente"
        size="lg"
      >
        <CustomerForm
          onSuccess={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title="Modifica Cliente"
        size="lg"
      >
        {editingCustomer && (
          <CustomerForm
            customer={editingCustomer}
            onSuccess={() => {
              setEditingCustomer(null);
              queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            }}
            onCancel={() => setEditingCustomer(null)}
          />
        )}
      </Modal>
    </div>
  );
}
