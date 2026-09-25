CREATE TABLE "oe_cesti_giacenze" (
  "cesto_codice" TEXT        NOT NULL,
  "negozio"      TEXT        NOT NULL,
  "qta"          INTEGER     NOT NULL DEFAULT 0,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "oe_cesti_giacenze_pkey" PRIMARY KEY ("cesto_codice", "negozio")
);

-- Seed dalle giacenze dell'ODS (Foglio: Cesti_lichens)
INSERT INTO "oe_cesti_giacenze" ("cesto_codice","negozio","qta") VALUES
('7430','CR',1),('7430','RE',0),('7430','CA',1),('7430','VI',1),('7430','MN',5),('7430','TR',80),('7430','HUB',121),
('7431','CR',0),('7431','RE',0),('7431','CA',0),('7431','VI',0),('7431','MN',7),('7431','TR',0),('7431','HUB',81),
('7433','CR',1),('7433','RE',3),('7433','CA',0),('7433','VI',0),('7433','MN',6),('7433','TR',0),('7433','HUB',78),
('7434','CR',4),('7434','RE',0),('7434','CA',0),('7434','VI',0),('7434','MN',12),('7434','TR',124),('7434','HUB',93),
('7436','CR',0),('7436','RE',0),('7436','CA',0),('7436','VI',0),('7436','MN',3),('7436','TR',0),('7436','HUB',7),
('7437','CR',0),('7437','RE',0),('7437','CA',0),('7437','VI',0),('7437','MN',2),('7437','TR',0),('7437','HUB',13),
('7439','CR',0),('7439','RE',0),('7439','CA',0),('7439','VI',0),('7439','MN',4),('7439','TR',0),('7439','HUB',25),
('7440','CR',0),('7440','RE',0),('7440','CA',0),('7440','VI',0),('7440','MN',2),('7440','TR',0),('7440','HUB',21);
