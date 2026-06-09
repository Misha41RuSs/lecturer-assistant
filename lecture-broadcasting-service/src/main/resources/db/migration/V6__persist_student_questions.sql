DO $$
BEGIN
    IF to_regclass('public.lectures') IS NOT NULL THEN
        IF to_regclass('public.student_questions') IS NULL THEN
            CREATE TABLE student_questions (
                id uuid PRIMARY KEY,
                lecture_id bigint NOT NULL REFERENCES lectures(id),
                chat_id bigint NOT NULL,
                text text NOT NULL,
                answer text,
                status varchar(32) NOT NULL,
                anonymous boolean NOT NULL DEFAULT false,
                created_at timestamp(6) with time zone NOT NULL
            );
        END IF;

        IF to_regclass('public.question_upvotes') IS NULL THEN
            CREATE TABLE question_upvotes (
                id uuid PRIMARY KEY,
                question_id uuid NOT NULL REFERENCES student_questions(id) ON DELETE CASCADE,
                chat_id bigint NOT NULL,
                CONSTRAINT uk_question_upvote UNIQUE (question_id, chat_id)
            );
        END IF;
    END IF;
END $$;
