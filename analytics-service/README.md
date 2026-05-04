# Analytics Service

Сервис сбора событий лекции и формирования аналитики. Порт: **8084**.

## Реализованный функционал

Принимает события от Lecture Broadcasting Service и предоставляет агрегированную статистику лектору.

### API

#### Системные события
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/analytics/events/lecture` | Принять системное событие (смена слайда, старт/стоп лекции) |
| `POST` | `/analytics/events/user` | Принять пользовательское событие (студент присоединился, потерял фокус и т.д.) |

#### Аналитика
| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/analytics/lectures/{lectureId}/dashboard` | Дашборд: кол-во уникальных студентов, смен слайдов, последний слайд |
| `GET` | `/analytics/lectures/{lectureId}/aggregations` | Агрегации по событиям |
| `GET` | `/analytics/lectures/{lectureId}/report` | Итоговый отчёт по лекции |

### Формат события

#### Системные события (`POST /analytics/events/lecture`)
```json
{
  "lectureId": 1,
  "actionType": "start_lecture",
  "payload": "{...}"
}
```

#### Пользовательские события (`POST /analytics/events/user`)
```json
{
  "lectureId": 1,
  "userId": 123456789,
  "actionType": "student_joined",
  "payload": "{\"slideNumber\": 3}"
}
```

**Примечание:** `lectureId` — тип `Long` (не UUID). `userId` может быть null для системных событий.

## База данных
`analytics_db` (PostgreSQL). Таблица `activity_logs` создаётся автоматически через Hibernate.

## Запуск
```bash
docker compose up -d --build analytics-service
```