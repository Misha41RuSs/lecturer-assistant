package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.lecturebroadcasting.bot.LectureBroadcastingBot;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.QuizServiceClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionBroadcastController {

    private final LectureBroadcastingBot bot;
    private final LectureService lectureService;
    private final QuizServiceClient quizServiceClient;

    /**
     * POST /api/questions/broadcast
     * Body: { "questionId": "uuid", "lectureId": 123, "slideNumber": 3 }
     *
     * Фиксирует отправку вопроса в quiz-service и рассылает вопрос всем студентам лекции.
     */
    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, Object>> broadcast(@RequestBody Map<String, Object> body) {
        UUID questionId = UUID.fromString((String) body.get("questionId"));
        Long lectureId = Long.parseLong(String.valueOf(body.get("lectureId")));
        int slideNumber = Integer.parseInt(String.valueOf(body.get("slideNumber")));

        QuizServiceClient.SlideQuestionSend send =
                quizServiceClient.sendQuestionToSlide(questionId, lectureId, slideNumber);

        if (send == null) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to register question send in quiz-service"));
        }

        List<Long> chatIds = lectureService.getStudentChatIds(lectureId);
        log.info("Broadcasting question {} (sendId={}) to {} students on slide {}",
                questionId, send.sendId(), chatIds.size(), slideNumber);

        UUID sendId = UUID.fromString(send.sendId());
        for (Long chatId : chatIds) {
            try {
                bot.sendSlideQuestion(chatId, sendId, send);
            } catch (Exception e) {
                log.error("Failed to send question to chatId={}: {}", chatId, e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "sendId", send.sendId(),
                "sentTo", chatIds.size()
        ));
    }
}
