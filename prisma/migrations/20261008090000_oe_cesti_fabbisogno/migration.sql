CREATE TABLE "oe_cesti_fabbisogno" (
  "cesto_codice" TEXT NOT NULL,
  "emporio"      TEXT NOT NULL,
  "giacenza"     INTEGER NOT NULL DEFAULT 0,
  "ordinato"     INTEGER NOT NULL DEFAULT 0,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oe_cesti_fabbisogno_pkey" PRIMARY KEY ("cesto_codice","emporio")
);
