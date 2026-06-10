'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';

const DENIED_KEY = 'push-denied';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Phase = 'loading' | 'unsupported' | 'denied-perm' | 'ask' | 'subscribed' | 'busy';

export default function PushNotificationSetup() {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const isCustomer = session?.user?.role === 'CUSTOMER';

  useEffect(() => {
    if (!isCustomer) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPhase('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPhase('denied-perm');
      return;
    }
    // Already previously denied by browser dialog (they chose "Blocca")
    if (localStorage.getItem(DENIED_KEY)) {
      setPhase('denied-perm');
      return;
    }
    if (Notification.permission === 'granted') {
      // Permission granted — ensure subscription exists in backend
      ensureSubscribed().then((ok) => setPhase(ok ? 'subscribed' : 'ask'));
      return;
    }
    // 'default' — not yet asked
    setPhase('ask');
  }, [isCustomer]);

  async function ensureSubscribed(): Promise<boolean> {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch('/api/push/vapid-key');
      if (!vapidRes.ok) return false;
      const { key } = await vapidRes.json();
      if (!key) return false;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
        });
      }

      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async function handleEnable() {
    setPhase('busy');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch('/api/push/vapid-key');
      if (!vapidRes.ok) { setPhase('ask'); return; }
      const { key } = await vapidRes.json();
      if (!key) { setPhase('ask'); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        localStorage.setItem(DENIED_KEY, '1');
        setPhase('denied-perm');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
      });

      const json = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      setPhase('subscribed');
    } catch {
      setPhase('ask');
    }
  }

  if (!isCustomer) return null;
  if (phase === 'loading' || phase === 'unsupported' || phase === 'subscribed') return null;

  if (phase === 'denied-perm') {
    return (
      <div className="fixed bottom-[72px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[340px] z-40 bg-amber-50 border border-amber-200 rounded-xl shadow-luxury p-4 flex items-start gap-3">
        <div className="bg-amber-400 rounded-full p-2 flex-shrink-0">
          <Bell size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-900">Notifiche bloccate</p>
          <p className="text-2xs text-amber-700 mt-1 leading-relaxed">
            Vai nelle <strong>Impostazioni del browser</strong> → Impostazioni sito → Notifiche, cerca <em>app.b2b.on-earth.it</em> e cambia in <strong>Consenti</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[72px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[340px] z-40 bg-white border border-border rounded-xl shadow-luxury p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-black rounded-full p-2 flex-shrink-0">
        <Bell size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">Attiva le notifiche</p>
        <p className="text-2xs text-gray-400 mt-0.5 leading-relaxed">
          Ricevi un avviso sul telefono quando arrivano novità, promozioni o aggiornamenti.
        </p>
        <button
          onClick={handleEnable}
          disabled={phase === 'busy'}
          className="mt-2.5 text-xs bg-black text-white rounded px-3 py-1.5 hover:bg-gray-800 transition-colors disabled:opacity-50 w-full"
        >
          {phase === 'busy' ? 'Attivazione…' : 'Abilita notifiche'}
        </button>
      </div>
    </div>
  );
}
