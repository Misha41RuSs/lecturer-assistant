DO $$
BEGIN
    IF to_regclass('public.students') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_students_group_name ON students(group_name);
    END IF;
END $$;
