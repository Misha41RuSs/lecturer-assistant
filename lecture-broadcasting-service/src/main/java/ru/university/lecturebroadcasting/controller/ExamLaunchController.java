package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.server.ResponseStatusException;
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
@RequestMapping({"/api/exams", "/exams"})
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

    /**
     * POST /api/exams/launch-to-user
     * Body: { "examId": "uuid", "chatId": "number" }
     *
     */
    @PostMapping("/launch-to-user")
    public ResponseEntity<Map<String, Object>> launchToUser(@RequestBody Map<String, String> body) {
        String examIdStr = body.get("examId");
        String chatIdStr = body.get("chatId");

        if (examIdStr == null || chatIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "examId and chatId are required"));
        }

        UUID examId = UUID.fromString(examIdStr);
        long chatId = Long.parseLong(chatIdStr);

        quizServiceClient.launchExam(examId);

        try {
            bot.sendExamToStudent(chatId, examId);
        } catch (Exception e) {
            log.error("Failed to send exam to chatId={}", chatId, e);
        }

        return ResponseEntity.ok(Map.of(
                "examId", examId,
                "sentTo", 1
        ));
    }

    @PostMapping("/{examId}/release-feedback")
    public ResponseEntity<Map<String, Object>> releaseFeedback(@PathVariable UUID examId) {
        try {
            QuizServiceClient.ExamFeedback feedback = quizServiceClient.releaseFeedback(examId);
            if (feedback == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Quiz service did not return feedback");
            }

            int sent = 0;
            for (QuizServiceClient.StudentFeedback student : feedback.students()) {
                if (student.chatId() == null) continue;
                bot.sendTextMessage(feedback.lectureId(), student.chatId(), formatFeedbackMessage(feedback, student));
                sent++;
            }

            return ResponseEntity.ok(Map.of(
                    "examId", examId,
                    "sentTo", sent
            ));
        } catch (HttpStatusCodeException e) {
            throw new ResponseStatusException(HttpStatus.valueOf(e.getStatusCode().value()), e.getResponseBodyAsString());
        }
    }

    private String formatFeedbackMessage(QuizServiceClient.ExamFeedback feedback,
                                         QuizServiceClient.StudentFeedback student) {
        StringBuilder message = new StringBuilder();
        message.append("📊 Результаты теста «").append(feedback.examTitle()).append("»\n\n");

        for (QuizServiceClient.QuestionFeedback question : student.questions()) {
            int number = question.orderIndex() + 1;
            message.append("Вопрос ").append(number).append(": «")
                    .append(question.questionText()).append("»\n");
            if (Boolean.TRUE.equals(question.correct())) {
                message.append("✅ Правильно — твой ответ: ").append(question.answerText()).append("\n\n");
            } else if (Boolean.FALSE.equals(question.correct())) {
                message.append("❌ Неправильно — твой ответ: ").append(question.answerText()).append("\n");
                message.append("   Так ошиблись ").append(question.wrongPct() != null ? question.wrongPct() : 0)
                        .append("% группы\n\n");
            }
        }

        message.append("───────────────────────\n");
        message.append("Итого: ").append(student.totalCorrect()).append(" из ")
                .append(student.totalQuestions()).append(" правильных (")
                .append(student.percent()).append("%)\n");
        message.append("Твой перцентиль в группе: лучше ")
                .append(student.percentile()).append("% участников");
        return message.toString();
    }
}
