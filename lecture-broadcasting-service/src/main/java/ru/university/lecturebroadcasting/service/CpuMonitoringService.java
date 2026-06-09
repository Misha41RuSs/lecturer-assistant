package ru.university.lecturebroadcasting.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import com.sun.management.OperatingSystemMXBean;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CpuMonitoringService {

    private final MeterRegistry meterRegistry;
    private final ConcurrentMap<String, Gauge> activeGauges = new ConcurrentHashMap<>();

    /**
     * Запуск мониторинга CPU для лекции (по идентификатору Long)
     */
    public void startMonitoring(Long lectureId) {
        if (lectureId != null) {
            startMonitoring(String.valueOf(lectureId));
        }
    }

    /**
     * Запуск мониторинга CPU для лекции (по идентификатору String)
     */
    public void startMonitoring(String lectureId) {
        if (lectureId == null || lectureId.isBlank()) {
            return;
        }

        activeGauges.computeIfAbsent(lectureId, id -> {
            log.info("Starting CPU monitoring for lecture_id={}", id);
            return Gauge.builder("lecture.cpu.usage", this::getCurrentCpuLoad)
                    .tag("lecture_id", id)
                    .description("Current CPU usage for a specific lecture in percent")
                    .register(meterRegistry);
        });
    }

    /**
     * Возвращает текущую загрузку CPU системы в процентах (0.0 - 100.0)
     */
    public double getCurrentCpuLoad() {
        try {
            OperatingSystemMXBean osBean = ManagementFactory.getPlatformMXBean(OperatingSystemMXBean.class);
            double systemCpuLoad = osBean.getCpuLoad();
            
            // Если значение недоступно (например, сразу после старта JVM возвращается -1.0)
            if (systemCpuLoad < 0) {
                return 0.0;
            }
            
            return systemCpuLoad * 100.0;
        } catch (Exception e) {
            log.error("Failed to read system CPU load", e);
            return 0.0;
        }
    }
}
