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

#### xAPI - Метрики понятности лекции
| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/xapi/events` | Записать событие xAPI (оценка, вопрос, ответ на тест) |
| `GET` | `/xapi/lectures/{lectureId}/clarity` | Получить метрики понятности лекции (CR, QD, QTD) |

**Подробная документация**: см. файл `src/main/java/ru/university/analyticsservice/xapi/METRICS.md`

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

#### xAPI события (`POST /xapi/events`)

**Оценка понятности слайда**
```json
{
  "verb": "rated",
  "lectureId": 1,
  "slideId": 5,
  "chatId": 123456789,
  "rating": 4
}
```

**Вопрос по слайду**
```json
{
  "verb": "asked",
  "lectureId": 1,
  "slideId": 5,
  "chatId": 123456789,
  "questionText": "Какой алгоритм используется здесь?"
}
```

**Ответ на тест/опрос**
```json
{
  "verb": "answered",
  "lectureId": 1,
  "chatId": 123456789,
  "quizId": "quiz-1",
  "answer": "A",
  "isCorrect": true
}
```

## База данных
`analytics_db` (PostgreSQL). Таблица `activity_logs` создаётся автоматически через Hibernate.

## Мониторинг и Метрики

### Prometheus

Метрики доступны на эндпоинте `/actuator/prometheus`. Prometheus собирает их каждые 10 секунд.

**Ключевые метрики xAPI:**
- `lecture_clarity_rating{lecture_id="..."}` — средняя оценка понятности слайда
- `lecture_question_density{lecture_id="..."}` — плотность вопросов на слайд на слушателя
- `lecture_question_temporal_depth{lecture_id="..."}` — среднее время от слайда до вопроса

### Grafana

Дашборд "Метрики понятности лекции" отображает три основные метрики в реальном времени.

- **URL**: http://localhost:3000 (при запущенном docker-compose)
- **Данные обновляются**: каждые 10 секунд
- **Язык**: Русский

## Запуск

### Docker Compose (рекомендуется)

```bash
docker-compose -f docker-compose-monitoring.yml up
```

Будут запущены:
- Analytics Service (порт 8084)
- PostgreSQL (порт 5432)
- Prometheus (порт 9090)
- Grafana (порт 3000)

### Локальное развертывание

```bash
mvn clean install
mvn spring-boot:run
```

**Требуется**: PostgreSQL база данных `analytics_db` на localhost:5432