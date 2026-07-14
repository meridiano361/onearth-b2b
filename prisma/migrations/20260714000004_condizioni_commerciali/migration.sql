CREATE TABLE IF NOT EXISTS condizioni_commerciali (
  id                  TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conferente          TEXT        NOT NULL,
  collezione          TEXT        NOT NULL,
  sconto_con_reso     FLOAT,
  percentuale_reso    FLOAT,
  note_reso           TEXT,
  sconto_senza_reso   FLOAT,
  extra_sconto_volume JSONB,
  importo_minimo_ie   FLOAT,
  consegna            TEXT,
  pagamento_gg        INTEGER,
  condizioni_riordini TEXT,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conferente, collezione)
);

-- Seed Altraqualità PE27
INSERT INTO condizioni_commerciali
  (conferente, collezione, sconto_con_reso, percentuale_reso, note_reso, sconto_senza_reso,
   extra_sconto_volume, importo_minimo_ie, consegna, pagamento_gg, condizioni_riordini)
VALUES
  ('Altraqualità', 'PE27', 47, 5, 'Esclusi prodotti del produttore KTS', 50,
   '[{"soglia":3000,"extra":3},{"soglia":7000,"extra":5}]'::jsonb,
   1500, 'Febbraio 2027', 60,
   'Sconto 40% con pagamento 60gg oppure 40+5% a vista fattura (pagamento immediato)')
ON CONFLICT (conferente, collezione) DO NOTHING;
