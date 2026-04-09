package ru.university.lecturebroadcasting.dto;

/**
 * Краткая карточка лекции для списка (в т.ч. сверка имён с /join в Telegram).
 */
public record LectureListItem(
        Long id,
        String name,
        String status,
        Integer currentSlide,
        String sequenceId
) {}
