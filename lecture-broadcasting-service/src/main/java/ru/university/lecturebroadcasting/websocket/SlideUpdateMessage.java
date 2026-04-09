package ru.university.lecturebroadcasting.websocket;

public record SlideUpdateMessage(Long lectureId, int slideNumber) {}