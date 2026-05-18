package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.QuestionResponse;

import java.util.List;
import java.util.UUID;

public interface QuestionResponseRepository extends JpaRepository<QuestionResponse, UUID> {
    List<QuestionResponse> findByQuestionSend_Id(UUID sendId);
    boolean existsByQuestionSend_IdAndChatId(UUID sendId, Long chatId);
}
