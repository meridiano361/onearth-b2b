import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function translateText(text: string, targetLang: 'en' | 'de' | 'fr' | 'es'): Promise<string> {
  if (!text || text.trim() === '') return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=it|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200) return data.responseData.translatedText;
    return text;
  } catch {
    return text;
  }
}

async function translateProduct(testo: string) {
  const [en, de, fr, es] = await Promise.all([
    translateText(testo, 'en'),
    translateText(testo, 'de'),
    translateText(testo, 'fr'),
    translateText(testo, 'es'),
  ]);
  return { descrizioneEn: en, descrizioneDe: de, descrizioneFr: fr, descrizioneEs: es };
}

async function main() {
  const products = await prisma.product.findMany({
    where: { descrizioneEn: null },
    select: { id: true, code: true, description: true, name: true },
  });

  console.log(`Prodotti da tradurre: ${products.length}`);
  if (products.length === 0) { console.log('Nessun prodotto da tradurre.'); return; }

  const BATCH = 10;
  let done = 0;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (p) => {
        try {
          const testo = p.description || p.name;
          const trad = await translateProduct(testo);
          await prisma.product.update({ where: { id: p.id }, data: trad });
          done++;
          process.stdout.write(`\r[${done}/${products.length}] ${p.code}`);
        } catch (e) {
          console.error(`\nErrore su ${p.code}: ${e}`);
        }
      })
    );
    // Delay 200ms tra ogni batch
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n\nCompleto! ${done}/${products.length} prodotti tradotti.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
