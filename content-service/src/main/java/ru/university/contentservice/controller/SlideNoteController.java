package ru.university.contentservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.contentservice.dto.SlideNoteDto;
import ru.university.contentservice.dto.SlideNoteRequest;
import ru.university.contentservice.service.SlideNoteService;

import java.util.List;
import java.util.UUID;

/**
 * CRUD-эндпоинты для заметок к слайдам.
 *
 * GET    /lectures/{lectureId}/notes                        — все заметки лекции
 * GET    /lectures/{lectureId}/notes/slide/{slideId}        — заметка к слайду
 * POST   /lectures/{lectureId}/notes/slide/{slideId}        — создать / обновить (upsert)
 * PUT    /lectures/{lectureId}/notes/{noteId}               — обновить по id
 * DELETE /lectures/{lectureId}/notes/{noteId}               — удалить по id
 */
@RestController
@RequestMapping("/lectures/{lectureId}/notes")
@RequiredArgsConstructor
public class SlideNoteController {

    private final SlideNoteService service;

    @GetMapping
    public List<SlideNoteDto> getAllByLecture(@PathVariable Long lectureId) {
        return service.getByLecture(lectureId);
    }

    @GetMapping("/slide/{slideId}")
    public ResponseEntity<SlideNoteDto> getBySlide(
            @PathVariable Long lectureId,
            @PathVariable UUID slideId) {
        SlideNoteDto dto = service.getBySlide(lectureId, slideId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    @PostMapping("/slide/{slideId}")
    public ResponseEntity<SlideNoteDto> upsert(
            @PathVariable Long lectureId,
            @PathVariable UUID slideId,
            @RequestBody SlideNoteRequest body) {
        return ResponseEntity.ok(service.create(lectureId, slideId, body.text()));
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<SlideNoteDto> update(
            @PathVariable Long lectureId,
            @PathVariable Long noteId,
            @RequestBody SlideNoteRequest body) {
        return ResponseEntity.ok(service.update(noteId, body.text()));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long lectureId,
            @PathVariable Long noteId) {
        service.delete(noteId);
        return ResponseEntity.noContent().build();
    }
}
