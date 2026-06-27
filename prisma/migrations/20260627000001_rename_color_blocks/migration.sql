-- Rinomina i blocchi colore da nomi numerici a nomi descrittivi.
-- Per ogni coppia, prima elimina l'eventuale riga duplicata (inserita dalla
-- migration 20260626000000) che non ha riferimenti in product_color_blocks,
-- poi rinomina la riga numerica originale.

DELETE FROM color_blocks WHERE name = 'Toni Caldi'    AND id NOT IN (SELECT color_block_id FROM product_color_blocks);
UPDATE color_blocks SET name = 'Toni Caldi',     sort_order = 1  WHERE name = '1';

DELETE FROM color_blocks WHERE name = 'Toni Freddi'   AND id NOT IN (SELECT color_block_id FROM product_color_blocks);
UPDATE color_blocks SET name = 'Toni Freddi',    sort_order = 2  WHERE name = '2';

DELETE FROM color_blocks WHERE name = 'Toni Neutri'   AND id NOT IN (SELECT color_block_id FROM product_color_blocks);
UPDATE color_blocks SET name = 'Toni Neutri',    sort_order = 3  WHERE name = '3';

DELETE FROM color_blocks WHERE name = 'Toni Naturali' AND id NOT IN (SELECT color_block_id FROM product_color_blocks);
UPDATE color_blocks SET name = 'Toni Naturali',  sort_order = 4  WHERE name = '4';

DELETE FROM color_blocks WHERE name = 'Toni Vivaci'   AND id NOT IN (SELECT color_block_id FROM product_color_blocks);
UPDATE color_blocks SET name = 'Toni Vivaci',    sort_order = 5  WHERE name = '5';

UPDATE color_blocks SET name = 'Toni Pastello',  sort_order = 6  WHERE name = '6';
UPDATE color_blocks SET name = 'Toni Scuri',     sort_order = 7  WHERE name = '7';
UPDATE color_blocks SET name = 'Toni Metallici', sort_order = 8  WHERE name = '8';
UPDATE color_blocks SET name = 'Toni Terrosi',   sort_order = 9  WHERE name = '9';
UPDATE color_blocks SET name = 'Toni Brillanti', sort_order = 10 WHERE name = '10';
