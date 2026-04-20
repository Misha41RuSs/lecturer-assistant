package ru.university.quizservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ru.university.quizservice.dto.*;
import ru.university.quizservice.entity.Exam;
import ru.university.quizservice.entity.ExamAnswer;
import ru.university.quizservice.service.ExamService;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class ExamController {

    private final ExamService examService;

    public ExamController(ExamService examService) {
        this.examService = examService;
    }

    @PostMapping("/exams")
    public ResponseEntity<ExamDetailDto> create(@RequestBody CreateExamDto dto) {
        Exam exam = examService.createExam(dto);
        return ResponseEntity.ok(examService.getExamDetail(exam.getId()));
    }

    @GetMapping("/exams/{examId}")
    public ResponseEntity<ExamDetailDto> get(@PathVariable UUID examId) {
        return ResponseEntity.ok(examService.getExamDetail(examId));
    }

    @GetMapping("/lectures/{lectureId}/exams")
    public List<ExamSummaryDto> listByLecture(@PathVariable Long lectureId) {
        return examService.listByLecture(lectureId);
    }

    @PutMapping("/exams/{examId}")
    public ResponseEntity<ExamDetailDto> update(
            @PathVariable UUID examId,
            @RequestBody CreateExamDto dto) {
        Exam exam = examService.updateExam(examId, dto);
        return ResponseEntity.ok(examService.getExamDetail(exam.getId()));
    }

    @DeleteMapping("/exams/{examId}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable UUID examId) {
        examService.deleteExam(examId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @PostMapping("/exams/{examId}/duplicate")
    public ResponseEntity<ExamDetailDto> duplicate(@PathVariable UUID examId) {
        Exam copy = examService.duplicateExam(examId);
        return ResponseEntity.ok(examService.getExamDetail(copy.getId()));
    }

    @PostMapping("/exams/{examId}/launch")
    public ResponseEntity<ExamDetailDto> launch(@PathVariable UUID examId) {
        examService.launchExam(examId);
        return ResponseEntity.ok(examService.getExamDetail(examId));
    }

    @PostMapping("/exams/{examId}/close")
    public ResponseEntity<ExamDetailDto> close(@PathVariable UUID examId) {
        examService.closeExam(examId);
        return ResponseEntity.ok(examService.getExamDetail(examId));
    }

    @PostMapping("/exams/{examId}/submissions")
    public ResponseEntity<ExamDetailDto> startSubmission(
            @PathVariable UUID examId,
            @RequestBody StartSubmissionDto dto) {
        return ResponseEntity.ok(examService.startSubmission(examId, dto.chatId()));
    }

    @PostMapping("/exams/{examId}/answers")
    public ResponseEntity<ExamAnswer> submitAnswer(
            @PathVariable UUID examId,
            @RequestParam Long chatId,
            @RequestBody SubmitAnswerDto dto) {
        return ResponseEntity.ok(examService.submitAnswer(examId, chatId, dto));
    }

    @GetMapping("/exams/{examId}/submissions")
    public List<SubmissionResultDto> getSubmissions(@PathVariable UUID examId) {
        return examService.getSubmissions(examId);
    }

    @PostMapping("/exams/import/gift")
    public ResponseEntity<ExamDetailDto> importGift(
            @RequestParam("file") MultipartFile file,
            @RequestParam("lectureId") Long lectureId,
            @RequestParam(value = "title", required = false) String title) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        if (title == null || title.isBlank()) {
            String filename = file.getOriginalFilename();
            title = (filename != null && filename.contains("."))
                    ? filename.substring(0, filename.lastIndexOf('.'))
                    : (filename != null ? filename : "Импорт из GIFT");
        }
        Exam exam = examService.importFromGift(lectureId, title, content);
        return ResponseEntity.ok(examService.getExamDetail(exam.getId()));
    }

    @GetMapping(value = "/exams/{examId}/export/gift", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<String> exportGift(@PathVariable UUID examId) {
        String giftText = examService.exportToGift(examId);
        Exam exam = examService.getExam(examId);
        String filename = exam.getTitle().replaceAll("[^a-zA-Zа-яА-Я0-9_\\-]", "_") + ".gift";
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename*=UTF-8''" + encodeFilename(filename))
                .body(giftText);
    }

    private String encodeFilename(String filename) {
        try {
            return java.net.URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        } catch (Exception e) {
            return "exam.gift";
        }
    }

    @PutMapping("/answers/{answerId}/grade")
    public ResponseEntity<ExamAnswer> grade(
            @PathVariable UUID answerId,
            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(examService.gradeAnswer(answerId, body.get("score")));
    }
}