DO $$
BEGIN
    IF to_regclass('public.students') IS NOT NULL THEN
        ALTER TABLE students
            ADD COLUMN IF NOT EXISTS real_name varchar(128),
            ADD COLUMN IF NOT EXISTS group_name varchar(32);

        CREATE INDEX IF NOT EXISTS idx_students_group_name
            ON students(group_name);
    END IF;

    IF to_regclass('public.lectures') IS NOT NULL THEN
        ALTER TABLE lectures
            ADD COLUMN IF NOT EXISTS duration_minutes integer,
            ADD COLUMN IF NOT EXISTS allow_questions boolean,
            ADD COLUMN IF NOT EXISTS anonymous_questions boolean,
            ADD COLUMN IF NOT EXISTS require_student_profile boolean,
            ADD COLUMN IF NOT EXISTS notified_start_at timestamp(6) with time zone;

        UPDATE lectures
        SET duration_minutes = 90
        WHERE duration_minutes IS NULL;

        UPDATE lectures
        SET allow_questions = true
        WHERE allow_questions IS NULL;

        UPDATE lectures
        SET anonymous_questions = false
        WHERE anonymous_questions IS NULL;

        UPDATE lectures
        SET require_student_profile = true
        WHERE require_student_profile IS NULL;
    END IF;
END $$;
