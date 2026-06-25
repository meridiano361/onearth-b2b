'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ChevronDown, Users, Shirt } from 'lucide-react';

interface Operator {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  attivo: boolean;
}

interface Organization {
  id: string;
  nome: string;
  operatori: Operator[];
}

export default function AdminPreviewPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((json) => {
        setOrgs(json.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const operators = selectedOrg?.operatori.filter((op) => op.attivo) ?? [];

  function handleOrgChange(orgId: string) {
    setSelectedOrgId(orgId);
    setSelectedOperatorId('');
  }

  async function handleEnterPreview() {
    if (!selectedOrgId || !selectedOperatorId) return;
    setEntering(true);
    setError('');
    try {
      const res = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedOrgId, operatorId: selectedOperatorId }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Errore');
        return;
      }
      router.push('/home');
      router.refresh();
    } catch {
      setError('Errore di rete');
    } finally {
      setEntering(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Anteprima</h1>
      </div>

      {/* 1 — Anteprima generale */}
      <section className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Eye size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Anteprima generale</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Visualizza l&apos;app pubblicata così come la vede un cliente, senza impersonare nessuna organizzazione.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded hover:bg-warm-darker transition-colors"
        >
          <Eye size={14} />
          Entra in anteprima generale
        </button>
      </section>

      {/* 2 — Anteprima per operatore */}
      <section className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Users size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Anteprima per operatore</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Naviga l&apos;app come se fossi uno specifico operatore cliente, con preferiti, destinazioni e ordini reali.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Caricamento organizzazioni…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Organizzazione</label>
              <div className="relative">
                <select
                  value={selectedOrgId}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-full appearance-none border border-border rounded px-3 py-2.5 text-sm text-primary bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">— Seleziona organizzazione —</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Operatore</label>
              <div className="relative">
                <select
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  disabled={!selectedOrgId || operators.length === 0}
                  className="w-full appearance-none border border-border rounded px-3 py-2.5 text-sm text-primary bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!selectedOrgId
                      ? "— Prima seleziona un'organizzazione —"
                      : operators.length === 0
                      ? '— Nessun operatore attivo —'
                      : '— Seleziona operatore —'}
                  </option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.nome} {op.cognome} ({op.email})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              onClick={handleEnterPreview}
              disabled={!selectedOrgId || !selectedOperatorId || entering}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded hover:bg-warm-darker transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye size={14} />
              {entering ? 'Entrando…' : 'Entra come questo operatore'}
            </button>
          </div>
        )}
      </section>

      {/* 3 — Anteprima in sviluppo */}
      <section className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center flex-shrink-0">
            <Shirt size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary">Anteprima in sviluppo</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sezione MODA PE27 — non ancora pubblicata, visibile solo dalla dashboard admin.
            </p>
          </div>
        </div>
        <a
          href="/moda"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 text-white text-sm font-medium rounded hover:bg-fuchsia-700 transition-colors"
        >
          <Shirt size={14} />
          Apri anteprima MODA PE27
        </a>
      </section>
    </div>
  );
}
