-- Drop the old unique index (orderId, productId) that blocks adding multiple taglie
-- for the same product. The correct index (orderId, productId, taglia) already exists.
DROP INDEX IF EXISTS "order_items_orderId_productId_key";
