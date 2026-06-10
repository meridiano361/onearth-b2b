'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, BellOff, Mail, MailX, Smartphone, SmartphoneNfc, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushState = 'loading' | 'unsupported' | 'blocked' | 'active' | 'inactive';

function SettingRow({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary">{title}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border last:border-0">
      <div className="text-gray-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-2xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-primary mt-0.5 break-all">{value}</p>
      </div>
    </div>
  );
}


export default function ImpostazioniPage() {
  const { data: session } = useSession();
  const [pushState, setPushState] = useState<PushState>('loading');
  const [pushBusy, setPushBusy] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const password = `onearth_${(session?.user?.companyName ?? '').slice(0, 5).toLowerCase()}`;

  useEffect(() => {
    // Push state
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
    } else if (Notification.permission === 'denied') {
      setPushState('blocked');
    } else {
      fetch('/api/push/subscribe')
        .then((r) => r.json())
        .then((d) => setPushState(d.subscribed ? 'active' : 'inactive'))
        .catch(() => setPushState('inactive'));
    }
    // Email preference
    fetch('/api/customer/notification-preferences')
      .then((r) => r.json())
      .then((d) => setEmailEnabled(d.notificationsEnabled ?? true))
      .catch(() => setEmailEnabled(true));
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState('blocked');
        toast.error('Permesso negato. Vai in Impostazioni browser → Notifiche per abilitarlo.');
        return;
      }

      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      } catch {
        toast.error('Notifiche non supportate su questo browser');
        return;
      }

      let key: string;
      try {
        const vapidRes = await fetch('/api/push/vapid-key');
        if (!vapidRes.ok) { toast.error('Servizio non disponibile — riprova più tardi'); return; }
        const data = await vapidRes.json();
        key = data.key;
        if (!key) { toast.error('Servizio non configurato — contatta l\'assistenza'); return; }
      } catch {
        toast.error('Errore di rete — verifica la connessione');
        return;
      }

      let sub: PushSubscription;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
        });
      } catch {
        toast.error('Attivazione non riuscita — riprova o controlla le impostazioni del browser');
        return;
      }

      const json = sub.toJSON();
      const email = session?.user?.email;
      if (!email) {
        toast.error('Sessione non trovata — rieffettua il login', { duration: 10000 });
        return;
      }
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, email }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        toast.error(`Errore salvataggio (${saveRes.status}): ${errBody.error ?? 'sconosciuto'}`, { duration: 10000 });
        return;
      }
      setPushState('active');
      toast.success('Notifiche push attivate');
    } catch {
      toast.error('Errore imprevisto — riprova');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setPushState('inactive');
      toast.success('Notifiche push disattivate');
    } catch {
      toast.error('Errore durante la disattivazione');
    } finally {
      setPushBusy(false);
    }
  }

  async function handleToggleEmail(enabled: boolean) {
    setEmailBusy(true);
    try {
      await fetch('/api/customer/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationsEnabled: enabled }),
      });
      setEmailEnabled(enabled);
      toast.success(enabled ? 'Email notifiche attivate' : 'Email notifiche disattivate');
    } catch {
      toast.error('Errore aggiornamento preferenze');
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div>
        <p className="label-luxury text-accent mb-1">Account</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">Impostazioni</h1>
      </div>

      {/* ── Dati account ── */}
      <div className="bg-white border border-border rounded-xl px-5">
        <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider pt-5 pb-1">Il tuo account</p>

        <InfoRow icon={<User size={16} />} label="Organizzazione" value={session?.user?.companyName ?? '—'} />
        <InfoRow icon={<Mail size={16} />} label="Email di accesso" value={session?.user?.email ?? '—'} />

        <InfoRow icon={<Lock size={16} />} label="Password" value={password} />
      </div>

      {/* ── Notifiche ── */}
      <div className="bg-white border border-border rounded-xl px-5">
        <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wider pt-5 pb-1">Notifiche</p>

        <SettingRow
          icon={<Smartphone size={18} />}
          title="Notifiche sul telefono"
          description={
            pushState === 'unsupported' ? 'Il tuo browser non supporta le notifiche push.' :
            pushState === 'blocked' ? 'Le notifiche sono bloccate. Vai in Impostazioni browser → Impostazioni sito → Notifiche e abilita app.b2b.on-earth.it.' :
            pushState === 'active' ? 'Attive — ricevi un avviso anche con l\'app chiusa.' :
            'Attiva per ricevere notifiche sul telefono anche con l\'app chiusa.'
          }
        >
          {pushState === 'loading' && <span className="text-2xs text-gray-300">…</span>}
          {pushState === 'unsupported' && <span className="text-2xs text-gray-400">Non disponibile</span>}
          {pushState === 'blocked' && <span className="text-2xs text-red-500 font-medium">Bloccate</span>}
          {pushState === 'active' && (
            <button onClick={handleDisablePush} disabled={pushBusy}
              className="flex items-center gap-1.5 text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40">
              <BellOff size={13} />Disattiva
            </button>
          )}
          {pushState === 'inactive' && (
            <button onClick={handleEnablePush} disabled={pushBusy}
              className="flex items-center gap-1.5 text-xs bg-black text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors disabled:opacity-40">
              <SmartphoneNfc size={13} />{pushBusy ? 'Attivazione…' : 'Attiva'}
            </button>
          )}
        </SettingRow>

        <SettingRow
          icon={emailEnabled === false ? <MailX size={18} /> : <Mail size={18} />}
          title="Notifiche via email"
          description="Ricevi aggiornamenti, novità e promozioni all'indirizzo email del tuo account."
        >
          {emailEnabled === null ? (
            <span className="text-2xs text-gray-300">…</span>
          ) : emailEnabled ? (
            <button onClick={() => handleToggleEmail(false)} disabled={emailBusy}
              className="flex items-center gap-1.5 text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-40">
              <MailX size={13} />Disattiva
            </button>
          ) : (
            <button onClick={() => handleToggleEmail(true)} disabled={emailBusy}
              className="flex items-center gap-1.5 text-xs bg-black text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors disabled:opacity-40">
              <Mail size={13} />{emailBusy ? 'Attivazione…' : 'Attiva'}
            </button>
          )}
        </SettingRow>
      </div>
    </div>
  );
}
