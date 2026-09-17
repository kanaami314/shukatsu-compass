CREATE TABLE `draft_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `draft_history_owner` ON `draft_history` (`owner`,`saved_at`);