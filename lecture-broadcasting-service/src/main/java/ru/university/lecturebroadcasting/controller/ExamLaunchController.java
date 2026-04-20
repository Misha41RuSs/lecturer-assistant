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
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamLaunchController {

    private final LectureBroadcastingBot bot;
    private final LectureService lectureService;
    private final QuizServiceClient quizServiceClient;

    /**
     * POST /api/exams/launch
     * Body: { "examId": "uuid", "lectureId": "number" }
     *
     * Меняет статус теста на ACTIVE (в quiz-service) и рассылает
     * первый вопрос всем студентам, подключённым к лекции.
     */
    @PostMapping("/launch")
    public ResponseEntity<Map<String, Object>> launch(@RequestBody Map<String, String> body) {
        String examIdStr = body.get("examId");
        String lectureIdStr = body.get("lectureId");

        if (examIdStr == null || lectureIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "examId and lectureId are required"));
        }

        UUID examId = UUID.fromString(examIdStr);
        long lectureId = Long.parseLong(lectureIdStr);

        QuizServiceClient.ExamDetail examDetail = quizServiceClient.getExam(examId);
        quizServiceClient.launchExam(examId);

        if (examDetail != null && examDetail.totalTimeSec() != null) {
            long delayMs = examDetail.totalTimeSec() * 1000L;
            new Timer(true).schedule(new TimerTask() {
                @Override public void run() {
                    log.info("Auto-closing exam {} after {} sec", examId, examDetail.totalTimeSec());
                    quizServiceClient.closeExam(examId);
                }
            }, delayMs);
        }

        List<Long> chatIds = lectureService.getStudentChatIds(lectureId);
        log.info("Launching exam {} for lecture {} → {} students", examId, lectureId, chatIds.size());

        for (Long chatId : chatIds) {
            try {
                bot.sendExamToStudent(chatId, examId);
            } catch (Exception e) {
                log.error("Failed to send exam to chatId={}", chatId, e);
            }
        }

        return ResponseEntity.ok(Map.of(
                "examId", examId,
                "sentTo", chatIds.size()
        ));
    }
}