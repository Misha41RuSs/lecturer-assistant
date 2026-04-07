# Заглушка для Content Management Service

## Описание
Сервис управления учебными материалами. Отвечает за загрузку презентаций (PDF/PPTX), парсинг слайдов, хранение медиа-файлов и выдачу контента. Выступает в роли "источника правды" для файлов.

## Задачи для разработчика
1. Настроить Spring Boot 3 + Java 21.
2. Подключить `content_db` PostgreSQL через Hibernate/Spring Data JPA.
3. Реализовать парсер для PDF/PPTX файлов (например, Apache PDFBox или Apache POI) для разбиения на отдельные картинки/слайды.
4. Разработать REST API:
   - `POST /presentations/upload`
   - `POST /slides/{slide_id}/media`
   - `PUT /slide-sequences/{sequence_id}`
   - `GET /slides/{slide_id}`
5. Ознакомиться с `Services_API.md` в корне проекта для более детальной архитектуры.

## Запуск
Сборка:
```bash
mvn clean package -DskipTests
```
Запуск:
Сервис запускается в рамках `docker-compose up -d --build` из корня проекта.
