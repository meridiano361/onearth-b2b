/**
 * Assegna la password standard a tutti gli operatori esistenti nel DB.
 * Password: "onearth_" + prime 5 lettere del nome org (minuscolo, solo a-z).
 *
 * Uso: node scripts/seed-operator-passwords.mjs
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function orgSlug(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove diacritici dopo NFD
    .replace(/[^a-z]/g, '')          // mantiene solo lettere a-z
    .substring(0, 5);
}

function defaultPassword(orgNome) {
  return 'onearth_' + orgSlug(orgNome);
}

async function main() {
  const operators = await prisma.operator.findMany({
    include: { organization: true },
    orderBy: [{ organization: { nome: 'asc' } }, { cognome: 'asc' }],
  });

  console.log(`Trovati ${operators.length} operatori. Avvio aggiornamento...\n`);

  const results = [];

  for (const op of operators) {
    const pwd = defaultPassword(op.organization.nome);
    const hash = await bcrypt.hash(pwd, 12);
    await prisma.operator.update({
      where: { id: op.id },
      data: { passwordHash: hash },
    });
    results.push({
      org: op.organization.nome,
      nome: `${op.nome} ${op.cognome}`,
      password: pwd,
    });
  }

  console.log(`✅ Aggiornati ${results.length} operatori.\n`);
  console.log('Primi 5 esempi:');
  console.log('─'.repeat(70));
  results.slice(0, 5).forEach((r) => {
    console.log(`  Org: ${r.org.padEnd(25)}  Operatore: ${r.nome.padEnd(25)}  Password: ${r.password}`);
  });
  console.log('─'.repeat(70));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
