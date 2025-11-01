CREATE TABLE "visits" (
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"referrer" text DEFAULT '',
	"ua" text DEFAULT '',
	"client_hints" text DEFAULT '',
	"ip_hash" text NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
