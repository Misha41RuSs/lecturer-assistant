package ru.university.quizservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.university.quizservice.dto.*;
import ru.university.quizservice.entity.Exam;
import ru.university.quizservice.entity.ExamAnswer;
import ru.university.quizservice.service.ExamService;

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
    public List<ExamSummaryDto> listByLecture(@PathVariable UUID lectureId) {
        return examService.listByLecture(lectureId);
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

    @PutMapping("/answers/{answerId}/grade")
    public ResponseEntity<ExamAnswer> grade(
            @PathVariable UUID answerId,
            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(examService.gradeAnswer(answerId, body.get("score")));
    }
}