// AGGIORNARE QUESTA PAGINA ad ogni modifica delle funzionalità dell'app cliente.
// Sezioni da verificare: indice, descrizioni funzionalità, schermate di esempio.

import {
  LogIn, BookOpen, Heart, ShoppingBag, MapPin, Package,
  Eye, Download, Smartphone, HelpCircle,
} from 'lucide-react';

export const metadata = { title: 'Guida all\'app — ON EARTH' };

const SECTIONS = [
  { id: 'come-accedere',    label: 'Come accedere',          icon: LogIn },
  { id: 'catalogo',         label: 'Il catalogo',             icon: BookOpen },
  { id: 'preferiti',        label: 'Preferiti',               icon: Heart },
  { id: 'creare-ordine',    label: 'Creare un ordine',        icon: ShoppingBag },
  { id: 'destinazioni',     label: 'Destinazioni',            icon: MapPin },
  { id: 'miei-ordini',      label: 'I miei ordini',           icon: Package },
  { id: 'anteprima-pdf',    label: 'Anteprima e PDF',         icon: Eye },
  { id: 'demetra',          label: 'Esportazione Demetra',    icon: Download },
  { id: 'installare-app',   label: 'Installare l\'app',       icon: Smartphone },
  { id: 'assistenza-tecnica', label: 'Assistenza tecnica',    icon: HelpCircle },
];

