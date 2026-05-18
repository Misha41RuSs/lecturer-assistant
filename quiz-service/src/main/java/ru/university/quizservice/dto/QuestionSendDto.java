package ru.university.quizservice.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Вопрос, отправленный к слайду, со статистикой ответов */
public record QuestionSendDto(
        UUID sendId,
        UUID questionId,
        String questionText,
        String questionType,
        Integer timeLimitSec,
        List<OptionDto> options,
        int slideNumber,
        Instant sentAt,
        int totalResponses,
        int correctResponses,
        List<OpenResponseDto> openResponses
) {
    public record OptionDto(UUID id, String text, boolean correct) {}
    public record OpenResponseDto(Long chatId, String openText) {}
}
