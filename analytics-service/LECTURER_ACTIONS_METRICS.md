# Метрики действий лектора

Микросервис собирает частоту действий лектора (переключение слайдов, аннотации, опросы, тесты) во время лекций, классифицирует их по типу и экспортирует в Prometheus.

## Что измеряется

Enum `ActionType` (`metrics/ActionType.java`):

| Тип | Когда инкрементируется |
|---|---|
| `NEXT_SLIDE` | Лектор переключил слайд |
| `ADD_ANNOTATION` | Лектор добавил аннотацию к слайду |
| `START_POLL` | Лектор запустил опрос |
| `LAUNCH_QUIZ` | Лектор запустил тест |

Сейчас активно используется только `NEXT_SLIDE` (хук в `LectureService.updateCurrentSlide`). Остальные типы подключатся когда появятся соответствующие фичи — для них уже всё готово.

## Архитектура

```
Frontend (slide change)
   ↓ REST: PUT /lectures/{id}/current-slide
lecture-broadcasting-service
   ↓ AnalyticsServiceClient.recordLecturerAction (async, fire-and-forget)
   ↓ HTTP POST /internal/actions  { type, lectureId }
analytics-service
   ↓ LecturerActionMetrics.recordAction
   ├─ totalCounters: AtomicLong (общий счётчик за всё время)
   ├─ recentEvents: Deque<Long> (таймстампы для скользящего окна)
   └─ Micrometer Counter (теги: action_type, lecture_id)
              ↓
        /actuator/prometheus
              ↓
         Prometheus (scrape every 15s)
              ↓
            Grafana
```

## Алгоритм

### Запись действия — `recordAction(ActionType, String lectureId)`

При каждом вызове:
1. Инкрементирует `AtomicLong` в `totalCounters[lectureId][type]` — общий счётчик
2. Добавляет `System.currentTimeMillis()` в конец `ConcurrentLinkedDeque<Long>` в `recentEvents[lectureId][type]` — для расчёта rate
3. Обновляет `lastSeen[lectureId]` — чтобы понимать какие лекции «брошенные»
4. Инкрементит Micrometer `Counter` с тегами `action_type` + `lecture_id` — для Prometheus

### Чтение частоты — `getActionsPerMinute(lectureId, windowMinutes)`

1. Вычисляет `cutoff = now - windowMinutes * 60_000` ms
2. Для каждого `ActionType` считает таймстампы в deque, у которых `ts >= cutoff`
3. Делит количество на `windowMinutes` → events per minute

### Очистка памяти

`ScheduledExecutorService` (отдельный демон-поток `lecturer-action-metrics-cleanup`) запускается каждые **30 секунд**:

1. Из каждого deque выкидывает таймстампы старше `RETAINED_WINDOW_MS = 10 минут` (держим запас x2 от максимального окна запроса)
2. Удаляет лекции, у которых не было активности `IDLE_LECTURE_MS = 30 минут` — освобождает память

Жизненный цикл управляется через `@PostConstruct` (старт) и `@PreDestroy` (стоп).

### Конкурентность

| Структура | Тип |
|---|---|
| Внешние мапы (`totalCounters`, `recentEvents`, `lastSeen`) | `ConcurrentHashMap` |
| Счётчики | `AtomicLong` |
| Таймстампы | `ConcurrentLinkedDeque<Long>` (lock-free) |

Все операции потокобезопасны без явных блокировок.

## API

### Внутренний (для broadcasting/quiz/content сервисов)

`POST /internal/actions`
```json
{ "type": "NEXT_SLIDE", "lectureId": "42" }
```
Ответ: `202 Accepted`. Тело пустое.

### Публичный

`GET /api/lectures/{lectureId}/actions?windowMinutes=5`
```json
{
  "lectureId": "42",
  "windowMinutes": 5,
  "actionsPerMinute": {
    "NEXT_SLIDE": 1.4,
    "ADD_ANNOTATION": 0.2,
    "START_POLL": 0.0,
    "LAUNCH_QUIZ": 0.0
  },
  "totals": {
    "NEXT_SLIDE": 7,
    "ADD_ANNOTATION": 1,
    "START_POLL": 0,
    "LAUNCH_QUIZ": 0
  }
}
```

### Prometheus

`GET /actuator/prometheus`

Формат:
```
# HELP lecturer_actions_total Total lecturer actions by type and lecture
# TYPE lecturer_actions_total counter
lecturer_actions_total{action_type="NEXT_SLIDE",application="analytics-service",lecture_id="1"} 7.0
lecturer_actions_total{action_type="NEXT_SLIDE",application="analytics-service",lecture_id="42"} 2.0
```

## Файлы

| Путь | Описание |
|---|---|
| `analytics-service/src/main/java/.../metrics/ActionType.java` | Enum типов действий |
| `analytics-service/src/main/java/.../metrics/LecturerActionMetrics.java` | Основной сервис: счётчики, окно, очистка, Micrometer |
| `analytics-service/src/main/java/.../controller/LecturerActionController.java` | REST: `POST /internal/actions` и `GET /api/lectures/{id}/actions` |
| `analytics-service/pom.xml` | Зависимости `spring-boot-starter-actuator` + `micrometer-registry-prometheus` |
| `analytics-service/src/main/resources/application.yml` | Блок `management:` — открывает `/actuator/prometheus` |
| `lecture-broadcasting-service/.../service/AnalyticsServiceClient.java` | Метод `recordLecturerAction(actionType, lectureId)` (`@Async`) |
| `lecture-broadcasting-service/.../service/LectureService.java` | Хук вызова `recordLecturerAction("NEXT_SLIDE", lectureId)` после смены слайда |
| `monitoring/prometheus.yml` | Конфиг Prometheus — какие сервисы скрейпить |
| `monitoring/grafana/provisioning/datasources/prometheus.yml` | Datasource Prometheus для Grafana |
| `monitoring/grafana/provisioning/dashboards/lecturer-actions.json` | Готовый дашборд |

## Запуск

```bash
docker compose up -d
```

Поднимет все сервисы плюс Prometheus и Grafana.

## Где смотреть

| URL | Что |
|---|---|
| `http://localhost:8084/api/lectures/{id}/actions?windowMinutes=5` | JSON с rate и total по лекции |
| `http://localhost:8084/actuator/prometheus` | Raw Prometheus-формат |
| `http://localhost:9090` | Prometheus UI (Targets, Graph) |
| `http://localhost:3000` | Grafana (admin / admin) — дашборд "Lecturer Actions" |

## Как добавить новый тип действия

1. В `ActionType` добавить значение, например `SHOW_QR`
2. В точке кода где это действие случается (контроллер/сервис), вызвать:
   ```java
   analyticsServiceClient.recordLecturerAction("SHOW_QR", lectureId);
   ```
3. Готово — счётчик появится в Prometheus автоматически, на дашборде в Grafana отрисуется без правок (запрос `sum by (action_type) (...)` подхватит новый тег)
