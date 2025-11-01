CREATE TABLE "devices" (
	"user_id" text NOT NULL,
	"fingerprint_hash" text NOT NULL,
	"ua" text,
	"client_hints" jsonb,
	"first_seen_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "devices_user_id_fingerprint_hash_pk" PRIMARY KEY("user_id","fingerprint_hash")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"true_answ_ratio" numeric,
	"avg_answ_time_ms" integer,
	"score" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "players_room_id_user_id_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"room_id" text PRIMARY KEY NOT NULL,
	"host_user_id" text NOT NULL,
	"slug" text NOT NULL,
	"players_qty" integer DEFAULT 0 NOT NULL,
	"amount_paid" integer,
	"start_at" timestamp with time zone,
	"finish_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
