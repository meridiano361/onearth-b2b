/**
 * Backup completo di tutti i dati del database tramite Prisma.
 * Output: backups/backup-YYYY-MM-DD-HH-MM.json
 *
 * Usage:  npm run db:backup
 *
 * Il file JSON contiene tutti i record di ogni tabella.
 * Non include lo schema (struttura del DB) — quello è in prisma/schema.prisma
 * e nelle migrations, già versionate su git.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Rileva tutti i modelli disponibili sul client Prisma
  const modelKeys = Object.keys(prisma).filter(k => {
    if (k.startsWith('$') || k.startsWith('_')) return false;
    const v = (prisma as any)[k];
    return typeof v === 'object' && v !== null && typeof v.findMany === 'function';
  });

  const ts = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '-');
  const backupDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`⏳  Esportazione dati (${modelKeys.length} tabelle)...\n`);

  const backup: Record<string, unknown> = {
    _meta: {
      timestamp: new Date().toISOString(),
      models: modelKeys,
      version: 1,
    },
  };

  let totalRows = 0;
  for (const key of modelKeys) {
    try {
      const rows = await (prisma as any)[key].findMany();
      backup[key] = rows;
      totalRows += rows.length;
      const label = key.padEnd(38);
      const count = String(rows.length).padStart(6);
      console.log(`  ✓  ${label} ${count} righe`);
    } catch (e: any) {
      console.warn(`  ⚠  ${key.padEnd(38)} saltato (${e.message?.slice(0, 50)})`);
      backup[key] = [];
    }
  }

  const filename = `backup-${ts}.json`;
  const filepath = path.join(backupDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  const mb = (fs.statSync(filepath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  Backup completato!`);
  console.log(`    File:   backups/${filename}`);
  console.log(`    Peso:   ${mb} MB`);
  console.log(`    Righe:  ${totalRows.toLocaleString('it')}`);
  console.log(`\n💡  Per ripristinare: npm run db:restore`);
}

main()
  .catch(e => { console.error('❌', e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
