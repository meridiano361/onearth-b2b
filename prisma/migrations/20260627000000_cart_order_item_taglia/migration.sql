-- Aggiunge il campo taglia a cart_items e order_items per supportare
-- più taglie dello stesso prodotto nello stesso carrello/ordine.

-- cart_items
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS taglia TEXT NOT NULL DEFAULT '';
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_id_product_id_taglia_key
  UNIQUE (cart_id, product_id, taglia);

-- order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS taglia TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_product_id_key;
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_product_id_taglia_key
  UNIQUE (order_id, product_id, taglia);
