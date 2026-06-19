import webPush from 'web-push';
import { prisma } from './prisma';

// Push notifications destinate solo all'admin Emilio Mazzolari
const ADMIN_EMAIL = 'emilio.mazzolari@gmail.com';

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';
  if (!pub || !priv) return;
  webPush.setVapidDetails(subj, pub, priv);
  vapidReady = true;
}

export async function notifyAdmin(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  ensureVapid();
  if (!vapidReady) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userEmail: ADMIN_EMAIL },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  await Promise.allSettled(
    subs.map((sub) =>
      webPush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(async (e: any) => {
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          }
        })
    )
  );
}
