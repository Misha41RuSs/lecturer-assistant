DO $$
BEGIN
    IF to_regclass('public.lectures') IS NOT NULL THEN
        IF to_regclass('public.post_lecture_responses') IS NULL THEN
            CREATE TABLE post_lecture_responses (
                id uuid PRIMARY KEY,
                lecture_id bigint NOT NULL REFERENCES lectures(id),
                chat_id bigint NOT NULL,
                rating integer NOT NULL,
                pace_signal varchar(32) NOT NULL,
                open_text text,
                created_at timestamp(6) with time zone NOT NULL,
                CONSTRAINT uk_post_lecture_response UNIQUE (lecture_id, chat_id)
            );
        END IF;
    END IF;
END $$;
