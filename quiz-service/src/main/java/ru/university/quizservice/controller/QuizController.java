package ru.university.quizservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.quizservice.dto.QuizResultsDto;
import ru.university.quizservice.entity.Quiz;
import ru.university.quizservice.entity.UserResponse;
import ru.university.quizservice.service.QuizService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/quizzes")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping
    public ResponseEntity<Quiz> createQuiz(@RequestBody Map<String, String> body) {
        UUID lectureId = UUID.fromString(body.get("lectureId"));
        return ResponseEntity.ok(quizService.createQuiz(lectureId, body.get("title")));
    }

    @PostMapping("/{quizId}/responses")
    public ResponseEntity<UserResponse> respond(
            @PathVariable UUID quizId,
            @RequestBody Map<String, String> body) {
        Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId")) : null;
        return ResponseEntity.ok(quizService.addResponse(quizId, userId, body.get("answer")));
    }

    @GetMapping("/{quizId}/results")
    public ResponseEntity<QuizResultsDto> results(@PathVariable UUID quizId) {
        return ResponseEntity.ok(quizService.getResults(quizId));
    }
}