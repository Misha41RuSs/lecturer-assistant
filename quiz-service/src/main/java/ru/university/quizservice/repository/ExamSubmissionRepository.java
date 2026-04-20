package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.ExamSubmission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamSubmissionRepository extends JpaRepository<ExamSubmission, UUID> {
    List<ExamSubmission> findByExam_IdOrderByStartedAtDesc(UUID examId);
    Optional<ExamSubmission> findByExam_IdAndChatId(UUID examId, Long chatId);
}