-- Reject writes from a stale application version instead of losing history.
CREATE TRIGGER records_require_revision BEFORE UPDATE ON records
WHEN NEW.revision <> OLD.revision + 1
BEGIN
  SELECT RAISE(ABORT,'Record revision must advance exactly once');
END;
--> statement-breakpoint
-- Deletion through this application is always recoverable.
CREATE TRIGGER records_prevent_hard_delete BEFORE DELETE ON records
BEGIN
  SELECT RAISE(ABORT,'Move records to trash instead of deleting');
END;
