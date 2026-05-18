import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertGM(nome: string) {
  return prisma.gruppoMerceologico.upsert({
    where: { nome },
    update: {},
    create: { nome },
  });
}

async function upsertFam(nome: string, gruppoMerceologicoId: string) {
  return prisma.famiglia.upsert({
    where: { nome_gruppoMerceologicoId: { nome, gruppoMerceologicoId } },
    update: {},
    create: { nome, gruppoMerceologicoId },
  });
}

async function upsertCls(nome: string, famigliaId: string) {
  return prisma.classe.upsert({
    where: { nome_famigliaId: { nome, famigliaId } },
    update: {},
    create: { nome, famigliaId },
  });
}

async function upsertSub(nome: string, classeId: string) {
  return prisma.sottoclasse.upsert({
    where: { nome_classeId: { nome, classeId } },
    update: {},
    create: { nome, classeId },
  });
}

async function upsertGO(nome: string, sottoclasseId: string) {
  return prisma.gruppoOmogeneo.upsert({
    where: { nome_sottoclasseId: { nome, sottoclasseId } },
    update: {},
    create: { nome, sottoclasseId },
  });
}

async function main() {
  console.log('Seeding classificazione gerarchica...');

  const gm = await upsertGM('CASA E REGALO');
  const fam = await upsertFam('PRODOTTI PER LA CASA', gm.id);

  // ── ARREDO E ACCESSORI ────────────────────────────────────────
  const clsArredo = await upsertCls('ARREDO E ACCESSORI', fam.id);

  const subAccIll = await upsertSub('ACCESSORI ILLUMINAZIONE', clsArredo.id);
  await upsertGO('LAMPADARI E LAMPADE', subAccIll.id);
  await upsertGO('PARALUMI IN CARTA', subAccIll.id);

  const subCest = await upsertSub('CESTERIA', clsArredo.id);
  await upsertGO('CESTINI GETTACARTE', subCest.id);
  await upsertGO('CONFEZIONI NATALIZIE', subCest.id);
  await upsertGO('CONTENITORI GRANDI IN FIBRA', subCest.id);
  await upsertGO('PICCOLA CESTERIA', subCest.id);
  await upsertGO('PORTABIANCHERIA E ACCESSORI', subCest.id);

  const subComp = await upsertSub('COMPLEMENTI DI ARREDO', clsArredo.id);
  await upsertGO('ACCESSORI ARREDO BAGNO', subComp.id);
  await upsertGO('ACCESSORI PORTAOGGETTI', subComp.id);
  await upsertGO('AMACHE E ALTALENE', subComp.id);
  await upsertGO('ATTACCAPANNI E GANCI', subComp.id);
  await upsertGO('COPRIVASO', subComp.id);
  await upsertGO('CUSCINI E POUF FIBRA', subComp.id);
  await upsertGO('PARAVENTO', subComp.id);
  await upsertGO('PORTA ASCIUGAMANI', subComp.id);
  await upsertGO('PORTAJOIE', subComp.id);
  await upsertGO('PORTAPIANTE E SIKA', subComp.id);
  await upsertGO('SEDIE E SDRAIO', subComp.id);
  await upsertGO('SPECCHI', subComp.id);
  await upsertGO('ZERBINI', subComp.id);

  const subElem = await upsertSub('ELEMENTI DI ARREDO', clsArredo.id);
  await upsertGO('LIBRERIE E ALTRI RIPIANI ALTI', subElem.id);
  await upsertGO('POLTRONE E DIVANI', subElem.id);
  await upsertGO('SGABELLI E SEDIE', subElem.id);
  await upsertGO('TAVOLINI E ALTRI RIPIANI BASSI', subElem.id);

  // ── CASA DECORATIVI ───────────────────────────────────────────
  const clsDeco = await upsertCls('CASA DECORATIVI', fam.id);

  const subAccVar = await upsertSub('ACCESSORI ARREDO VARI', clsDeco.id);
  await upsertGO('DIFFUSORI', subAccVar.id);
  await upsertGO('INCENSI', subAccVar.id);
  await upsertGO('PORTACANDELE E PORTALUMINI', subAccVar.id);
  await upsertGO('PORTAINCENSI E PORTAESSENZE', subAccVar.id);

  const subCand = await upsertSub('CANDELE', clsDeco.id);
  await upsertGO('CON CONTENITORE E PORTACANDELE', subCand.id);
  await upsertGO('DECORATIVE', subCand.id);
  await upsertGO('LUMINI E CANDELE GALLEGGIANTI', subCand.id);
  await upsertGO('NATALIZIE', subCand.id);

  const subProdDeco = await upsertSub('PRODOTTI DECORATIVI CASA', clsDeco.id);
  await upsertGO('DECORAZIONI CASA VARIE', subProdDeco.id);
  await upsertGO('PIATTI E CIOTOLE DECORATIVE', subProdDeco.id);
  await upsertGO('VASI DECORATIVI', subProdDeco.id);
  await upsertGO('VASI FIORI IN VETRO E CERAMICA', subProdDeco.id);

  // ── PRODOTTI TESSILI CASA ─────────────────────────────────────
  const clsTess = await upsertCls('PRODOTTI TESSILI CASA', fam.id);

  const subCasaCam = await upsertSub('CASA E CAMERA', clsTess.id);
  await upsertGO('ALTRI TESSILI CASA', subCasaCam.id);
  await upsertGO('ARAZZI E PANNELLI', subCasaCam.id);
  await upsertGO('COPERTE E PLAID', subCasaCam.id);
  await upsertGO('COPRICUSCINO', subCasaCam.id);
  await upsertGO('CUSCINI IMBOTTITI E POUF TESSUTO', subCasaCam.id);
  await upsertGO('LENZUOLA', subCasaCam.id);
  await upsertGO('PANNELLI CON TASCHE', subCasaCam.id);
  await upsertGO('SACCHI PER BIANCHERIA', subCasaCam.id);
  await upsertGO('TAPPETI STUOIE E PASSATOIE', subCasaCam.id);
  await upsertGO('TENDE', subCasaCam.id);
  await upsertGO('TRAPUNTE E COPRIPIUMINO', subCasaCam.id);

  const subBagno = await upsertSub('TESSILI BAGNO', clsTess.id);
  await upsertGO('ACCESSORI BAGNO', subBagno.id);
  await upsertGO('ASCIUGAMANI', subBagno.id);

  const subTavCuc = await upsertSub('TESSILI TAVOLA E CUCINA', clsTess.id);
  await upsertGO('ALTRI TESSILI DA CUCINA', subTavCuc.id);
  await upsertGO('RUNNER E CENTROTAVOLA', subTavCuc.id);
  await upsertGO('TOVAGLIE CON TOVAGLIOLI', subTavCuc.id);
  await upsertGO('TOVAGLIE SENZA TOVAGLIOLI', subTavCuc.id);
  await upsertGO('TOVAGLIETTE', subTavCuc.id);

  // ── TAVOLA E CUCINA ───────────────────────────────────────────
  const clsTavola = await upsertCls('TAVOLA E CUCINA', fam.id);

  const subAccTav = await upsertSub('ACCESSORI TAVOLA', clsTavola.id);
  await upsertGO('PORTATOVAGLIOLI', subAccTav.id);
  await upsertGO('SEGNAPOSTO', subAccTav.id);
  await upsertGO('SOTTOBICCHIERI', subAccTav.id);
  await upsertGO('SOTTOPIATTI', subAccTav.id);

  const subCucina = await upsertSub('CUCINA', clsTavola.id);
  await upsertGO('CONTENITORI DA CUCINA IN ALTRI MATERIALI', subCucina.id);
  await upsertGO('CONTENITORI DA CUCINA IN FIBRA', subCucina.id);
  await upsertGO('OLIERE SALE-PEPE E PORTASALSE', subCucina.id);
  await upsertGO('SOTTOPENTOLE', subCucina.id);
  await upsertGO('UTENSILI CUCINA', subCucina.id);
  await upsertGO('VASSOI', subCucina.id);

  const subStov = await upsertSub('STOVIGLIE E BICCHIERI', clsTavola.id);
  await upsertGO('BICCHIERI ACQUA-VINO E CALICI', subStov.id);
  await upsertGO('BICCHIERINI', subStov.id);
  await upsertGO('BROCCHE E CARAFFE', subStov.id);
  await upsertGO('CIOTOLE E COPPETTE', subStov.id);
  await upsertGO('INSALATIERE E TERRINE', subStov.id);
  await upsertGO('PENTOLE E PIROFILE', subStov.id);
  await upsertGO('PIATTI DA PORTATA', subStov.id);
  await upsertGO('PIATTI PIANI FONDI E FRUTTA', subStov.id);
  await upsertGO('POSATE', subStov.id);

  const subTazze = await upsertSub('TAZZE E TEIERE', clsTavola.id);
  await upsertGO('SERVIZI CAFFÈ', subTazze.id);
  await upsertGO('SERVIZI TÈ', subTazze.id);
  await upsertGO('TAZZE ALTE E MUGS', subTazze.id);
  await upsertGO('TAZZE E CIOTOLE TÈ', subTazze.id);
  await upsertGO('TAZZINE CAFFÈ', subTazze.id);
  await upsertGO('TAZZONE CAFFELATTE E SCODELLE', subTazze.id);
  await upsertGO('TEIERE', subTazze.id);
  await upsertGO('TISANIERE', subTazze.id);
  await upsertGO('ZUCCHIERERE E BRICCHI LATTE', subTazze.id);

  console.log('\n✅ Seed classificazione gerarchica completato!');
}

main()
  .catch((e) => {
    console.error('❌ Errore seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
