package ru.university.lecturebroadcasting.bot;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class TelegramTrafficInterceptor implements ClientHttpRequestInterceptor {

    private final MeterRegistry meterRegistry;

    public TelegramTrafficInterceptor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        String lectureId = request.getHeaders().getFirst("X-Lecture-Id");
        if (lectureId == null || lectureId.trim().isEmpty()) {
            lectureId = "unknown";
        }

        // Outbound traffic counter
        long requestSize = body != null ? body.length : 0;
        Counter.builder("telegram.traffic.outbound.bytes")
                .tag("lecture_id", lectureId)
                .register(meterRegistry)
                .increment(requestSize);

        ClientHttpResponse response = execution.execute(request, body);

        // Inbound traffic counter
        long responseSize = response.getHeaders().getContentLength();
        if (responseSize < 0) {
            responseSize = 0;
        }
        Counter.builder("telegram.traffic.inbound.bytes")
                .tag("lecture_id", lectureId)
                .register(meterRegistry)
                .increment(responseSize);

        return response;
    }
}
