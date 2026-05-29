'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';

type NotificationItem = {
  id: string;
  titolo: string;
  testo: string;
  icona: string;
  coloreSfondo: string;
  coloreTesto: string;
  linkUrl?: string | null;
  linkTesto?: string | null;
  letta: boolean;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const unread = notifications.filter((n) => !n.letta).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    qc.setQueryData<NotificationItem[]>(['notifications'], (prev) =>
      prev ? prev.map((n) => (n.id === id ? { ...n, letta: true } : n)) : []
    );
  }

  async function markAllRead() {
    await Promise.all(
      notifications.filter((n) => !n.letta).map((n) => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }))
    );
    qc.setQueryData<NotificationItem[]>(['notifications'], (prev) =>
      prev ? prev.map((n) => ({ ...n, letta: true })) : []
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-gray-400 hover:text-primary transition-colors"
        aria-label="Notifiche"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-[4px] -right-[6px] bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center leading-none px-[2px]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-xs font-semibold text-primary">Notifiche</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-2xs text-gray-400 hover:text-primary transition-colors"
                >
                  Segna tutte come lette
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-primary transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400">Nessuna notifica</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: n.coloreSfondo, color: n.coloreTesto }}
                >
                  <div className="px-4 py-3 border-b border-black/10 flex gap-3 items-start">
                    {n.icona && <span className="text-base flex-shrink-0">{n.icona}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="text-xs font-semibold flex-1 leading-snug">{n.titolo}</p>
                        {!n.letta && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-white mt-1 opacity-80" />
                        )}
                      </div>
                      {n.testo && (
                        <p className="text-xs mt-0.5 opacity-80 line-clamp-2">{n.testo}</p>
                      )}
                      {n.linkUrl && (
                        <a
                          href={n.linkUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block mt-1 text-xs font-medium underline underline-offset-2"
                          style={{ color: n.coloreTesto }}
                        >
                          {n.linkTesto || 'Scopri di più'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
