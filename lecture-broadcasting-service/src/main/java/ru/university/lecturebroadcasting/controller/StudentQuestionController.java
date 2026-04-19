package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.lecturebroadcasting.bot.LectureBroadcastingBot;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.StudentQuestionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/lectures")
@RequiredArgsConstructor
public class StudentQuestionController {

    private final StudentQuestionService questionService;
    private final LectureBroadcastingBot bot;
    private final LectureService lectureService;

    @GetMapping("/{id}/student-questions")
    public List<Map<String, Object>> getQuestions(@PathVariable Long id) {
        return questionService.getByLecture(id).stream()
                .map(q -> Map.<String, Object>of(
                        "id", q.id(),
                        "text", q.text(),
                        "createdAt", q.createdAt().toString()
                ))
                .toList();
    }

    @PutMapping("/{id}/student-questions/{qId}/private-reply")
    public ResponseEntity<Void> privateReply(
            @PathVariable Long id,
            @PathVariable String qId,
            @RequestBody Map<String, String> body) {
        String replyText = body.get("text");
        questionService.answer(qId, replyText).ifPresent(q ->
                bot.sendTextMessage(q.chatId(),
                        "Преподаватель ответил на ваш вопрос:\n«" + q.text() + "»\n\nОтвет: " + replyText)
        );
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/student-questions/{qId}/broadcast-reply")
    public ResponseEntity<Void> broadcastReply(
            @PathVariable Long id,
            @PathVariable String qId,
            @RequestBody Map<String, String> body) {
        String replyText = body.get("text");
        questionService.answer(qId, replyText).ifPresent(q -> {
            String msg = "Ответ преподавателя на вопрос:\n«" + q.text() + "»\n\nОтвет: " + replyText;
            for (Long chatId : lectureService.getStudentChatIds(id)) {
                bot.sendTextMessage(chatId, msg);
            }
        });
        return ResponseEntity.ok().build();
    }
}