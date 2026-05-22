package ru.university.lecturebroadcasting.bot;

public enum MessageType {
    SLIDE_PUSH,      // Лектор отправляет слайд
    SLIDE_PULL,      // Студент запрашивает слайд
    QUESTION_BROADCAST, // Отправка вопроса/теста
    POLL,            // Опрос
    ALERT,           // Уведомление
    CHECKPOINT       // Промежуточная проверка
}