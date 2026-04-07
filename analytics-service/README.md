# Заглушка для Analytics Service

## Описание
Сервис сбора телеметрии и аналитики. Получает события из других сервисов (смена слайда, вход пользователя, ответы на вопросы) и формирует отчеты по вовлеченности/активности. Рекомендуется использовать для визуализации графиков на фронтенде лектора.

## Задачи для разработчика
1. Настроить Spring Boot 3 + Java 21.
2. Подключить `analytics_db` PostgreSQL через Hibernate/Spring Data JPA.
3. Разработать REST API:
   - `POST /analytics/events/lecture` (системные события, например, смена слайда)
   - `POST /analytics/events/user` (пользовательские события, например, отвлекся/фокус окна)
   - `GET /analytics/lectures/{lecture_id}/aggregations`
   - `GET /analytics/lectures/{lecture_id}/dashboard`
   - `GET /analytics/lectures/{lecture_id}/report`
4. В будущем сервис может быть переведён на работу через Kafka или RabbitMQ для асинхронного сбора логов активности.

## Запуск
Сборка:
```bash
mvn clean package -DskipTests
```
Запуск (порт 8084):
Сервис запускается в рамках `docker-compose up -d --build`.
