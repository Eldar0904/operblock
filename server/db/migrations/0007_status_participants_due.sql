-- Task statuses: paused, canceled
ALTER TYPE "task_status" ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE "task_status" ADD VALUE IF NOT EXISTS 'canceled';

-- Project lifecycle status
DO $$ BEGIN
  CREATE TYPE "project_status" AS ENUM ('active', 'paused', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "status" "project_status" NOT NULL DEFAULT 'active';
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "status_changed_at" timestamptz;

-- due_date: text -> timestamptz (ISO strings only; legacy free text becomes null)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "due_at" timestamptz;

UPDATE "tasks"
SET "due_at" = "due_date"::timestamptz
WHERE "due_date" IS NOT NULL
  AND "due_date" ~ '^\d{4}-\d{2}-\d{2}';

ALTER TABLE "tasks" DROP COLUMN IF EXISTS "due_date";
ALTER TABLE "tasks" RENAME COLUMN "due_at" TO "due_date";

-- Backfill task_assignees from legacy single assignee
INSERT INTO "task_assignees" ("task_id", "user_id")
SELECT "id", "assignee_user_id"
FROM "tasks"
WHERE "assignee_user_id" IS NOT NULL
ON CONFLICT DO NOTHING;
