-- Survey: apre i destinatari anche agli operatori (non solo Customer)
-- customerId diventa opzionale; identificazione tramite email

-- 1. Rendi customer_id opzionale in survey_recipients
ALTER TABLE survey_recipients ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Aggiungi respondent_name (nome display per operatori)
ALTER TABLE survey_recipients ADD COLUMN IF NOT EXISTS respondent_name TEXT;

-- 3. Backfill respondent_name dai Customer esistenti
UPDATE survey_recipients sr
SET respondent_name = c.company_name
FROM customers c
WHERE c.id = sr.customer_id AND sr.respondent_name IS NULL;

-- 4. Sostituisci unique (survey_id, customer_id) con (survey_id, email)
ALTER TABLE survey_recipients DROP CONSTRAINT IF EXISTS "survey_recipients_survey_id_customer_id_key";
ALTER TABLE survey_recipients ADD CONSTRAINT "survey_recipients_survey_id_email_key" UNIQUE (survey_id, email);

-- 5. Rendi customer_id opzionale in survey_responses
ALTER TABLE survey_responses ALTER COLUMN customer_id DROP NOT NULL;

-- 6. Aggiungi email e respondent_name a survey_responses
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS respondent_name TEXT;

-- 7. Backfill email e respondent_name da Customer esistenti
UPDATE survey_responses sr
SET
  email          = c.email,
  respondent_name = c.company_name
FROM customers c
WHERE c.id = sr.customer_id AND sr.email IS NULL;

-- 8. Rendi email NOT NULL (dopo backfill)
ALTER TABLE survey_responses ALTER COLUMN email SET NOT NULL;

-- 9. Sostituisci unique (survey_id, customer_id) con (survey_id, email)
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS "survey_responses_survey_id_customer_id_key";
ALTER TABLE survey_responses ADD CONSTRAINT "survey_responses_survey_id_email_key" UNIQUE (survey_id, email);
