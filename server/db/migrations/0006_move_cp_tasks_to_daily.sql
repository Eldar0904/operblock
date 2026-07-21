-- Move CP's daily/HR tasks (from screenshot) onto the shared Daily board.
-- Ticket suffixes match formatTicketId (last 4 hex of UUID). EN's OB-A24C is excluded.
DO $$
DECLARE
  daily_id uuid;
  org_id uuid;
BEGIN
  SELECT id INTO daily_id FROM projects WHERE is_personal = true LIMIT 1;

  IF daily_id IS NULL THEN
    SELECT id INTO org_id FROM organizations LIMIT 1;
    IF org_id IS NOT NULL THEN
      INSERT INTO projects (name, org_id, is_personal)
      VALUES ('Daily', org_id, true)
      RETURNING id INTO daily_id;
    END IF;
  END IF;

  IF daily_id IS NULL THEN
    RAISE NOTICE 'No Daily project available — skipped task move';
    RETURN;
  END IF;

  UPDATE tasks AS t
  SET
    project_id = daily_id,
    status = CASE
      WHEN t.status = 'done' THEN 'done'::task_status
      ELSE 'todo'::task_status
    END
  WHERE UPPER(RIGHT(REPLACE(t.id::text, '-', ''), 4)) IN (
    '785B',
    'ADC3',
    '0079',
    '0AF0',
    'D9A5',
    '488A',
    '530E',
    'E2D3',
    '0510'
  )
  AND t.project_id IS DISTINCT FROM daily_id;
END $$;
