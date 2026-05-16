'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  ArrowRight,
  Plus,
  Upload,
} from 'lucide-react';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Stats {
  orders: number;
  customers: number;
  products: number;
  revenue: number;
  recentOrders: any[];
}

export default function AdminDashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?limit=10');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: async () => {
      const res = await fetch('/api/customers?limit=1');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-count'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const orders = ordersData?.data || [];
  const revenue = orders.reduce((sum: number, o: any) => sum + Number(o.totalValue), 0);

  const statusVariant: Record<string, string> = {
    DRAFT: 'default',
    CONFIRMED: 'info',
    PROCESSING: 'warning',
    SHIPPED: 'success',
    CANCELLED: 'danger',
  };

  const stats = [
    {
      label: 'Ordini Totali',
      value: ordersData?.total || 0,
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Clienti',
      value: customersData?.total || 0,
      icon: Users,
      href: '/admin/customers',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Prodotti Attivi',
      value: productsData?.total || 0,
      icon: Package,
      href: '/admin/products',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Fatturato Totale',
      value: formatCurrency(revenue),
      icon: TrendingUp,
      href: '/admin/orders',
      color: 'text-accent',
      bg: 'bg-amber-50',
      isMonetary: true,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Meridiano 361</p>
        <h1 className="font-display text-3xl text-primary font-light">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Panoramica Collezione CASA 2027</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="bg-white border border-border rounded p-5 hover:shadow-luxury transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded flex items-center justify-center ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <ArrowRight
                size={14}
                className="text-gray-300 group-hover:text-gray-600 transition-colors mt-0.5"
              />
            </div>
            <p className="text-xl font-semibold text-primary">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white border border-border rounded">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-primary">Ordini Recenti</h2>
            <Link
              href="/admin/orders"
              className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 transition-colors"
            >
              Vedi tutti <ArrowRight size={12} />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="sm" />
            </div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              Nessun ordine ancora
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orders.slice(0, 8).map((order: any) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-cream/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary truncate">
                        {order.customer?.companyName || 'Unknown'}
                      </span>
                      <Badge variant={statusVariant[order.status] as any} size="xs">
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="text-2xs text-gray-400 mt-0.5">
                      {formatDate(order.createdAt, 'datetime')} · {order.totalItems} pezzi
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary flex-shrink-0">
                    {formatCurrency(Number(order.totalValue))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <div className="bg-white border border-border rounded">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-medium text-primary">Azioni Rapide</h2>
            </div>
            <div className="p-3 space-y-2">
              <Link
                href="/admin/products"
                className="flex items-center gap-3 w-full px-3 py-3 rounded hover:bg-cream transition-colors text-left group"
              >
                <div className="w-8 h-8 bg-amber-50 rounded flex items-center justify-center flex-shrink-0">
                  <Upload size={14} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Importa Prodotti</p>
                  <p className="text-2xs text-gray-400">Carica file CSV o Excel</p>
                </div>
                <ArrowRight size={12} className="text-gray-300 group-hover:text-gray-600 ml-auto transition-colors" />
              </Link>

              <Link
                href="/admin/customers"
                className="flex items-center gap-3 w-full px-3 py-3 rounded hover:bg-cream transition-colors text-left group"
              >
                <div className="w-8 h-8 bg-green-50 rounded flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Aggiungi Cliente</p>
                  <p className="text-2xs text-gray-400">Crea nuovo account</p>
                </div>
                <ArrowRight size={12} className="text-gray-300 group-hover:text-gray-600 ml-auto transition-colors" />
              </Link>

              <Link
                href="/admin/categories"
                className="flex items-center gap-3 w-full px-3 py-3 rounded hover:bg-cream transition-colors text-left group"
              >
                <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Gestisci Categorie</p>
                  <p className="text-2xs text-gray-400">Modifica struttura collezione</p>
                </div>
                <ArrowRight size={12} className="text-gray-300 group-hover:text-gray-600 ml-auto transition-colors" />
              </Link>
            </div>
          </div>

          {/* Collection info */}
          <div className="mt-4 bg-primary rounded p-5 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #ACA39A 0px, #ACA39A 1px, transparent 1px, transparent 40px)',
              }}
            />
            <p className="relative text-2xs tracking-widest uppercase text-accent font-medium mb-1">
              Collezione Attiva
            </p>
            <p className="relative font-display text-2xl text-white font-light tracking-wide">
              CASA 2027
            </p>
            <p className="relative text-2xs text-gray-500 mt-2 uppercase tracking-wider">
              FW 2027 · Showroom B2B
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
