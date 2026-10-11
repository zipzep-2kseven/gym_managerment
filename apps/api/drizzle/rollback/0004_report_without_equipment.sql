-- Rollback refuses incompatible new data instead of deleting reports.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM gym_reports WHERE report_type='EQUIPMENT' AND equipment_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot restore equipment-required constraint: unlinked EQUIPMENT reports exist';
  END IF;
END $$;
ALTER TABLE gym_reports ADD CONSTRAINT gym_reports_equipment_required_check
  CHECK (report_type <> 'EQUIPMENT' OR equipment_id IS NOT NULL);
