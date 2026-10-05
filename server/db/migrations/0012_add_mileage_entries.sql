CREATE TABLE IF NOT EXISTS "mileage_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "entry_date" date NOT NULL,
  "kilometers" integer NOT NULL,
  "rate_per_km" integer NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mileage_entries_user_date_idx"
  ON "mileage_entries" ("user_id", "entry_date");
