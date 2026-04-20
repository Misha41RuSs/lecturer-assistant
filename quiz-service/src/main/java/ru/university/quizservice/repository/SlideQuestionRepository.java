package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.SlideQuestion;

import java.util.List;
import java.util.UUID;

public interface SlideQuestionRepository extends JpaRepository<SlideQuestion, UUID> {
    List<SlideQuestion> findByLectureIdOrderByCreatedAtDesc(UUID lectureId);
    List<SlideQuestion> findBySlideId(UUID slideId);
}