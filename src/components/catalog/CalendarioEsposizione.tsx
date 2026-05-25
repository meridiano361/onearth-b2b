'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DisplayGroup, DisplayGroupSchedule } from '@/types';

// ─── Costanti ─────────────────────────────────────────────────────────────────

const MONTH_NAMES_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const WEEKS_COUNT = 52;
const MOBILE_VISIBLE = 13; // un trimestre

// Mappa settimana ISO → mese (approssimata)
const WEEK_TO_MONTH: Record<number, number> = {
  1: 0, 5: 1, 9: 2, 14: 3, 18: 4, 22: 5, 26: 6, 31: 7, 36: 8, 40: 9, 44: 10, 48: 11,
};

function weekToMonthLabel(week: number): string | null {
  return WEEK_TO_MONTH[week] !== undefined ? MONTH_NAMES_SHORT[WEEK_TO_MONTH[week]] : null;
}

function weekInSchedule(week: number, schedules: DisplayGroupSchedule[], anno: number): DisplayGroupSchedule | null {
  return schedules.find((s) => s.anno === anno && week >= s.settimanaIn && week <= s.settimanaFn) ?? null;
}

const FALLBACK_COLOR = '#9CA3AF';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalendarioEsposizioneProps {
  orderId: string;
}

// ─── Popover state ────────────────────────────────────────────────────────────

interface PopoverState {
  type: 'empty' | 'schedule';
  groupId: string;
  week: number;
  schedule?: DisplayGroupSchedule;
  x: number;
  y: number;
}

// ─── Resize drag state ─────────────────────────────────────────────────────────

interface DragState {
  scheduleId: string;
  side: 'left' | 'right';
  startWeek: number;
  currentWeek: number;
}

// ─── CalendarioEsposizione ────────────────────────────────────────────────────

