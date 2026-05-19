'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Store, Radio, Globe, Package, LogOut, CheckCircle2, ShoppingBag, Building, ShoppingCart, Tag, Landmark } from 'lucide-react';
import { signOut } from 'next-auth/react';
import type { Canale, CanaleTipo } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const TIPO_ICONS: Record<CanaleTipo, React.ReactNode> = {
  BOTTEGA: <Store size={20} />,
  EMPORIO: <ShoppingBag size={20} />,
  DISTRETTO: <Building size={20} />,
  STORE: <ShoppingCart size={20} />,
  OUTLET: <Tag size={20} />,
  TENDONE: <Radio size={20} />,
  FIERA: <Landmark size={20} />,
  ONLINE: <Globe size={20} />,
  ALTRO: <Package size={20} />,
};

const TIPO_LABELS: Record<CanaleTipo, string> = {
  BOTTEGA: 'Bottega',
  EMPORIO: 'Emporio',
  DISTRETTO: 'Distretto',
  STORE: 'Store',
  OUTLET: 'Outlet',
  TENDONE: 'Tendone',
  FIERA: 'Fiera',
  ONLINE: 'Online',
  ALTRO: 'Altro',
};

export default function SelezionaCanale() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [canali, setCanali] = useState<Canale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status !== 'authenticated') return;
    if (session?.user.role !== 'OPERATOR') {
      router.push('/catalog');
      return;
    }
    if (session?.user.canaleId) {
      router.push('/catalog');
      return;
    }
    fetchCanali();
  }, [status, session]);

  async function fetchCanali() {
    try {
      const res = await fetch(`/api/canali?organizationId=${session!.user.organizationId}`);
      const json = await res.json();
      const list: Canale[] = json.data || [];
      setCanali(list);
      // Auto-select if only one canale
      if (list.length === 1) {
        await selectCanale(list[0]);
      }
    } catch {
      // keep loading state
    } finally {
      setLoading(false);
    }
  }

  async function selectCanale(canale: Canale) {
    setSelecting(canale.id);
    await update({ canaleId: canale.id, canaleName: canale.nome });
    router.push('/catalog');
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-primary tracking-wide">ON EARTH</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500">{session?.user.companyName}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
        >
          <LogOut size={13} />
          Esci
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <p className="label-luxury text-accent mb-2">Benvenuta/o</p>
            <h1 className="font-display text-2xl text-primary font-light mb-2">
              Seleziona il punto vendita
            </h1>
            <p className="text-sm text-gray-400">
              Scegli la bottega per cui stai creando l'ordine
            </p>
          </div>

          {canali.length === 0 ? (
            <div className="bg-white border border-border rounded-lg p-8 text-center">
              <Store size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Nessun punto vendita configurato</p>
              <p className="text-xs text-gray-400">Contatta l'amministratore per aggiungere i canali della tua organizzazione.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {canali.map((canale) => (
                <button
                  key={canale.id}
                  onClick={() => selectCanale(canale)}
                  disabled={!!selecting}
                  className="w-full bg-white border border-border rounded-lg px-5 py-4 flex items-center gap-4 hover:border-accent hover:bg-cream transition-all text-left disabled:opacity-60 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-cream border border-border flex items-center justify-center text-gray-500 group-hover:border-accent group-hover:text-accent transition-colors flex-shrink-0">
                    {selecting === canale.id
                      ? <CheckCircle2 size={20} className="text-accent" />
                      : TIPO_ICONS[canale.tipo]
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary text-sm">{canale.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {TIPO_LABELS[canale.tipo]}{canale.citta ? ` · ${canale.citta}` : ''}
                    </p>
                  </div>
                  {selecting === canale.id && (
                    <LoadingSpinner className="flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
