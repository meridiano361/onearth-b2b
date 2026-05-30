import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.product.findMany({ select: { id: true, code: true, notes: true, paese: true } });
  let paeseNull = 0, paeseSet = 0, notesJustCountry = 0;
  const COUNTRIES = ['Vietnam','Bangladesh','Sri Lanka','India','Nepal','Thailand','Thailandia','Indonesia','Cina','China','Pakistan','Cambodia','Cambogia','Myanmar','Laos','Malesia','Malaysia'];
  for (const p of all) {
    if (!p.paese) paeseNull++;
    else paeseSet++;
    if (p.notes && COUNTRIES.some(c => p.notes!.trim().toLowerCase() === c.toLowerCase())) {
      notesJustCountry++;
      console.log(`  ${p.code}: notes="${p.notes}", paese=${p.paese}`);
    }
  }
  console.log(`\npaeseNull: ${paeseNull}, paeseSet: ${paeseSet}`);
  console.log(`notes that is just a country name: ${notesJustCountry}`);

  // Products with paese=null that have notes
  const nullPaeseWithNotes = all.filter(p => !p.paese && p.notes);
  console.log(`\nProducts with paese=null and notes: ${nullPaeseWithNotes.length}`);
  for (const p of nullPaeseWithNotes.slice(0, 10)) {
    console.log(`  ${p.code}: "${p.notes}"`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
