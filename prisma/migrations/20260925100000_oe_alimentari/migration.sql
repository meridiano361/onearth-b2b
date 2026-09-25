-- CreateTable: OE Alimentari

CREATE TABLE "oe_alimentari_prodotti" (
  "id"              TEXT        NOT NULL,
  "barcode"         TEXT,
  "fornitore"       TEXT,
  "nome"            TEXT        NOT NULL,
  "formato"         TEXT,
  "iva_perc"        DOUBLE PRECISION NOT NULL DEFAULT 10,
  "costo_ii"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pvp_ii"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pvp_consigliato" DOUBLE PRECISION,
  "foto_url"        TEXT,
  "note"            TEXT,
  "ordine"          INTEGER     NOT NULL DEFAULT 0,
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "oe_alimentari_prodotti_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "oe_alimentari_fabbisogno_empori" (
  "prodotto_id" TEXT        NOT NULL,
  "emporio"     TEXT        NOT NULL,
  "qta"         INTEGER     NOT NULL DEFAULT 0,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "oe_alimentari_fabbisogno_empori_pkey" PRIMARY KEY ("prodotto_id", "emporio"),
  CONSTRAINT "oe_alimentari_fabbisogno_empori_prodotto_id_fkey"
    FOREIGN KEY ("prodotto_id") REFERENCES "oe_alimentari_prodotti"("id") ON DELETE CASCADE
);

CREATE TABLE "oe_alimentari_ordinato" (
  "prodotto_id" TEXT        NOT NULL,
  "ordinato"    INTEGER     NOT NULL DEFAULT 0,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "oe_alimentari_ordinato_pkey" PRIMARY KEY ("prodotto_id"),
  CONSTRAINT "oe_alimentari_ordinato_prodotto_id_fkey"
    FOREIGN KEY ("prodotto_id") REFERENCES "oe_alimentari_prodotti"("id") ON DELETE CASCADE
);

-- Seed prodotti dall'ODS (Foglio: Alimentari)
INSERT INTO "oe_alimentari_prodotti" ("id","barcode","fornitore","nome","formato","iva_perc","costo_ii","pvp_ii","pvp_consigliato","note","ordine") VALUES
('oeap-01','8051684517805','Pietra di scarto','Pomodorini secchi','314 ml',4,4.30,6.50,6.50,NULL,1),
('oeap-02','8051684517812','Pietra di scarto','Pomodori datterini','314 ml',10,2.96,4.50,NULL,NULL,2),
('oeap-03','8051684517829','Pietra di scarto','Sugo al basilico','314 ml',10,2.96,4.50,NULL,NULL,3),
('oeap-04','8051684517836','Giuste terre','Olio evo del Parco','500 ml',4,9.36,14.00,13.00,NULL,4),
('oeap-05','8051684517843','Luccini','Mostarda classica','240 g',10,5.50,9.00,9.00,NULL,5),
('oeap-06','8051684517850','Sapori di Libertà','Torta Sbrisolona Mantovana','',10,4.40,7.50,7.50,'Chiedere costo a Sapori di libertà',6),
('oeap-07','8051684517867','Sapori di Libertà','Panettone','750g o 1kg',10,27.50,38.00,NULL,'da definire con Sapori di libertà',7),
('oeap-08',NULL,'Sapori di Libertà','Panettoni selection (classico, amarena, pistacchio)','3x250g',10,24.20,38.00,38.00,'da definire con Sapori di libertà',8),
('oeap-09','8051684517874','Semi Liberi','Honey selection','120g x 3',10,8.40,13.00,12.00,NULL,9),
('oeap-10','8051684517881','Semi Liberi','Garden selection','120g x 3',10,8.40,13.00,12.00,NULL,10),
('oeap-11','8051684517898','Semi Liberi','Savory selection','120g x 3',10,7.00,13.00,10.00,NULL,11),
('oeap-12','8051684517904','Semi Liberi','Deli selection','120g x 3',10,8.40,13.00,12.00,NULL,12),
('oeap-13','8051684517911','Semi Liberi','Cipolle rosse aceto balsamico','120 g',10,2.80,4.50,4.00,NULL,13),
('oeap-14','8051684517928','Semi Liberi','Confettura di peperoncino','120 g',10,2.80,4.50,4.00,NULL,14),
('oeap-15','8051684517935','Semi Liberi','Crema di Zucchine','120 g',10,2.80,4.50,4.00,NULL,15),
('oeap-16','8051684517942','Semi Liberi','Salsa Giardiniera','120 g',10,2.80,4.50,4.00,NULL,16),
('oeap-17','8051684517959','Semi Liberi','Crema di pomodori verdi','120 g',10,2.80,4.50,4.00,NULL,17),
('oeap-18','8051684517966','Semi Liberi','Miele Millefiori','125 g',10,2.80,4.50,4.00,NULL,18),
('oeap-19','8051684517973','Semi Liberi','Crema di miele e pistacchi','125 g',10,2.80,4.50,4.00,NULL,19),
('oeap-20','8051684517980','Semi Liberi','Crema di miele e nocciole','125 g',10,2.80,4.50,4.00,NULL,20),
('oeap-21',NULL,NULL,'Pasta (tipo A)','500 g',10,0,0,NULL,'da definire',21),
('oeap-22',NULL,NULL,'Pasta (tipo B)','500 g',10,0,0,NULL,'da definire',22),
('oeap-23',NULL,NULL,'Spergola','',10,0,0,NULL,'da definire',23);

