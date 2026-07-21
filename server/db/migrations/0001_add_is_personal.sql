ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "is_personal" boolean DEFAULT false NOT NULL;
