package ru.university.quizservice.dto;

import java.util.List;

public record StudentCardDto(
        Long chatId,
        int participationDone,
        int participationTotal,
        int averagePct,
        List<Integer> trend,
        List<String> alerts,
        List<StudentStatsDto.LectureStatsDto> lectures
) {}
