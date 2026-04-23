package ru.university.admingateway;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayRoutingTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void shouldRejectOversizedHeaders() {
        String hugeHeader = "x".repeat(200 * 1024);

        webTestClient.get()
                .uri("/api/content/slides/123")
                .header("X-Huge-Header", hugeHeader)
                .exchange()
                .expectStatus().isEqualTo(431);  // Request Header Fields Too Large
    }

    @Test
    void shouldReturn404ForUnknownRoute() {
        webTestClient.get()
                .uri("/unknown-route-12345")
                .exchange()
                .expectStatus().isNotFound();  // 404
    }

    @Test
    void shouldAllowCorsPreflightRequests() {
        webTestClient.options()
                .uri("/api/content/slides/123")
                .header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "GET")
                .exchange()
                .expectStatus().isOk()  // 200
                .expectHeader().valueEquals("Access-Control-Allow-Origin", "*");
    }
}