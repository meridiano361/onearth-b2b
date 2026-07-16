-- Rende organizationId nullable nei canali (per supportare destinazioni dei clienti)
ALTER TABLE "canali" ALTER COLUMN "organizationId" DROP NOT NULL;

-- Aggiunge customerId per destinazioni di proprietà del cliente
ALTER TABLE "canali" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "canali" ADD CONSTRAINT "canali_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
