'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Loader2, Trash2, Plus, Pencil, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DisplayGroup, DisplayGroupSchedule, SpazioEspositivo } from '@/types';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const WEEKS_COUNT = 52;
const MOBILE_VISIBLE = 13;
const CELL_H = 20; // px per row

// Settimana ISO → mese (prima settimana del mese, approssimata)
const WEEK_MONTH_STARTS: Record<number, number> = {
  1: 0, 5: 1, 9: 2, 14: 3, 18: 4, 22: 5, 27: 6, 31: 7, 36: 8, 40: 9, 44: 10, 48: 11,
};

const FALLBACK_COLOR = '#D4C4B0';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalendarioEsposizioneProps {
  orderId: string;
}

interface PopoverState {
  type: 'empty' | 'schedule';
  spazioId: string;
  week: number;
  schedule?: DisplayGroupSchedule;
  rect: DOMRect;
}

// ─── CalendarioEsposizione ────────────────────────────────────────────────────

export default function CalendarioEsposizione({ orderId }: CalendarioEsposizioneProps) {
  const [anno, setAnno] = useState(() => new Date().getFullYear());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [mobileOffset, setMobileOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [editingSpazioId, setEditingSpazioId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [addingSpazio, setAddingSpazio] = useState(false);
  const [newSpazioName, setNewSpazioName] = useState('');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: groupsData } = useQuery<{ groups: DisplayGroup[] }>({
    queryKey: ['display-groups', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups`).then(r => r.json()),
    staleTime: 10_000,
  });

  const { data: scheduleData, refetch: refetchSchedules } = useQuery<{ schedules: DisplayGroupSchedule[] }>({
    queryKey: ['display-group-schedules', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups/schedule`).then(r => r.json()),
    staleTime: 5_000,
  });

  const { data: spaziData, refetch: refetchSpazi } = useQuery<{ spazi: SpazioEspositivo[] }>({
    queryKey: ['spazi-espositivi'],
    queryFn: () => fetch('/api/catalog/spazi-espositivi').then(r => r.json()),
    staleTime: 30_000,
  });

  const groups = groupsData?.groups ?? [];
  const allSchedules = scheduleData?.schedules ?? [];
  const spazi = spaziData?.spazi ?? [];

  // Close popover on outside click
  useEffect(() => {
    if (!popover) return;
    function handle(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest('[data-popover]')) setPopover(null);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [popover]);

  const visibleWeeks = useMemo(() => {
    if (!isMobile) return Array.from({ length: WEEKS_COUNT }, (_, i) => i + 1);
    const start = mobileOffset * MOBILE_VISIBLE + 1;
    return Array.from({ length: MOBILE_VISIBLE }, (_, i) => start + i).filter(w => w <= 52);
  }, [isMobile, mobileOffset]);

  const maxOffset = Math.ceil(WEEKS_COUNT / MOBILE_VISIBLE) - 1;

  // ─── Spazi CRUD ───────────────────────────────────────────────────────────

  async function addSpazio() {
    if (!newSpazioName.trim()) return;
    try {
      const res = await fetch('/api/catalog/spazi-espositivi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newSpazioName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewSpazioName('');
      setAddingSpazio(false);
      refetchSpazi();
    } catch { toast.error('Errore nella creazione'); }
  }

  async function renameSpazio(id: string, nome: string) {
    if (!nome.trim()) return;
    try {
      await fetch(`/api/catalog/spazi-espositivi/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      setEditingSpazioId(null);
      refetchSpazi();
    } catch { toast.error('Errore nel rinomina'); }
  }

  async function deleteSpazio(id: string) {
    if (!confirm('Eliminare questo spazio? Le pianificazioni associate verranno rimosse.')) return;
    try {
      await fetch(`/api/catalog/spazi-espositivi/${id}`, { method: 'DELETE' });
      refetchSpazi();
      refetchSchedules();
    } catch { toast.error('Errore nella cancellazione'); }
  }

  // ─── Schedule CRUD ────────────────────────────────────────────────────────

  async function createSchedule(spazioId: string, groupId: string, settimanaIn: number, settimanaFn: number, nota: string) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, spazioId, anno, settimanaIn, settimanaFn: Math.max(settimanaIn, settimanaFn), nota: nota || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Pianificazione aggiunta');
      refetchSchedules();
    } catch { toast.error('Errore nella creazione'); }
    setPopover(null);
  }

  async function updateSchedule(scheduleId: string, data: { settimanaIn?: number; settimanaFn?: number; nota?: string | null }) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      refetchSchedules();
    } catch { toast.error('Errore nel salvataggio'); }
    setPopover(null);
  }

  async function deleteSchedule(scheduleId: string) {
    try {
      await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule/${scheduleId}`, { method: 'DELETE' });
      toast.success('Pianificazione rimossa');
      refetchSchedules();
    } catch { toast.error('Errore nella cancellazione'); }
    setPopover(null);
  }

  // ─── Cell helpers ─────────────────────────────────────────────────────────

  function getScheduleForCell(spazioId: string, week: number): DisplayGroupSchedule | null {
    return allSchedules.find(s =>
      s.spazioId === spazioId && s.anno === anno && week >= s.settimanaIn && week <= s.settimanaFn
    ) ?? null;
  }

  function groupColor(groupId: string): string {
    return groups.find(g => g.id === groupId)?.coloreTag ?? FALLBACK_COLOR;
  }

  function groupName(groupId: string): string {
    return groups.find(g => g.id === groupId)?.nome ?? '';
  }

  function handleCellClick(e: React.MouseEvent, spazioId: string, week: number) {
    const schedule = getScheduleForCell(spazioId, week);
    setPopover({
      type: schedule ? 'schedule' : 'empty',
      spazioId,
      week,
      schedule: schedule ?? undefined,
      rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
    });
  }

  // ─── Legenda stats ────────────────────────────────────────────────────────

  const groupStats = useMemo(() => {
    return groups.map(g => {
      const slots = new Set<string>();
      allSchedules.filter(s => s.groupId === g.id && s.anno === anno).forEach(s => {
        for (let w = s.settimanaIn; w <= s.settimanaFn; w++) slots.add(`${s.spazioId}-${w}`);
      });
      return { group: g, slots: slots.size };
    });
  }, [groups, allSchedules, anno]);

  const LABEL_W = 42;
  const COL_MIN = 80;

  return (
    <div className="px-4 sm:px-6 py-6 pb-32 lg:pb-24">

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-sm font-semibold text-primary flex-1">Calendario Esposizione</h2>
        <div className="flex items-center gap-2 bg-cream border border-border rounded px-3 py-1.5">
          <button onClick={() => setAnno(y => y - 1)} className="text-gray-400 hover:text-primary transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-primary w-10 text-center">{anno}</span>
          <button onClick={() => setAnno(y => y + 1)} className="text-gray-400 hover:text-primary transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
        {isMobile && (
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileOffset(o => Math.max(0, o - 1))} disabled={mobileOffset === 0}
              className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500">T{mobileOffset + 1}</span>
            <button onClick={() => setMobileOffset(o => Math.min(maxOffset, o + 1))} disabled={mobileOffset >= maxOffset}
              className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          Nessun gruppo espositivo. Creane uno nella vista Mondi Espositivi.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(600, LABEL_W + spazi.length * COL_MIN + 80) }}>

            {/* Column headers */}
            <div className="flex items-end pb-2 border-b border-border" style={{ paddingLeft: LABEL_W }}>
              {spazi.map(spazio => (
                <div key={spazio.id} className="flex-1 px-1 group" style={{ minWidth: COL_MIN }}>
                  {editingSpazioId === spazio.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="flex-1 text-xs border border-border rounded px-1.5 py-0.5 min-w-0 bg-white"
                        value={editingNome}
                        onChange={e => setEditingNome(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameSpazio(spazio.id, editingNome);
                          if (e.key === 'Escape') setEditingSpazioId(null);
                        }}
                      />
                      <button onClick={() => renameSpazio(spazio.id, editingNome)}
                        className="text-[#8FAF8F] hover:opacity-70 flex-shrink-0">
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-primary truncate flex-1" title={spazio.nome}>{spazio.nome}</span>
                      <button
                        onClick={() => { setEditingSpazioId(spazio.id); setEditingNome(spazio.nome); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-primary flex-shrink-0">
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => deleteSpazio(spazio.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#C17A5A] flex-shrink-0">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add spazio */}
              <div className="flex-shrink-0" style={{ minWidth: 72 }}>
                {addingSpazio ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      className="flex-1 text-xs border border-border rounded px-1.5 py-0.5 min-w-0 w-20 bg-white"
                      value={newSpazioName}
                      placeholder="Nome…"
                      onChange={e => setNewSpazioName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addSpazio();
                        if (e.key === 'Escape') { setAddingSpazio(false); setNewSpazioName(''); }
                      }}
                    />
                    <button onClick={addSpazio} className="text-[#8FAF8F] flex-shrink-0"><Check size={12} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSpazio(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors">
                    <Plus size={12} />
                    <span className="hidden sm:inline">Spazio</span>
                  </button>
                )}
              </div>
            </div>

            {/* Rows = weeks */}
            <div>
              {visibleWeeks.map(w => {
                const isMonthStart = w in WEEK_MONTH_STARTS;
                const monthIdx = WEEK_MONTH_STARTS[w];

                return (
                  <div
                    key={w}
                    className="flex items-stretch"
                    style={{
                      height: CELL_H,
                      borderTop: isMonthStart ? '1px solid #D4C4B0' : '1px solid #F3F4F6',
                    }}
                  >
                    {/* Week label */}
                    <div
                      className="flex-shrink-0 flex items-center gap-1 pr-1"
                      style={{ width: LABEL_W }}
                    >
                      {isMonthStart && (
                        <span className="text-[9px] font-semibold text-[#C17A5A] leading-none">
                          {MONTHS[monthIdx]}
                        </span>
                      )}
                      <span className="text-[9px] text-gray-300 leading-none ml-auto">S{w}</span>
                    </div>

                    {/* Spazio columns */}
                    {spazi.map(spazio => {
                      const sched = getScheduleForCell(spazio.id, w);
                      const color = sched ? groupColor(sched.groupId) : null;
                      const isTop = sched ? w === sched.settimanaIn : false;
                      const isBottom = sched ? w === sched.settimanaFn : false;

                      return (
                        <div
                          key={spazio.id}
                          className="flex-1 px-0.5 cursor-pointer flex items-center"
                          style={{ minWidth: COL_MIN }}
                          onClick={e => handleCellClick(e, spazio.id, w)}
                        >
                          {color ? (
                            <div
                              className="w-full"
                              style={{
                                height: CELL_H - 2,
                                backgroundColor: color,
                                opacity: 0.82,
                                borderRadius:
                                  isTop && isBottom ? 4
                                    : isTop ? '4px 4px 0 0'
                                      : isBottom ? '0 0 4px 4px'
                                        : 0,
                                marginTop: isTop ? 1 : 0,
                                marginBottom: isBottom ? 1 : 0,
                              }}
                              title={groupName(sched!.groupId)}
                            />
                          ) : (
                            <div className="w-full hover:bg-cream transition-colors" style={{ height: CELL_H - 2 }} />
                          )}
                        </div>
                      );
                    })}

                    {/* Add spazio column spacer */}
                    <div className="flex-shrink-0" style={{ minWidth: 72 }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      {groups.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">Gruppi</p>
          <div className="flex flex-wrap gap-3">
            {groupStats.map(({ group, slots }) => (
              <div key={group.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: group.coloreTag || FALLBACK_COLOR }} />
                <span className="text-xs text-gray-600">{group.nome}</span>
                {slots > 0 && <span className="text-xs text-gray-400">({slots} celle)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popover */}
      {popover && (
        <SchedulePopover
          popover={popover}
          groups={groups}
          anno={anno}
          onClose={() => setPopover(null)}
          onCreate={createSchedule}
          onSave={(data) => { if (popover.schedule) updateSchedule(popover.schedule.id, data); }}
          onDelete={() => { if (popover.schedule) deleteSchedule(popover.schedule.id); }}
          groupColor={groupColor}
          groupName={groupName}
        />
      )}
    </div>
  );
}

// ─── SchedulePopover ──────────────────────────────────────────────────────────

function SchedulePopover({
  popover, groups, anno, onClose, onCreate, onSave, onDelete, groupColor, groupName,
}: {
  popover: PopoverState;
  groups: DisplayGroup[];
  anno: number;
  onClose: () => void;
  onCreate: (spazioId: string, groupId: string, settimanaIn: number, settimanaFn: number, nota: string) => void;
  onSave: (data: { settimanaIn?: number; settimanaFn?: number; nota?: string | null }) => void;
  onDelete: () => void;
  groupColor: (id: string) => string;
  groupName: (id: string) => string;
}) {
  const isNew = popover.type === 'empty';
  const [selectedGroupId, setSelectedGroupId] = useState(popover.schedule?.groupId ?? groups[0]?.id ?? '');
  const [settimanaIn, setSettimanaIn] = useState(popover.schedule?.settimanaIn ?? popover.week);
  const [settimanaFn, setSettimanaFn] = useState(popover.schedule?.settimanaFn ?? popover.week);
  const [nota, setNota] = useState(popover.schedule?.nota ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const fn = Math.max(settimanaIn, settimanaFn);
    if (isNew) {
      await onCreate(popover.spazioId, selectedGroupId, settimanaIn, fn, nota);
    } else {
      onSave({ settimanaIn, settimanaFn: fn, nota: nota || null });
    }
    setSaving(false);
  }

  const top = Math.min(
    popover.rect.bottom + window.scrollY + 6,
    window.scrollY + window.innerHeight - 350
  );
  const left = Math.min(popover.rect.left, window.innerWidth - 288);

  return (
    <div
      data-popover
      className="fixed z-50 bg-white border border-border rounded-xl shadow-2xl p-4 w-72"
      style={{ top, left }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-primary">
          {isNew ? `Aggiungi — Settimana ${popover.week}` : 'Modifica pianificazione'}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-primary p-0.5 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {isNew && groups.length > 0 && (
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Gruppo espositivo</label>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="w-full text-sm border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent bg-white"
            >
              {groups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
        )}

        {!isNew && popover.schedule && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-cream">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: groupColor(popover.schedule.groupId) }} />
            <span className="text-xs font-medium text-primary">{groupName(popover.schedule.groupId)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Inizio (sett.)</label>
            <input
              type="number" min={1} max={52}
              value={settimanaIn}
              onChange={e => setSettimanaIn(Number(e.target.value))}
              className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fine (sett.)</label>
            <input
              type="number" min={1} max={52}
              value={settimanaFn}
              onChange={e => setSettimanaFn(Number(e.target.value))}
              className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1">Nota</label>
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Opzionale…"
            className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving || (isNew && !selectedGroupId)}
            className="flex-1 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {saving && <Loader2 size={10} className="animate-spin" />}
            {isNew ? 'Aggiungi' : 'Salva'}
          </button>
          {!isNew && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-600 border border-border rounded hover:bg-red-50 transition-colors"
              title="Elimina"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
