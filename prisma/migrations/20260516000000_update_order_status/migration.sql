-- Migration: update OrderStatus enum and add mercePronta to order_items
-- Maps all existing orders to MERCE_DA_ORDINARE before recreating the enum.

-- Step 1: Add new enum values to the existing type
-- (ALTER TYPE ADD VALUE cannot run inside a transaction)
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'MERCE_DA_ORDINARE';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'MERCE_ORDINATA';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'MERCE_PARZIALMENTE_PRONTA';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'MERCE_PRONTA_DA_AVVISARE';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'MERCE_PRONTA_AVVISATO';

-- Step 2: Map all existing rows to MERCE_DA_ORDINARE before dropping old values
UPDATE "orders"
SET "status" = 'MERCE_DA_ORDINARE'
WHERE "status" IN ('DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED');

-- Step 3: Recreate the enum with only the new values
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE text;

DROP TYPE "OrderStatus";
CREATE TYPE "OrderStatus" AS ENUM (
  'MERCE_DA_ORDINARE',
  'MERCE_ORDINATA',
  'MERCE_PARZIALMENTE_PRONTA',
  'MERCE_PRONTA_DA_AVVISARE',
  'MERCE_PRONTA_AVVISATO'
);

ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus",
  ALTER COLUMN "status" SET DEFAULT 'MERCE_DA_ORDINARE'::"OrderStatus";

-- Step 4: Add mercePronta column to order_items
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "mercePronta" INTEGER NOT NULL DEFAULT 0;
