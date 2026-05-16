'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Search, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProductImport from './ProductImport';
import ProductForm from './ProductForm';
import type { Product } from '@/types';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '500' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const products: Product[] = data?.data || [];

  async function handleToggleActive(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`Prodotto ${product.isActive ? 'disattivato' : 'attivato'}`);
    } catch {
      toast.error('Impossibile aggiornare il prodotto');
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Eliminare ${product.name}? Questa azione non può essere annullata.`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Prodotto eliminato');
    } catch {
      toast.error('Impossibile eliminare il prodotto');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin</p>
          <h1 className="font-display text-2xl text-primary font-light">Prodotti</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.total || 0} prodotti in collezione</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            icon={<Upload size={13} />}
            onClick={() => setShowImport(true)}
          >
            <span className="hidden sm:inline">Importa</span>
          </Button>
          <Button
            icon={<Plus size={13} />}
            onClick={() => setShowCreateForm(true)}
          >
            <span className="hidden sm:inline">Aggiungi Prodotto</span>
            <span className="sm:hidden">Aggiungi</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Cerca per codice o nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={14} />}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[600px]">
          <thead>
            <tr>
              <th>Codice</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Costo</th>
              <th>Vendita</th>
              <th>LOT</th>
              <th>Stato</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <LoadingSpinner className="mx-auto" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  Nessun prodotto trovato
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className="font-mono text-xs text-gray-500">{product.code}</span>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-primary text-xs">{product.name}</p>
                      {product.notes && (
                        <p className="text-2xs text-gray-400 truncate max-w-[200px]">{product.notes}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs text-gray-500">{product.category?.name || '—'}</span>
                  </td>
                  <td className="font-medium text-xs">{formatCurrency(product.costPrice)}</td>
                  <td className="text-xs text-gray-500">{formatCurrency(product.retailPrice)}</td>
                  <td className="text-xs text-center">
                    {product.lotSize > 1 ? (
                      <Badge variant="accent" size="xs">{product.lotSize}</Badge>
                    ) : (
                      <span className="text-gray-300">1</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={product.isActive ? 'success' : 'default'} size="xs">
                      {product.isActive ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(product)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors"
                        title={product.isActive ? 'Disattiva' : 'Attiva'}
                      >
                        {product.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                        title="Delete"
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

      {/* Import Modal */}
      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Importa Prodotti"
        size="xl"
      >
        <ProductImport
          onSuccess={() => {
            setShowImport(false);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Modifica Prodotto"
        size="lg"
      >
        {editingProduct && (
          <ProductForm
            product={editingProduct}
            onSuccess={() => {
              setEditingProduct(null);
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            }}
            onCancel={() => setEditingProduct(null)}
          />
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Aggiungi Prodotto"
        size="lg"
      >
        <ProductForm
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>
    </div>
  );
}
