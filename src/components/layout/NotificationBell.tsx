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
  const buttonRef = useRef<HTMLButtonElement>(null);
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
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
    <div className="relative">
      <button
        ref={buttonRef}
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
        <>
          {/* Backdrop — mobile only */}
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel: fixed on mobile, absolute on desktop */}
          <div
            ref={panelRef}
            className="
              fixed left-4 right-4 top-16 z-50
              md:absolute md:left-auto md:right-0 md:top-8 md:w-[380px]
              bg-white rounded-xl shadow-2xl border border-border
              max-h-[70vh] md:max-h-[80vh] overflow-hidden flex flex-col
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">Notifiche</span>
                {unread > 0 && (
                  <span className="text-2xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-gray-400 hover:text-primary transition-colors"
                  >
                    Segna tutte come lette
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-primary transition-colors p-1"
                  aria-label="Chiudi"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  Nessuna notifica
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="border-b last:border-0"
                    style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                  >
                    <div
                      className="p-4"
                      style={{ backgroundColor: n.coloreSfondo, color: n.coloreTesto }}
                    >
                      <div className="flex items-start gap-3">
                        {n.icona && (
                          <span className="text-2xl flex-shrink-0 leading-none">{n.icona}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm leading-snug">{n.titolo}</p>
                            {!n.letta && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white mt-1 opacity-80" />
                            )}
                          </div>
                          {n.testo && (
                            <p
                              className="text-sm mt-1 leading-relaxed break-words whitespace-normal"
                              style={{ opacity: 0.9 }}
                            >
                              {n.testo}
                            </p>
                          )}
                          {n.linkUrl && (
                            <a
                              href={n.linkUrl}
                              className="inline-block mt-2 text-sm font-medium underline underline-offset-2"
                              style={{ color: n.coloreTesto }}
                            >
                              {n.linkTesto || 'Scopri di più'}
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => markRead(n.id)}
                          className="flex-shrink-0 p-1 opacity-50 hover:opacity-100 transition-opacity"
                          style={{ color: n.coloreTesto }}
                          aria-label="Segna come letta"
                          title="Segna come letta"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
