CREATE TABLE "accessori_vendita" (
  "id"           TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "retailPrice"  DECIMAL(10,2) NOT NULL,
  "costPrice"    DECIMAL(10,2) NOT NULL,
  "misura"       TEXT,
  "imageUrl"     TEXT,
  "note"         TEXT,
  "colore"       TEXT,
  "linkAcquisto" TEXT,
  "tipoTarget"   TEXT[] NOT NULL DEFAULT '{}',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accessori_vendita_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accessori_vendita_code_key" ON "accessori_vendita"("code");
