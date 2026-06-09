'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, X } from 'lucide-react';

type Phase = 'loading' | 'unsupported' | 'denied' | 'ask' | 'subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationSetup() {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const isCustomer = session?.user?.role === 'CUSTOMER';

  useEffect(() => {
    if (!isCustomer) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPhase('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPhase('denied');
      return;
    }
    if (Notification.permission === 'granted') {
      // Check if already subscribed in backend
      fetch('/api/push/subscribe').then(r => r.json()).then(d => {
        setPhase(d.subscribed ? 'subscribed' : 'ask');
      }).catch(() => setPhase('ask'));
      return;
    }
    // 'default' — never asked
    const alreadyDismissed = sessionStorage.getItem('push-banner-dismissed');
    if (alreadyDismissed) {
      setPhase('ask'); // keep it available but banner won't show if dismissed
      setDismissed(true);
    } else {
      setPhase('ask');
    }
  }, [isCustomer]);

  async function subscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch('/api/push/vapid-key');
      const { key } = await vapidRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
      });

      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      setPhase('subscribed');
    } catch (e: any) {
      if (Notification.permission === 'denied') {
        setPhase('denied');
      }
      console.error('[push] Subscribe error:', e);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem('push-banner-dismissed', '1');
    setDismissed(true);
  }

  // Register SW silently on mount even if already granted (keeps SW alive)
  useEffect(() => {
    if (!isCustomer || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [isCustomer]);

  if (!isCustomer || phase === 'loading' || phase === 'unsupported' || phase === 'denied' || phase === 'subscribed') return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-[72px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[340px] z-40 bg-white border border-border rounded-xl shadow-luxury p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-black rounded-full p-2 flex-shrink-0">
        <Bell size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">Vuoi ricevere notifiche?</p>
        <p className="text-2xs text-gray-400 mt-0.5">Ti avvisiamo su novità, promozioni e aggiornamenti.</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={subscribe}
            disabled={busy}
            className="text-xs bg-black text-white rounded px-3 py-1.5 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {busy ? 'Attivazione…' : 'Abilita'}
          </button>
          <button
            onClick={dismiss}
            className="text-xs border border-border text-gray-400 rounded px-3 py-1.5 hover:bg-cream transition-colors"
          >
            Non ora
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
