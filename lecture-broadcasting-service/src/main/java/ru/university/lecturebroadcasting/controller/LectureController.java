package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.university.lecturebroadcasting.bot.LectureBroadcastingBot;
import ru.university.lecturebroadcasting.dto.LectureListItem;
import ru.university.lecturebroadcasting.dto.StudentDto;
import ru.university.lecturebroadcasting.entity.AccessType;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.PaceSignal;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.PostLectureSurveyService;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.StudentQuestionService;
import ru.university.lecturebroadcasting.websocket.SlideUpdateMessage;

import java.util.List;
import java.util.Map;

@Slf4j

@RestController
@RequestMapping("/lectures")
@RequiredArgsConstructor
public class LectureController {

    private final LectureService lectureService;
    private final LectureBroadcastingBot bot;
    private final SimpMessagingTemplate messagingTemplate;
    private final QuizServiceClient quizServiceClient;
    private final StudentQuestionService studentQuestionService;
    private final PostLectureSurveyService postLectureSurveyService;

    @PostMapping
    public ResponseEntity<Lecture> createLecture(@RequestBody Map<String, String> body) {
        String seqString = body.get("sequenceId");
        java.util.UUID sequenceId = seqString != null ? java.util.UUID.fromString(seqString) : null;
        AccessType accessType = parseAccessType(body.get("accessType"));
        String password = body.get("password");
        Integer durationMinutes = parseInteger(body.get("durationMinutes"));
        Boolean allowQuestions = parseBoolean(body.get("allowQuestions"));
        Boolean anonymousQuestions = parseBoolean(body.get("anonymousQuestions"));
        Boolean requireStudentProfile = parseBoolean(body.get("requireStudentProfile"));
        Lecture lecture = lectureService.createLecture(
                body.get("name"), sequenceId, accessType, password, durationMinutes, allowQuestions,
                anonymousQuestions, requireStudentProfile);
        return ResponseEntity.ok(lecture);
    }

    /**
     * Список всех лекций (id, имя, статус) — для отладки /join и сверки с БД.
     */
    @GetMapping
    public List<LectureListItem> listLectures() {
        return lectureService.findAllOrderByIdDesc().stream()
                .map(l -> new LectureListItem(
                        l.getId(),
                        l.getName(),
                        l.getStatus().name(),
                        l.getCurrentSlide(),
                        l.getSequenceId() != null ? l.getSequenceId().toString() : null,
                        l.getAccessType() != null ? l.getAccessType().name() : "OPEN"
                ))
                .toList();
    }

