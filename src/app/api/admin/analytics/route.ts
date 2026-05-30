import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, format } from 'date-fns';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'ADMIN') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const today = startOfDay(now);
  const d7 = subDays(now, 7);
  const d30 = subDays(now, 30);

  const [
    totalOrgs,
    totalOperators,
    accessesToday,
    accesses7d,
    accesses30d,
    allAccessLogs,
    deviceGroups,
    orgsWithOperators,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.operator.count({ where: { attivo: true } }),
    prisma.accessLog.count({ where: { loginAt: { gte: today } } }),
    prisma.accessLog.count({ where: { loginAt: { gte: d7 } } }),
    prisma.accessLog.count({ where: { loginAt: { gte: d30 } } }),
    prisma.accessLog.findMany({
      select: { operatorId: true, loginAt: true, dispositivo: true },
      orderBy: { loginAt: 'asc' },
    }),
    prisma.accessLog.groupBy({
      by: ['dispositivo'],
      _count: { _all: true },
    }),
    prisma.organization.findMany({
      include: {
        operatori: {
          select: { id: true, nome: true, cognome: true, email: true, attivo: true, createdAt: true },
        },
        ordini: { select: { id: true } },
      },
      orderBy: { nome: 'asc' },
    }),
  ]);

  // Build operator → org map
  const operatorOrgMap: Record<string, string> = {};
  for (const org of orgsWithOperators) {
    for (const op of org.operatori) {
      operatorOrgMap[op.id] = org.id;
    }
  }

  // Set of operatorIds that have ever accessed
  const accessedOperatorIds = new Set(allAccessLogs.map(l => l.operatorId));
  // Set of orgIds that have ever accessed (via any operator)
  const accessedOrgIds = new Set<string>();
  for (const opId of accessedOperatorIds) {
    const orgId = operatorOrgMap[opId];
    if (orgId) accessedOrgIds.add(orgId);
  }

  const orgsWithAccess = accessedOrgIds.size;
  const orgsNeverAccessed = totalOrgs - orgsWithAccess;
  const operatorsWithAccess = new Set(allAccessLogs.map(l => l.operatorId)).size;

  // Build per-org aggregations
  const orgAccessMap: Record<string, {
    firstAccess: Date | null;
    lastAccess: Date | null;
    totalAccesses: number;
    deviceCounts: Record<string, number>;
  }> = {};

  for (const log of allAccessLogs) {
    const orgId = operatorOrgMap[log.operatorId];
    if (!orgId) continue;
    if (!orgAccessMap[orgId]) {
      orgAccessMap[orgId] = { firstAccess: null, lastAccess: null, totalAccesses: 0, deviceCounts: {} };
    }
    const entry = orgAccessMap[orgId];
    if (!entry.firstAccess || log.loginAt < entry.firstAccess) entry.firstAccess = log.loginAt;
    if (!entry.lastAccess || log.loginAt > entry.lastAccess) entry.lastAccess = log.loginAt;
    entry.totalAccesses++;
    const dev = log.dispositivo ?? 'desktop';
    entry.deviceCounts[dev] = (entry.deviceCounts[dev] ?? 0) + 1;
  }

  function dominantDevice(counts: Record<string, number>): string {
    let best = 'desktop'; let bestN = 0;
    for (const [d, n] of Object.entries(counts)) {
      if (n > bestN) { best = d; bestN = n; }
    }
    return best;
  }

  // orgsWithAccessList
  const orgsAccessedList = orgsWithOperators
    .filter(org => accessedOrgIds.has(org.id))
    .map(org => {
      const agg = orgAccessMap[org.id];
      return {
        id: org.id,
        nome: org.nome,
        operatoriAttivi: org.operatori.filter(o => o.attivo).length,
        firstAccess: agg?.firstAccess ?? null,
        lastAccess: agg?.lastAccess ?? null,
        totalAccesses: agg?.totalAccesses ?? 0,
        dispositivoPrev: dominantDevice(agg?.deviceCounts ?? {}),
        ordini: org.ordini.length,
      };
    });

  // orgsNeverList
  const orgsNeverList = orgsWithOperators
    .filter(org => !accessedOrgIds.has(org.id))
    .map(org => ({
      id: org.id,
      nome: org.nome,
      operatori: org.operatori.map(o => ({
        id: o.id,
        nome: o.nome,
        cognome: o.cognome,
        email: o.email,
        attivo: o.attivo,
      })),
      operatoriCount: org.operatori.length,
      createdAt: org.createdAt,
      giorniDaCreazione: Math.floor((now.getTime() - org.createdAt.getTime()) / 86_400_000),
    }));

  // Daily chart (last 30 days)
  const dailyMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    dailyMap[format(subDays(now, i), 'yyyy-MM-dd')] = 0;
  }
  for (const log of allAccessLogs.filter(l => l.loginAt >= d30)) {
    const key = format(log.loginAt, 'yyyy-MM-dd');
    if (key in dailyMap) dailyMap[key]++;
  }
  const dailyChart = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  // Weekly chart (last 12 weeks)
  const weeklyMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const weekStart = subDays(now, i * 7 + 6);
    weeklyMap[format(weekStart, 'yyyy-ww')] = 0;
  }
  for (const log of allAccessLogs.filter(l => l.loginAt >= subDays(now, 12 * 7))) {
    const key = format(log.loginAt, 'yyyy-ww');
    if (key in weeklyMap) weeklyMap[key]++;
  }
  const weeklyChart = Object.entries(weeklyMap).map(([week, count]) => ({ week, count }));

  // Monthly chart (last 12 months)
  const monthlyMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = subDays(now, i * 30);
    monthlyMap[format(d, 'yyyy-MM')] = 0;
  }
  for (const log of allAccessLogs.filter(l => l.loginAt >= subDays(now, 365))) {
    const key = format(log.loginAt, 'yyyy-MM');
    if (key in monthlyMap) monthlyMap[key]++;
  }
  const monthlyChart = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

  // Device stats
  const devices = { mobile: 0, tablet: 0, desktop: 0 };
  for (const g of deviceGroups) {
    const dev = (g.dispositivo ?? 'desktop') as keyof typeof devices;
    if (dev in devices) devices[dev] = g._count._all;
  }

  return NextResponse.json({
    stats: {
      totalOrgs,
      orgsWithAccess,
      orgsNeverAccessed,
      totalOperators,
      operatorsWithAccess,
      accessesToday,
      accesses7d,
      accesses30d,
    },
    dailyChart,
    weeklyChart,
    monthlyChart,
    devices,
    orgsAccessedList,
    orgsNeverList,
  });
}
