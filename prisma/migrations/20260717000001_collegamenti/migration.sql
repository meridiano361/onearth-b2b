CREATE TABLE "collegamenti" (
  "id"          TEXT NOT NULL,
  "nome"        TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "descrizione" TEXT,
  "cartella"    TEXT,
  "collezione"  TEXT,
  "visibile"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "collegamenti_pkey" PRIMARY KEY ("id")
);
