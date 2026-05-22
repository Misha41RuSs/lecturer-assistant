package ru.university.lecturebroadcasting.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryMetricsService {

    private static final double ERROR_RATE_THRESHOLD = 0.05;

    private final MeterRegistry meterRegistry;

    // Для алерта по порогу — храним raw-счётчики в памяти
    private final ConcurrentHashMap<Long, long[]> counters = new ConcurrentHashMap<>();

    public void recordDeliveryStatus(Long lectureId, boolean success) {
        String lectureTag = String.valueOf(lectureId);

        if (success) {
            Counter.builder("telegram.messages.sent")
                    .description("Total Telegram messages sent successfully")
                    .tag("lecture_id", lectureTag)
                    .register(meterRegistry)
                    .increment();
        } else {
            Counter.builder("telegram.messages.failed")
                    .description("Total Telegram messages failed to deliver")
                    .tag("lecture_id", lectureTag)
                    .register(meterRegistry)
                    .increment();
        }

        long[] stats = counters.computeIfAbsent(lectureId, k -> new long[]{0, 0});
        synchronized (stats) {
            stats[0]++;
            if (!success) stats[1]++;
            checkAndAlert(lectureId, stats[0], stats[1]);
        }
    }

    private void checkAndAlert(Long lectureId, long total, long failed) {
        if (total == 0) return;
        double rate = (double) failed / total;
        if (rate > ERROR_RATE_THRESHOLD) {
            log.warn("Delivery error rate {:.1f}% exceeded 5% threshold for lectureId={} ({} failed / {} total)",
                    rate * 100, lectureId, failed, total);
        }
    }

    public DeliveryStats getMetrics(Long lectureId) {
        long[] stats = counters.getOrDefault(lectureId, new long[]{0, 0});
        long total = stats[0];
        long failed = stats[1];
        double rate = total == 0 ? 0.0 : (double) failed / total;
        return new DeliveryStats(total, failed, rate);
    }

    public void resetForLecture(Long lectureId) {
        counters.remove(lectureId);
    }

    public record DeliveryStats(long totalSent, long totalFailed, double errorRate) {}
}
