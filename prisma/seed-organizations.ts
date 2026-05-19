import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateOrgPassword(orgNome: string): string {
  const slug = orgNome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
  return 'onearth_' + slug.substring(0, 5);
}

function splitName(fullName: string): { nome: string; cognome: string } {
  const parts = fullName.trim().split(' ');
  const cognome = parts.pop()!;
  const nome = parts.join(' ') || cognome;
  return { nome, cognome };
}

const ORGS: { nome: string; operators: { fullName: string; email: string }[] }[] = [
  {
    nome: 'Ad Gentes',
    operators: [
      { fullName: 'Enrica Cremaschi', email: 'enrica.cremaschi@adgentes.org' },
      { fullName: 'Daniela Curti', email: 'curtid@unipv.it' },
      { fullName: 'Laura Fantoni', email: 'adgentesbinasco@hotmail.it' },
    ],
  },
  {
    nome: 'Aetix',
    operators: [
      { fullName: 'Irina Zangari', email: 'irina.zangari@aetix.it' },
    ],
  },
  {
    nome: 'Altromercato',
    operators: [
      { fullName: 'Giliana Sinibaldi', email: 'giliana.sinibaldi@altromercato.it' },
    ],
  },
  {
    nome: 'Amandla',
    operators: [
      { fullName: 'Barbara Carrara', email: 'arpilleras@amandla.it' },
      { fullName: 'Teresa Cattaneo', email: 'terricatta@hotmail.it' },
      { fullName: 'Cristina Ravasio', email: 'tdtu@amandla.it' },
      { fullName: 'Linda Cuminetti', email: 'baioni@amandla.it' },
    ],
  },
  {
    nome: 'Angoli Di Mondo',
    operators: [
      { fullName: 'Giulia Astero', email: 'titolivio@angolidimondo.it' },
      { fullName: 'Maria Pia Denegri', email: 'arcella@angolidimondo.it' },
      { fullName: 'Alberto Graziotto', email: 'acquisti@angolidimondo.it' },
      { fullName: 'Frydhaousse Nouhoum', email: 'botteghe@stelladelsudcittadella.com' },
    ],
  },
  {
    nome: 'Bottega Del Sole',
    operators: [
      { fullName: 'Alessia Boschetti', email: 'bottegadelsole.carpi@gmail.com' },
    ],
  },
  {
    nome: "C'È Un Mondo",
    operators: [
      { fullName: 'Emanuela Melotti', email: 'info@ceunmondo.it' },
      { fullName: 'Rosalinda Triggiani', email: 'info@ceunmondo.it' },
    ],
  },
  {
    nome: 'Effetto Terra',
    operators: [
      { fullName: 'Meri Colleoni', email: 'mericolleoni@gmail.com' },
      { fullName: 'Valentino Grazia', email: 'info@effettoterra.it' },
    ],
  },
  {
    nome: "Equ'Azione",
    operators: [
      { fullName: 'Giovanna Merlo', email: 'ordini@equazionenole.eu' },
    ],
  },
  {
    nome: 'Equamente',
    operators: [
      { fullName: 'Carolina Rubboli', email: 'info@equamente.info' },
    ],
  },
  {
    nome: 'Exaequo',
    operators: [
      { fullName: 'Valeria Buraschi', email: 'valeria.buraschi@exaequo.bo.it' },
      { fullName: 'Emanuela Sortino', email: 'emanuela.sortino@exaequo.bo.it' },
    ],
  },
  {
    nome: 'Giuste Terre',
    operators: [
      { fullName: 'Roberta Beltrami', email: 'roberta.beltrami@giusteterre.it' },
      { fullName: 'Valentina Bigliani', email: 'valentina.bigliani@giusteterre.it' },
      { fullName: 'Chiara Capretti', email: 'chiara.capretti@giusteterre.it' },
      { fullName: 'Stefania Sommariva', email: 'stefania.sommariva@giusteterre.it' },
    ],
  },
  {
    nome: 'Il Mondo In Casa',
    operators: [
      { fullName: 'Simona Bertolasi', email: 'assmondoincasa@gmail.com' },
      { fullName: 'Loretta Fanti', email: 'assmondoincasa@gmail.com' },
      { fullName: 'Stefania Migliorati', email: 'assmondoincasa@gmail.com' },
      { fullName: 'Nadia Riva', email: 'assmondoincasa@gmail.com' },
    ],
  },
  {
    nome: "L'Albero Del Pane",
    operators: [
      { fullName: 'M. Grazia Bailo', email: 'bailomgrazia@gmail.com' },
      { fullName: 'Marina Uderzo', email: 'bailomgrazia@gmail.com' },
      { fullName: 'Giovanna Lubian', email: 'lgiovi55@gmail.com' },
    ],
  },
  {
    nome: 'La Bottega Solidale',
    operators: [
      { fullName: 'Francesca Capelli', email: 'bdm.portoantico@bottegasolidale.it' },
      { fullName: 'Alice Felanda', email: 'bdm.galata@bottegasolidale.it' },
      { fullName: 'Chiara Piano', email: 'bdm.galata@bottegasolidale.it' },
    ],
  },
  {
    nome: 'La Carovana',
    operators: [
      { fullName: 'Federica Tosi', email: 'lacarovana17@gmail.com' },
    ],
  },
  {
    nome: 'Le Rondini',
    operators: [
      { fullName: 'Martina Bon', email: 'bottegalegnago@rondini.org' },
      { fullName: 'Felicita Crudele', email: 'feileius9@gmail.com' },
      { fullName: 'Anna Maria Lamberti', email: 'bottegaviapallone@rondini.org' },
      { fullName: 'Elisabetta Marchesan', email: 'bottegasangiovanni@rondini.org' },
      { fullName: 'Alessia Masotto', email: 'promozione@rondini.org' },
      { fullName: 'Fiorella Mirandola', email: 'bottegasanbonifacio@rondini.org' },
      { fullName: 'Simonetta Sempreboni', email: 'simosempre1971@gmail.com' },
      { fullName: 'Carlotta Zamboni', email: 'comunicazione@rondini.org' },
    ],
  },
  {
    nome: 'Macondo',
    operators: [
      { fullName: 'Marinella Grattoni', email: 'marinellagrattoni@gmail.com' },
      { fullName: 'Luigia Parravicini', email: 'parraluigia@gmail.com' },
      { fullName: 'Ylenia Schettino', email: 'super_yle@hotmail.it' },
    ],
  },
  {
    nome: 'Mandacarù',
    operators: [
      { fullName: 'Andreina Bordoni', email: 'sondrio@mandacaru.it' },
      { fullName: 'Giulia Da Tos', email: 'donbosco@mandacaru.it' },
      { fullName: 'Monica Gamper', email: 'roma@mandacaru.it' },
      { fullName: 'Annalisa Pensoni', email: 'sondrio@mandacaru.it' },
      { fullName: 'Giovanna Sartorelli', email: 'sondrio@mandacaru.it' },
      { fullName: 'Daniella Soppa', email: 'roma@mandacaru.it' },
      { fullName: 'Antonella Berti', email: 'magazzino@mandacaru.it' },
      { fullName: 'Valentina Mosetti', email: 'trento@mandacaru.it' },
      { fullName: 'Mirko Civettini', email: 'rovereto@mandacaru.it' },
      { fullName: 'Milva Giramonti', email: 'rovereto@mandacaru.it' },
    ],
  },
  {
    nome: 'Meridiano 361',
    operators: [
      { fullName: 'Chiara Monteverdi', email: 'c.monteverdi@meridiano361.it' },
    ],
  },
  {
    nome: 'Mondo Equo',
    operators: [
      { fullName: 'Maria Ratti', email: 'lecco@mondoequo.it' },
    ],
  },
  {
    nome: 'Mondo Nuovo',
    operators: [
      { fullName: 'Femi Sicilia', email: 'sandonato@mondo-nuovo.it' },
      { fullName: 'Paolo Destefanis', email: 'paolo.destefanis@mondo-nuovo.it' },
      { fullName: 'Cecilia Capoia', email: 'sanmarino@mondo-nuovo.it' },
    ],
  },
  {
    nome: 'Mondo Solidale',
    operators: [
      { fullName: 'Giacinta Scarlato', email: 'nonloso55@gmail.com' },
    ],
  },
  {
    nome: 'Monimbò',
    operators: [
      { fullName: 'Adele Barbetti', email: 'monimbocoop@gmail.com' },
    ],
  },
  {
    nome: 'Nazca Mondo Alegre',
    operators: [
      { fullName: 'Cristiana Abbiati', email: 'arese@mondoalegre.it' },
      { fullName: 'Alessandra Carta', email: 'alessandra.carta@unimi.it' },
      { fullName: 'Nicoletta Conca', email: 'nikitempesta@gmail.com' },
      { fullName: 'Fosca Medici', email: 'fosca.medici62@gmail.com' },
      { fullName: 'Angela Pomati', email: 'angela.pomati@gmail.com' },
      { fullName: 'Elena Restelli', email: 'botteghe@mondoalegre.it' },
      { fullName: 'Valeria Sala', email: 'botteghe@mondoalegre.it' },
      { fullName: 'Franca Vignati', email: 'franca.vignati@gmail.com' },
      { fullName: 'Marisa Previtali', email: 'marisaprevi@virgilio.it' },
      { fullName: 'Monica Dazzi', email: 'cernusco@mondoalegre.it' },
      { fullName: "Anna Cantu'", email: 'annacantu55@gmail.com' },
      { fullName: 'Grazia Piarulli', email: 'cernusco@mondoalegre.it' },
      { fullName: 'Francesca Raimondi', email: 'e.bennet52@yahoo.it' },
    ],
  },
  {
    nome: 'Nord Sud',
    operators: [
      { fullName: 'Dominique Van Lierde', email: 'nordsudlodi@gmail.com' },
      { fullName: 'Concetta Scarfia', email: 'concettascarfia55@gmail.com' },
      { fullName: 'Monica Tronchin', email: 'monicatronchin@gmail.com' },
    ],
  },
  {
    nome: 'Nuova Solidarietà',
    operators: [
      { fullName: 'Fulvia Seghezzi', email: 'clusone@coopnuovasolidarieta.it' },
    ],
  },
  {
    nome: 'Pace E Sviluppo',
    operators: [
      { fullName: 'Maristella Giuliano', email: 'maristella.giuliano@pacesviluppo.org' },
      { fullName: 'Giovanna Daniel', email: 'giovanna.daniel@pacesviluppo.org' },
      { fullName: 'Federica Massolin', email: 'federica.massolin@pacesviluppo.org' },
      { fullName: 'Alberto Marconato', email: 'alberto.marconato@pacesviluppo.org' },
      { fullName: 'Sara Fidone', email: 'sara.fidone@pacesviluppo.org' },
    ],
  },
  {
    nome: 'Pime',
    operators: [
      { fullName: 'Anna Asteriti', email: 'asteriti@pimemilano.com' },
      { fullName: 'Paola Campagna', email: 'campagna@pimemilano.com' },
    ],
  },
  {
    nome: 'Porto Alegre',
    operators: [
      { fullName: 'Carla Pavan', email: 'fiondadidavide@portoalegrerovigo.org' },
    ],
  },
  {
    nome: 'Raggio Verde',
    operators: [
      { fullName: 'Laura Piscetta', email: 'borgomanero@raggioverde.com' },
      { fullName: 'Carlo Tosi', email: 'verbania@raggioverde.com' },
      { fullName: "Isabella D'Avola", email: 'borgosesia@raggioverde.com' },
    ],
  },
  {
    nome: 'Shongoti',
    operators: [
      { fullName: 'Donata Brambilla', email: 'shongoti@shongoti.it' },
      { fullName: 'Daniela Marieni', email: 'shongoti@shongoti.it' },
    ],
  },
  {
    nome: 'Tapioca',
    operators: [
      { fullName: 'Cinzia Arzu', email: 'cinziaarzu@gmail.com' },
      { fullName: 'Laura Macario', email: 'latapioca95@gmail.com' },
      { fullName: 'Ebe Tedeschi', email: 'ebetedeschi1962@gmail.com' },
    ],
  },
  {
    nome: 'Unicomondo',
    operators: [
      { fullName: 'Valentina Cabras', email: 'botteghe@unicomondo.org' },
      { fullName: 'Marta Fracasso', email: 'comunicazione@unicomondo.org' },
    ],
  },
  {
    nome: 'Vagamondi',
    operators: [
      { fullName: 'Samuela Baldaccini', email: 'bottega@vagamondi.net' },
      { fullName: 'Cristina Guerra', email: 'bottega@vagamondi.net' },
    ],
  },
];

