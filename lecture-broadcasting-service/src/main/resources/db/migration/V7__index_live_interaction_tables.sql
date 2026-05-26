CREATE INDEX IF NOT EXISTS idx_post_lecture_responses_lecture_id
    ON post_lecture_responses(lecture_id);

CREATE INDEX IF NOT EXISTS idx_comprehension_signals_lecture_slide
    ON comprehension_signals(lecture_id, slide_index);

CREATE INDEX IF NOT EXISTS idx_student_questions_lecture_status
    ON student_questions(lecture_id, status);

CREATE INDEX IF NOT EXISTS idx_question_upvotes_question_id
    ON question_upvotes(question_id);
