package ru.university.quizservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.quizservice.dto.CreateQuestionDto;
import ru.university.quizservice.dto.QuestionDetailDto;
import ru.university.quizservice.dto.QuestionSendDto;
import ru.university.quizservice.entity.Question;
import ru.university.quizservice.entity.QuestionResponse;
import ru.university.quizservice.service.QuestionService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/questions")
public class QuestionBankController {

    private final QuestionService questionService;

    public QuestionBankController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @PostMapping
    public ResponseEntity<QuestionDetailDto> create(@RequestBody CreateQuestionDto dto) {
        Question q = questionService.create(dto);
        return ResponseEntity.ok(questionService.toDto(q));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionDetailDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(questionService.toDto(questionService.get(id)));
    }

    @GetMapping
    public List<QuestionDetailDto> listByLecture(@RequestParam Long lectureId) {
        return questionService.listByLecture(lectureId).stream()
                .map(questionService::toDto)
                .toList();
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionDetailDto> update(
            @PathVariable UUID id,
            @RequestBody CreateQuestionDto dto) {
        Question q = questionService.update(id, dto);
        return ResponseEntity.ok(questionService.toDto(q));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable UUID id) {
        questionService.delete(id);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    /** Зафиксировать отправку вопроса к слайду во время лекции */
    @PostMapping("/send")
    public ResponseEntity<QuestionSendDto> send(@RequestBody Map<String, Object> body) {
        UUID questionId = UUID.fromString((String) body.get("questionId"));
        Long lectureId = Long.parseLong(String.valueOf(body.get("lectureId")));
        int slideNumber = Integer.parseInt(String.valueOf(body.get("slideNumber")));
        return ResponseEntity.ok(questionService.sendQuestion(questionId, lectureId, slideNumber));
    }

    /** Ответ студента на отправленный вопрос (вызывается ботом) */
    @PostMapping("/{sendId}/respond")
    public ResponseEntity<Map<String, Object>> respond(
            @PathVariable UUID sendId,
            @RequestBody Map<String, Object> body) {
        Long chatId = Long.parseLong(String.valueOf(body.get("chatId")));
        UUID selectedOptionId = body.get("selectedOptionId") != null
                ? UUID.fromString((String) body.get("selectedOptionId")) : null;
        String openText = (String) body.get("openText");
        QuestionResponse r = questionService.respond(sendId, chatId, selectedOptionId, openText);
        return ResponseEntity.ok(Map.of(
                "id", r.getId(),
                "correct", r.getCorrect() != null ? r.getCorrect() : "null"
        ));
    }

    /** Все отправки вопросов для лекции (с аналитикой) */
    @GetMapping("/sends")
    public List<QuestionSendDto> getSends(@RequestParam Long lectureId) {
        return questionService.getQuestionSendsForLecture(lectureId);
    }
}
