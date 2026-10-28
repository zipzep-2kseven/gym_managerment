-- Refuse rollback rather than silently discard new consultation data.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM consultation_requests WHERE preferred_contact IS NOT NULL OR processing_note IS NOT NULL) THEN
    RAISE EXCEPTION 'Rollback would discard consultation contact preference or processing notes';
  END IF;
END $$;
ALTER TABLE consultation_requests DROP COLUMN preferred_contact, DROP COLUMN processing_note;
