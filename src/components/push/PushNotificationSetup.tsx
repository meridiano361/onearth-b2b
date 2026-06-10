'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isIOSBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone === true);
  return isIOS && !isPWA;
}

type Phase = 'loading' | 'ios-browser' | 'unsupported' | 'denied-perm' | 'ask' | 'subscribed' | 'busy';

async function saveSubscription(sub: PushSubscription, email: string): Promise<boolean> {
  const json = sub.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, email }),
  });
  return res.ok;
}

export default function PushNotificationSetup() {
  const { data: session } = useSession();
  const [phase, setPhase] = useState<Phase>('loading');
  const email = session?.user?.email ?? '';

  useEffect(() => {
    if (!email) return;
    if (typeof window === 'undefined') return;

    // iOS Safari nel browser normale non supporta push — serve installare come PWA
    if (isIOSBrowser()) {
      setPhase('ios-browser');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPhase('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setPhase('denied-perm');
      return;
    }
    if (Notification.permission === 'granted') {
      ensureSubscribed();
      return;
    }
    setPhase('ask');
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureSubscribed() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const vapidRes = await fetch('/api/push/vapid-key');
      if (!vapidRes.ok) { setPhase('ask'); return; }
      const { key } = await vapidRes.json();
      if (!key) { setPhase('ask'); return; }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
        });
      }
      const ok = await saveSubscription(sub, email);
      setPhase(ok ? 'subscribed' : 'ask');
    } catch {
      setPhase('ask');
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
      if (permission !== 'granted') { setPhase('denied-perm'); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
      });
      const ok = await saveSubscription(sub, email);
      setPhase(ok ? 'subscribed' : 'ask');
    } catch {
      setPhase('ask');
    }
  }

  if (phase === 'loading' || phase === 'unsupported' || phase === 'subscribed' || phase === 'denied-perm') return null;

  if (phase === 'ios-browser') {
    return (
      <div className="fixed bottom-[72px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[340px] z-40 bg-white border border-border rounded-xl shadow-luxury p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-black rounded-full p-2 flex-shrink-0">
          <Bell size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary">Installa l&apos;app per le notifiche</p>
          <p className="text-2xs text-gray-400 mt-0.5 leading-relaxed">
            Su iPhone tocca <strong>condividi</strong> <span className="inline-block">⎙</span> in Safari, poi <strong>&ldquo;Aggiungi a schermata Home&rdquo;</strong>. Apri l&apos;app installata e attiva le notifiche.
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
