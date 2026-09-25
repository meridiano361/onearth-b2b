CREATE TABLE IF NOT EXISTS "notifiche_config" (
  "id"              TEXT PRIMARY KEY,
  "nome"            TEXT NOT NULL,
  "descrizione"     TEXT,
  "attiva"          BOOLEAN NOT NULL DEFAULT true,
  "canale"          TEXT NOT NULL,
  "destinatari"     TEXT NOT NULL,
  "evento"          TEXT NOT NULL,
  "giorni_anticipo" INTEGER,
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regole pre-popolate
INSERT INTO "notifiche_config" ("id", "nome", "descrizione", "attiva", "canale", "destinatari", "evento", "giorni_anticipo")
VALUES
  ('scadenza-preno-7g',   'Promemoria scadenza prenotazione (7 gg)',  'Inviata 7 giorni prima della chiusura del periodo di prenotazione.',    true,  'entrambi', 'tutti',     'prenotazione_scadenza', 7),
  ('scadenza-preno-3g',   'Promemoria scadenza prenotazione (3 gg)',  'Inviata 3 giorni prima della chiusura del periodo di prenotazione.',    true,  'entrambi', 'tutti',     'prenotazione_scadenza', 3),
  ('catalogo-apertura',   'Apertura nuovo catalogo',                  'Inviata agli utenti quando un nuovo catalogo diventa accessibile.',     true,  'entrambi', 'tutti',     'catalogo_apertura',     NULL),
  ('ordine-creato-admin', 'Nuovo ordine ricevuto',                    'Notifica all''admin quando un cliente o operatore crea un ordine.',     true,  'push',     'admin',     'ordine_creato',         NULL),
  ('ordine-esportato',    'Ordine esportato in Demetra',              'Notifica all''admin quando un ordine viene esportato in Demetra.',      false, 'push',     'admin',     'ordine_esportato',      NULL),
  ('cliente-inattivo-30', 'Cliente inattivo da 30 giorni',            'Promemoria per i clienti che non accedono all''app da 30 giorni.',      false, 'email',    'clienti',   'cliente_inattivo',      30)
ON CONFLICT ("id") DO NOTHING;
