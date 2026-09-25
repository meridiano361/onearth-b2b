CREATE TABLE "oe_cesti" (
  "codice"      TEXT NOT NULL,
  "descrizione" TEXT NOT NULL DEFAULT '',
  "misure"      TEXT NOT NULL DEFAULT '',
  "pvp"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "costo"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "foto_url"    TEXT NOT NULL DEFAULT '',
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oe_cesti_pkey" PRIMARY KEY ("codice")
);

INSERT INTO "oe_cesti" ("codice", "descrizione", "misure", "pvp", "costo") VALUES
  ('7430', 'Rett. medio basso',  'cm 33×23×8h',  15.00,  3.75),
  ('7431', 'Rett. grande basso', 'cm 38×28×9h',  20.00,  5.00),
  ('7433', 'Rett. medio alto',   'cm 30×19×13h', 15.00,  3.75),
  ('7434', 'Rett. grande alto',  'cm 32×22×16h', 18.00,  4.50),
  ('7436', 'Medio ovale',        '',             27.00,  6.75),
  ('7437', 'Grande ovale',       '',             35.00,  8.75),
  ('7439', 'Rett. maxi medio',   'cm 40×28×22h', 34.00,  8.50),
  ('7440', 'Rett. maxi grande',  '',             40.00, 10.00);
