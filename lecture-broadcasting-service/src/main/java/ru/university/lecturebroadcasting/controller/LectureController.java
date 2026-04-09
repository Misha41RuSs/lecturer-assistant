package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.lecturebroadcasting.bot.LectureBroadcastingBot;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.service.LectureService;

import java.util.Map;

@RestController
@RequestMapping("/lectures")
@RequiredArgsConstructor
public class LectureController {

    private final LectureService lectureService;
    private final LectureBroadcastingBot bot;

    @PostMapping
    public ResponseEntity<Lecture> createLecture(@RequestBody Map<String, String> body) {
        Lecture lecture = lectureService.createLecture(body.get("name"));
        return ResponseEntity.ok(lecture);
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Lecture> startLecture(@PathVariable Long id) {
        return ResponseEntity.ok(lectureService.startLecture(id));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<Lecture> stopLecture(@PathVariable Long id) {
        return ResponseEntity.ok(lectureService.stopLecture(id));
    }

    @PutMapping("/{id}/current-slide")
    public ResponseEntity<Void> updateCurrentSlide(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {

        int slideNumber = body.get("slideNumber");
        LectureService.SlideUpdateResult result = lectureService.updateCurrentSlide(id, slideNumber);

        if (result.imageBytes() != null) {
            for (Long chatId : result.chatIds()) {
                bot.sendSlideToStudent(chatId, result.imageBytes(), slideNumber);
            }
        }

        return ResponseEntity.ok().build();
    }
}