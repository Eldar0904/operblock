CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "title" text DEFAULT 'New conversation' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "ai_conversations"("id") ON DELETE cascade,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_conversations_user_updated_idx"
  ON "ai_conversations" ("user_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "ai_messages_conversation_created_idx"
  ON "ai_messages" ("conversation_id", "created_at");
