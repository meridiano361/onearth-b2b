// AGGIORNATO: 2026-06-11f

import {
  LogIn, BookOpen, Heart, ShoppingBag, MapPin, Package,
  Eye, Download, Smartphone, HelpCircle, Layers, Film, Globe, Wallet, GitMerge, Bell, Settings,
} from 'lucide-react';

export const metadata = { title: 'Guida all\'app — ON EARTH' };

const SECTIONS = [
  { id: 'installare-app',     label: 'Installare l\'app sul dispositivo', icon: Smartphone },
  { id: 'come-accedere',      label: 'Come accedere',                     icon: LogIn },
  { id: 'catalogo',           label: 'Il Catalogo',                       icon: BookOpen },
  { id: 'preferiti',          label: 'Preferiti',                         icon: Heart },
  { id: 'creare-ordine',      label: 'Creare un Ordine',                  icon: ShoppingBag },
  { id: 'budget-ordine',      label: 'Budget Ordine',                     icon: Wallet },
  { id: 'destinazioni',       label: 'Le Destinazioni',                   icon: MapPin },
  { id: 'miei-ordini',        label: 'I miei Ordini',                     icon: Package },
  { id: 'unire-ordini',       label: 'Unire due Ordini',                  icon: GitMerge },
  { id: 'notifiche',          label: 'Notifiche',                         icon: Bell },
  { id: 'anteprima',          label: 'Anteprima e Raggruppamento',        icon: Eye },
  { id: 'demetra',            label: 'Esportare in Demetra',              icon: Download },
  { id: 'esposizioni',        label: 'Esposizioni',                       icon: Layers },
  { id: 'risorse',            label: 'Risorse e Media',                   icon: Film },
  { id: 'mie-destinazioni',   label: 'Le mie Destinazioni',               icon: MapPin },
  { id: 'multilingua',        label: 'Multilingua',                       icon: Globe },
  { id: 'impostazioni',        label: 'Impostazioni',                      icon: Settings },
  { id: 'assistenza-tecnica', label: 'Assistenza tecnica',                icon: HelpCircle },
];

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-gray-600">
      <span className="text-accent mt-1 flex-shrink-0">·</span>
      <span>{children}</span>
    </li>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-gray-600">
      <span className="text-accent font-medium flex-shrink-0 w-4">{n}.</span>
      <span>{children}</span>
    </li>
  );
}

function SectionHeader({ n, icon: Icon, label }: { n: number; icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-accent flex-shrink-0" />
      <h2 className="text-sm font-semibold text-primary tracking-wide">{n}. {label}</h2>
    </div>
  );
}

