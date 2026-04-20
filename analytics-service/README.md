# Analytics Service

Сервис сбора событий лекции и формирования аналитики. Порт: **8084**.

## Реализованный функционал

Принимает события от Lecture Broadcasting Service и предоставляет агрегированную статистику лектору.

### API

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/analytics/events/lecture` | Принять событие (`slide_changed`, `student_joined`, `start_lecture`, `end_lecture`) |
| `GET` | `/analytics/lectures/{lectureId}/dashboard` | Дашборд: кол-во уникальных студентов, смен слайдов, последний слайд |
| `GET` | `/analytics/lectures/{lectureId}/aggregations` | Агрегации по событиям |
| `GET` | `/analytics/lectures/{lectureId}/report` | Итоговый отчёт по лекции |

### Формат события (`POST /analytics/events/lecture`)
```json
{
  "lectureId": 1,
  "actionType": "student_joined",
  "userId": "123456789",
  "payload": "{\"slideNumber\": 3}"
}
```

`lectureId` — тип `Long` (не UUID).

## База данных
`analytics_db` (PostgreSQL). Таблица `activity_logs` создаётся автоматически через Hibernate.

## Запуск
```bash
docker compose up -d --build analytics-service
```