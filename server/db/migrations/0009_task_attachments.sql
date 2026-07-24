CREATE TABLE IF NOT EXISTS "task_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text,
  "size_bytes" integer NOT NULL,
  "storage_key" text NOT NULL,
  "uploaded_by_user_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_attachments_task_id_idx" ON "task_attachments" ("task_id");
