'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ChevronDown, Loader2, MonitorSmartphone, UserCheck, FlaskConical } from 'lucide-react';

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

export default function AdminAnteprimaPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((json) => { setOrgs(json.data ?? []); setLoadingOrgs(false); })
      .catch(() => setLoadingOrgs(false));
  }, []);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const operators = selectedOrg?.operatori.filter((op) => op.attivo) ?? [];

  function handleOrgChange(orgId: string) {
    setSelectedOrgId(orgId);
    setSelectedOperatorId('');
    setError('');
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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Admin</p>
        <h1 className="font-display text-2xl text-primary font-light">Anteprima</h1>
        <p className="text-xs text-gray-400 mt-1">Visualizza l'app in diverse modalità senza modificare dati reali.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Pannello 1: Anteprima generica ─────────────────────────────── */}
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <MonitorSmartphone size={18} className="text-gray-600" />
            </div>
            <div>
              <h2 className="font-medium text-primary text-sm">Anteprima generica</h2>
              <p className="text-2xs text-gray-400">Apre l'app attuale</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-6 flex-1">
            Accedi all'app come amministratore senza impersonare nessun cliente.
            Vedrai l'interfaccia ma senza dati specifici di un'organizzazione.
          </p>
          <a
            href="/home"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-border rounded-lg text-sm text-primary hover:bg-cream transition-colors font-medium"
          >
            <Eye size={14} />
            Apri app attuale
          </a>
        </div>

        {/* ── Pannello 2: Anteprima cliente ───────────────────────────────── */}
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <UserCheck size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-medium text-primary text-sm">Anteprima cliente</h2>
              <p className="text-2xs text-gray-400">Vista di un cliente specifico</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Naviga l'app come se fossi un operatore cliente: vedrai i suoi ordini, preferiti e destinazioni.
          </p>

          {loadingOrgs ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
              <Loader2 size={13} className="animate-spin" /> Caricamento…
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              <div>
                <label className="block text-2xs text-gray-500 mb-1.5">Organizzazione</label>
                <div className="relative">
                  <select
                    value={selectedOrgId}
                    onChange={(e) => handleOrgChange(e.target.value)}
                    className="w-full appearance-none border border-border rounded px-3 py-2 text-xs text-primary bg-white pr-7 focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">— Seleziona —</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-2xs text-gray-500 mb-1.5">Operatore</label>
                <div className="relative">
                  <select
                    value={selectedOperatorId}
                    onChange={(e) => setSelectedOperatorId(e.target.value)}
                    disabled={!selectedOrgId || operators.length === 0}
                    className="w-full appearance-none border border-border rounded px-3 py-2 text-xs text-primary bg-white pr-7 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedOrgId ? '— Prima seleziona org —' : operators.length === 0 ? '— Nessun operatore attivo —' : '— Seleziona —'}
                    </option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>{op.nome} {op.cognome}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {error && <p className="text-2xs text-red-500">{error}</p>}
            </div>
          )}

          <button
            onClick={handleEnterPreview}
            disabled={!selectedOrgId || !selectedOperatorId || entering}
            className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {entering ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
            {entering ? 'Entrando…' : 'Entra come cliente'}
          </button>
        </div>

        {/* ── Pannello 3: Anteprima in sviluppo ──────────────────────────── */}
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FlaskConical size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-medium text-primary text-sm">Anteprima in sviluppo</h2>
              <p className="text-2xs text-gray-400">Nascosta agli utenti clienti</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-6 flex-1">
            La nuova versione dell'app, ancora in fase di sviluppo e non visibile ai clienti.
            Accessibile solo agli amministratori.
          </p>
          <a
            href="/catalog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <FlaskConical size={14} />
            Apri versione in sviluppo
          </a>
        </div>

      </div>
    </div>
  );
}
