-- Seed color_blocks con i 5 toni MODA.
-- ON CONFLICT DO NOTHING rende la migrazione idempotente.
INSERT INTO color_blocks (name, sort_order) VALUES
  ('Toni Caldi',    1),
  ('Toni Freddi',   2),
  ('Toni Neutri',   3),
  ('Toni Naturali', 4),
  ('Toni Vivaci',   5)
ON CONFLICT (name) DO NOTHING;
