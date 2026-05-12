package ru.university.qatest;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;

@DisplayName("Тесты безопасности (IDOR) - проверка изоляции данных")
public class IDORSecurityTest {

    private static final String GATEWAY_URL = "http://localhost:8080";
    private static final Long LECTURE_ID_LECTOR = 1L;
    private static final Long LECTURE_ID_ANOTHER = 999L;
    private static final String STUDENT_CHAT_ID = "123456789"; // из твоего отчета

    @BeforeEach
    void setUp() {
        RestAssured.baseURI = GATEWAY_URL;
    }

    @Test
    @DisplayName("IDOR: Студент не должен получить чужую лекцию по ID (GET /lectures/{id})")
    void studentCannotAccessAnotherLectureById() {
        // Симуляция: студент пытается получить лекцию, к которой не подключен
        given()
                .header("X-Chat-Id", STUDENT_CHAT_ID) // предположим, gateway пробрасывает chatId
                .when()
                .get("/lectures/" + LECTURE_ID_LECTOR)
                .then()
                .statusCode(not(200)); // должно быть 403 или 404
    }

    @Test
    @DisplayName("IDOR: Студент не должен видеть список студентов другой лекции")
    void studentCannotSeeAnotherLectureStudents() {
        given()
                .header("X-Chat-Id", STUDENT_CHAT_ID)
                .when()
                .get("/lectures/" + LECTURE_ID_LECTOR + "/students")
                .then()
                .statusCode(not(200)); // доступ запрещен
    }

    @Test
    @DisplayName("IDOR: Студент не может отправить сообщение в чужую лекцию")
    void studentCannotBroadcastToAnotherLecture() {
        String maliciousMessage = "{\"text\":\"Hack attempt\"}";

        given()
                .header("X-Chat-Id", STUDENT_CHAT_ID)
                .contentType("application/json")
                .body(maliciousMessage)
                .when()
                .post("/lectures/" + LECTURE_ID_LECTOR + "/broadcast-message")
                .then()
                .statusCode(403); // Forbidden
    }

    @Test
    @DisplayName("IDOR: Студент не может изменить слайд чужой лекции")
    void studentCannotChangeSlide() {
        String slideChangeBody = "{\"slideNumber\": 10}";

        given()
                .header("X-Chat-Id", STUDENT_CHAT_ID)
                .contentType("application/json")
                .body(slideChangeBody)
                .when()
                .put("/lectures/" + LECTURE_ID_LECTOR + "/current-slide")
                .then()
                .statusCode(403);
    }

    @Test
    @DisplayName("IDOR: Несуществующая лекция возвращает 404 (не 500)")
    void nonExistentLectureReturns404() {
        given()
                .when()
                .get("/lectures/" + LECTURE_ID_ANOTHER)
                .then()
                .statusCode(404);
    }
}