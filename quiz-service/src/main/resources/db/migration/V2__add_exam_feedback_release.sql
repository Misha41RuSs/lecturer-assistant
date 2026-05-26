DO $$
BEGIN
    IF to_regclass('public.exams') IS NOT NULL THEN
        ALTER TABLE exams
            ADD COLUMN IF NOT EXISTS feedback_released boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS feedback_released_at timestamp(6) with time zone;
    END IF;
END $$;
