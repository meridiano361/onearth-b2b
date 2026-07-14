CREATE TABLE IF NOT EXISTS vocabolario_campo (
  campo  TEXT NOT NULL,
  valore TEXT NOT NULL,
  PRIMARY KEY (campo, valore)
);