export default function CalendarioEsposizione({ orderId }: CalendarioEsposizioneProps) {
  const queryClient = useQueryClient();
  const [anno, setAnno] = useState(() => new Date().getFullYear());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [mobileOffset, setMobileOffset] = useState(0); // quarter index 0-3
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const { data: groupsData } = useQuery<{ groups: DisplayGroup[] }>({
    queryKey: ['display-groups', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups`).then((r) => r.json()),
    staleTime: 10_000,
  });

  const { data: scheduleData, refetch: refetchSchedules } = useQuery<{ schedules: DisplayGroupSchedule[] }>({
    queryKey: ['display-group-schedules', orderId],
    queryFn: () => fetch(`/api/catalog/orders/${orderId}/display-groups/schedule`).then((r) => r.json()),
    staleTime: 5_000,
  });

  const groups = groupsData?.groups ?? [];
  const allSchedules = scheduleData?.schedules ?? [];

  // Close popover on click outside
  useEffect(() => {
    if (!popover) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-popover]')) setPopover(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popover]);

  // ─── Drag resize ──────────────────────────────────────────────────────────

  function weekFromX(clientX: number): number {
    if (!containerRef.current) return 1;
    const rect = containerRef.current.getBoundingClientRect();
    const cellW = rect.width / WEEKS_COUNT;
    return Math.min(52, Math.max(1, Math.round((clientX - rect.left) / cellW) + 1));
  }

  function onDragMouseMove(e: MouseEvent) {
    if (!dragState) return;
    const w = weekFromX(e.clientX);
    setDragState((d) => d ? { ...d, currentWeek: w } : null);
  }

  function onDragMouseUp() {
    if (!dragState) return;
    const { scheduleId, side, currentWeek } = dragState;
    const sched = allSchedules.find((s) => s.id === scheduleId);
    if (!sched) { setDragState(null); return; }
    const newIn = side === 'left' ? Math.min(currentWeek, sched.settimanaFn) : sched.settimanaIn;
    const newFn = side === 'right' ? Math.max(currentWeek, sched.settimanaIn) : sched.settimanaFn;
    setDragState(null);
    saveScheduleUpdate(scheduleId, { settimanaIn: newIn, settimanaFn: newFn });
  }

  useEffect(() => {
    if (!dragState) return;
    window.addEventListener('mousemove', onDragMouseMove);
    window.addEventListener('mouseup', onDragMouseUp);
    return () => { window.removeEventListener('mousemove', onDragMouseMove); window.removeEventListener('mouseup', onDragMouseUp); };
  }, [dragState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── API helpers ──────────────────────────────────────────────────────────

  async function createSchedule(groupId: string, week: number) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, anno, settimanaIn: week, settimanaFn: week }),
      });
      if (!res.ok) throw new Error();
      toast.success('Settimana aggiunta');
      refetchSchedules();
    } catch { toast.error('Errore nella creazione'); }
    setPopover(null);
  }

  async function saveScheduleUpdate(scheduleId: string, data: Partial<Pick<DisplayGroupSchedule, 'settimanaIn' | 'settimanaFn' | 'nota'>>) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      refetchSchedules();
    } catch { toast.error('Errore nel salvataggio'); }
  }

  async function deleteSchedule(scheduleId: string) {
    try {
      const res = await fetch(`/api/catalog/orders/${orderId}/display-groups/schedule/${scheduleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Schedule eliminato');
      refetchSchedules();
    } catch { toast.error('Errore nell\'eliminazione'); }
    setPopover(null);
  }

  // ─── Visible weeks (mobile vs desktop) ────────────────────────────────────

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const visibleWeeks = useMemo(() => {
    if (!isMobile) return Array.from({ length: WEEKS_COUNT }, (_, i) => i + 1);
    const start = mobileOffset * MOBILE_VISIBLE + 1;
    return Array.from({ length: MOBILE_VISIBLE }, (_, i) => start + i).filter((w) => w <= 52);
  }, [isMobile, mobileOffset]);

  const maxOffset = Math.ceil(WEEKS_COUNT / MOBILE_VISIBLE) - 1;

  // ─── Cell click handler ────────────────────────────────────────────────────

  function handleCellClick(e: React.MouseEvent, groupId: string, week: number) {
    const existing = allSchedules.find((s) => s.groupId === groupId && s.anno === anno && week >= s.settimanaIn && week <= s.settimanaFn);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({
      type: existing ? 'schedule' : 'empty',
      groupId,
      week,
      schedule: existing,
      x: rect.left,
      y: rect.bottom + window.scrollY,
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const totalActiveSets = useMemo(() => {
    return groups.map((g) => {
      const sched = allSchedules.filter((s) => s.groupId === g.id && s.anno === anno);
      const weeks = new Set<number>();
      sched.forEach((s) => { for (let w = s.settimanaIn; w <= s.settimanaFn; w++) weeks.add(w); });
      return { group: g, weeks: weeks.size };
    });
  }, [groups, allSchedules, anno]);

  return (
    <div className="px-4 sm:px-6 py-6 pb-32 lg:pb-24">

      {/* Anno selector */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-sm font-semibold text-primary flex-1">Calendario Esposizione</h2>
        <div className="flex items-center gap-2 bg-cream border border-border rounded px-3 py-1.5">
          <button onClick={() => setAnno((y) => y - 1)} className="text-gray-400 hover:text-primary transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-primary w-10 text-center">{anno}</span>
          <button onClick={() => setAnno((y) => y + 1)} className="text-gray-400 hover:text-primary transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
        {isMobile && (
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileOffset((o) => Math.max(0, o - 1))} disabled={mobileOffset === 0}
              className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500">T{mobileOffset + 1}</span>
            <button onClick={() => setMobileOffset((o) => Math.min(maxOffset, o + 1))} disabled={mobileOffset >= maxOffset}
              className="p-1 text-gray-400 hover:text-primary disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Nessun gruppo espositivo. Creane uno nella vista Mondi Espositivi.</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: isMobile ? undefined : 900 }}>

            {/* Week headers */}
            <div className="flex" ref={containerRef}>
              {/* Row label spacer */}
              <div className="flex-shrink-0" style={{ width: 140 }} />
              {visibleWeeks.map((w) => {
                const monthLabel = weekToMonthLabel(w);
                return (
                  <div
                    key={w}
                    className="flex-1 flex flex-col items-center border-l border-gray-100"
                    style={{ minWidth: isMobile ? 24 : 16 }}
                  >
                    {monthLabel ? (
                      <span className="text-[9px] text-gray-400 font-medium leading-tight">{monthLabel}</span>
                    ) : (
                      <span className="text-[9px] text-transparent leading-tight">·</span>
                    )}
                    <span className="text-[9px] text-gray-400 leading-tight">{w}</span>
                  </div>
                );
              })}
            </div>

            {/* Group rows */}
            <div className="mt-1 space-y-1">
              {groups.map((group) => {
                const groupSchedules = allSchedules.filter((s) => s.groupId === group.id && s.anno === anno);
                return (
                  <div key={group.id} className="flex items-center">
                    {/* Row label */}
                    <div className="flex-shrink-0 flex items-center gap-2 pr-2" style={{ width: 140 }}>
                      {group.coloreTag && (
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.coloreTag }} />
                      )}
                      <span className="text-xs text-primary font-medium truncate" title={group.nome}>{group.nome}</span>
                    </div>

                    {/* Week cells */}
                    <div className="flex flex-1">
                      {visibleWeeks.map((w) => {
                        const sched = weekInSchedule(w, groupSchedules, anno);
                        const isDragActive = dragState && allSchedules.find((s) => s.id === dragState.scheduleId && s.groupId === group.id);

                        // For active drag: compute effective range
                        let effectiveIn = sched?.settimanaIn ?? 0;
                        let effectiveFn = sched?.settimanaFn ?? 0;
                        if (dragState && sched && sched.id === dragState.scheduleId) {
                          if (dragState.side === 'left') effectiveIn = Math.min(dragState.currentWeek, sched.settimanaFn);
                          else effectiveFn = Math.max(dragState.currentWeek, sched.settimanaIn);
                        }
                        const isInRange = sched && w >= effectiveIn && w <= effectiveFn;
                        const isFirst = isInRange && w === effectiveIn;
                        const isLast = isInRange && w === effectiveFn;

                        const barColor = group.coloreTag || FALLBACK_COLOR;

                        return (
                          <div
                            key={w}
                            className="flex-1 relative cursor-pointer"
                            style={{ minWidth: isMobile ? 24 : 16, height: 28 }}
                            onClick={(e) => handleCellClick(e, group.id, w)}
                          >
                            {isInRange ? (
                              <div
                                className="absolute inset-y-1 flex items-center"
                                style={{
                                  left: isFirst ? 2 : 0,
                                  right: isLast ? 2 : 0,
                                  backgroundColor: barColor,
                                  borderRadius: isFirst && isLast ? 4 : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : 0,
                                  opacity: 0.85,
                                }}
                              >
                                {/* Drag handles */}
                                {isFirst && (
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize flex-shrink-0"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setDragState({ scheduleId: sched!.id, side: 'left', startWeek: w, currentWeek: w });
                                    }}
                                  />
                                )}
                                {isLast && (
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setDragState({ scheduleId: sched!.id, side: 'right', startWeek: w, currentWeek: w });
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="absolute inset-y-1 inset-x-px rounded" style={{ backgroundColor: '#F9FAFB', border: '0.5px solid #F3F4F6' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
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
          <p className="text-2xs text-gray-400 uppercase tracking-wider mb-2">Legenda</p>
          <div className="flex flex-wrap gap-3">
            {totalActiveSets.map(({ group, weeks }) => (
              <div key={group.id} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: group.coloreTag || FALLBACK_COLOR }} />
                <span className="text-xs text-gray-600">{group.nome}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{weeks} sett. attive</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popover */}
      {popover && (
        <SchedulePopover
          popover={popover}
          onClose={() => setPopover(null)}
          onCreate={() => createSchedule(popover.groupId, popover.week)}
          onSave={(data) => { if (popover.schedule) saveScheduleUpdate(popover.schedule.id, data); setPopover(null); }}
          onDelete={() => { if (popover.schedule) deleteSchedule(popover.schedule.id); }}
        />
      )}
    </div>
  );
}

// ─── SchedulePopover ──────────────────────────────────────────────────────────

function SchedulePopover({
  popover, onClose, onCreate, onSave, onDelete,
}: {
  popover: PopoverState;
  onClose: () => void;
  onCreate: () => void;
  onSave: (data: Partial<Pick<DisplayGroupSchedule, 'settimanaIn' | 'settimanaFn' | 'nota'>>) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    settimanaIn: popover.schedule?.settimanaIn ?? popover.week,
    settimanaFn: popover.schedule?.settimanaFn ?? popover.week,
    nota: popover.schedule?.nota ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    onSave({ settimanaIn: form.settimanaIn, settimanaFn: Math.max(form.settimanaIn, form.settimanaFn), nota: form.nota || null as any });
    setSaving(false);
  }

  return (
    <div
      data-popover
      className="fixed z-50 bg-white border border-border rounded-lg shadow-2xl p-4 w-64"
      style={{ top: Math.min(popover.y, window.innerHeight - 240), left: Math.min(popover.x, window.innerWidth - 270) }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-primary">
          {popover.type === 'empty' ? `Settimana ${popover.week}` : 'Modifica pianificazione'}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-primary p-0.5"><X size={14} /></button>
      </div>

      {popover.type === 'empty' ? (
        <button
          onClick={onCreate}
          className="w-full py-2 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Aggiungi qui</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-2xs text-gray-400 uppercase mb-1">Dal</label>
              <input
                type="number" min={1} max={52}
                value={form.settimanaIn}
                onChange={(e) => setForm((f) => ({ ...f, settimanaIn: Number(e.target.value) }))}
                className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-2xs text-gray-400 uppercase mb-1">Al</label>
              <input
                type="number" min={1} max={52}
                value={form.settimanaFn}
                onChange={(e) => setForm((f) => ({ ...f, settimanaFn: Number(e.target.value) }))}
                className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-2xs text-gray-400 uppercase mb-1">Nota</label>
            <input
              type="text"
              value={form.nota}
              onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
              placeholder="Opzionale…"
              className="w-full text-sm border border-border rounded px-2 py-1 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : null}Salva
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-600 border border-border rounded hover:bg-red-50 transition-colors"
              title="Elimina"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
