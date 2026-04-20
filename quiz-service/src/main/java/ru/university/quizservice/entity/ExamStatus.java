package ru.university.quizservice.entity;

public enum ExamStatus {
    DRAFT,   // создан, не запущен
    ACTIVE,  // запущен, студенты могут проходить
    CLOSED   // завершён
}