    /**
     * Быстрая проверка: тот же JDBC-пул, что и у бота. Сравните lectureCount с SELECT COUNT(*) FROM lectures.
     */
    @GetMapping("/health/db")
    public Map<String, Object> lecturesDbHealth() {
        return Map.of(
                "service", "lecture-broadcasting-service",
                "sameDbAsTelegramBotJoin", true,
                "lecturesTableRowCount", lectureService.countLectures()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Lecture> getLecture(@PathVariable Long id) {
        return ResponseEntity.ok(lectureService.getLecture(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Lecture> updateLecture(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String name = body.get("name");
        AccessType accessType = parseAccessType(body.get("accessType"));
        String password = body.get("password");
        Integer durationMinutes = parseInteger(body.get("durationMinutes"));
        Boolean allowQuestions = parseBoolean(body.get("allowQuestions"));
        Boolean anonymousQuestions = parseBoolean(body.get("anonymousQuestions"));
        Boolean requireStudentProfile = parseBoolean(body.get("requireStudentProfile"));
        return ResponseEntity.ok(lectureService.updateLecture(
                id, name, accessType, password, durationMinutes, allowQuestions,
                anonymousQuestions, requireStudentProfile));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLecture(@PathVariable Long id) {
        lectureService.deleteLecture(id);
        return ResponseEntity.noContent().build();
    }
    /**
     * Принимает PNG-композит (слайд + рисунки) и рассылает его всем подключённым студентам.
     * Вызывается фронтом когда на слайде есть аннотации.
     */
    @PostMapping(value = "/{id}/broadcast-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> broadcastCustomImage(
            @PathVariable Long id,
            @RequestPart("image") MultipartFile image) throws java.io.IOException {
        Lecture lecture = lectureService.getLecture(id);
        byte[] imageBytes = image.getBytes();
        List<Long> chatIds = lectureService.getStudentChatIds(id);
        for (Long chatId : chatIds) {
            bot.sendSlideToStudent(id, chatId, imageBytes, lecture.getCurrentSlide());
        }
        return ResponseEntity.ok().build();
    }

    private static AccessType parseAccessType(String value) {
        if (value == null) return null;
        try {
            return AccessType.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static Integer parseInteger(String value) {
        if (value == null || value.isBlank()) return null;
        return Integer.parseInt(value.trim());
    }

    private static Boolean parseBoolean(String value) {
        if (value == null || value.isBlank()) return null;
        return Boolean.parseBoolean(value.trim());
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Lecture> startLecture(@PathVariable Long id) {
        LectureService.StartLectureResult result = lectureService.startLecture(id);
        Lecture lecture = result.lecture();
        if (result.notifyStudents()) {
            List<Long> chatIds = lectureService.getStudentChatIds(id);
            bot.notifyLectureStartedToStudents(
                    id,
                    lecture.getName(),
                    lecture.getCurrentSlide() != null ? lecture.getCurrentSlide() : 1,
                    chatIds
            );
        }
        return ResponseEntity.ok(lecture);
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<Lecture> stopLecture(@PathVariable Long id) {
        quizServiceClient.closeAllExamsForLecture(id);
        LectureService.StopLectureResult result = lectureService.stopLecture(id);
        studentQuestionService.clearByLecture(id);
        bot.notifyLectureEndedToStudents(id, result.lecture().getName(), result.disconnectedChatIds());
        bot.sendPostLectureSurvey(id, result.lecture().getName(), result.disconnectedChatIds());
        return ResponseEntity.ok(result.lecture());
    }

    @PostMapping("/{id}/post-survey")
    public ResponseEntity<Void> savePostSurvey(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Long chatId = Long.parseLong(body.get("chatId"));
        int rating = Integer.parseInt(body.get("rating"));
        PaceSignal pace = PaceSignal.valueOf(body.get("paceSignal"));
        postLectureSurveyService.saveResponse(id, chatId, rating, pace, body.get("openText"));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/post-survey/results")
    public Map<String, Object> getPostSurveyResults(@PathVariable Long id) {
        PostLectureSurveyService.Results results = postLectureSurveyService.results(id);
        return Map.of(
                "totalStudents", results.totalStudents(),
                "responded", results.responded(),
                "avgRating", results.avgRating(),
                "ratingDistribution", results.ratingDistribution(),
                "pace", results.paceCounts(),
                "openTexts", results.openTexts()
        );
    }

    @PostMapping("/{id}/broadcast-message")
    public ResponseEntity<Void> broadcastMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String text = body.get("text");
        if (text == null || text.isBlank()) return ResponseEntity.badRequest().build();
        List<Long> chatIds = lectureService.getStudentChatIds(id);
        for (Long chatId : chatIds) bot.sendTextMessage(id, chatId, "📢 " + text);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<List<StudentDto>> getStudents(@PathVariable Long id) {
        return ResponseEntity.ok(lectureService.getStudents(id));
    }
    @GetMapping("/{id}/all-students")
    public ResponseEntity<List<StudentDto>> getAllStudents(@PathVariable Long id) {
        return ResponseEntity.ok(lectureService.getAllStudents(id));
    }

    @PostMapping("/{id}/kick/{chatId}")
    public ResponseEntity<Void> kickStudent(@PathVariable Long id, @PathVariable Long chatId) {
        lectureService.kickStudent(id, chatId);
        bot.sendTextMessage(id, chatId, "Вы отключены лектором от текущей лекции.");
        return ResponseEntity.ok().build();
    }


    @PutMapping("/{id}/current-slide")
    public ResponseEntity<Void> updateCurrentSlide(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {

        int slideNumber = body.get("slideNumber");
        LectureService.SlideUpdateResult result = lectureService.updateCurrentSlide(id, slideNumber);

        // рассылка в Telegram всем подписанным студентам
        if (!result.chatIds().isEmpty()) {
            log.info("Broadcasting slide {} to {} students", slideNumber, result.chatIds().size());
            for (Long chatId : result.chatIds()) {
                bot.sendSlideToStudent(id, chatId, result.imageBytes(), slideNumber);
            }
        }
        if (result.imageBytes() == null) {
            log.warn("Slide image unavailable for lectureId={} slide={} (content-service unreachable or no presentation)", id, slideNumber);
        }

        // рассылка через WebSocket проектору / интерфейсу лектора
        messagingTemplate.convertAndSend(
                "/topic/lectures/" + id + "/slide",
                new SlideUpdateMessage(id, slideNumber)
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/traffic")
    public ResponseEntity<Double> getLectureTraffic(@PathVariable Long id) {
        return ResponseEntity.ok(bot.getLectureTrafficMb(String.valueOf(id)));
    }
}
