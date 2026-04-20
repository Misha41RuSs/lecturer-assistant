package ru.university.quizservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.quizservice.dto.SlideRatingStatsDto;
import ru.university.quizservice.entity.SlideRating;
import ru.university.quizservice.service.QuizService;

import java.util.Map;
import java.util.UUID;

@RestController
public class RatingController {

    private final QuizService quizService;

    public RatingController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping("/slides/{slideId}/ratings")
    public ResponseEntity<SlideRating> rate(
            @PathVariable UUID slideId,
            @RequestBody Map<String, String> body) {
        Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId")) : null;
        int score = Integer.parseInt(body.get("score"));
        return ResponseEntity.ok(quizService.rateSlide(slideId, userId, score));
    }

    @GetMapping("/slides/{slideId}/ratings")
    public ResponseEntity<SlideRatingStatsDto> stats(@PathVariable UUID slideId) {
        return ResponseEntity.ok(quizService.getRatingStats(slideId));
    }
}