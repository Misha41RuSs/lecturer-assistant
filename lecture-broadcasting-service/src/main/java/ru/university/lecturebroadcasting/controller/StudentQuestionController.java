package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.lecturebroadcasting.bot.LectureBroadcastingBot;
import ru.university.lecturebroadcasting.dto.StudentDto;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.StudentQuestionService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/lectures")
@RequiredArgsConstructor
public class StudentQuestionController {

    private final StudentQuestionService questionService;
    private final LectureBroadcastingBot bot;
    private final LectureService lectureService;

    @GetMapping("/{id}/student-questions")
    public List<Map<String, Object>> getQuestions(@PathVariable Long id) {
        questionService.markOpenAsSeen(id).forEach(q ->
                bot.sendTextMessage(id, q.chatId(), "👀 Преподаватель увидел ваш вопрос.")
        );

        Map<Long, StudentDto> studentsByChatId = lectureService.getAllStudents(id).stream()
                .collect(Collectors.toMap(StudentDto::getChatId, Function.identity(), (left, right) -> left));

        return questionService.getByLecture(id).stream()
                .map(q -> {
                    StudentDto student = studentsByChatId.get(q.chatId());
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", q.id());
                    item.put("text", q.text());
                    item.put("answer", q.answer());
                    item.put("status", q.status());
                    item.put("createdAt", q.createdAt().toString());
                    item.put("chatId", q.chatId());
                    if (student != null) {
                        item.put("studentName", studentDisplayName(student));
                        item.put("username", student.getUsername());
                    }
                    return item;
                })
                .toList();
    }

    private String studentDisplayName(StudentDto student) {
        String firstName = student.getFirstName() != null ? student.getFirstName().trim() : "";
        String lastName = student.getLastName() != null ? student.getLastName().trim() : "";
        String fullName = (firstName + " " + lastName).trim();
        if (!fullName.isBlank()) return fullName;
        if (student.getUsername() != null && !student.getUsername().isBlank()) {
            return "@" + student.getUsername();
        }
        return "ID: " + student.getChatId();
    }

    @PutMapping("/{id}/student-questions/{qId}/private-reply")
    public ResponseEntity<Void> privateReply(
            @PathVariable Long id,
            @PathVariable String qId,
            @RequestBody Map<String, String> body) {
        String replyText = body.get("text");
        questionService.answer(qId, replyText).ifPresent(q ->
                bot.sendTextMessage(id, q.chatId(),
                        "Преподаватель ответил на ваш вопрос:\n«" + q.text() + "»\n\nОтвет: " + replyText)
        );
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/student-questions/{qId}/dismiss")
    public ResponseEntity<Void> dismiss(
            @PathVariable Long id,
            @PathVariable String qId) {
        questionService.dismiss(qId).ifPresent(q ->
                bot.sendTextMessage(id, q.chatId(), "Вопрос закрыт преподавателем.")
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
                bot.sendTextMessage(id, chatId, msg);
            }
        });
        return ResponseEntity.ok().build();
    }
}
