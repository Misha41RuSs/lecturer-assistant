package ru.university.lecturebroadcasting.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class StudentQuestionService {

    public record Question(String id, Long lectureId, Long chatId, String text,
                           String answer, Instant createdAt) {
        Question withAnswer(String ans) {
            return new Question(id, lectureId, chatId, text, ans, createdAt);
        }
    }

    private final AtomicLong seq = new AtomicLong(1);
    private final ConcurrentHashMap<String, Question> store = new ConcurrentHashMap<>();

    public Question add(Long lectureId, Long chatId, String text) {
        String id = String.valueOf(seq.getAndIncrement());
        Question q = new Question(id, lectureId, chatId, text, null, Instant.now());
        store.put(id, q);
        return q;
    }

    public List<Question> getByLecture(Long lectureId) {
        return store.values().stream()
                .filter(q -> q.lectureId().equals(lectureId) && q.answer() == null)
                .sorted(Comparator.comparing(Question::createdAt))
                .toList();
    }

    public Optional<Question> answer(String id, String answer) {
        Question q = store.get(id);
        if (q == null) return Optional.empty();
        Question answered = q.withAnswer(answer);
        store.put(id, answered);
        return Optional.of(answered);
    }

    public void clearByLecture(Long lectureId) {
        store.values().removeIf(q -> q.lectureId().equals(lectureId));
    }
}