export default function AssistenzaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Guida</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          Come usare l&apos;app
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Tutto ciò che ti serve per ordinare, gestire le destinazioni e consultare il catalogo ON EARTH.
        </p>
      </div>

      {/* TOC */}
      <nav className="bg-white border border-border rounded-lg p-5 mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Indice</p>
        <ol className="space-y-1.5">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-accent transition-colors group"
                >
                  <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{i + 1}.</span>
                  <Icon size={13} className="text-gray-300 group-hover:text-accent flex-shrink-0 transition-colors" />
                  <span>{s.label}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-8">

        {/* 1. Come accedere */}
        <section id="come-accedere" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <LogIn size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">1. Come accedere</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Apri l&apos;app all&apos;indirizzo <span className="font-mono text-primary">app.b2b.on-earth.it</span> e inserisci email e password fornite da ON EARTH.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>La password predefinita segue il formato <span className="font-mono text-primary">onearth_</span> seguito dai primi 5 caratteri del nome della tua organizzazione (minuscoli, senza spazi).</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Esempio: se la tua organizzazione si chiama <span className="font-medium text-primary">Le Rondini</span>, la password sarà <span className="font-mono text-primary">onearth_leron</span>.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Puoi salvare le credenziali nel browser o installare l&apos;app come shortcut (vedi sezione <a href="#installare-app" className="text-accent hover:underline">Installare l&apos;app</a>).</span></li>
          </ul>
        </section>

        {/* 2. Il catalogo */}
        <section id="catalogo" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">2. Il catalogo</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Dal menu in basso tocca <span className="font-medium">Catalogo</span> per sfogliare tutti i prodotti attivi.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Usa la barra di ricerca per trovare un prodotto per nome o codice.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Filtra i prodotti per: Gruppo merceologico, Famiglia, Classe, Sottoclasse, Gruppo omogeneo, Linea, Stagione, Collezione, Colore, Tema colore.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Tocca il cuore ♥ su un prodotto per aggiungerlo ai preferiti.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Ogni prodotto mostra il prezzo di costo e il numero di pezzi per lotto. I pulsanti +/− permettono di aggiungere al carrello per multipli del lotto.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Nel carrello (icona in alto a destra) sono visibili le proiezioni di vendita e il margine stimato.</span></li>
          </ul>
        </section>

        {/* 3. Preferiti */}
        <section id="preferiti" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">3. Preferiti</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Tocca il cuore ♥ su qualsiasi prodotto nel catalogo per salvarlo tra i preferiti.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Accedi ai preferiti dal menu in basso o dal filtro "Preferiti" nel catalogo.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>I preferiti sono salvati sul tuo profilo e rimangono disponibili tra una sessione e l&apos;altra.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Puoi aggiungere al carrello direttamente dalla lista preferiti senza tornare al catalogo.</span></li>
          </ul>
        </section>

        {/* 4. Creare un ordine */}
        <section id="creare-ordine" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">4. Creare un ordine</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Aggiungi prodotti al carrello dal catalogo usando il pulsante <span className="font-medium">+ Aggiungi</span>.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Apri il carrello e verifica i prodotti selezionati, le quantità e le proiezioni economiche.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Tocca <span className="font-medium">Crea ordine</span>: se hai più destinazioni attive, ti verrà chiesto di selezionarne una.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Se non hai ancora nessuna destinazione, l&apos;app ti guiderà a crearne una prima di procedere (vedi sezione <a href="#destinazioni" className="text-accent hover:underline">Destinazioni</a>).</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>L&apos;ordine viene salvato con stato <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">In attesa</span> e puoi modificarlo finché non viene processato.</span></li>
          </ul>
        </section>

        {/* 5. Destinazioni */}
        <section id="destinazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">5. Destinazioni</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Le destinazioni rappresentano i tuoi punti vendita (botteghe, mercati, fiere, ecc.).</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Gestisci le tue destinazioni dal menu in basso → <span className="font-medium">Destinazioni</span>.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Per ogni destinazione puoi impostare un <span className="font-medium">budget</span>: il carrello mostrerà una barra di avanzamento che indica quanto budget è stato utilizzato con l&apos;ordine corrente.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Ogni ordine deve essere associato a una destinazione: è obbligatoria per garantire la corretta gestione logistica.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Puoi avere più destinazioni attive contemporaneamente e creare ordini distinti per ciascuna.</span></li>
          </ul>
        </section>

        {/* 6. I miei ordini */}
        <section id="miei-ordini" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">6. I miei ordini</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Dal menu in basso tocca <span className="font-medium">Ordini</span> per vedere tutti i tuoi ordini.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Per ogni ordine sono visibili: numero di articoli, pezzi totali, costo, vendite potenziali, guadagno stimato e margine %.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Finché l&apos;ordine non è stato esportato puoi modificarlo: aggiungi o rimuovi prodotti, cambia le quantità.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Tocca <span className="font-medium">Anteprima</span> per visualizzare il dettaglio completo dell&apos;ordine.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span>
              <span>Gli stati possibili sono:
                <span className="inline-flex flex-wrap gap-1 mt-1">
                  <span className="font-mono text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">In attesa</span>
                  <span className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">In lavorazione</span>
                  <span className="font-mono text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">Merce pronta</span>
                  <span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Spedito</span>
                  <span className="font-mono text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Consegnato</span>
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Esportato</span>
                </span>
              </span>
            </li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Gli ordini con stato <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">Esportato</span> non sono modificabili ma possono essere duplicati per creare un nuovo ordine con gli stessi prodotti.</span></li>
          </ul>
        </section>

        {/* 7. Anteprima e PDF */}
        <section id="anteprima-pdf" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">7. Anteprima e PDF</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Dall&apos;elenco ordini tocca <span className="font-medium">Anteprima</span> per vedere il dettaglio completo con immagini e prezzi.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Scegli il criterio di raggruppamento (per famiglia, linea, colore, ecc.) per organizzare la visualizzazione.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Usa il pulsante <span className="font-medium">Scarica PDF</span> per esportare una copia dell&apos;ordine da condividere o archiviare.</span></li>
          </ul>
        </section>

        {/* 8. Esportazione Demetra */}
        <section id="demetra" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Download size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">8. Esportazione Demetra</h2>
          </div>
          <ul className="space-y-2">
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Il pulsante <span className="font-medium">Esporta Demetra</span> genera un file CSV compatibile con il gestionale Demetra.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Dopo l&apos;esportazione l&apos;ordine cambia stato in <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">Esportato</span> e non può più essere modificato.</span></li>
            <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent mt-1 flex-shrink-0">·</span><span>Se hai bisogno di modificare un ordine già esportato, usa il pulsante <span className="font-medium">Duplica</span> per creare un nuovo ordine con gli stessi prodotti e apportare le variazioni necessarie.</span></li>
          </ul>
        </section>

        {/* 9. Installare l'app */}
        <section id="installare-app" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">9. Installare l&apos;app</h2>
          </div>
          <div className="space-y-5">
            {[
              {
                label: 'iPhone / iPad (Safari)',
                steps: [
                  "Apri app.b2b.on-earth.it in Safari",
                  "Tocca l'icona di condivisione (quadrato con freccia in su) in basso",
                  'Scorri e tocca "Aggiungi a schermata Home"',
                  'Tocca "Aggiungi" in alto a destra',
                  "L'app apparirà come icona sulla tua schermata home",
                ],
              },
              {
                label: 'Android (Chrome)',
                steps: [
                  "Apri app.b2b.on-earth.it in Chrome",
                  "Tocca i tre puntini in alto a destra",
                  'Tocca "Aggiungi a schermata Home" o "Installa app"',
                  'Tocca "Aggiungi"',
                  "L'app apparirà come icona sulla tua schermata home",
                ],
              },
              {
                label: 'Mac / PC (Chrome o Edge)',
                steps: [
                  "Apri app.b2b.on-earth.it",
                  "Clicca sull'icona di installazione nella barra degli indirizzi",
                  'Clicca "Installa"',
                  "L'app si aprirà come applicazione desktop",
                ],
              },
            ].map((platform) => (
              <div key={platform.label}>
                <p className="text-xs font-semibold text-primary mb-2">{platform.label}</p>
                <ol className="space-y-1 ml-1">
                  {platform.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                      <span className="text-accent font-medium flex-shrink-0 w-4">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* 10. Assistenza tecnica */}
        <section id="assistenza-tecnica" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-accent flex-shrink-0" />
            <h2 className="text-sm font-semibold text-primary tracking-wide">10. Assistenza tecnica</h2>
          </div>
          <p className="text-sm text-gray-600">
            Per problemi tecnici o richieste di supporto, scrivi a{' '}
            <a
              href="mailto:e.mazzolari@meridiano361.it"
              className="text-accent hover:underline font-medium"
            >
              e.mazzolari@meridiano361.it
            </a>
            . Rispondiamo di solito entro un giorno lavorativo.
          </p>
        </section>

      </div>
    </div>
  );
}
