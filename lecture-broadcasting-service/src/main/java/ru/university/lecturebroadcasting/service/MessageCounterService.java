package ru.university.lecturebroadcasting.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import ru.university.lecturebroadcasting.bot.MessageType;

import javax.annotation.PostConstruct;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class MessageCounterService {

    private static final int WARNING_THRESHOLD = 18; // сообщений в минуту
    private static final long MILLIS_IN_MINUTE = 60_000L;

    private final MeterRegistry meterRegistry;
    private final ConcurrentHashMap<String, Counter> counters = new ConcurrentHashMap<>();

    // Для отслеживания времени последнего сброса и количества сообщений
    private final ConcurrentHashMap<String, AtomicLong> lastResetTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> messageCount = new ConcurrentHashMap<>();

    public MessageCounterService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void init() {
        // Регистрируем счётчики для каждого типа сообщения
        for (MessageType type : MessageType.values()) {
            registerCounter(type);
        }
    }

    private void registerCounter(MessageType type) {
        Counter counter = Counter.builder("lecture.messages")
                .tag("type", type.name())
                .description("Количество отправленных сообщений по типам")
                .register(meterRegistry);
        counters.put(type.name(), counter);

        // Инициализируем структуры для отслеживания лимитов
        String key = type.name();
        lastResetTime.put(key, new AtomicLong(System.currentTimeMillis()));
        messageCount.put(key, new AtomicLong(0));
    }

    /**
     * Увеличивает счётчик для указанного типа сообщения
     * @param type тип сообщения
     * @param lectureId идентификатор лекции (для логирования)
     */
    public void incrementCounter(MessageType type, String lectureId) {
        String typeName = type.name();

        // Увеличиваем основной счётчик Micrometer
        Counter counter = counters.get(typeName);
        if (counter != null) {
            counter.increment();
        } else {
            // fallback - если счётчик не зарегистрирован
            Counter fallback = Counter.builder("lecture.messages")
                    .tag("type", typeName)
                    .register(meterRegistry);
            fallback.increment();
            counters.put(typeName, fallback);
        }

        // Проверяем лимит сообщений в минуту
        checkRateLimit(type, lectureId);
    }

    /**
     * Проверяет не превышен ли лимит сообщений в минуту
     */
    private void checkRateLimit(MessageType type, String lectureId) {
        String key = type.name();
        long now = System.currentTimeMillis();
        long lastReset = lastResetTime.get(key).get();

        // Синхронизированный блок для потокобезопасного сброса счётчика
        synchronized (this) {
            // Если прошла минута - сбрасываем счётчик
            if (now - lastReset >= MILLIS_IN_MINUTE) {
                lastResetTime.get(key).set(now);
                messageCount.get(key).set(0);
                lastReset = now;
            }

            long currentCount = messageCount.get(key).incrementAndGet();

            // Предупреждение при превышении порога (18 сообщений в минуту)
            if (currentCount > WARNING_THRESHOLD) {
                log.warn("⚠️ ПРЕВЫШЕНИЕ ЛИМИТА: тип={}, lectureId={}, " +
                                "сообщений за минуту={}, порог={}",
                        type.name(), lectureId, currentCount, WARNING_THRESHOLD);
            } else if (currentCount == WARNING_THRESHOLD) {
                log.info("Достигнут порог предупреждения: тип={}, lectureId={}, " +
                                "сообщений={}",
                        type.name(), lectureId, currentCount);
            }
        }
    }

    /**
     * Получить текущее количество сообщений за последнюю минуту
     */
    public long getCurrentMinuteCount(MessageType type) {
        String key = type.name();
        long now = System.currentTimeMillis();
        long lastReset = lastResetTime.get(key).get();

        if (now - lastReset >= MILLIS_IN_MINUTE) {
            return 0;
        }
        return messageCount.get(key).get();
    }

    /**
     * Получить общее количество сообщений с момента старта
     */
    public double getTotalCount(MessageType type) {
        Counter counter = counters.get(type.name());
        return counter != null ? counter.count() : 0;
    }
}