async function main() {
  console.log('Seeding organizations and operators...\n');

  let orgCount = 0;
  let opCount = 0;
  const skipped: string[] = [];

  for (const orgData of ORGS) {
    const password = generateOrgPassword(orgData.nome);
    const passwordHash = await bcrypt.hash(password, 12);

    // Upsert organization
    const org = await prisma.organization.upsert({
      where: { nome: orgData.nome },
      update: {},
      create: { nome: orgData.nome },
    });
    orgCount++;

    // Create operators (skip duplicates by email)
    const seenEmails = new Set<string>();
    for (const op of orgData.operators) {
      if (seenEmails.has(op.email)) {
        // Multiple operators share the same email — append name to distinguish
        const { nome, cognome } = splitName(op.fullName);
        const existing = await prisma.operator.findUnique({ where: { email: op.email } });
        if (existing) {
          console.log(`  [skip-dup] ${op.email} already exists for another operator in this org`);
          continue;
        }
      }
      seenEmails.add(op.email);

      const { nome, cognome } = splitName(op.fullName);
      const existing = await prisma.operator.findUnique({ where: { email: op.email } });
      if (existing) {
        skipped.push(`${op.email} (already exists)`);
        continue;
      }

      await prisma.operator.create({
        data: {
          nome,
          cognome,
          email: op.email.toLowerCase().trim(),
          passwordHash,
          organizationId: org.id,
          attivo: true,
        },
      });
      opCount++;
    }

    console.log(`✓ ${orgData.nome} — password: ${password}`);
  }

  console.log(`\nDone: ${orgCount} organizations, ${opCount} operators created`);
  if (skipped.length) {
    console.log(`Skipped (already existed): ${skipped.join(', ')}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
