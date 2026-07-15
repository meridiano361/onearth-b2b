ALTER TABLE "pareti_attrezzate" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "pareti_attrezzate" ADD CONSTRAINT IF NOT EXISTS "pareti_attrezzate_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
