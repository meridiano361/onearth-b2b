CREATE TABLE "oe_strenne_foto" (
  "barcode"     TEXT NOT NULL,
  "foto_url"    TEXT NOT NULL DEFAULT '',
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oe_strenne_foto_pkey" PRIMARY KEY ("barcode")
);
