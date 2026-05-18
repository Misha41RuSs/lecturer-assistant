package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.QuestionSend;

import java.util.List;
import java.util.UUID;

public interface QuestionSendRepository extends JpaRepository<QuestionSend, UUID> {
    List<QuestionSend> findByLectureIdOrderBySentAtAsc(Long lectureId);
}
