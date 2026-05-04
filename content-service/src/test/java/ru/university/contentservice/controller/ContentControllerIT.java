//package ru.university.contentservice.controller;
//
//import org.junit.jupiter.api.Test;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.boot.test.web.client.TestRestTemplate;
//import org.springframework.http.*;
//import ru.university.contentservice.IntegrationTestBase;
//import ru.university.contentservice.entity.SlideSequence;
//import ru.university.contentservice.repository.SlideSequenceRepository;
//
//import java.util.Map;
//import java.util.UUID;
//
//import static org.assertj.core.api.Assertions.*;
//
//class ContentControllerIT extends IntegrationTestBase {
//
//    @Autowired
//    private TestRestTemplate restTemplate;
//
//    @Autowired
//    private SlideSequenceRepository slideSequenceRepository;
//
//    @Test
//    void shouldCreateLectureAndSaveToDatabase() {
//        // 1. Отправляем HTTP-запрос на создание
//        Map<String, String> request = Map.of(
//                "name", "Test Lecture",
//                "sequenceId", UUID.randomUUID().toString()
//        );
//
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.APPLICATION_JSON);
//        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
//
//        ResponseEntity<Map> response = restTemplate.exchange(
//                "http://localhost:" + port + "/lectures",  // путь к вашему контроллеру
//                HttpMethod.POST,
//                entity,
//                Map.class
//        );
//
//        // 2. Проверяем HTTP-ответ
//        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
//
//        // 3. Проверяем, что данные реально сохранились в БД
//        //    (не просто в памяти, а в PostgreSQL через Testcontainers)
//        long count = slideSequenceRepository.count();
//        assertThat(count).isGreaterThan(0);
//
//        System.out.println("✅ Lecture saved to database, total records: " + count);
//    }
//
//    @Test
//    void shouldSaveSlideSequenceWithCorrectRelations() {
//        // 1. Создаём последовательность слайдов
//        UUID sequenceId = UUID.randomUUID();
//        Map<String, Object> request = Map.of(
//                "id", sequenceId.toString(),
//                "name", "Test Sequence"
//        );
//
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.APPLICATION_JSON);
//        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
//
//        ResponseEntity<Map> response = restTemplate.exchange(
//                "http://localhost:" + port + "/api/slide-sequences",
//                HttpMethod.POST,
//                entity,
//                Map.class
//        );
//
//        // 2. Проверяем, что сохранилось в БД
//        SlideSequence saved = slideSequenceRepository.findById(sequenceId).orElse(null);
//        assertThat(saved).isNotNull();
//        assertThat(saved.getId()).isEqualTo(sequenceId);
//
//        System.out.println("✅ SlideSequence saved to database with correct relations");
//    }
//
//    @Test
//    void shouldRollbackTransactionOnError() {
//        // 1. Отправляем некорректный запрос (без обязательного поля)
//        Map<String, String> invalidRequest = Map.of(
//                "wrongField", "value"
//        );
//
//        HttpHeaders headers = new HttpHeaders();
//        headers.setContentType(MediaType.APPLICATION_JSON);
//        HttpEntity<Map<String, String>> entity = new HttpEntity<>(invalidRequest, headers);
//
//        long countBefore = slideSequenceRepository.count();
//
//        ResponseEntity<Map> response = restTemplate.exchange(
//                "http://localhost:" + port + "/lectures",
//                HttpMethod.POST,
//                entity,
//                Map.class
//        );
//
//        // 2. Проверяем, что вернулась ошибка
//        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
//
//        // 3. Проверяем, что в БД ничего не сохранилось (транзакция откатилась)
//        long countAfter = slideSequenceRepository.count();
//        assertThat(countAfter).isEqualTo(countBefore);
//
//        System.out.println("✅ Transaction rolled back on error, database unchanged");
//    }
//}

package ru.university.contentservice.controller;

import org.junit.jupiter.api.Test;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
public class ContentControllerIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Test
    void testContainerStarts() {
        System.out.println("✅ PostgreSQL container started!");
        System.out.println("JDBC URL: " + postgres.getJdbcUrl());
    }

    @Test
    void debugDocker() {
        System.out.println(
                DockerClientFactory.instance().isDockerAvailable()
        );
    }
}