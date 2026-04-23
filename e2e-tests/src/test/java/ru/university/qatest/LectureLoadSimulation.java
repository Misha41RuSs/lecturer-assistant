package ru.university.qatest;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import org.junit.jupiter.api.DisplayName;

import java.time.Duration;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.stream.Stream;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.http;
import static io.gatling.javaapi.http.HttpDsl.status;

@DisplayName("Нагрузочное тестирование: Лекция + Тест")
public class LectureLoadSimulation extends Simulation {

    String gatewayUrl = "http://localhost:8080";

    // Исправленный feeder - создаем итератор вручную
    Iterator<Map<String, Object>> feeder = Stream.generate(() -> {
        Long chatId = System.currentTimeMillis() + (long)(Math.random() * 10000);
        return Map.<String, Object>of(
                "chatId", chatId,
                "lectureId", 1L,
                "examId", "f912e23b-1955-4376-97f6-9edc0f059482"
        );
    }).limit(100).iterator();

    HttpProtocolBuilder httpProtocol = http
            .baseUrl(gatewayUrl)
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .userAgentHeader("Gatling/StudentSimulator");

    // Сценарий: Один студент
    ChainBuilder studentFlow = exec(
            http("Студент подключается к лекции")
                    .post("/lectures/#{lectureId}/join")
                    .body(StringBody("{\"chatId\": \"#{chatId}\"}"))
                    .check(status().in(200, 409))
    )
            .pause(Duration.ofSeconds(1))
            .exec(
                    http("Студент стартует тест")
                            .post("/exams/#{examId}/submissions")
                            .body(StringBody("{\"chatId\": \"#{chatId}\"}"))
                            .check(status().is(200))
            )
            .pause(Duration.ofMillis(500))
            .exec(
                    http("Студент отвечает на вопрос")
                            .post("/exams/#{examId}/answers?chatId=#{chatId}")
                            .body(StringBody("{\"questionId\": \"c375e5be-0a06-4d82-bb05-2f94a32fee84\", \"selectedOptionId\": \"8dc51878-4d34-4eb8-9c50-704d94205082\"}"))
                            .check(status().is(200))
            );

    // Настройка нагрузки
    ScenarioBuilder scenario = scenario("Нагрузка на лекцию")
            .feed(feeder)
            .exec(studentFlow);

    {
        setUp(
                scenario.injectOpen(
                        rampUsers(100).during(Duration.ofSeconds(10))
                ).protocols(httpProtocol)
        ).assertions(
                global().responseTime().max().lt(2000),
                global().successfulRequests().percent().gt(95.0)
        );
    }
}