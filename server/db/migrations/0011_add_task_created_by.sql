ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;

CREATE INDEX IF NOT EXISTS "tasks_created_by_user_idx"
  ON "tasks" ("created_by_user_id");
