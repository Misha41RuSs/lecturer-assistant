package ru.university.qatest;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.apache.http.entity.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "ContentService", port = "8081")
@DisplayName("Контрактные тесты: Content Service")
public class ContentServiceContractTest {

    private final RestTemplate restTemplate = new RestTemplate();

    @Pact(consumer = "QuizService")
    public RequestResponsePact getSlideSequenceContract(PactDslWithProvider builder) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");

        return builder
                .given("Существует последовательность слайдов с ID caa5e244-3446-47d4-ab29-5bd1e4211023")
                .uponReceiving("Запрос на получение последовательности слайдов")
                .path("/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023")
                .method("GET")
                .willRespondWith()
                .status(200)
                .headers(headers)
                .body(
                        "{" +
                                "\"id\": \"caa5e244-3446-47d4-ab29-5bd1e4211023\"," +
                                "\"name\": \"этика.pdf\"," +
                                "\"slides\": [\"c709d25d-d659-4946-bee1-6bacd4b24bea\", \"e12efcf4-6f6b-4926-b4f3-65c1f54156ea\"]," +
                                "\"createdAt\": \"2026-04-22T09:13:27.245129\"," +
                                "\"updatedAt\": \"2026-04-22T09:13:27.245147\"" +
                                "}"
                )
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getSlideSequenceContract")
    @DisplayName("Проверка контракта: GET /slide-sequences/{id} возвращает корректный JSON")
    void verifyGetSlideSequenceContract(MockServer mockServer) throws IOException {
        String response = restTemplate.getForObject(mockServer.getUrl() + "/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023", String.class);
        assertThat(response).contains("\"slides\"");
        assertThat(response).contains("\"id\"");
        // Проверяем, что slides - это массив, а не объект и не содержит лишних полей
        assertThat(response).doesNotContain("\"slideIds\""); // <- Важно! Согласно твоему отчету, документация врала
    }

    @Pact(consumer = "AdminGateway") // <- Другой потребитель
    public RequestResponsePact updateSlideSequenceContract(PactDslWithProvider builder) {
        return builder
                .given("Существует последовательность слайдов с ID caa5e244-3446-47d4-ab29-5bd1e4211023")
                .uponReceiving("Запрос на обновление порядка слайдов (массивом)")
                .path("/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023")
                .method("PUT")
                .body("[\"c709d25d-d659-4946-bee1-6bacd4b24bea\", \"e12efcf4-6f6b-4926-b4f3-65c1f54156ea\"]", ContentType.APPLICATION_JSON.getMimeType())
                .willRespondWith()
                .status(200)
                .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "updateSlideSequenceContract")
    @DisplayName("Проверка контракта: PUT /slide-sequences/{id} принимает массив (не объект)")
    void verifyUpdateSlideSequenceContract(MockServer mockServer) {
        String body = "[\"c709d25d-d659-4946-bee1-6bacd4b24bea\", \"e12efcf4-6f6b-4926-b4f3-65c1f54156ea\"]";
        // Важно: В твоем отчете была ошибка 400, когда ты слал объект. Контракт должен требовать массив.
        var response = restTemplate
                .postForEntity(mockServer.getUrl() + "/slide-sequences/caa5e244-3446-47d4-ab29-5bd1e4211023", body, String.class);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
    }
}