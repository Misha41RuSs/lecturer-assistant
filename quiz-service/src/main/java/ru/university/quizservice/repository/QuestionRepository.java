package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.Question;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByLectureId(Long lectureId);
}
