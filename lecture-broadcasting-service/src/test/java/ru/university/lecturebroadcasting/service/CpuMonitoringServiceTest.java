package ru.university.lecturebroadcasting.service;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CpuMonitoringServiceTest {

    private MeterRegistry meterRegistry;
    private CpuMonitoringService cpuMonitoringService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        cpuMonitoringService = new CpuMonitoringService(meterRegistry);
    }

    @Test
    void startMonitoring_registersGaugeWithLectureTag() {
        String lectureId = "test-lecture-123";

        // Запуск мониторинга
        cpuMonitoringService.startMonitoring(lectureId);

        // Ищем Gauge по названию метрики и тегу
        Gauge gauge = meterRegistry.find("lecture.cpu.usage")
                .tag("lecture_id", lectureId)
                .gauge();

        assertNotNull(gauge, "Gauge 'lecture.cpu.usage' should be registered in the registry");
        
        // Проверяем, что значение метрики возвращает валидный процент CPU (0.0 - 100.0)
        double value = gauge.value();
        assertTrue(value >= 0.0 && value <= 100.0, "CPU usage value should be between 0.0 and 100.0 percent, got: " + value);
    }

    @Test
    void startMonitoring_withLongId_registersGauge() {
        Long lectureId = 999L;

        cpuMonitoringService.startMonitoring(lectureId);

        Gauge gauge = meterRegistry.find("lecture.cpu.usage")
                .tag("lecture_id", "999")
                .gauge();

        assertNotNull(gauge, "Gauge should be registered with String value of Long ID");
    }

    @Test
    void getCurrentCpuLoad_returnsPercentageBetweenZeroAndOneHundred() {
        double cpuLoad = cpuMonitoringService.getCurrentCpuLoad();
        assertTrue(cpuLoad >= 0.0 && cpuLoad <= 100.0, "CPU load should be a percentage between 0.0 and 100.0, got: " + cpuLoad);
    }
}
