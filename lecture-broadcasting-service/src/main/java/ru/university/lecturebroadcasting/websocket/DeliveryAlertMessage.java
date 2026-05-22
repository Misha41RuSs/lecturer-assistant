package ru.university.lecturebroadcasting.websocket;

public record DeliveryAlertMessage(Long lectureId, long totalSent, long totalFailed, double errorRate) {}
