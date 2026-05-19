// IMPORTANTE: aggiornare questa pagina ogni volta che vengono aggiunte, modificate o rimosse funzionalità nell'app cliente.

import { Metadata } from 'next';
import {
  LogIn, BookOpen, ShoppingBag, Package, Eye, Download,
  Globe, HelpCircle, MessageCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Assistenza',
};

interface Section {
  icon: React.ReactNode;
  title: string;
  items: (string | { label: string; sub: string[] })[];
}

const SECTIONS: Section[] = [
  {
    icon: <LogIn size={16} />,
    title: 'Come accedere',
    items: [
      'Vai su app.b2b.on-earth.it',
      'Inserisci la tua email e la password ricevuta',
      {
        label: 'La password segue il formato: onearth_ + prime 5 lettere della tua organizzazione (solo lettere, senza spazi)',
        sub: ['Esempio: organizzazione "Le Rondini" → password: onearth_leron'],
      },
    ],
  },
  {
    icon: <BookOpen size={16} />,
    title: 'Il Catalogo',
    items: [
      'Sfoglia i prodotti della collezione CASA 2027',
      'Usa i filtri a sinistra per filtrare per Gruppo merceologico, Famiglia, Classe, Sottoclasse, Gruppo omogeneo, Linea, Colore, Collezione, Produttore, Tranche',
      'Clicca su un prodotto per vedere la scheda completa',
      'Usa i pulsanti + e − per aggiungere o rimuovere quantità',
      'I prodotti aggiunti appaiono nella barra a destra (Ordine Corrente)',
    ],
  },
  {
    icon: <ShoppingBag size={16} />,
    title: 'Creare un Ordine',
    items: [
      'Aggiungi i prodotti che vuoi ordinare dal catalogo',
      'Clicca "Crea Ordine" nella barra a destra per salvare l\'ordine',
      'L\'ordine viene salvato come "Da esportare"',
    ],
  },
  {
    icon: <Package size={16} />,
    title: 'I miei Ordini',
    items: [
      'Clicca "I miei Ordini" in alto per vedere tutti i tuoi ordini',
      {
        label: 'Per ogni ordine puoi:',
        sub: [
          'Cliccare per vedere il dettaglio',
          'Modificare quantità o rimuovere prodotti',
          'Aggiungere prodotti cliccando "+ Aggiungi prodotti"',
          'Esportare in PDF raggruppando per Linea, Colore, Collezione, Classe, ecc.',
          'Esportare in Demetra (CSV) per inviare l\'ordine al magazzino',
          'Duplicare un ordine già esportato come base per un nuovo ordine',
          'Eliminare un ordine non ancora esportato',
        ],
      },
    ],
  },
  {
    icon: <Eye size={16} />,
    title: 'Anteprima Ordine',
    items: [
      'Clicca su un ordine per vedere l\'anteprima visiva con le foto dei prodotti',
      'Scegli il criterio di raggruppamento (Linea, Collezione, Colore, ecc.)',
      'Da qui puoi esportare il PDF o in Demetra',
    ],
  },
  {
    icon: <Download size={16} />,
    title: 'Esportare in Demetra',
    items: [
      'Clicca "Esporta in Demetra" per scaricare il file CSV da importare in Demetra',
      'Dopo l\'export l\'ordine diventa "Esportato" e non è più modificabile',
      'Puoi duplicarlo per creare un nuovo ordine basato su quello esportato',
    ],
  },
  {
    icon: <Globe size={16} />,
    title: 'Scopri ON EARTH',
    items: [
      'In basso a sinistra trovi il link al sito www.on-earth.it',
      'Trovi anche il podcast "Materia" di ON EARTH su Spotify',
    ],
  },
];

export default function AssistenzaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="label-luxury text-accent mb-1">Guida</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          Assistenza
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Tutto quello che ti serve per usare la piattaforma ordini B2B ON EARTH.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white border border-border rounded-lg p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-accent">{section.icon}</span>
              <h2 className="text-sm font-semibold text-primary tracking-wide">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) =>
                typeof item === 'string' ? (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-accent mt-1 flex-shrink-0">·</span>
                    <span>{item}</span>
                  </li>
                ) : (
                  <li key={i} className="text-sm text-gray-600">
                    <div className="flex gap-2">
                      <span className="text-accent mt-1 flex-shrink-0">·</span>
                      <span>{item.label}</span>
                    </div>
                    <ul className="mt-1.5 ml-4 space-y-1">
                      {item.sub.map((s, j) => (
                        <li key={j} className="flex gap-2 text-sm text-gray-500">
                          <span className="text-gray-300 mt-1 flex-shrink-0">–</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}

        {/* Assistenza */}
        <div className="bg-white border border-border rounded-lg p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-accent"><HelpCircle size={16} /></span>
            <h2 className="text-sm font-semibold text-primary tracking-wide">Assistenza</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600">
              <span className="text-accent mt-1 flex-shrink-0">·</span>
              <span>
                Per problemi tecnici scrivi a{' '}
                <a
                  href="mailto:e.mazzolari@meridiano361.it"
                  className="text-accent hover:underline font-medium"
                >
                  assistenzatecnicaapp2b2@onearth.it
                </a>
              </span>
            </li>
            <li className="flex gap-2 text-sm text-gray-600">
              <span className="text-accent mt-1 flex-shrink-0">·</span>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={13} className="text-green-500 flex-shrink-0" />
                Oppure scrivici su WhatsApp al numero di assistenza
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
