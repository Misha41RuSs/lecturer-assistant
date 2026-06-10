# Task 5 — Расчёт коэффициента ошибок доставки

## Ветка: task-5-delivery-error-rate

## Цель
- Счётчики `total_messages_sent` и `total_messages_failed` по `lectureId`
- Метод `recordDeliveryStatus(lectureId, success)`
- Алерт лектору через WebSocket при доле ошибок > 5%

## Затрагиваемые файлы

### Новые файлы
- [x] `lecture-broadcasting-service/.../websocket/DeliveryAlertMessage.java` — DTO для WebSocket алерта
- [x] `lecture-broadcasting-service/.../service/DeliveryMetricsService.java` — счётчики + алерт

### Изменённые файлы
- [x] `lecture-broadcasting-service/.../bot/LectureBroadcastingBot.java`
  - Добавлен `DeliveryMetricsService` в зависимости
  - `sendSlideToStudent` — добавлен `lectureId`, обёрнут в try-catch с recordDeliveryStatus
  - `sendTextMessage` — добавлен `lectureId`, делегирует в `sendTrackedText`
  - `notifyLectureEndedToStudents` — добавлен `lectureId`, использует `sendTrackedText`
  - Добавлен приватный `sendTrackedText(lectureId, chatId, text)` с метриками
  - Оставлен `sendText(chatId, text)` для внутренних сообщений бота (без метрик)
- [x] `lecture-broadcasting-service/.../controller/LectureController.java`
  - Все вызовы bot-методов обновлены — передают `id` как `lectureId`
- [x] `lecture-broadcasting-service/.../controller/StudentQuestionController.java`
  - `privateReply` и `broadcastReply` — обновлены вызовы sendTextMessage с lectureId

## Лог изменений

### [done] Шаг 1 — создать DeliveryAlertMessage (WebSocket DTO)
### [done] Шаг 2 — создать DeliveryMetricsService
### [done] Шаг 3 — внедрить сервис в LectureBroadcastingBot, обернуть вызовы
### [done] Шаг 4 — обновить LectureController
