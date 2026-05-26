DO $$
BEGIN
    IF to_regclass('public.comprehension_signals') IS NULL THEN
        CREATE TABLE comprehension_signals (
            id uuid PRIMARY KEY,
            lecture_id bigint NOT NULL REFERENCES lectures(id),
            chat_id bigint NOT NULL,
            slide_index integer NOT NULL,
            signal varchar(16) NOT NULL,
            created_at timestamp(6) with time zone NOT NULL,
            CONSTRAINT uk_comprehension_signal UNIQUE (lecture_id, chat_id, slide_index)
        );
    END IF;
END $$;
