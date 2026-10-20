CREATE TABLE `ai_access_settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
