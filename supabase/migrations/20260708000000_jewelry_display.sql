-- ─────────────────────────────────────────────────────────────────────────────
-- Jewelry Display Rendering — migration Supabase
-- Run: Supabase Dashboard > SQL Editor, oppure `supabase db push`
-- Dopo aver eseguito questo SQL aggiungere i modelli Prisma e fare
--   `npx prisma generate` (le tabelle esistono già, non servono migrate)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE public.tipo_supporto AS ENUM (
  'busto_legno',
  'cono_legno',
  'portaorecchini',
  'parete_ganci'
);

CREATE TYPE public.tono_legno AS ENUM ('chiaro', 'scuro');

CREATE TYPE public.categoria_gioiello AS ENUM (
  'collana',
  'bracciale',
  'orecchino',
  'anello'
);

CREATE TYPE public.stato_compositing_job AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- ── Supporti espositivi ───────────────────────────────────────────────────────

CREATE TABLE public.supporto_espositivo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  tipo          public.tipo_supporto NOT NULL,
  tono          public.tono_legno,           -- NULL per portaorecchini e parete_ganci
  immagine_url  TEXT NOT NULL,               -- Supabase Storage URL (bucket: jewelry-stands)
  larghezza_px  INTEGER NOT NULL DEFAULT 800,
  altezza_px    INTEGER NOT NULL DEFAULT 600,
  attivo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Zone di posizionamento per categoria ─────────────────────────────────────
-- Ogni supporto può avere una zona per ogni categoria compatibile.
-- anchor_x / anchor_y sono coordinate normalizzate 0–1 riferite alle dimensioni
-- del supporto; rappresentano il CENTRO del gioiello nell'immagine composita.

CREATE TABLE public.zona_posizionamento (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supporto_id      UUID NOT NULL REFERENCES public.supporto_espositivo(id) ON DELETE CASCADE,
  categoria        public.categoria_gioiello NOT NULL,
  anchor_x         FLOAT NOT NULL DEFAULT 0.5,
  anchor_y         FLOAT NOT NULL DEFAULT 0.5,
  max_larghezza_px INTEGER NOT NULL DEFAULT 300,
  max_altezza_px   INTEGER NOT NULL DEFAULT 300,
  UNIQUE (supporto_id, categoria)
);

-- ── Job di compositing ────────────────────────────────────────────────────────

CREATE TABLE public.compositing_job (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        TEXT NOT NULL,             -- ID del prodotto nel catalogo
  product_image_url TEXT NOT NULL,             -- URL immagine gioiello (PNG trasparente)
  supporto_id       UUID NOT NULL REFERENCES public.supporto_espositivo(id),
  categoria         public.categoria_gioiello NOT NULL,
  stato             public.stato_compositing_job NOT NULL DEFAULT 'pending',
  risultato_url     TEXT,                      -- URL immagine composita finale
  errore            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.jewelry_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER compositing_job_updated_at
  BEFORE UPDATE ON public.compositing_job
  FOR EACH ROW EXECUTE FUNCTION public.jewelry_set_updated_at();

-- ── Indici ────────────────────────────────────────────────────────────────────

CREATE INDEX idx_compositing_job_product ON public.compositing_job (product_id);
CREATE INDEX idx_compositing_job_stato   ON public.compositing_job (stato);
CREATE INDEX idx_zona_supporto           ON public.zona_posizionamento (supporto_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Il service_role (usato da Prisma e dal backend) bypassa RLS automaticamente.

ALTER TABLE public.supporto_espositivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zona_posizionamento  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compositing_job      ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica per i supporti attivi (utile se esposti al frontend)
CREATE POLICY "public_read_supporti" ON public.supporto_espositivo
  FOR SELECT USING (attivo = TRUE);
CREATE POLICY "public_read_zone"     ON public.zona_posizionamento
  FOR SELECT USING (TRUE);
CREATE POLICY "public_read_jobs"     ON public.compositing_job
  FOR SELECT USING (TRUE);

-- ── Storage buckets ───────────────────────────────────────────────────────────
-- Eseguire separatamente in Supabase Dashboard > Storage:
--
--   CREATE BUCKET "jewelry-stands"    (public: true)
--   CREATE BUCKET "jewelry-composite" (public: true)
