package ru.university.lecturebroadcasting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.lecturebroadcasting.entity.ComprehensionSignal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ComprehensionSignalRepository extends JpaRepository<ComprehensionSignal, UUID> {
    Optional<ComprehensionSignal> findByLecture_IdAndChatIdAndSlideIndex(Long lectureId, Long chatId, Integer slideIndex);
    List<ComprehensionSignal> findByLecture_IdAndSlideIndex(Long lectureId, Integer slideIndex);
    List<ComprehensionSignal> findByLecture_Id(Long lectureId);
}
