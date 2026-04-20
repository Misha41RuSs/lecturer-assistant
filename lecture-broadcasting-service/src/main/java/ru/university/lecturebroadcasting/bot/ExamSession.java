package ru.university.lecturebroadcasting.bot;

import ru.university.lecturebroadcasting.service.QuizServiceClient.ExamDetail;
import ru.university.lecturebroadcasting.service.QuizServiceClient.ExamDetail.Question;

import java.util.List;
import java.util.UUID;

public class ExamSession {

    private final UUID examId;
    private final List<Question> questions;
    private int currentIndex = 0;

    public ExamSession(UUID examId, ExamDetail detail) {
        this.examId = examId;
        this.questions = detail.questions();
    }

    public UUID getExamId() { return examId; }

    public Question currentQuestion() {
        return questions.get(currentIndex);
    }

    public boolean hasMore() {
        return currentIndex < questions.size();
    }

    public void advance() {
        currentIndex++;
    }

    public int currentIndex() { return currentIndex; }

    public int total() { return questions.size(); }

    public boolean isMultiple() {
        return "MULTIPLE".equals(currentQuestion().type());
    }
}