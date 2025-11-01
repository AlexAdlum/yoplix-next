CREATE TABLE "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"qty_of_visits" integer DEFAULT 0 NOT NULL,
	"first_timestamp" timestamp with time zone,
	"last_timestamp" timestamp with time zone
);
