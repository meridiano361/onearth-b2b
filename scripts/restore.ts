/**
 * Ripristino del database da un backup JSON creato con scripts/backup.ts.
 *
 * ⚠️  ATTENZIONE: sovrascrive TUTTI i dati del database corrente.
 *     Fai un nuovo backup prima di procedere se hai dati recenti da conservare.
 *
 * Usage:
 *   npm run db:restore                                                  # mostra lista backup
 *   npm run db:restore -- backups/backup-2026-10-10-14-30.json         # ripristina diretto
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const prisma = new PrismaClient();
const backupDir = path.join(process.cwd(), 'backups');

function listBackups(): string[] {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
}

function fmtSize(fp: string) {
  const mb = fs.statSync(fp).size / 1024 / 1024;
  return mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
}

async function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim()); }));
}

async function selectFile(): Promise<string> {
  const arg = process.argv[2];
  if (arg) {
    const fp = path.resolve(arg);
    if (!fs.existsSync(fp)) { console.error(`❌  File non trovato: ${fp}`); process.exit(1); }
    return fp;
  }

  const files = listBackups();
  if (files.length === 0) {
    console.log('Nessun backup trovato in backups/');
    console.log('Esegui prima: npm run db:backup');
    process.exit(0);
  }

  console.log('\nBackup disponibili:\n');
  files.forEach((f, i) => {
    const fp = path.join(backupDir, f);
    const tag = i === 0 ? '  ← più recente' : '';
    console.log(`  [${i + 1}] ${f}  (${fmtSize(fp)})${tag}`);
  });

  const choice = await ask('\nQuale backup? Inserisci il numero [1]: ');
  const idx = choice === '' ? 0 : parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= files.length) {
    console.error('Scelta non valida.'); process.exit(1);
  }
  return path.join(backupDir, files[idx]);
}

async function main() {
  const filepath = await selectFile();

  console.log(`\n⚠️   File selezionato: ${path.basename(filepath)}`);
  console.log('    Questa operazione sovrascrive TUTTI i dati attuali del database.');
  console.log('    Se hai dati recenti importanti, premi Ctrl+C e fai prima un backup.\n');
  const confirm = await ask('Digita "sì" per confermare: ');
  if (!['sì', 'si', 'yes'].includes(confirm.toLowerCase())) {
    console.log('\nAnnullato.'); process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as Record<string, unknown>;
  const meta = raw._meta as { models: string[]; timestamp: string };
  const modelKeys: string[] = meta?.models ?? [];

  if (modelKeys.length === 0) {
    console.error('❌  File di backup non valido (lista modelli mancante).');
    process.exit(1);
  }

  console.log(`\n⏳  Ripristino da backup del ${new Date(meta.timestamp).toLocaleString('it')}...\n`);

  // Usa una transazione con SET LOCAL per bypassare i vincoli FK durante l'operazione
  await prisma.$transaction(
    async tx => {
      await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');

      // 1. Svuota tutte le tabelle (ordine inverso per sicurezza)
      console.log('  Svuotamento tabelle...');
      for (const key of [...modelKeys].reverse()) {
        try { await (tx as any)[key].deleteMany(); } catch { /* ignora se la tabella è già vuota */ }
      }

      // 2. Reinserisce i dati nell'ordine originale del backup
      console.log('  Inserimento dati...\n');
      for (const key of modelKeys) {
        const rows = raw[key] as unknown[];
        if (!rows?.length) continue;
        try {
          await (tx as any)[key].createMany({ data: rows, skipDuplicates: true });
          console.log(`  ✓  ${key.padEnd(38)} ${String(rows.length).padStart(6)} righe`);
        } catch (e: any) {
          console.warn(`  ⚠  ${key.padEnd(38)} errore: ${e.message?.slice(0, 70)}`);
        }
      }
    },
    { timeout: 300_000 } // 5 minuti
  );

  console.log('\n✅  Ripristino completato!');
  console.log('    Riavvia il server Next.js per vedere i dati aggiornati.');
}

main()
  .catch(e => { console.error('\n❌  Errore:', e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
