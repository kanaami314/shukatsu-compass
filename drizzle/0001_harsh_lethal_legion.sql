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
ALTER TABLE `records` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TRIGGER records_keep_history BEFORE UPDATE ON records
BEGIN
  INSERT INTO record_history (id, record_id, owner, kind, payload, revision, saved_at)
  VALUES (OLD.id || ':' || OLD.revision, OLD.id, OLD.owner, OLD.kind, OLD.payload, OLD.revision, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER records_validate_insert BEFORE INSERT ON records
WHEN NEW.deleted = 0
BEGIN
  SELECT CASE WHEN COALESCE(json_extract(NEW.payload,'$.companyId'),'') <> '' AND NOT EXISTS (SELECT 1 FROM records WHERE id = json_extract(NEW.payload,'$.companyId') AND owner = NEW.owner AND kind = 'company' AND deleted = 0) THEN RAISE(ABORT,'Related company unavailable') END;
  SELECT CASE WHEN COALESCE(json_extract(NEW.payload,'$.agentId'),'') <> '' AND NOT EXISTS (SELECT 1 FROM records WHERE id = json_extract(NEW.payload,'$.agentId') AND owner = NEW.owner AND kind = 'agent' AND deleted = 0) THEN RAISE(ABORT,'Related agent unavailable') END;
END;
--> statement-breakpoint
CREATE TRIGGER records_validate_update BEFORE UPDATE ON records
WHEN NEW.deleted = 0
BEGIN
  SELECT CASE WHEN COALESCE(json_extract(NEW.payload,'$.companyId'),'') <> '' AND NOT EXISTS (SELECT 1 FROM records WHERE id = json_extract(NEW.payload,'$.companyId') AND owner = NEW.owner AND kind = 'company' AND deleted = 0) THEN RAISE(ABORT,'Related company unavailable') END;
  SELECT CASE WHEN COALESCE(json_extract(NEW.payload,'$.agentId'),'') <> '' AND NOT EXISTS (SELECT 1 FROM records WHERE id = json_extract(NEW.payload,'$.agentId') AND owner = NEW.owner AND kind = 'agent' AND deleted = 0) THEN RAISE(ABORT,'Related agent unavailable') END;
END;
