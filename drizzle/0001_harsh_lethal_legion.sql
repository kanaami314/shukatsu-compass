CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`sequence` integer NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drafts_owner` ON `drafts` (`owner`);--> statement-breakpoint
CREATE TABLE `record_history` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_owner_record` ON `record_history` (`owner`,`record_id`);--> statement-breakpoint
ALTER TABLE `records` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `records` ADD `deleted` integer DEFAULT 0 NOT NULL;