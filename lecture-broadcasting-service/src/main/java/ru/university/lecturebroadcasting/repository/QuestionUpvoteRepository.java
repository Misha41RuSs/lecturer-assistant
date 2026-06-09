package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.university.lecturebroadcasting.entity.QuestionUpvote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionUpvoteRepository extends JpaRepository<QuestionUpvote, UUID> {
    long countByQuestion_Id(UUID questionId);
    @Query("select u.question.id, count(u) from QuestionUpvote u where u.question.lecture.id = :lectureId group by u.question.id")
    List<Object[]> countByLectureId(@Param("lectureId") Long lectureId);
    List<QuestionUpvote> findByQuestion_Id(UUID questionId);
    Optional<QuestionUpvote> findByQuestion_IdAndChatId(UUID questionId, Long chatId);
    void deleteByQuestion_Lecture_Id(Long lectureId);
}
