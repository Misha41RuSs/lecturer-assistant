package ru.university.qatest;

import io.restassured.RestAssured;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@DisplayName("E2E Тесты для QA3 - Полный цикл работы лектора")
public class E2ELecturerFlowTest {

    private static final String GATEWAY_URL = "http://localhost:8080";
    private static final String TEST_FILE = "src/test/resources/sample.pdf";

    @BeforeEach
    void setUp() {
        RestAssured.baseURI = GATEWAY_URL;
        Awaitility.setDefaultPollInterval(500, TimeUnit.MILLISECONDS);
        Awaitility.setDefaultTimeout(30, TimeUnit.SECONDS);
    }

    @Test
    @DisplayName("E2E: Загрузка презентации → Получение слайдов → Проверка изображений")
    void e2e_uploadPresentationAndRetrieveSlides() {
        //Загружаем презентацию
        String sequenceId = given()
                .multiPart("file", new File(TEST_FILE))
                .post("/presentations/upload")
                .then()
                .statusCode(200)
                .extract()
                .path("sequenceId");

        assertThat(sequenceId).isNotNull();
        System.out.println("✅ Загружена презентация, sequenceId: " + sequenceId);

        //Ждем, пока слайды обработаются
        await().until(() -> {
            List<String> slides = given()
                    .get("/slide-sequences/" + sequenceId)
                    .then()
                    .statusCode(200)
                    .extract()
                    .jsonPath()
                    .getList("slides");

            return slides != null && !slides.isEmpty();
        });

        //Получаем список слайдов
        List<String> slideIds = given()
                .get("/slide-sequences/" + sequenceId)
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getList("slides");

        System.out.println("✅ Найдено слайдов: " + slideIds.size());
        assertThat(slideIds).isNotEmpty();

        //Скачиваем первый слайд как изображение
        byte[] slideImage = given()
                .get("/slides/" + slideIds.get(0))
                .then()
                .statusCode(200)
                .extract()
                .asByteArray();

        System.out.println("✅ Размер первого слайда: " + slideImage.length + " байт");
        assertThat(slideImage.length).isGreaterThan(10000); // больше 10KB
    }

    @Test
    @DisplayName("Негативный тест: Запрос несуществующего слайда")
    void negative_getNonExistentSlide_returns404() {
        String fakeSlideId = "00000000-0000-0000-0000-000000000000";

        given()
                .get("/slides/" + fakeSlideId)
                .then()
                .statusCode(404); // или 400
    }

    @Test
    @DisplayName("Тест производительности: Загрузка 5 презентаций подряд")
    void performance_uploadMultiplePresentations() {
        long startTime = System.currentTimeMillis();

        for (int i = 0; i < 5; i++) {
            given()
                    .multiPart("file", new File(TEST_FILE))
                    .post("/presentations/upload")
                    .then()
                    .statusCode(200);
        }

        long duration = System.currentTimeMillis() - startTime;
        System.out.println("⏱️ Загрузка 5 презентаций заняла: " + duration + " мс");

        //Проверяем, что среднее время загрузки < 5 секунд
        assertThat(duration / 5).isLessThan(5000);
    }



}