-- Seed fabbisogno empori (Foglio: Fabbisogno_empori) — MN, RE, CR, CA, VI
INSERT INTO "oe_alimentari_fabbisogno_empori" ("prodotto_id","emporio","qta") VALUES
('oeap-01','MN',48),('oeap-01','RE',42),('oeap-01','CR',42),('oeap-01','CA',10),('oeap-01','VI',10),
('oeap-02','MN',30),('oeap-02','RE',30),('oeap-02','CR',30),('oeap-02','CA',6),('oeap-02','VI',6),
('oeap-03','MN',30),('oeap-03','RE',20),('oeap-03','CR',20),('oeap-03','CA',10),('oeap-03','VI',10),
('oeap-04','MN',60),('oeap-04','RE',18),('oeap-04','CR',18),('oeap-04','CA',6),('oeap-04','VI',6),
('oeap-05','MN',46),('oeap-05','RE',30),('oeap-05','CR',30),('oeap-05','CA',10),('oeap-05','VI',10),
('oeap-06','MN',30),('oeap-06','RE',30),('oeap-06','CR',30),('oeap-06','CA',10),('oeap-06','VI',10),
('oeap-07','MN',0), ('oeap-07','RE',0), ('oeap-07','CR',0), ('oeap-07','CA',0), ('oeap-07','VI',0),
('oeap-08','MN',0), ('oeap-08','RE',0), ('oeap-08','CR',0), ('oeap-08','CA',0), ('oeap-08','VI',0),
('oeap-09','MN',20),('oeap-09','RE',20),('oeap-09','CR',20),('oeap-09','CA',6),('oeap-09','VI',6),
('oeap-10','MN',30),('oeap-10','RE',30),('oeap-10','CR',30),('oeap-10','CA',10),('oeap-10','VI',10),
('oeap-11','MN',20),('oeap-11','RE',20),('oeap-11','CR',20),('oeap-11','CA',6),('oeap-11','VI',6),
('oeap-12','MN',30),('oeap-12','RE',30),('oeap-12','CR',30),('oeap-12','CA',10),('oeap-12','VI',10),
('oeap-13','MN',40),('oeap-13','RE',40),('oeap-13','CR',40),('oeap-13','CA',10),('oeap-13','VI',10),
('oeap-14','MN',30),('oeap-14','RE',30),('oeap-14','CR',30),('oeap-14','CA',10),('oeap-14','VI',10),
('oeap-15','MN',30),('oeap-15','RE',30),('oeap-15','CR',30),('oeap-15','CA',10),('oeap-15','VI',10),
('oeap-16','MN',40),('oeap-16','RE',40),('oeap-16','CR',40),('oeap-16','CA',10),('oeap-16','VI',10),
('oeap-17','MN',30),('oeap-17','RE',30),('oeap-17','CR',30),('oeap-17','CA',10),('oeap-17','VI',10),
('oeap-18','MN',30),('oeap-18','RE',30),('oeap-18','CR',30),('oeap-18','CA',10),('oeap-18','VI',10),
('oeap-19','MN',30),('oeap-19','RE',30),('oeap-19','CR',30),('oeap-19','CA',10),('oeap-19','VI',10),
('oeap-20','MN',30),('oeap-20','RE',30),('oeap-20','CR',30),('oeap-20','CA',10),('oeap-20','VI',10),
('oeap-21','MN',0), ('oeap-21','RE',20),('oeap-21','CR',20),('oeap-21','CA',10),('oeap-21','VI',10),
('oeap-22','MN',0), ('oeap-22','RE',20),('oeap-22','CR',20),('oeap-22','CA',10),('oeap-22','VI',10),
('oeap-23','MN',0), ('oeap-23','RE',24),('oeap-23','CR',24),('oeap-23','CA',12),('oeap-23','VI',12);

-- Seed ordinato (Foglio: Fabbisogno_totale — colonna Ordinato)
INSERT INTO "oe_alimentari_ordinato" ("prodotto_id","ordinato") VALUES
('oeap-01',204),('oeap-02',204),('oeap-03',204),('oeap-04',204),
('oeap-05',168),('oeap-06',0),('oeap-07',0),('oeap-08',0),
('oeap-09',0),('oeap-10',0),('oeap-11',0),('oeap-12',0),
('oeap-13',0),('oeap-14',0),('oeap-15',0),('oeap-16',0),
('oeap-17',0),('oeap-18',0),('oeap-19',0),('oeap-20',0),
('oeap-21',0),('oeap-22',0),('oeap-23',0);
