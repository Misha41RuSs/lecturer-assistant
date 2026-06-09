package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.university.quizservice.entity.ExamAnswer;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamAnswerRepository extends JpaRepository<ExamAnswer, UUID> {
    List<ExamAnswer> findBySubmission_Id(UUID submissionId);
    Optional<ExamAnswer> findBySubmission_IdAndQuestion_Id(UUID submissionId, UUID questionId);

    /** Loads all answers for an exam with their questions and submissions eagerly (analytics). */
    @Query("SELECT a FROM ExamAnswer a JOIN FETCH a.question JOIN FETCH a.submission WHERE a.submission.exam.id = :examId")
    List<ExamAnswer> findWithQuestionByExamId(@Param("examId") UUID examId);
}
