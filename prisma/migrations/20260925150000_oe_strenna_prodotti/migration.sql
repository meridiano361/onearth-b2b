CREATE TABLE "oe_strenna_prodotti" (
  "strenna_barcode" TEXT NOT NULL,
  "prodotto_nome"   TEXT NOT NULL,
  "ordine"          INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "oe_strenna_prodotti_pkey" PRIMARY KEY ("strenna_barcode","prodotto_nome")
);
