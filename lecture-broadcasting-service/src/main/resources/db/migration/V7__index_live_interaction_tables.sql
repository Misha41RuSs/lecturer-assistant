DO $$
BEGIN
    IF to_regclass('public.post_lecture_responses') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_post_lecture_responses_lecture_id ON post_lecture_responses(lecture_id);
    END IF;

    IF to_regclass('public.comprehension_signals') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_comprehension_signals_lecture_slide ON comprehension_signals(lecture_id, slide_index);
    END IF;

    IF to_regclass('public.student_questions') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_student_questions_lecture_status ON student_questions(lecture_id, status);
    END IF;

    IF to_regclass('public.question_upvotes') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_question_upvotes_question_id ON question_upvotes(question_id);
    END IF;
END $$;
