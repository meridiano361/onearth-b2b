-- Migration: add survey tables

CREATE TABLE "surveys" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "slug"        TEXT NOT NULL UNIQUE,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "startsAt"    TIMESTAMP(3) NOT NULL,
  "endsAt"      TIMESTAMP(3) NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'draft',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "survey_questions" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "surveyId"     TEXT NOT NULL REFERENCES "surveys"("id") ON DELETE CASCADE,
  "sortOrder"    INTEGER NOT NULL,
  "questionKey"  TEXT NOT NULL,
  "questionText" TEXT NOT NULL,
  "questionType" TEXT NOT NULL,
  "optionsJson"  JSONB,
  "required"     BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("surveyId", "questionKey")
);

CREATE TABLE "survey_recipients" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "surveyId"        TEXT NOT NULL REFERENCES "surveys"("id") ON DELETE CASCADE,
  "customerId"      TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "email"           TEXT NOT NULL,
  "token"           TEXT NOT NULL UNIQUE,
  "pushSentAt"      TIMESTAMP(3),
  "emailSentAt"     TIMESTAMP(3),
  "openedAt"        TIMESTAMP(3),
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "deliveryChannel" TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("surveyId", "customerId")
);

CREATE TABLE "survey_responses" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "surveyId"      TEXT NOT NULL REFERENCES "surveys"("id") ON DELETE CASCADE,
  "customerId"    TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "submittedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceChannel" TEXT,
  "completed"     BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("surveyId", "customerId")
);

CREATE TABLE "survey_answers" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "responseId"   TEXT NOT NULL REFERENCES "survey_responses"("id") ON DELETE CASCADE,
  "questionKey"  TEXT NOT NULL,
  "answerText"   TEXT,
  "answerNumber" DECIMAL(5, 2),
  "answerJson"   JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "survey_recipients_surveyId_idx" ON "survey_recipients"("surveyId");
CREATE INDEX "survey_recipients_token_idx" ON "survey_recipients"("token");
CREATE INDEX "survey_responses_surveyId_idx" ON "survey_responses"("surveyId");
CREATE INDEX "survey_answers_responseId_idx" ON "survey_answers"("responseId");
