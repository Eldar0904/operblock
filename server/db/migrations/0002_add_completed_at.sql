ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "tasks" SET "completed_at" = "created_at" WHERE "status" = 'done' AND "completed_at" IS NULL;
