package ru.university.analyticsservice.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class LecturerActionMetrics {

    private static final Logger log = LoggerFactory.getLogger(LecturerActionMetrics.class);

    private static final long RETAINED_WINDOW_MS = TimeUnit.MINUTES.toMillis(10);
    private static final long IDLE_LECTURE_MS = TimeUnit.MINUTES.toMillis(30);
    private static final long CLEANUP_PERIOD_S = 30L;

    private final Map<String, Map<ActionType, AtomicLong>> totalCounters = new ConcurrentHashMap<>();
    private final Map<String, Map<ActionType, ConcurrentLinkedDeque<Long>>> recentEvents = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> lastSeen = new ConcurrentHashMap<>();

    private final MeterRegistry meterRegistry;
    private ScheduledExecutorService cleanupExecutor;

    public LecturerActionMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void start() {
        cleanupExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "lecturer-action-metrics-cleanup");
            t.setDaemon(true);
            return t;
        });
        cleanupExecutor.scheduleAtFixedRate(
                this::cleanup, CLEANUP_PERIOD_S, CLEANUP_PERIOD_S, TimeUnit.SECONDS);
        log.info("LecturerActionMetrics started, cleanup every {}s", CLEANUP_PERIOD_S);
    }

    @PreDestroy
    public void stop() {
        if (cleanupExecutor != null) cleanupExecutor.shutdownNow();
    }

    public void recordAction(ActionType type, String lectureId) {
        if (type == null || lectureId == null || lectureId.isBlank()) return;

        long now = System.currentTimeMillis();

        totalCounters
                .computeIfAbsent(lectureId, k -> new ConcurrentHashMap<>())
                .computeIfAbsent(type, k -> new AtomicLong())
                .incrementAndGet();

        recentEvents
                .computeIfAbsent(lectureId, k -> new ConcurrentHashMap<>())
                .computeIfAbsent(type, k -> new ConcurrentLinkedDeque<>())
                .addLast(now);

        lastSeen.computeIfAbsent(lectureId, k -> new AtomicLong()).set(now);

        Counter.builder("lecturer_actions_total")
                .description("Total lecturer actions by type and lecture")
                .tag("action_type", type.name())
                .tag("lecture_id", lectureId)
                .register(meterRegistry)
                .increment();
    }

    public Map<ActionType, Double> getActionsPerMinute(String lectureId, int windowMinutes) {
        if (windowMinutes <= 0) throw new IllegalArgumentException("windowMinutes must be > 0");

        Map<ActionType, Double> result = new EnumMap<>(ActionType.class);
        long cutoff = System.currentTimeMillis() - TimeUnit.MINUTES.toMillis(windowMinutes);

        Map<ActionType, ConcurrentLinkedDeque<Long>> perType = recentEvents.get(lectureId);
        for (ActionType type : ActionType.values()) {
            long count = 0;
            if (perType != null) {
                ConcurrentLinkedDeque<Long> deque = perType.get(type);
                if (deque != null) {
                    for (Long ts : deque) {
                        if (ts >= cutoff) count++;
                    }
                }
            }
            result.put(type, count / (double) windowMinutes);
        }
        return result;
    }

    public Map<ActionType, Long> getTotals(String lectureId) {
        Map<ActionType, Long> snapshot = new EnumMap<>(ActionType.class);
        Map<ActionType, AtomicLong> per = totalCounters.get(lectureId);
        for (ActionType type : ActionType.values()) {
            snapshot.put(type, per == null ? 0L : per.getOrDefault(type, new AtomicLong()).get());
        }
        return snapshot;
    }

    public Map<ActionType, AtomicLong> getCounters(String lectureId) {
        return totalCounters.getOrDefault(lectureId, new HashMap<>());
    }

    void cleanup() {
        try {
            long now = System.currentTimeMillis();
            long retainCutoff = now - RETAINED_WINDOW_MS;
            long idleCutoff = now - IDLE_LECTURE_MS;

            for (Map.Entry<String, Map<ActionType, ConcurrentLinkedDeque<Long>>> e : recentEvents.entrySet()) {
                for (ConcurrentLinkedDeque<Long> deque : e.getValue().values()) {
                    Long head;
                    while ((head = deque.peekFirst()) != null && head < retainCutoff) {
                        deque.pollFirst();
                    }
                }
            }

            for (Map.Entry<String, AtomicLong> e : lastSeen.entrySet()) {
                if (e.getValue().get() < idleCutoff) {
                    String lectureId = e.getKey();
                    recentEvents.remove(lectureId);
                    totalCounters.remove(lectureId);
                    lastSeen.remove(lectureId);
                    log.debug("Evicted idle lecture {}", lectureId);
                }
            }
        } catch (Exception ex) {
            log.warn("Cleanup failed", ex);
        }
    }
}
