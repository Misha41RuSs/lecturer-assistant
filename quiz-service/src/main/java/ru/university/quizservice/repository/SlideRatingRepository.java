package ru.university.quizservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.university.quizservice.entity.SlideRating;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SlideRatingRepository extends JpaRepository<SlideRating, UUID> {
    List<SlideRating> findBySlideId(UUID slideId);
    Optional<SlideRating> findBySlideIdAndUserId(UUID slideId, Long userId);
}