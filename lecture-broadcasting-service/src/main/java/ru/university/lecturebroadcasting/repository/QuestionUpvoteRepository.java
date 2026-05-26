package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.QuestionUpvote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuestionUpvoteRepository extends JpaRepository<QuestionUpvote, UUID> {
    long countByQuestion_Id(UUID questionId);
    List<QuestionUpvote> findByQuestion_Id(UUID questionId);
    Optional<QuestionUpvote> findByQuestion_IdAndChatId(UUID questionId, Long chatId);
    void deleteByQuestion_Lecture_Id(Long lectureId);
}
