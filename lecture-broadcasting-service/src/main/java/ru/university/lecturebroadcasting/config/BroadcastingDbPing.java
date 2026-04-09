package ru.university.lecturebroadcasting.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import ru.university.lecturebroadcasting.repository.LectureRepository;

/**
 * В логах контейнера видно, что сервис реально подключился к той же БД (счётчик лекций).
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class BroadcastingDbPing implements ApplicationRunner {

    private final LectureRepository lectureRepository;

    @Override
    public void run(ApplicationArguments args) {
        long n = lectureRepository.count();
        log.info("=== lecture-broadcasting-service: подключение к БД OK, таблица lectures: {} записей ===", n);
    }
}
