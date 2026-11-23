-- false finora significava "non ancora deciso": diventa NULL
ALTER TABLE "oe_alimentari_prodotti" ALTER COLUMN "bio" DROP NOT NULL, ALTER COLUMN "bio" DROP DEFAULT;
ALTER TABLE "oe_alimentari_prodotti" ALTER COLUMN "senza_glutine" DROP NOT NULL, ALTER COLUMN "senza_glutine" DROP DEFAULT;
ALTER TABLE "oe_alimentari_prodotti" ALTER COLUMN "vegan" DROP NOT NULL, ALTER COLUMN "vegan" DROP DEFAULT;
UPDATE "oe_alimentari_prodotti" SET "bio" = NULL WHERE "bio" = false;
UPDATE "oe_alimentari_prodotti" SET "senza_glutine" = NULL WHERE "senza_glutine" = false;
UPDATE "oe_alimentari_prodotti" SET "vegan" = NULL WHERE "vegan" = false;
