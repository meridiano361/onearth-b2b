-- Aggiunge il valore espositore_onearth all'enum tipo_supporto
ALTER TYPE tipo_supporto ADD VALUE IF NOT EXISTS 'espositore_onearth';

-- Aggiunge campi commerciali a supporto_espositivo
ALTER TABLE supporto_espositivo ADD COLUMN IF NOT EXISTS retail_price  DECIMAL(10,2);
ALTER TABLE supporto_espositivo ADD COLUMN IF NOT EXISTS cost_price    DECIMAL(10,2);
ALTER TABLE supporto_espositivo ADD COLUMN IF NOT EXISTS misura        TEXT;
ALTER TABLE supporto_espositivo ADD COLUMN IF NOT EXISTS note          TEXT;
ALTER TABLE supporto_espositivo ADD COLUMN IF NOT EXISTS link_acquisto TEXT;

-- Rimuove la tabella accessori_vendita (rimpiazzata da supporto_espositivo)
DROP TABLE IF EXISTS accessori_vendita;
