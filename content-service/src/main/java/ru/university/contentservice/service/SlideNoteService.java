package ru.university.contentservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.contentservice.dto.SlideNoteDto;
import ru.university.contentservice.entity.SlideNote;
import ru.university.contentservice.repository.SlideNoteRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SlideNoteService {

    private final SlideNoteRepository repo;

    // ── GET all notes for a lecture ──────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<SlideNoteDto> getByLecture(Long lectureId) {
        return repo.findByLectureId(lectureId).stream()
                .map(this::toDto)
                .toList();
    }

    // ── GET single note for slide ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public SlideNoteDto getBySlide(Long lectureId, UUID slideId) {
        return repo.findByLectureIdAndSlideId(lectureId, slideId)
                .map(this::toDto)
                .orElse(null);
    }

    // ── CREATE ───────────────────────────────────────────────────────────────
    @Transactional
    public SlideNoteDto create(Long lectureId, UUID slideId, String text) {
        // If note already exists for this slide — update it (upsert semantics)
        SlideNote note = repo.findByLectureIdAndSlideId(lectureId, slideId)
                .orElseGet(() -> SlideNote.builder()
                        .lectureId(lectureId)
                        .slideId(slideId)
                        .build());
        note.setText(text);
        return toDto(repo.save(note));
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    @Transactional
    public SlideNoteDto update(Long id, String text) {
        SlideNote note = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("SlideNote not found: " + id));
        note.setText(text);
        return toDto(repo.save(note));
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }

    // ── Mapper ───────────────────────────────────────────────────────────────
    private SlideNoteDto toDto(SlideNote n) {
        return new SlideNoteDto(
                n.getId(),
                n.getLectureId(),
                n.getSlideId(),
                n.getText(),
                n.getCreatedAt(),
                n.getUpdatedAt()
        );
    }
}
