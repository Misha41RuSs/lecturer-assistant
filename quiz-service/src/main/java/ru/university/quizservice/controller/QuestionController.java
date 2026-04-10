package ru.university.quizservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.quizservice.entity.SlideQuestion;
import ru.university.quizservice.service.QuizService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class QuestionController {

    private final QuizService quizService;

    public QuestionController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping("/slides/{slideId}/questions")
    public ResponseEntity<SlideQuestion> ask(
            @PathVariable UUID slideId,
            @RequestBody Map<String, String> body) {
        UUID lectureId = UUID.fromString(body.get("lectureId"));
        Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId")) : null;
        return ResponseEntity.ok(quizService.askQuestion(lectureId, slideId, userId, body.get("text")));
    }

    @GetMapping("/lectures/{lectureId}/questions")
    public List<SlideQuestion> getQuestions(@PathVariable UUID lectureId) {
        return quizService.getQuestions(lectureId);
    }

    @PutMapping("/questions/{questionId}/answer")
    public ResponseEntity<SlideQuestion> answer(
            @PathVariable UUID questionId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(quizService.answerQuestion(questionId, body.get("answer")));
    }
}
