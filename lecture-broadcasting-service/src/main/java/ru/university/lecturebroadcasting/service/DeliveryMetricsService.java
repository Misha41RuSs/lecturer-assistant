package ru.university.lecturebroadcasting.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import ru.university.lecturebroadcasting.websocket.DeliveryAlertMessage;

import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryMetricsService {

    private static final double ERROR_RATE_THRESHOLD = 0.05;

    private final SimpMessagingTemplate messagingTemplate;

    private final ConcurrentHashMap<Long, long[]> counters = new ConcurrentHashMap<>();

    public void recordDeliveryStatus(Long lectureId, boolean success) {
        long[] stats = counters.computeIfAbsent(lectureId, k -> new long[]{0, 0});
        synchronized (stats) {
            stats[0]++;
            if (!success) {
                stats[1]++;
            }
            checkAndAlert(lectureId, stats[0], stats[1]);
        }
    }

    private void checkAndAlert(Long lectureId, long total, long failed) {
        if (total == 0) return;
        double rate = (double) failed / total;
        if (rate > ERROR_RATE_THRESHOLD) {
            log.warn("Delivery error rate {:.1f}% exceeded threshold for lectureId={}", rate * 100, lectureId);
            messagingTemplate.convertAndSend(
                    "/topic/lectures/" + lectureId + "/alerts",
                    new DeliveryAlertMessage(lectureId, total, failed, rate)
            );
        }
    }

    public void resetForLecture(Long lectureId) {
        counters.remove(lectureId);
    }
}
