package ru.university.lecturebroadcasting.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.lecturebroadcasting.entity.ComprehensionSignal;
import ru.university.lecturebroadcasting.entity.ComprehensionSignalValue;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.repository.ComprehensionSignalRepository;
import ru.university.lecturebroadcasting.repository.LectureRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ComprehensionService {
    private final ComprehensionSignalRepository repository;
    private final LectureRepository lectureRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ComprehensionService(ComprehensionSignalRepository repository,
                                LectureRepository lectureRepository,
                                SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.lectureRepository = lectureRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public Aggregate save(Long lectureId, Long chatId, Integer slideIndex, ComprehensionSignalValue signal) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));
        ComprehensionSignal entity = repository.findByLecture_IdAndChatIdAndSlideIndex(lectureId, chatId, slideIndex)
                .orElseGet(ComprehensionSignal::new);
        entity.setLecture(lecture);
        entity.setChatId(chatId);
        entity.setSlideIndex(slideIndex);
        entity.setSignal(signal);
        entity.setCreatedAt(Instant.now());
        repository.save(entity);
        Aggregate aggregate = current(lectureId);
        messagingTemplate.convertAndSend("/topic/comprehension/" + lectureId, aggregate);
        return aggregate;
    }

    @Transactional(readOnly = true)
    public Aggregate current(Long lectureId) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));
        int slideIndex = lecture.getCurrentSlide() != null ? lecture.getCurrentSlide() : 1;
        return aggregate(slideIndex, repository.findByLecture_IdAndSlideIndex(lectureId, slideIndex));
    }

    @Transactional(readOnly = true)
    public Map<Integer, Aggregate> history(Long lectureId) {
        return repository.findByLecture_Id(lectureId).stream()
                .collect(Collectors.groupingBy(ComprehensionSignal::getSlideIndex))
                .entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> aggregate(entry.getKey(), entry.getValue())));
    }

    private Aggregate aggregate(int slideIndex, List<ComprehensionSignal> signals) {
        int green = count(signals, ComprehensionSignalValue.GREEN);
        int yellow = count(signals, ComprehensionSignalValue.YELLOW);
        int red = count(signals, ComprehensionSignalValue.RED);
        int total = signals.size();
        return new Aggregate(slideIndex, total, bucket(green, total), bucket(yellow, total), bucket(red, total));
    }

    private int count(List<ComprehensionSignal> signals, ComprehensionSignalValue value) {
        return (int) signals.stream().filter(signal -> signal.getSignal() == value).count();
    }

    private Bucket bucket(int count, int total) {
        return new Bucket(count, total > 0 ? Math.round(count * 100f / total) : 0);
    }

    public record Aggregate(int slideIndex, int totalResponses, Bucket green, Bucket yellow, Bucket red) {}
    public record Bucket(int count, int pct) {}
}