export default function AssistenzaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* Header */}
      <div className="mb-8">
        <p className="label-luxury text-accent mb-1">Guida</p>
        <h1 className="font-display text-2xl sm:text-3xl text-primary font-light tracking-wide">
          Come usare l&apos;app
        </h1>
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
                  <span className="text-xs text-gray-300 w-5 text-right flex-shrink-0">{i + 1}.</span>
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

        {/* 1. Installare l'app */}
        <section id="installare-app" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={1} icon={Smartphone} label="Installare l'app sul dispositivo" />
          <div className="space-y-5">
            {[
              {
                label: 'iPhone / iPad (Safari)',
                steps: [
                  'Apri app.b2b.on-earth.it in Safari',
                  'Tocca l\'icona di condivisione (quadrato con freccia) in basso',
                  'Scorri e tocca "Aggiungi a schermata Home"',
                  'Tocca "Aggiungi"',
                ],
              },
              {
                label: 'Android (Chrome)',
                steps: [
                  'Apri app.b2b.on-earth.it in Chrome',
                  'Tocca i tre puntini in alto a destra',
                  'Tocca "Aggiungi a schermata Home" o "Installa app"',
                  'Tocca "Aggiungi"',
                ],
              },
              {
                label: 'Mac / PC (Chrome o Edge)',
                steps: [
                  'Apri app.b2b.on-earth.it',
                  'Clicca sull\'icona di installazione nella barra degli indirizzi',
                  'Clicca "Installa"',
                ],
              },
            ].map((platform) => (
              <div key={platform.label}>
                <p className="text-xs font-semibold text-primary mb-2">{platform.label}</p>
                <ol className="space-y-1 ml-1">
                  {platform.steps.map((step, i) => (
                    <Step key={i} n={i + 1}>{step}</Step>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Come accedere */}
        <section id="come-accedere" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={2} icon={LogIn} label="Come accedere" />
          <ul className="space-y-2">
            <Bullet>Vai su <span className="font-mono text-primary">app.b2b.on-earth.it</span></Bullet>
            <Bullet>Inserisci la tua email e la password ricevuta.</Bullet>
            <Bullet>La password predefinita è <span className="font-mono text-primary">onearth_</span> seguito dalle prime 5 lettere della tua organizzazione (minuscole, senza spazi).</Bullet>
            <Bullet>Esempio: organizzazione <span className="font-medium text-primary">Le Rondini</span> → password: <span className="font-mono text-primary">onearth_leron</span></Bullet>
            <Bullet>Se non hai ancora le credenziali clicca <span className="font-medium">Richiedi credenziali per accesso</span> nella pagina di login.</Bullet>
          </ul>
        </section>

        {/* 3. Il Catalogo */}
        <section id="catalogo" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={3} icon={BookOpen} label="Il Catalogo" />
          <ul className="space-y-2">
            <Bullet>Accedi al catalogo dalla voce <span className="font-medium">Catalogo</span> nel menu in alto.</Bullet>
            <Bullet>Sfoglia i prodotti della collezione CASA 2027.</Bullet>
            <Bullet>Usa i filtri a sinistra per filtrare per: Gruppo merceologico, Famiglia, Classe, Sottoclasse, Gruppo omogeneo, Linea, Colore, Tema colore, Collezione, Stagione, Produttore, Tranche.</Bullet>
            <Bullet><span className="font-medium">I filtri sono intelligenti:</span> selezionando un valore, tutti gli altri filtri aggiornano automaticamente le proprie opzioni mostrando solo i valori compatibili con la selezione corrente. Accanto a ogni opzione è indicato il numero di prodotti disponibili.</Bullet>
            <Bullet>Usa i chip <span className="font-medium">Tutti / Novità / Continuativi</span> sopra la griglia per filtrare rapidamente tra le novità della stagione (CA27) e i prodotti continuativi.</Bullet>
            <Bullet>Ordina i prodotti con <span className="font-medium">Ordina per…</span>: A→Z, Z→A, Prezzo crescente, Prezzo decrescente, Novità (CA27), Continuativi.</Bullet>
            <Bullet>Cerca per codice, nome o linea nella barra di ricerca.</Bullet>
            <Bullet>Scegli la modalità di visualizzazione: griglia, lista orizzontale o lookbook.</Bullet>
            <Bullet>Clicca ❤️ su un prodotto per aggiungerlo ai Preferiti.</Bullet>
            <Bullet>Usa <span className="font-medium">+</span> e <span className="font-medium">−</span> per aggiungere quantità all&apos;ordine corrente nella barra a destra.</Bullet>
            <Bullet>I prodotti CA27 hanno il badge <span className="font-medium">NUOVO</span>.</Bullet>
          </ul>
        </section>

        {/* 4. Preferiti */}
        <section id="preferiti" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={4} icon={Heart} label="Preferiti" />
          <ul className="space-y-2">
            <Bullet>Clicca il cuore ❤️ su qualsiasi prodotto per salvarlo nei preferiti.</Bullet>
            <Bullet>Accedi ai tuoi preferiti dalla voce <span className="font-medium">Preferiti</span> nel menu in alto.</Bullet>
            <Bullet>Puoi aggiungere prodotti preferiti all&apos;ordine direttamente dalla pagina Preferiti.</Bullet>
          </ul>
        </section>

        {/* 5. Creare un Ordine */}
        <section id="creare-ordine" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={5} icon={ShoppingBag} label="Creare un Ordine" />
          <ul className="space-y-2">
            <Bullet>Aggiungi prodotti dal catalogo usando i pulsanti <span className="font-medium">+</span> e <span className="font-medium">−</span>.</Bullet>
            <Bullet>Nella barra a destra vedi l&apos;ordine corrente con: costo totale, vendite potenziali, margine medio.</Bullet>
            <Bullet>Imposta un <span className="font-medium">Budget ordine €</span> nel campo apposito sotto il pulsante Crea Ordine (opzionale). Il budget viene salvato sull&apos;ordine e puoi modificarlo in seguito direttamente dall&apos;ordine.</Bullet>
            <Bullet>Clicca <span className="font-medium">Crea Ordine</span> per salvare.</Bullet>
            <Bullet>Se hai più destinazioni ti verrà chiesto di selezionarne una.</Bullet>
            <Bullet>Dopo la creazione vieni portato automaticamente alla pagina Ordini.</Bullet>
          </ul>
        </section>

        {/* 6. Budget Ordine */}
        <section id="budget-ordine" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={6} icon={Wallet} label="Budget Ordine" />
          <ul className="space-y-2">
            <Bullet>Il budget appartiene al singolo ordine, non alla destinazione.</Bullet>
            <Bullet>Prima di creare un ordine trovi il campo <span className="font-medium">Budget ordine €</span> nella barra del carrello, sotto il pulsante Crea Ordine: compilalo se vuoi definire una spesa massima per quell&apos;ordine (opzionale).</Bullet>
            <Bullet>Una volta creato l&apos;ordine, puoi modificare il budget in qualsiasi momento direttamente dalla pagina dell&apos;ordine usando l&apos;icona matita accanto al budget.</Bullet>
            <Bullet>Cambiare la destinazione dell&apos;ordine non modifica il budget impostato.</Bullet>
            <Bullet>Non devi entrare nella sezione Destinazioni per gestire il budget di un ordine.</Bullet>
          </ul>
        </section>

        {/* 7. Le Destinazioni */}
        <section id="destinazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={7} icon={MapPin} label="Le Destinazioni" />
          <ul className="space-y-2">
            <Bullet>Le destinazioni sono i tuoi punti vendita (bottega, emporio, online, ecc.).</Bullet>
            <Bullet>Gestiscile dalla voce <span className="font-medium">Destinazioni</span> nel menu.</Bullet>
            <Bullet>Ogni ordine è associato a una destinazione.</Bullet>
            <Bullet>Puoi impostare un budget di riferimento per ogni destinazione: serve a tracciare quanto hai ordinato complessivamente per quel punto vendita. È diverso dal budget del singolo ordine (vedi <a href="#budget-ordine" className="text-accent hover:underline">Budget Ordine</a>).</Bullet>
            <Bullet>Tipi disponibili: Bottega, Emporio, Distretto, Store, Outlet, Tendone, Fiera, Online, Altro.</Bullet>
          </ul>
        </section>

        {/* 8. I miei Ordini */}
        <section id="miei-ordini" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={8} icon={Package} label="I miei Ordini" />
          <ul className="space-y-2">
            <Bullet>Visualizza tutti i tuoi ordini dalla voce <span className="font-medium">Ordini</span> nel menu.</Bullet>
            <Bullet>Usa la barra di ricerca per cercare per numero ordine o destinazione, e i chip <span className="font-medium">Tutti / In lavorazione / Esportati</span> per filtrare per stato.</Bullet>
            <Bullet>Gli stati possibili sono: <span className="font-medium">Da esportare</span> | <span className="font-medium">Esportato</span>.</Bullet>
            <Bullet>Se hai prodotti nel carrello, vedi in cima la <span className="font-medium">Bozza corrente</span> con le opzioni <span className="font-medium">Modifica bozza</span>, <span className="font-medium">Elimina bozza</span> (con conferma) e <span className="font-medium">Crea Ordine</span>.</Bullet>
            <Bullet>Per ogni ordine puoi:
              <ul className="mt-1.5 ml-2 space-y-1">
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Modificare quantità e prodotti</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Vedere l&apos;anteprima visiva raggruppata</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Esportare in PDF con raggruppamento personalizzato</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Esportare in Demetra (CSV per il gestionale)</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Duplicare un ordine esportato come base per uno nuovo</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Unire due ordini non esportati in uno solo (vedi sezione seguente)</span></li>
                <li className="flex gap-2 text-sm text-gray-600"><span className="text-accent flex-shrink-0">–</span><span>Eliminare un ordine (anche se già esportato)</span></li>
              </ul>
            </Bullet>
            <Bullet>Usa il pulsante <span className="font-medium">Budget</span> su ogni ordine per impostare o modificare il budget di spesa massimo.</Bullet>
          </ul>
        </section>

        {/* 9. Unire due Ordini */}
        <section id="unire-ordini" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={9} icon={GitMerge} label="Unire due Ordini" />
          <ul className="space-y-2">
            <Bullet>Puoi unire due ordini non ancora esportati in un unico ordine.</Bullet>
            <Bullet>Nella pagina <span className="font-medium">Ordini</span>, spunta la <span className="font-medium">checkbox</span> accanto al numero di due ordini diversi.</Bullet>
            <Bullet>Appare una barra in basso: clicca <span className="font-medium">Unisci</span>.</Bullet>
            <Bullet>Nel modal scegli quale ordine <span className="font-medium">conservare</span>: il contenuto dell&apos;altro viene aggiunto a quello scelto (stessi prodotti: quantità sommate; prodotti nuovi: aggiunti). L&apos;ordine non conservato viene eliminato.</Bullet>
            <Bullet>Non è possibile unire ordini già esportati.</Bullet>
          </ul>
        </section>

        {/* 10. Notifiche */}
        <section id="notifiche" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={10} icon={Bell} label="Notifiche" />
          <ul className="space-y-2">
            <Bullet>Quando ON EARTH pubblica un aggiornamento o una promozione, ricevi una notifica <span className="font-medium">push</span> se hai installato l&apos;app sul telefono, altrimenti via <span className="font-medium">email</span>.</Bullet>
            <Bullet>Al primo accesso appare un banner: clicca <span className="font-medium">Abilita</span> per attivare le notifiche push; il browser chiede conferma. Una volta abilitate, arrivano anche quando l&apos;app è chiusa.</Bullet>
            <Bullet>Per gestire le preferenze clicca sull&apos;icona <span className="font-medium">campanella 🔔</span> in alto a destra, poi <span className="font-medium">Impostazioni notifiche</span> in fondo al pannello.</Bullet>
            <Bullet>Puoi abilitare o disabilitare le <span className="font-medium">notifiche push</span> e le <span className="font-medium">notifiche email</span> separatamente in qualsiasi momento.</Bullet>
            <Bullet>Se disabiliti entrambe non riceverai più nessuna comunicazione da ON EARTH B2B.</Bullet>
          </ul>
        </section>

        {/* 11. Anteprima e Raggruppamento */}
        <section id="anteprima" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={11} icon={Eye} label="Anteprima e Raggruppamento" />
          <ul className="space-y-2">
            <Bullet>Clicca <span className="font-medium">Anteprima</span> su un ordine per vedere i prodotti raggruppati visivamente.</Bullet>
            <Bullet>Scegli il criterio di raggruppamento: Gruppo merceologico, Famiglia, Classe, Sottoclasse, Gruppo omogeneo, Linea, Tema colore, Stagione, Collezione, Produttore, Tranche.</Bullet>
            <Bullet>Usa la <span className="font-medium">barra di ricerca</span> in alto per filtrare i prodotti dell&apos;ordine per nome o codice.</Bullet>
            <Bullet>Modifica quantità direttamente dall&apos;anteprima con i pulsanti <span className="font-medium">+</span> e <span className="font-medium">−</span>.</Bullet>
            <Bullet>Clicca <span className="font-medium">+ Aggiungi prodotti</span> per aggiungere nuovi prodotti all&apos;ordine: cerca per nome/codice oppure sfoglia il catalogo con i filtri. Nel pannello filtri trovi in cima il selettore <span className="font-medium">Tutti / Non ancora nell&apos;ordine / Già nell&apos;ordine</span> per vedere subito i prodotti mancanti o già presenti.</Bullet>
            <Bullet>In fondo alla pagina vedi il riepilogo con subtotali per gruppo e totale generale.</Bullet>
            <Bullet>Esporta il <span className="font-medium">PDF</span> con le foto dei prodotti raggruppati.</Bullet>
            <Bullet>Esporta in <span className="font-medium">Excel multi-foglio</span>: un foglio per ogni criterio di classificazione (linea, collezione, colore, ecc.).</Bullet>
          </ul>
        </section>

        {/* 12. Esportare in Demetra */}
        <section id="demetra" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={12} icon={Download} label="Esportare in Demetra" />
          <ul className="space-y-2">
            <Bullet>Il pulsante <span className="font-medium">Esporta in Demetra</span> apre un menu con le opzioni: <span className="font-medium">CSV completo</span>, <span className="font-medium">CSV tranche</span> (una per ogni tranche presente nell&apos;ordine) e <span className="font-medium">Excel (.xlsx)</span>. Il menu è disponibile sia nella lista ordini sia nella pagina di modifica/anteprima.</Bullet>
            <Bullet>Dopo l&apos;export l&apos;ordine diventa <span className="font-medium">Esportato</span> e non è più modificabile.</Bullet>
            <Bullet>Puoi duplicarlo per creare un nuovo ordine basato su quello esportato.</Bullet>
            <Bullet>Su Demetra vai in <span className="font-medium">Proposte di prenotazione</span> › <span className="font-medium">Proposte attive</span> › <span className="font-medium">Nuova prenotazione</span>, compila i campi e poi clicca su <span className="font-medium">Crea prenotazione</span> (in Cliente seleziona <span className="font-medium">Prenotazioni dirette</span>).</Bullet>
            <Bullet>Nella finestra successiva inserisci la destinazione e compila gli altri campi necessari, poi clicca sul pulsante blu <span className="font-medium">Carica da file</span>.</Bullet>
            <Bullet>Si apre una nuova finestra. Clicca sul pulsante grigio <span className="font-medium">Scegli file</span> e poi di nuovo sul pulsante verde <span className="font-medium">Carica da file</span> per confermare il caricamento. In fondo alla pagina premi <span className="font-medium">Inserisci</span> per aggiungere gli articoli alla prenotazione, oppure <span className="font-medium">Annulla</span> per annullare l&apos;inserimento.</Bullet>
            <Bullet>Prosegui e clicca <span className="font-medium">Conferma e invia</span> per confermare in via definitiva la prenotazione.</Bullet>
          </ul>
        </section>

        {/* 13. Esposizioni */}
        <section id="esposizioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={13} icon={Layers} label="Esposizioni" />
          <ul className="space-y-2">
            <Bullet>Dall&apos;anteprima di un ordine tocca il tab <span className="font-medium">Esposizione</span> per organizzare i prodotti in gruppi espositivi (es. Vetrina, Isola, Parete).</Bullet>
            <Bullet>Crea un nuovo gruppo con il pulsante <span className="font-medium">+ Gruppo</span>: assegna nome, colore e template.</Bullet>
            <Bullet>Assegna i prodotti non assegnati a un gruppo usando il menu a tendina su ciascun prodotto.</Bullet>
            <Bullet>Usa l&apos;icona 🔥 per marcare i prodotti <span className="font-medium">focus</span> del gruppo: prodotti di punta che meritano massima visibilità.</Bullet>
            <Bullet>Esporta il PDF Esposizioni con il pulsante <span className="font-medium">Scarica PDF</span>: include griglia prodotti, colori e note.</Bullet>
            <Bullet>Dal tab <span className="font-medium">Calendario</span> pianifica quando ogni gruppo sarà esposto, settimana per settimana, suddiviso per spazi espositivi.</Bullet>
          </ul>
        </section>

        {/* 14. Risorse e Media */}
        <section id="risorse" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={14} icon={Film} label="Risorse e Media" />
          <ul className="space-y-2">
            <Bullet>Accedi alle Risorse dal menu in basso (icona cartella) o dalla homepage.</Bullet>
            <Bullet>Trovi documenti PDF, video e audio condivisi da ON EARTH.</Bullet>
            <Bullet><span className="font-medium">PDF:</span> scaricabili direttamente.</Bullet>
            <Bullet><span className="font-medium">Video:</span> il pulsante <span className="font-medium">Guarda</span> apre il video in una nuova scheda del browser.</Bullet>
            <Bullet><span className="font-medium">Audio:</span> ascoltabili con player integrato.</Bullet>
          </ul>
        </section>

        {/* 15. Le mie Destinazioni */}
        <section id="mie-destinazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={15} icon={MapPin} label="Le mie Destinazioni" />
          <ul className="space-y-2">
            <Bullet>Gestisci i tuoi punti vendita dalla voce <span className="font-medium">Destinazioni</span>.</Bullet>
            <Bullet>Aggiungi nuove destinazioni con: tipo, città, indirizzo.</Bullet>
            <Bullet>Puoi impostare un budget di riferimento per ogni destinazione: è indicativo e mostra quanti acquisti hai fatto complessivamente per quel punto vendita.</Bullet>
            <Bullet>Per impostare il budget di un singolo ordine usa il campo <span className="font-medium">Budget ordine €</span> nel carrello, oppure modificalo direttamente dalla pagina dell&apos;ordine già creato.</Bullet>
          </ul>
        </section>

        {/* 16. Multilingua */}
        <section id="multilingua" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={16} icon={Globe} label="Multilingua" />
          <ul className="space-y-2">
            <Bullet>L&apos;app è disponibile in: <span className="font-medium">Italiano, Inglese, Tedesco, Francese, Spagnolo</span>.</Bullet>
            <Bullet>Cambia lingua dal selettore in alto a destra (IT / EN / DE / FR / ES).</Bullet>
            <Bullet>Su mobile usa il menu a tendina per selezionare la lingua.</Bullet>
          </ul>
        </section>

        {/* 17. Impostazioni */}
        <section id="impostazioni" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={17} icon={Settings} label="Impostazioni" />
          <ul className="space-y-2">
            <Bullet>Accedi alle Impostazioni dall&apos;icona <span className="font-medium">⚙</span> in alto a destra o dalla barra in basso (<span className="font-medium">Impostaz.</span>).</Bullet>
            <Bullet><span className="font-medium">Il tuo account:</span> visualizza organizzazione, email di accesso e password.</Bullet>
            <Bullet><span className="font-medium">Notifiche sul telefono:</span> attiva o disattiva le notifiche push. Se attive, ricevi un avviso sul telefono anche con l&apos;app chiusa.</Bullet>
            <Bullet><span className="font-medium">Notifiche via email:</span> attiva o disattiva le comunicazioni email relative a novità e promozioni.</Bullet>
            <Bullet>Se il browser ha già bloccato le notifiche, vai in Impostazioni Chrome → Impostazioni sito → Notifiche e abilita <em>app.b2b.on-earth.it</em>.</Bullet>
          </ul>
        </section>

        {/* 18. Assistenza tecnica */}
        <section id="assistenza-tecnica" className="bg-white border border-border rounded-lg p-5 sm:p-6 scroll-mt-6">
          <SectionHeader n={18} icon={HelpCircle} label="Assistenza tecnica" />
          <p className="text-sm text-gray-600">
            Per problemi tecnici{' '}
            <a
              href="mailto:e.mazzolari@meridiano361.it"
              className="text-accent hover:underline font-medium"
            >
              scrivici
            </a>
            . Ti risponderemo al più presto.
          </p>
        </section>

      </div>
    </div>
  );
}
