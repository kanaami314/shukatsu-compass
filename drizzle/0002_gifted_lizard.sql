CREATE TABLE `draft_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `draft_history_owner` ON `draft_history` (`owner`,`saved_at`);--> statement-breakpoint
CREATE TRIGGER drafts_keep_history BEFORE UPDATE ON drafts
WHEN OLD.payload <> NEW.payload
BEGIN
  INSERT INTO draft_history (id, owner, payload, saved_at)
  VALUES (OLD.id || ':' || OLD.sequence, OLD.owner, OLD.payload, OLD.updated_at);
END;
