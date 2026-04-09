package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import ru.university.lecturebroadcasting.bot.LectureBroadcastingBot;
import ru.university.lecturebroadcasting.dto.LectureListItem;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.websocket.SlideUpdateMessage;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/lectures")
@RequiredArgsConstructor
public class LectureController {

    private final LectureService lectureService;
    private final LectureBroadcastingBot bot;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public ResponseEntity<Lecture> createLecture(@RequestBody Map<String, String> body) {
        String seqString = body.get("sequenceId");
        java.util.UUID sequenceId = seqString != null ? java.util.UUID.fromString(seqString) : null;
        Lecture lecture = lectureService.createLecture(body.get("name"), sequenceId);
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
                        l.getSequenceId() != null ? l.getSequenceId().toString() : null
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
        return ResponseEntity.ok(lectureService.updateLectureName(id, name));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Lecture> startLecture(@PathVariable Long id) {
        return ResponseEntity.ok(lectureService.startLecture(id));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<Lecture> stopLecture(@PathVariable Long id) {
        LectureService.StopLectureResult result = lectureService.stopLecture(id);
        bot.notifyLectureEndedToStudents(result.lecture().getName(), result.disconnectedChatIds());
        return ResponseEntity.ok(result.lecture());
    }

    @PutMapping("/{id}/current-slide")
    public ResponseEntity<Void> updateCurrentSlide(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {

        int slideNumber = body.get("slideNumber");
        LectureService.SlideUpdateResult result = lectureService.updateCurrentSlide(id, slideNumber);

        // рассылка в Telegram всем подписанным студентам
        if (result.imageBytes() != null) {
            for (Long chatId : result.chatIds()) {
                bot.sendSlideToStudent(chatId, result.imageBytes(), slideNumber);
            }
        }

        // рассылка через WebSocket проектору / интерфейсу лектора
        messagingTemplate.convertAndSend(
                "/topic/lectures/" + id + "/slide",
                new SlideUpdateMessage(id, slideNumber)
        );

        return ResponseEntity.ok().build();
    }
}