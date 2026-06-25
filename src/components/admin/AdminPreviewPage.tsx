'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ChevronDown } from 'lucide-react';

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
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Eye size={22} className="text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-primary">Anteprima cliente</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Naviga l&apos;app come se fossi un operatore cliente, senza modificare dati reali.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento organizzazioni…</p>
      ) : (
        <div className="space-y-5">
          {/* Organization dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Visualizza come:
            </label>
            <div className="relative">
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full appearance-none border border-border rounded px-3 py-2.5 text-sm text-primary bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">— Seleziona organizzazione —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Operator dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Operatore:
            </label>
            <div className="relative">
              <select
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                disabled={!selectedOrgId || operators.length === 0}
                className="w-full appearance-none border border-border rounded px-3 py-2.5 text-sm text-primary bg-white pr-8 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedOrgId
                    ? '— Prima seleziona un\'organizzazione —'
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

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={handleEnterPreview}
            disabled={!selectedOrgId || !selectedOperatorId || entering}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded hover:bg-warm-darker transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Eye size={15} />
            {entering ? 'Entrando…' : 'Entra in modalità anteprima'}
          </button>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-gray-700 mb-2">Oppure:</p>
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 px-4 py-2.5 border border-border text-primary text-sm font-medium rounded hover:bg-cream transition-colors w-full"
            >
              <Eye size={15} />
              Anteprima generica (nessuna organizzazione)
            </button>
            <p className="text-2xs text-gray-400 mt-2 leading-relaxed">
              Visualizza il catalogo senza impersonare nessun operatore. Nessun ordine, destinazione o preferito.
            </p>
          </div>

          <p className="text-2xs text-gray-400 leading-relaxed">
            In modalità anteprima specifica puoi navigare il catalogo, vedere preferiti, destinazioni e ordini
            dell&apos;organizzazione selezionata. La creazione di ordini è disabilitata.
            Usa il banner giallo in cima alla pagina per uscire.
          </p>
        </div>
      )}
    </div>
  );
}
