# Заглушка для Lecture Broadcasting Service

## Описание
Сервис отвечающий за жизненный цикл лекции и рассылку уведомлений. Интегрируется со слушателями (через WebSocket, SSE или напрямую для Telegram бота). Контролирует когда лекция началась, завершилась и какой слайд идет в данный момент.

## Задачи для разработчика
1. Настроить Spring Boot 3 + Java 21.
2. Подключить `broadcasting_db` PostgreSQL через Hibernate/Spring Data JPA.
3. Реализовать REST API:
   - `POST /lectures`
   - `POST /lectures/{lecture_id}/start`
   - `POST /lectures/{lecture_id}/stop`
   - `POST /lectures/{lecture_id}/join`
   - `PUT /lectures/{lecture_id}/current-slide`
4. Реализовать WebSocket сервер (или SSE) **ИСКЛЮЧИТЕЛЬНО** для живого обновления текущего слайда на экране проектора или интерфейсе лектора (React/Electron).
5. **Встроить логику Telegram-бота прямо в этот сервис** (рекомендуется использовать библиотеку `telegrambots-spring-boot-starter`). Бот будет обрабатывать команду `/join`, а при смене слайда итеративно проходиться по всем подписанным студентам в `broadcasting_db` и рассылать им картинки.
6. При смене слайда отправлять событие в Analytics Service (асинхронно).

## Запуск
Сборка:
```bash
mvn clean package -DskipTests
```
Запуск (порт 8082):
Сервис запускается в рамках `docker-compose up -d --build`.
