CREATE TABLE `widget_access` (
	`owner` text PRIMARY KEY NOT NULL,
	`token_hash` text,
	`enabled` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `widget_token_hash` ON `widget_access` (`token_hash`);