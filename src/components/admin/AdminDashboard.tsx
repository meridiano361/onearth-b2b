'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ShoppingCart, Users, Package, TrendingUp, ArrowRight,
  MessageSquare, BarChart2, BookOpen, Layers, FileText,
  Image as ImageIcon, Bell, Paintbrush, Eye,
} from 'lucide-react';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminDashboard() {
  const REFRESH = 30_000;

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?limit=8');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: REFRESH,
  });

  const { data: customersData } = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: async () => {
      const res = await fetch('/api/customers?limit=1');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: REFRESH,
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-count'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: REFRESH,
  });

  const { data: surveysData } = useQuery({
    queryKey: ['admin-surveys-summary'],
    queryFn: async () => {
      const res = await fetch('/api/admin/surveys?limit=100');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: REFRESH,
  });

  const orders: any[] = ordersData?.data ?? [];
  const revenue = orders.reduce((sum: number, o: any) => sum + Number(o.totalValue), 0);

  const surveys: any[] = surveysData?.data ?? [];
  const activeSurveys = surveys.filter((s: any) => s.status === 'active');
  const totalResponses = surveys.reduce((sum: number, s: any) => sum + (s._count?.responses ?? 0), 0);

  const statusVariant: Record<string, string> = {
    MERCE_DA_ORDINARE:         'default',
    MERCE_ORDINATA:            'info',
    MERCE_PARZIALMENTE_PRONTA: 'warning',
    MERCE_PRONTA_DA_AVVISARE:  'success',
    MERCE_PRONTA_AVVISATO:     'success',
  };

  const kpis = [
    {
      label: 'Ordini',
      value: ordersData?.total ?? '—',
      sub: `${formatCurrency(revenue)} stimato`,
      icon: ShoppingCart,
      href: '/admin/orders',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      accent: 'border-t-blue-400',
    },
    {
      label: 'Clienti',
      value: customersData?.total ?? '—',
      sub: 'organizzazioni registrate',
      icon: Users,
      href: '/admin/customers',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      accent: 'border-t-emerald-400',
    },
    {
      label: 'Prodotti attivi',
      value: productsData?.total ?? '—',
      sub: 'nel catalogo corrente',
      icon: Package,
      href: '/admin/products',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      accent: 'border-t-amber-400',
    },
    {
      label: 'Sondaggi attivi',
      value: activeSurveys.length,
      sub: `${totalResponses} risposte ricevute`,
      icon: MessageSquare,
      href: '/admin/sondaggi',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      accent: 'border-t-purple-400',
    },
  ];

  const quickLinks = [
    { href: '/admin/analytics',          label: 'Analisi',           icon: BarChart2  },
    { href: '/admin/catalogo-pdf',       label: 'Catalogo PDF',      icon: BookOpen   },
    { href: '/admin/classificazione',    label: 'Classificazione',   icon: Layers     },
    { href: '/admin/documenti',          label: 'Documenti',         icon: FileText   },
    { href: '/admin/foto',               label: 'Foto',              icon: ImageIcon  },
    { href: '/admin/notifiche',          label: 'Notifiche',         icon: Bell       },
    { href: '/admin/personalizzazione',  label: 'Personalizzazione', icon: Paintbrush },
    { href: '/admin/anteprima',          label: 'Anteprima',         icon: Eye        },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">

      {/* Header */}
      <div className="mb-7">
        <p className="label-luxury text-accent mb-1">Meridiano 361</p>
        <h1 className="font-display text-3xl text-primary font-light">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Aggiornamento automatico ogni 30 s</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, sub, icon: Icon, href, iconColor, iconBg, accent }) => (
          <Link
            key={label}
            href={href}
            className={`bg-white border border-border border-t-2 ${accent} rounded-xl p-5 hover:shadow-luxury transition-all duration-200 group flex flex-col`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
                <Icon size={17} className={iconColor} />
              </div>
              <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-primary leading-none mb-1">{value}</p>
            <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
            <p className="text-2xs text-gray-400 mt-auto pt-2 border-t border-border">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Ordini recenti (2/3) */}
        <div className="lg:col-span-2 bg-white border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-blue-500" />
              <h2 className="text-sm font-medium text-primary">Ordini Recenti</h2>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Gestisci ordini <ArrowRight size={12} />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="sm" />
            </div>
          ) : orders.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-gray-400">Nessun ordine ancora</p>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((order: any) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-cream/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-primary truncate">
                        {order.organization?.nome || order.customer?.companyName || '—'}
                      </span>
                      <Badge variant={statusVariant[order.status] as any} size="xs">
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="text-2xs text-gray-400 mt-0.5">
                      {formatDate(order.createdAt, 'datetime')}
                      {' · '}{order.totalItems} pz
                      {order.operator ? ` · ${order.operator.nome} ${order.operator.cognome}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary flex-shrink-0">
                    {formatCurrency(Number(order.totalValue))}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-border bg-cream/30">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
            >
              <TrendingUp size={12} />
              Vedi tutti gli ordini e le analisi
            </Link>
          </div>
        </div>

        {/* Colonna destra */}
        <div className="space-y-5">

          {/* Sondaggi */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-purple-500" />
                <h2 className="text-sm font-medium text-primary">Sondaggi</h2>
              </div>
              <Link
                href="/admin/sondaggi"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
              >
                Gestisci <ArrowRight size={12} />
              </Link>
            </div>

            {activeSurveys.length === 0 ? (
              <p className="text-2xs text-gray-400 text-center py-6">Nessun sondaggio attivo</p>
            ) : (
              <div className="p-3 space-y-1">
                {activeSurveys.slice(0, 5).map((s: any) => {
                  const recipients = s._count?.recipients ?? 0;
                  const responses = s._count?.responses ?? 0;
                  const pct = recipients > 0 ? Math.round((responses / recipients) * 100) : 0;
                  return (
                    <Link
                      key={s.id}
                      href={`/admin/sondaggi/${s.id}`}
                      className="block px-3 py-2.5 rounded-lg hover:bg-cream transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-primary truncate flex-1 mr-2">{s.title}</p>
                        <span className="text-2xs text-gray-400 flex-shrink-0">{responses}/{recipients}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-2xs text-gray-400 mt-1">{pct}% risposto</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accesso rapido */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-medium text-primary">Accesso Rapido</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-1">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-cream transition-colors group"
                >
                  <Icon size={13} className="text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="text-2xs text-gray-600 group-hover:text-primary transition-colors truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
