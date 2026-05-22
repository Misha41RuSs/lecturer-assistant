# Метрики понятности лекции (xAPI)

## Описание модуля

Модуль xAPI собирает и обрабатывает события от слушателей лекций, поступающие через Telegram-бота, и рассчитывает метрики понятности в соответствии со стандартом xAPI (Experience API).

## Реализованные метрики

### 1. Clarity Rating (CR) - Оценка понятности слайда

**Описание**: Средняя оценка понятности слайда, выставленная слушателями по шкале 1-5.

**Формула расчета**:
```
CR = Σ(rating_i) / N
```
где:
- rating_i - оценка понятности от i-го слушателя (1-5)
- N - количество оценок

**Где находится**:
- Сервис: `ClarityMetricsService.calculateClarityRating()`
- Метрика Prometheus: `lecture_clarity_rating{lecture_id="..."}` (Gauge)
- Эндпоинт API: `GET /xapi/lectures/{lectureId}/clarity` → `clarityRating`

**Единица измерения**: баллы (1.0 - 5.0)

---

### 2. Question Density (QD) - Плотность вопросов

**Описание**: Количество вопросов, задаваемых слушателями, нормализованное по количеству слайдов и активных слушателей.

**Формула расчета**:
```
QD = Q / (S × U)
```
где:
- Q - общее количество вопросов (verb='asked')
- S - количество уникальных слайдов в лекции
- U - количество уникальных слушателей, задавших хотя бы один вопрос

**Где находится**:
- Сервис: `ClarityMetricsService.calculateQuestionDensity()`
- Метрика Prometheus: `lecture_question_density{lecture_id="..."}` (Gauge)
- Эндпоинт API: `GET /xapi/lectures/{lectureId}/clarity` → `questionDensity`

**Единица измерения**: вопросы на слайд на слушателя (безразмерная величина)

---

### 3. Question Temporal Depth (QTD) - Среднее время от слайда до вопроса

**Описание**: Среднее время, прошедшее между появлением слайда и первым вопросом по нему (в целях MVP временно возвращает 0).

**Текущий статус**: MVP реализация (возвращает 0.0)

**Планируемая формула расчета**:
```
QTD = Σ(t_question - t_slide) / M
```
где:
- t_question - время события вопроса (verb='asked')
- t_slide - время события появления слайда (verb='slide_shown')
- M - количество слайдов с вопросами

**Где находится**:
- Сервис: `ClarityMetricsService.calculateQuestionTemporalDepth()`
- Метрика Prometheus: `lecture_question_temporal_depth{lecture_id="..."}` (Gauge)
- Эндпоинт API: `GET /xapi/lectures/{lectureId}/clarity` → `questionTemporalDepth`

**Единица измерения**: секунды

**Примечание**: Для полной реализации требуется добавить события типа 'slide_shown' в систему сбора событий.

---

## Структура хранения данных

### XapiEvent (сущность)

```
id (Long) - уникальный идентификатор события
verb (String) - тип события ('rated', 'asked', 'answered', 'slide_shown')
lectureId (Long) - идентификатор лекции
slideId (Long) - идентификатор слайда
chatId (Long) - идентификатор пользователя (Telegram chat ID)
rating (Integer) - оценка понятности [1-5] (для verb='rated')
questionText (String) - текст вопроса (для verb='asked')
quizId (String) - идентификатор теста/опроса (для verb='answered')
answer (String) - ответ пользователя (для verb='answered')
isCorrect (Boolean) - корректность ответа (для verb='answered')
timestamp (Instant) - время события в UTC
```

**Таблица БД**: `xapi_events`

---

## REST API

### 1. Запись события

```
POST /xapi/events
Content-Type: application/json

{
  "verb": "rated",
  "lectureId": 1,
  "slideId": 5,
  "chatId": 123456789,
  "rating": 4,
  "questionText": null,
  "quizId": null,
  "answer": null,
  "isCorrect": null
}
```

**Ответ**: 200 OK

---

### 2. Получение метрик понятности лекции

```
GET /xapi/lectures/{lectureId}/clarity

Пример: GET /xapi/lectures/1/clarity
```

**Ответ (200 OK)**:
```json
{
  "lectureId": 1,
  "clarityRating": 4.2,
  "questionDensity": 0.35,
  "questionTemporalDepth": 0.0
}
```

---

## Мониторинг в Prometheus

Все метрики доступны на эндпоинте `/actuator/prometheus` и собираются Prometheus каждые 10 секунд.

### Prometheus метрики

- `lecture_clarity_rating{lecture_id="1"}` - оценка понятности лекции
- `lecture_question_density{lecture_id="1"}` - плотность вопросов
- `lecture_question_temporal_depth{lecture_id="1"}` - время от слайда до вопроса

### Grafana дашборд

Дашборд "Метрики понятности лекции" содержит три визуализации:

1. **Оценка понятности слайда** (круговая диаграмма)
   - Отображает распределение оценок по лекциям
   - Шкала 1-5 баллов

2. **Плотность вопросов** (статистический блок)
   - Показывает среднее значение вопросов на слайд на слушателя
   - Обновляется в реальном времени

3. **Среднее время от слайда до вопроса** (статистический блок)
   - Показывает временную метрику в секундах
   - Статус: MVP реализация

Дашборд обновляется каждые 10 секунд.

---

## Примеры использования

### Пример 1: Запись оценки понятности

```bash
curl -X POST http://localhost:8084/xapi/events \
  -H "Content-Type: application/json" \
  -d '{
    "verb": "rated",
    "lectureId": 1,
    "slideId": 3,
    "chatId": 123456789,
    "rating": 5
  }'
```

### Пример 2: Запись вопроса

```bash
curl -X POST http://localhost:8084/xapi/events \
  -H "Content-Type: application/json" \
  -d '{
    "verb": "asked",
    "lectureId": 1,
    "slideId": 3,
    "chatId": 123456789,
    "questionText": "Что такое xAPI?"
  }'
```

### Пример 3: Получение метрик лекции

```bash
curl http://localhost:8084/xapi/lectures/1/clarity
```

---

## Технический стек

- **Framework**: Spring Boot 3.2.3
- **БД**: PostgreSQL 15
- **Мониторинг**: Micrometer + Prometheus
- **Визуализация**: Grafana
- **Java**: OpenJDK 21

---

## Развертывание

### Docker Compose

```bash
docker-compose -f docker-compose-monitoring.yml up
```

Сервисы:
- Analytics Service: http://localhost:8084
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- PostgreSQL: localhost:5432

---

## Дополнительные ресурсы

- **xAPI Standard**: https://github.com/adlnet/xAPI-Spec
- **Micrometer Documentation**: https://micrometer.io/
- **Prometheus Metrics**: http://localhost:9090 (при запущенном контейнере)
- **Grafana Dashboards**: http://localhost:3000 (при запущенном контейнере)
