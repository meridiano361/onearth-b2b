import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding classificazione...');

  // ── Gruppo Merceologico ──────────────────────────────────────
  const gruppiMerceologici = ['CASA E REGALO'];

  await prisma.gruppoMerceologico.createMany({
    data: gruppiMerceologici.map((nome) => ({ nome })),
    skipDuplicates: true,
  });
  console.log(`GruppoMerceologico: ${gruppiMerceologici.length} inseriti`);

  // ── Famiglia ─────────────────────────────────────────────────
  const famiglie = ['PRODOTTI PER LA CASA'];

  await prisma.famiglia.createMany({
    data: famiglie.map((nome) => ({ nome })),
    skipDuplicates: true,
  });
  console.log(`Famiglia: ${famiglie.length} inserite`);

  // ── Classe ───────────────────────────────────────────────────
  const classi = [
    'ARREDO E ACCESSORI',
    'CASA DECORATIVI',
    'PRODOTTI TESSILI CASA',
    'TAVOLA E CUCINA',
  ];

  await prisma.classe.createMany({
    data: classi.map((nome) => ({ nome })),
    skipDuplicates: true,
  });
  console.log(`Classe: ${classi.length} inserite`);

  // ── Sottoclasse ───────────────────────────────────────────────
  const sottoclassi = [
    // ARREDO E ACCESSORI
    'ACCESSORI ILLUMINAZIONE',
    'CESTERIA',
    'COMPLEMENTI DI ARREDO',
    'ELEMENTI DI ARREDO',
    // CASA DECORATIVI
    'ACCESSORI ARREDO VARI',
    'CANDELE',
    'PRODOTTI DECORATIVI CASA',
    // PRODOTTI TESSILI CASA
    'CASA E CAMERA',
    'TESSILI BAGNO',
    'TESSILI TAVOLA E CUCINA',
    // TAVOLA E CUCINA
    'ACCESSORI TAVOLA',
    'CUCINA',
    'STOVIGLIE E BICCHIERI',
    'TAZZE E TEIERE',
  ];

  await prisma.sottoclasse.createMany({
    data: sottoclassi.map((nome) => ({ nome })),
    skipDuplicates: true,
  });
  console.log(`Sottoclasse: ${sottoclassi.length} inserite`);

  // ── Gruppo Omogeneo ───────────────────────────────────────────
  const gruppiOmogenei = [
    // ACCESSORI ILLUMINAZIONE
    'LAMPADARI E LAMPADE',
    'PARALUMI IN CARTA',
    // CESTERIA
    'CESTINI GETTACARTE',
    'CONFEZIONI NATALIZIE',
    'CONTENITORI GRANDI IN FIBRA',
    'PICCOLA CESTERIA',
    'PORTABIANCHERIA E ACCESSORI',
    // COMPLEMENTI DI ARREDO
    'ACCESSORI ARREDO BAGNO',
    'ACCESSORI PORTAOGGETTI',
    'AMACHE E ALTALENE',
    'ATTACCAPANNI E GANCI',
    'COPRIVASO',
    'CUSCINI E POUF FIBRA',
    'PARAVENTO',
    'PORTA ASCIUGAMANI',
    'PORTAJOIE',
    'PORTAPIANTE E SIKA',
    'SEDIE E SDRAIO',
    'SPECCHI',
    'ZERBINI',
    // ELEMENTI DI ARREDO
    'LIBRERIE E ALTRI RIPIANI ALTI',
    'POLTRONE E DIVANI',
    'SGABELLI E SEDIE',
    'TAVOLINI E ALTRI RIPIANI BASSI',
    // ACCESSORI ARREDO VARI
    'DIFFUSORI',
    'INCENSI',
    'PORTACANDELE E PORTALUMINI',
    'PORTAINCENSI E PORTAESSENZE',
    // CANDELE
    'CON CONTENITORE E PORTACANDELE',
    'DECORATIVE',
    'LUMINI E CANDELE GALLEGGIANTI',
    'NATALIZIE',
    // PRODOTTI DECORATIVI CASA
    'DECORAZIONI CASA VARIE',
    'PIATTI E CIOTOLE DECORATIVE',
    'VASI DECORATIVI',
    'VASI FIORI IN VETRO E CERAMICA',
    // CASA E CAMERA
    'ALTRI TESSILI CASA',
    'ARAZZI E PANNELLI',
    'COPERTE E PLAID',
    'COPRICUSCINO',
    'CUSCINI IMBOTTITI E POUF TESSUTO',
    'LENZUOLA',
    'PANNELLI CON TASCHE',
    'SACCHI PER BIANCHERIA',
    'TAPPETI STUOIE E PASSATOIE',
    'TENDE',
    'TRAPUNTE E COPRIPIUMINO',
    // TESSILI BAGNO
    'ACCESSORI BAGNO',
    'ASCIUGAMANI',
    // TESSILI TAVOLA E CUCINA
    'ALTRI TESSILI DA CUCINA',
    'RUNNER E CENTROTAVOLA',
    'TOVAGLIE CON TOVAGLIOLI',
    'TOVAGLIE SENZA TOVAGLIOLI',
    'TOVAGLIETTE',
    // ACCESSORI TAVOLA
    'PORTATOVAGLIOLI',
    'SEGNAPOSTO',
    'SOTTOBICCHIERI',
    'SOTTOPIATTI',
    // CUCINA
    'CONTENITORI DA CUCINA IN ALTRI MATERIALI',
    'CONTENITORI DA CUCINA IN FIBRA',
    'OLIERE SALE-PEPE E PORTASALSE',
    'SOTTOPENTOLE',
    'UTENSILI CUCINA',
    'VASSOI',
    // STOVIGLIE E BICCHIERI
    'BICCHIERI ACQUA-VINO E CALICI',
    'BICCHIERINI',
    'BROCCHE E CARAFFE',
    'CIOTOLE E COPPETTE',
    'INSALATIERE E TERRINE',
    'PENTOLE E PIROFILE',
    'PIATTI DA PORTATA',
    'PIATTI PIANI FONDI E FRUTTA',
    'POSATE',
    // TAZZE E TEIERE
    'SERVIZI CAFFÈ',
    'SERVIZI TÈ',
    'TAZZE ALTE E MUGS',
    'TAZZE E CIOTOLE TÈ',
    'TAZZINE CAFFÈ',
    'TAZZONE CAFFELATTE E SCODELLE',
    'TEIERE',
    'TISANIERE',
    'ZUCCHIERERE E BRICCHI LATTE',
  ];

  await prisma.gruppoOmogeneo.createMany({
    data: gruppiOmogenei.map((nome) => ({ nome })),
    skipDuplicates: true,
  });
  console.log(`GruppoOmogeneo: ${gruppiOmogenei.length} inseriti`);

  console.log('\n✅ Seed classificazione completato!');
  console.log(`Totale: ${gruppiMerceologici.length + famiglie.length + classi.length + sottoclassi.length + gruppiOmogenei.length} valori`);
}

main()
  .catch((e) => {
    console.error('❌ Errore seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
