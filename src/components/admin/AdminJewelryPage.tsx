'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Settings2, Play, CheckCircle2, XCircle, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import type {
  SupportoEspositivo, ZonaPosizionamento,
  TipoSupporto, TonoLegno, CategoriaGioiello,
} from '@/types/jewelry';
import {
  LABEL_SUPPORTO, LABEL_CATEGORIA,
  SUPPORTI_COMPATIBILI,
} from '@/types/jewelry';

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchSupporti(): Promise<SupportoEspositivo[]> {
  const res = await fetch('/api/jewelry/supporti?attivi=false');
  if (!res.ok) throw new Error('Errore caricamento supporti');
  const json = await res.json();
  return json.data;
}

// ─── Componente zone editor ───────────────────────────────────────────────────

function ZoneEditor({
  supporto, onClose,
}: {
  supporto: SupportoEspositivo;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const categorie: CategoriaGioiello[] = (
    Object.keys(SUPPORTI_COMPATIBILI) as CategoriaGioiello[]
  ).filter((cat) => SUPPORTI_COMPATIBILI[cat].includes(supporto.tipo));

  const [zone, setZone] = useState<Record<CategoriaGioiello, Omit<ZonaPosizionamento, 'id' | 'supportoId'>>>(
    () => {
      const init = {} as any;
      categorie.forEach((cat) => {
        const z = supporto.zone?.find((z) => z.categoria === cat);
        init[cat] = z
          ? { categoria: cat, anchorX: z.anchorX, anchorY: z.anchorY, maxLarghezzaPx: z.maxLarghezzaPx, maxAltezzaPx: z.maxAltezzaPx }
          : { categoria: cat, anchorX: 0.5, anchorY: 0.35, maxLarghezzaPx: 250, maxAltezzaPx: 200 };
      });
      return init;
    },
  );

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jewelry/supporti/${supporto.id}/zone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: Object.values(zone) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await qc.invalidateQueries({ queryKey: ['jewelry-supporti'] });
      toast.success('Zone salvate');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function update(cat: CategoriaGioiello, field: string, val: number) {
    setZone((prev) => ({ ...prev, [cat]: { ...prev[cat], [field]: val } }));
  }

  return (
    <div className="space-y-4">
      {categorie.map((cat) => (
        <div key={cat} className="border border-border rounded p-3 space-y-2">
          <p className="text-xs font-semibold text-primary">{LABEL_CATEGORIA[cat]}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-2xs text-gray-500 block mb-1">Anchor X (0–1)</span>
              <input type="number" min={0} max={1} step={0.01}
                className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                value={zone[cat].anchorX}
                onChange={(e) => update(cat, 'anchorX', parseFloat(e.target.value))} />
            </label>
            <label className="block">
              <span className="text-2xs text-gray-500 block mb-1">Anchor Y (0–1)</span>
              <input type="number" min={0} max={1} step={0.01}
                className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                value={zone[cat].anchorY}
                onChange={(e) => update(cat, 'anchorY', parseFloat(e.target.value))} />
            </label>
            <label className="block">
              <span className="text-2xs text-gray-500 block mb-1">Max larghezza (px)</span>
              <input type="number" min={20} max={1200} step={10}
                className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                value={zone[cat].maxLarghezzaPx}
                onChange={(e) => update(cat, 'maxLarghezzaPx', parseInt(e.target.value))} />
            </label>
            <label className="block">
              <span className="text-2xs text-gray-500 block mb-1">Max altezza (px)</span>
              <input type="number" min={20} max={1200} step={10}
                className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                value={zone[cat].maxAltezzaPx}
                onChange={(e) => update(cat, 'maxAltezzaPx', parseInt(e.target.value))} />
            </label>
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} loading={saving}>Salva zone</Button>
      </div>
    </div>
  );
}

// ─── Componente test compositing ──────────────────────────────────────────────

function TestComposite({ supporto }: { supporto: SupportoEspositivo }) {
  const categorie: CategoriaGioiello[] = (Object.keys(SUPPORTI_COMPATIBILI) as CategoriaGioiello[])
    .filter((cat) => SUPPORTI_COMPATIBILI[cat].includes(supporto.tipo));

  const [categoria, setCategoria] = useState<CategoriaGioiello>(categorie[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [productId, setProductId] = useState('test-product');
  const [loading, setLoading] = useState(false);
  const [risultato, setRisultato] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function handleRun() {
    if (!imageUrl) { toast.error('Inserisci URL immagine gioiello'); return; }
    setLoading(true);
    setRisultato(null);
    setErrore(null);
    try {
      const res = await fetch('/api/jewelry/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, productImageUrl: imageUrl, supportoId: supporto.id, categoria }),
      });
      const json = await res.json();
      if (!res.ok || json.stato === 'failed') {
        setErrore(json.errore || json.error || 'Errore sconosciuto');
      } else {
        setRisultato(json.risultatoUrl);
      }
    } catch (err: any) {
      setErrore(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-2xs text-gray-500 block mb-1">Categoria</span>
          <select
            className="w-full text-xs border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGioiello)}>
            {categorie.map((c) => <option key={c} value={c}>{LABEL_CATEGORIA[c]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-2xs text-gray-500 block mb-1">Product ID</span>
          <input type="text"
            className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            value={productId} onChange={(e) => setProductId(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="text-2xs text-gray-500 block mb-1">URL immagine gioiello (PNG trasparente)</span>
        <input type="url"
          className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </label>
      <Button onClick={handleRun} loading={loading} icon={<Play size={12} />} className="w-full">
        Genera compositing
      </Button>
      {errore && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          <XCircle size={13} className="mt-0.5 flex-shrink-0" />{errore}
        </div>
      )}
      {risultato && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle2 size={13} />Compositing completato
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={risultato} alt="Compositing" className="w-full rounded border border-border object-contain max-h-64" />
          <a href={risultato} target="_blank" rel="noreferrer"
            className="text-2xs text-accent underline break-all">{risultato}</a>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminJewelryPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: supporti = [], isLoading } = useQuery({
    queryKey: ['jewelry-supporti'],
    queryFn: fetchSupporti,
  });

  // Modale crea supporto
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    nome: '', tipo: 'busto_legno' as TipoSupporto,
    tono: '' as TonoLegno | '', larghezzaPx: '800', altezzaPx: '600',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Modale zone
  const [editingZone, setEditingZone] = useState<SupportoEspositivo | null>(null);
  // Modale test
  const [testingSupporto, setTestingSupporto] = useState<SupportoEspositivo | null>(null);

  const TIPI_LEGNO: TipoSupporto[] = ['busto_legno', 'cono_legno'];

  async function handleCreate() {
    if (!imageFile) { toast.error('Seleziona un\'immagine'); return; }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('nome', form.nome);
      fd.append('tipo', form.tipo);
      if (form.tono) fd.append('tono', form.tono);
      fd.append('larghezzaPx', form.larghezzaPx);
      fd.append('altezzaPx', form.altezzaPx);
      fd.append('immagine', imageFile);

      const res = await fetch('/api/jewelry/supporti', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      await qc.invalidateQueries({ queryKey: ['jewelry-supporti'] });
      toast.success('Supporto creato');
      setShowCreate(false);
      setImageFile(null);
      setForm({ nome: '', tipo: 'busto_legno', tono: '', larghezzaPx: '800', altezzaPx: '600' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleAttivo(s: SupportoEspositivo) {
    try {
      const res = await fetch(`/api/jewelry/supporti/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attivo: !s.attivo }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await qc.invalidateQueries({ queryKey: ['jewelry-supporti'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="label-luxury text-accent mb-1">Admin › Gioielli</p>
          <h1 className="font-display text-2xl text-primary font-light">Supporti Espositivi</h1>
          <p className="text-sm text-gray-400 mt-0.5">{supporti.length} supporti configurati</p>
        </div>
        <Button icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
          Aggiungi supporto
        </Button>
      </div>

      {/* Tabella supporti */}
      <div className="bg-white border border-border rounded overflow-hidden overflow-x-auto">
        <table className="table-luxury w-full min-w-[640px]">
          <thead>
            <tr>
              <th>Anteprima</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Tono</th>
              <th>Dimensioni</th>
              <th>Zone</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="py-12 text-center">
                <Loader2 className="animate-spin mx-auto text-gray-300" size={24} />
              </td></tr>
            ) : supporti.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                Nessun supporto configurato
              </td></tr>
            ) : supporti.map((s) => (
              <tr key={s.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.immagineUrl} alt={s.nome}
                    className="w-12 h-12 object-contain rounded border border-border bg-gray-50" />
                </td>
                <td><span className="font-medium text-xs text-primary">{s.nome}</span></td>
                <td><span className="text-xs text-gray-600">{LABEL_SUPPORTO[s.tipo]}</span></td>
                <td><span className="text-xs text-gray-500">{s.tono ?? '—'}</span></td>
                <td className="text-xs text-gray-400">{s.larghezzaPx}×{s.altezzaPx}</td>
                <td>
                  <Badge variant="default" size="xs">{s.zone?.length ?? 0} zone</Badge>
                </td>
                <td>
                  <Badge variant={s.attivo ? 'success' : 'default'} size="xs">
                    {s.attivo ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </td>
                <td className="pr-3">
                  <div className="flex items-center gap-1">
                    <button title="Modifica zone"
                      onClick={() => setEditingZone(s)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors">
                      <Settings2 size={13} />
                    </button>
                    <button title="Test compositing"
                      onClick={() => setTestingSupporto(s)}
                      className="p-1.5 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors">
                      <Play size={13} />
                    </button>
                    <button title={s.attivo ? 'Disattiva' : 'Attiva'}
                      onClick={() => handleToggleAttivo(s)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-cream transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modale crea supporto */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuovo supporto espositivo" size="md"
        footer={<><Button variant="ghost" onClick={() => setShowCreate(false)}>Annulla</Button>
          <Button onClick={handleCreate} loading={creating}>Crea supporto</Button></>}>
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="es. Busto rovere chiaro" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-2xs text-gray-500 uppercase tracking-wide block mb-1">Tipo *</span>
              <select className="w-full text-xs border border-border rounded px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                value={form.tipo}
                onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as TipoSupporto, tono: '' }))}>
                {(Object.keys(LABEL_SUPPORTO) as TipoSupporto[]).map((t) => (
                  <option key={t} value={t}>{LABEL_SUPPORTO[t]}</option>
                ))}
              </select>
            </label>
            {TIPI_LEGNO.includes(form.tipo) && (
              <label className="block">
                <span className="text-2xs text-gray-500 uppercase tracking-wide block mb-1">Tono legno</span>
                <select className="w-full text-xs border border-border rounded px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                  value={form.tono}
                  onChange={(e) => setForm((p) => ({ ...p, tono: e.target.value as TonoLegno }))}>
                  <option value="">Nessuno</option>
                  <option value="chiaro">Chiaro</option>
                  <option value="scuro">Scuro</option>
                </select>
              </label>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Larghezza output (px)" type="number" value={form.larghezzaPx}
              onChange={(e) => setForm((p) => ({ ...p, larghezzaPx: e.target.value }))} />
            <Input label="Altezza output (px)" type="number" value={form.altezzaPx}
              onChange={(e) => setForm((p) => ({ ...p, altezzaPx: e.target.value }))} />
          </div>
          <div>
            <span className="text-2xs text-gray-500 uppercase tracking-wide block mb-1">Immagine supporto *</span>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
              className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            <button type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-accent hover:text-accent transition-colors w-full justify-center">
              <Upload size={13} />
              {imageFile ? imageFile.name : 'Seleziona immagine PNG o JPG'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modale modifica zone */}
      <Modal isOpen={!!editingZone} onClose={() => setEditingZone(null)} size="md"
        title={`Zone di posizionamento — ${editingZone?.nome ?? ''}`}>
        {editingZone && <ZoneEditor supporto={editingZone} onClose={() => setEditingZone(null)} />}
      </Modal>

      {/* Modale test compositing */}
      <Modal isOpen={!!testingSupporto} onClose={() => setTestingSupporto(null)} size="md"
        title={`Test compositing — ${testingSupporto?.nome ?? ''}`}>
        {testingSupporto && <TestComposite supporto={testingSupporto} />}
      </Modal>
    </div>
  );
}
