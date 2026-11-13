import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS oe_preventivi (
      id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      numero_preventivo      TEXT NOT NULL UNIQUE,
      tipo_ordine            TEXT NOT NULL,
      sottotipo_natale       TEXT,
      emporio                TEXT NOT NULL,
      canale                 TEXT,
      operatore              TEXT,
      data_preventivo        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cliente_nome           TEXT NOT NULL DEFAULT '',
      cliente_cognome        TEXT,
      cliente_cellulare      TEXT,
      cliente_email          TEXT,
      wa_attivo              BOOLEAN NOT NULL DEFAULT FALSE,
      cliente_extra          JSONB,
      modalita_consegna      TEXT,
      consegna_data          TIMESTAMPTZ,
      consegna_ora           TEXT,
      totale                 FLOAT NOT NULL DEFAULT 0,
      totale_ie              FLOAT NOT NULL DEFAULT 0,
      acconto                FLOAT NOT NULL DEFAULT 0,
      note                   TEXT,
      articoli               JSONB NOT NULL DEFAULT '[]'::jsonb,
      titolo                 TEXT NOT NULL DEFAULT '',
      condizioni_commerciali JSONB,
      stato                  TEXT NOT NULL DEFAULT 'bozza',
      ordine_id              TEXT,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data_modifica          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ oe_preventivi');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS oe_preventivi_clienti (
      id       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome     TEXT NOT NULL,
      cognome  TEXT,
      cliente  TEXT NOT NULL UNIQUE,
      telefono TEXT,
      email    TEXT,
      wa       BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
  console.log('✓ oe_preventivi_clienti');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS oe_preventivi_operatori (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      nome              TEXT NOT NULL,
      emporio           TEXT NOT NULL,
      empori_aggiuntivi TEXT[] NOT NULL DEFAULT '{}',
      attivo            BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);
  console.log('✓ oe_preventivi_operatori');

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION update_oe_preventivi_data_modifica()
    RETURNS TRIGGER AS $$
    BEGIN NEW.data_modifica = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_oe_preventivi_updated ON oe_preventivi;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_oe_preventivi_updated
      BEFORE UPDATE ON oe_preventivi
      FOR EACH ROW EXECUTE FUNCTION update_oe_preventivi_data_modifica();
  `);
  console.log('✓ trigger data_modifica');
}

main().catch(console.error).finally(() => prisma.$disconnect());
