package ru.university.quizservice.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.quizservice.dto.*;
import ru.university.quizservice.entity.*;
import ru.university.quizservice.repository.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamSubmissionRepository submissionRepository;
    private final ExamAnswerRepository answerRepository;

    public ExamService(ExamRepository examRepository,
                       ExamSubmissionRepository submissionRepository,
                       ExamAnswerRepository answerRepository) {
        this.examRepository = examRepository;
        this.submissionRepository = submissionRepository;
        this.answerRepository = answerRepository;
    }

    @Transactional
    public Exam createExam(CreateExamDto dto) {
        Exam exam = new Exam();
        exam.setLectureId(Long.parseLong(dto.lectureId()));
        exam.setTitle(dto.title());
        exam.setTotalTimeSec(dto.totalTimeSec());
        if (dto.examType() != null) {
            exam.setExamType(ExamType.valueOf(dto.examType()));
        }

        int idx = 0;
        for (CreateExamDto.QuestionDto qDto : dto.questions()) {
            ExamQuestion q = new ExamQuestion();
            q.setExam(exam);
            q.setOrderIndex(idx++);
            q.setText(qDto.text());
            q.setType(QuestionType.valueOf(qDto.type()));
            q.setTimeLimitSec(qDto.timeLimitSec());

            if (qDto.options() != null) {
                int optIdx = 0;
                for (CreateExamDto.OptionDto oDto : qDto.options()) {
                    ExamOption opt = new ExamOption();
                    opt.setQuestion(q);
                    opt.setOrderIndex(optIdx++);
                    opt.setText(oDto.text());
                    opt.setCorrect(oDto.correct());
                    q.getOptions().add(opt);
                }
            }
            exam.getQuestions().add(q);
        }
        return examRepository.save(exam);
    }

    @Transactional
    public Exam duplicateExam(UUID examId) {
        Exam src = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));
        Exam copy = new Exam();
        copy.setLectureId(src.getLectureId());
        copy.setTitle(src.getTitle() + " (копия)");
        copy.setTotalTimeSec(src.getTotalTimeSec());
        copy.setExamType(src.getExamType());
        int idx = 0;
        for (ExamQuestion srcQ : src.getQuestions()) {
            ExamQuestion q = new ExamQuestion();
            q.setExam(copy);
            q.setOrderIndex(idx++);
            q.setText(srcQ.getText());
            q.setType(srcQ.getType());
            q.setTimeLimitSec(srcQ.getTimeLimitSec());
            int optIdx = 0;
            for (ExamOption srcO : srcQ.getOptions()) {
                ExamOption opt = new ExamOption();
                opt.setQuestion(q);
                opt.setOrderIndex(optIdx++);
                opt.setText(srcO.getText());
                opt.setCorrect(srcO.isCorrect());
                q.getOptions().add(opt);
            }
            copy.getQuestions().add(q);
        }
        return examRepository.save(copy);
    }

    public Exam getExam(UUID examId) {
        return examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));
    }

    public ExamDetailDto getExamDetail(UUID examId) {
        return toDetail(getExam(examId));
    }

    public List<ExamSummaryDto> listByLecture(Long lectureId) {
        return examRepository.findByLectureIdOrderByCreatedAtDesc(lectureId)
                .stream()
                .map(e -> new ExamSummaryDto(
                        e.getId(), e.getTitle(), e.getTotalTimeSec(),
                        e.getStatus().name(), e.getExamType().name(), e.getQuestions().size(),
                        e.isFeedbackReleased()))
                .toList();
    }

    @Transactional
    public Exam launchExam(UUID examId) {
        Exam exam = getExam(examId);
        exam.setStatus(ExamStatus.ACTIVE);
        exam.setActivatedAt(Instant.now());
        return examRepository.save(exam);
    }

    @Transactional
    public Exam closeExam(UUID examId) {
        Exam exam = getExam(examId);
        exam.setStatus(ExamStatus.CLOSED);
        return examRepository.save(exam);
    }

    @Transactional
    public ExamDetailDto startSubmission(UUID examId, Long chatId) {
        Exam exam = getExam(examId);
        if (exam.getStatus() != ExamStatus.ACTIVE) {
            throw new IllegalStateException("Exam is not active");
        }
        submissionRepository.findByExam_IdAndChatId(examId, chatId)
                .orElseGet(() -> {
                    ExamSubmission s = new ExamSubmission();
                    s.setExam(exam);
                    s.setChatId(chatId);
                    return submissionRepository.save(s);
                });
        return toDetail(exam);
    }

    @Transactional
    public ExamAnswer submitAnswer(UUID examId, Long chatId, SubmitAnswerDto dto) {
        ExamSubmission sub = submissionRepository.findByExam_IdAndChatId(examId, chatId)
                .orElseThrow(() -> new IllegalArgumentException("No active submission for chatId=" + chatId));

        Exam exam = sub.getExam();
        if (exam.getStatus() != ExamStatus.ACTIVE) {
            throw new IllegalStateException("Exam is already closed");
        }
        if (exam.getTotalTimeSec() != null && exam.getActivatedAt() != null) {
            long elapsed = Instant.now().getEpochSecond() - exam.getActivatedAt().getEpochSecond();
            if (elapsed > exam.getTotalTimeSec()) {
                throw new IllegalStateException("Exam time limit exceeded");
            }
        }
        UUID questionId = UUID.fromString(dto.questionId());

        ExamQuestion question = exam.getQuestions().stream()
                .filter(q -> q.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));

        ExamAnswer answer = new ExamAnswer();
        answer.setSubmission(sub);
        answer.setQuestion(question);

        if (question.getType() == QuestionType.MULTIPLE) {
            if (dto.selectedOptionId() != null) {
                UUID optId = UUID.fromString(dto.selectedOptionId());
                answer.setSelectedOptionId(optId);
                boolean correct = question.getOptions().stream()
                        .anyMatch(o -> o.getId().equals(optId) && o.isCorrect());
                answer.setScore(correct ? answer.getMaxScore() : 0);
            } else {
                answer.setScore(0);
            }
        } else {
            answer.setOpenText(dto.openText());
        }

        ExamAnswer saved = answerRepository.save(answer);

        long answered = answerRepository.findBySubmission_Id(sub.getId()).size();
        if (answered >= exam.getQuestions().size()) {
            sub.setCompletedAt(Instant.now());
            submissionRepository.save(sub);
        }

        return saved;
    }

    public List<SubmissionResultDto> getSubmissions(UUID examId) {
        Exam exam = getExam(examId);
        List<ExamSubmission> subs = submissionRepository.findByExam_IdOrderByStartedAtDesc(examId);

        Map<UUID, ExamOption> optionMap = exam.getQuestions().stream()
                .flatMap(q -> q.getOptions().stream())
                .collect(Collectors.toMap(ExamOption::getId, o -> o));

        Map<UUID, ExamQuestion> questionMap = exam.getQuestions().stream()
                .collect(Collectors.toMap(ExamQuestion::getId, q -> q));

        return subs.stream().map(sub -> {
            List<ExamAnswer> answers = answerRepository.findBySubmission_Id(sub.getId());

            int totalScore = 0, maxScore = 0;
            boolean hasUngraded = false;
            List<SubmissionResultDto.AnswerDto> answerDtos = new ArrayList<>();

            for (ExamAnswer a : answers) {
                maxScore += a.getMaxScore();
                if (a.getScore() != null) totalScore += a.getScore();
                else hasUngraded = true;

                ExamQuestion q = questionMap.get(a.getQuestion().getId());
                ExamOption selectedOpt = a.getSelectedOptionId() != null
                        ? optionMap.get(a.getSelectedOptionId()) : null;

                Boolean correct = null;
                if (q != null && q.getType() == QuestionType.MULTIPLE && selectedOpt != null) {
                    correct = selectedOpt.isCorrect();
                } else if (q != null && q.getType() == QuestionType.OPEN && a.getScore() != null) {
                    correct = a.getScore() >= a.getMaxScore();
                }

                answerDtos.add(new SubmissionResultDto.AnswerDto(
                        a.getId(),
                        q != null ? q.getId() : null,
                        q != null ? q.getOrderIndex() : 0,
                        q != null ? q.getText() : "",
                        q != null ? q.getType().name() : "",
                        a.getSelectedOptionId(),
                        selectedOpt != null ? selectedOpt.getText() : null,
                        a.getOpenText(),
                        a.getScore(),
                        a.getMaxScore(),
                        correct
                ));
            }

            return new SubmissionResultDto(
                    sub.getId(), sub.getChatId(),
                    sub.getStartedAt(), sub.getCompletedAt(),
                    totalScore, maxScore, hasUngraded, answerDtos
            );
        }).toList();
    }

    @Transactional
    public Exam updateExam(UUID examId, CreateExamDto dto) {
        Exam exam = getExam(examId);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Нельзя редактировать запущенный или закрытый тест");
        }
        exam.setTitle(dto.title());
        exam.setTotalTimeSec(dto.totalTimeSec());
        exam.getQuestions().clear();

        int idx = 0;
        for (CreateExamDto.QuestionDto qDto : dto.questions()) {
            ExamQuestion q = new ExamQuestion();
            q.setExam(exam);
            q.setOrderIndex(idx++);
            q.setText(qDto.text());
            q.setType(QuestionType.valueOf(qDto.type()));
            q.setTimeLimitSec(qDto.timeLimitSec());
            if (qDto.options() != null) {
                int optIdx = 0;
                for (CreateExamDto.OptionDto oDto : qDto.options()) {
                    ExamOption opt = new ExamOption();
                    opt.setQuestion(q);
                    opt.setOrderIndex(optIdx++);
                    opt.setText(oDto.text());
                    opt.setCorrect(oDto.correct());
                    q.getOptions().add(opt);
                }
            }
            exam.getQuestions().add(q);
        }
        return examRepository.save(exam);
    }

    @Transactional
    public void deleteExam(UUID examId) {
        examRepository.delete(getExam(examId));
    }

    @Transactional
    public Exam importFromGift(Long lectureId, String title, String content) {
        GiftParser parser = new GiftParser();
        List<CreateExamDto.QuestionDto> questions = parser.parse(content);
        if (questions.isEmpty()) throw new IllegalArgumentException("No questions found in GIFT file");
        CreateExamDto dto = new CreateExamDto(String.valueOf(lectureId), title, null, "EXAM", questions);
        return createExam(dto);
    }

    @Transactional(readOnly = true)
    public String exportToGift(UUID examId) {
        Exam exam = getExam(examId);
        exam.getQuestions().forEach(q -> q.getOptions().size()); // init lazy collections
        return new GiftExporter().export(exam);
    }

    @Transactional
    public ExamAnswer gradeAnswer(UUID answerId, int score) {
        ExamAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new IllegalArgumentException("Answer not found: " + answerId));
        if (score < 0 || score > answer.getMaxScore()) {
            throw new IllegalArgumentException("Score must be 0–" + answer.getMaxScore());
        }
        answer.setScore(score);
        return answerRepository.save(answer);
    }

    private ExamDetailDto toDetail(Exam exam) {
        List<ExamDetailDto.QuestionDto> questions = exam.getQuestions().stream()
                .map(q -> new ExamDetailDto.QuestionDto(
                        q.getId(), q.getOrderIndex(), q.getText(), q.getType().name(),
                        q.getTimeLimitSec(),
                        q.getOptions().stream()
                                .map(o -> new ExamDetailDto.OptionDto(o.getId(), o.getText(), o.isCorrect()))
                                .toList()
                ))
                .toList();

        return new ExamDetailDto(
                exam.getId(), exam.getLectureId(), exam.getTitle(),
                exam.getTotalTimeSec(), exam.getStatus().name(), exam.getExamType().name(),
                exam.isFeedbackReleased(), questions
        );
    }

    @Transactional
    public ExamFeedbackDto releaseFeedback(UUID examId) {
        Exam exam = getExam(examId);
        if (exam.getStatus() != ExamStatus.CLOSED) {
            throw new IllegalStateException("Exam must be closed before releasing feedback");
        }
        if (exam.isFeedbackReleased()) {
            throw new IllegalStateException("Exam feedback already released");
        }

        List<SubmissionResultDto> submissions = getSubmissions(examId);
        Map<UUID, Integer> wrongPctByQuestion = calculateWrongPctByQuestion(submissions);
        List<Integer> percents = submissions.stream()
                .map(this::submissionPercent)
                .sorted()
                .toList();

        List<ExamFeedbackDto.StudentFeedbackDto> studentFeedback = submissions.stream()
                .map(submission -> toStudentFeedback(submission, wrongPctByQuestion, percents))
                .toList();

        Instant releasedAt = Instant.now();
        exam.setFeedbackReleased(true);
        exam.setFeedbackReleasedAt(releasedAt);
        examRepository.save(exam);

        return new ExamFeedbackDto(exam.getId(), exam.getLectureId(), exam.getTitle(), releasedAt, studentFeedback);
    }

    private Map<UUID, Integer> calculateWrongPctByQuestion(List<SubmissionResultDto> submissions) {
        Map<UUID, List<SubmissionResultDto.AnswerDto>> byQuestion = submissions.stream()
                .flatMap(submission -> submission.answers().stream())
                .filter(answer -> answer.questionId() != null)
                .collect(Collectors.groupingBy(SubmissionResultDto.AnswerDto::questionId));

        Map<UUID, Integer> result = new HashMap<>();
        byQuestion.forEach((questionId, answers) -> {
            long total = answers.stream()
                    .filter(answer -> answer.correct() != null)
                    .count();
            long wrong = answers.stream()
                    .filter(answer -> Boolean.FALSE.equals(answer.correct()))
                    .count();
            result.put(questionId, total > 0 ? Math.round(wrong * 100f / total) : 0);
        });
        return result;
    }

    private ExamFeedbackDto.StudentFeedbackDto toStudentFeedback(
            SubmissionResultDto submission,
            Map<UUID, Integer> wrongPctByQuestion,
            List<Integer> percents) {
        List<SubmissionResultDto.AnswerDto> answers = submission.answers().stream()
                .filter(answer -> answer.correct() != null)
                .sorted(Comparator.comparingInt(SubmissionResultDto.AnswerDto::orderIndex))
                .toList();
        int totalQuestions = answers.size();
        int totalCorrect = (int) answers.stream()
                .filter(answer -> Boolean.TRUE.equals(answer.correct()))
                .count();
        int percent = submissionPercent(submission);
        int percentile = percentile(percent, percents);

        List<ExamFeedbackDto.QuestionFeedbackDto> questions = answers.stream()
                .map(answer -> new ExamFeedbackDto.QuestionFeedbackDto(
                        questionOrder(answer),
                        answer.questionText(),
                        selectedAnswerText(answer),
                        answer.correct(),
                        Boolean.FALSE.equals(answer.correct()) ? wrongPctByQuestion.getOrDefault(answer.questionId(), 0) : null
                ))
                .toList();

        return new ExamFeedbackDto.StudentFeedbackDto(
                submission.chatId(), totalCorrect, totalQuestions, percent, percentile, questions);
    }

    private int submissionPercent(SubmissionResultDto submission) {
        return submission.maxScore() > 0
                ? Math.round(submission.totalScore() * 100f / submission.maxScore())
                : 0;
    }

    private int percentile(int percent, List<Integer> percents) {
        if (percents.isEmpty()) return 0;
        long lowerOrEqual = percents.stream().filter(value -> value <= percent).count();
        return Math.round(lowerOrEqual * 100f / percents.size());
    }

    private int questionOrder(SubmissionResultDto.AnswerDto answer) {
        return answer.orderIndex();
    }

    private String selectedAnswerText(SubmissionResultDto.AnswerDto answer) {
        if (answer.selectedOptionText() != null && !answer.selectedOptionText().isBlank()) {
            return answer.selectedOptionText();
        }
        if (answer.openText() != null && !answer.openText().isBlank()) {
            return answer.openText();
        }
        return "Без ответа";
    }

    @Transactional(readOnly = true)
    public ExamAnalyticsDto getAnalytics(UUID examId) {
        Exam exam = getExam(examId);
        List<ExamSubmission> subs = submissionRepository.findByExam_IdOrderByStartedAtDesc(examId);
        List<ExamAnswer> allAnswers = answerRepository.findWithQuestionByExamId(examId);

        // Build option lookup
        Map<UUID, ExamOption> optionMap = exam.getQuestions().stream()
                .flatMap(q -> q.getOptions().stream())
                .collect(Collectors.toMap(ExamOption::getId, o -> o));

        // ── Per-question stats ──────────────────────────────────────────────
        List<ExamAnalyticsDto.QuestionStatDto> questionStats = exam.getQuestions().stream()
                .sorted(Comparator.comparingInt(ExamQuestion::getOrderIndex))
                .map(q -> {
                    List<ExamAnswer> qAnswers = allAnswers.stream()
                            .filter(a -> a.getQuestion().getId().equals(q.getId()))
                            .toList();

                    int total = qAnswers.size();
                    int correct = 0;

                    List<ExamAnalyticsDto.OptionStatDto> optionStats = new ArrayList<>();

                    if (q.getType() == QuestionType.MULTIPLE) {
                        // Count how many times each option was chosen
                        Map<UUID, Long> choiceCounts = qAnswers.stream()
                                .filter(a -> a.getSelectedOptionId() != null)
                                .collect(Collectors.groupingBy(ExamAnswer::getSelectedOptionId, Collectors.counting()));

                        correct = (int) qAnswers.stream()
                                .filter(a -> a.getSelectedOptionId() != null &&
                                        optionMap.containsKey(a.getSelectedOptionId()) &&
                                        optionMap.get(a.getSelectedOptionId()).isCorrect())
                                .count();

                        optionStats = q.getOptions().stream()
                                .sorted(Comparator.comparingInt(ExamOption::getOrderIndex))
                                .map(opt -> {
                                    int chosen = choiceCounts.getOrDefault(opt.getId(), 0L).intValue();
                                    int pct = total > 0 ? Math.round(chosen * 100f / total) : 0;
                                    return new ExamAnalyticsDto.OptionStatDto(
                                            opt.getId(), opt.getText(), opt.isCorrect(), chosen, pct);
                                })
                                .toList();
                    }

                    int correctPct = (q.getType() == QuestionType.MULTIPLE && total > 0)
                            ? Math.round(correct * 100f / total) : 0;

                    return new ExamAnalyticsDto.QuestionStatDto(
                            q.getId(), q.getOrderIndex(), q.getText(), q.getType().name(),
                            total, correct, correctPct, optionStats
                    );
                })
                .toList();

        // ── Per-student stats ──────────────────────────────────────────────
        Map<UUID, List<ExamAnswer>> answersBySubmission = allAnswers.stream()
                .collect(Collectors.groupingBy(a -> a.getSubmission().getId()));

        List<ExamAnalyticsDto.StudentStatDto> studentStats = subs.stream().map(sub -> {
            List<ExamAnswer> answers = answersBySubmission.getOrDefault(sub.getId(), List.of());

            int totalScore = 0, maxScore = 0, correctMultiple = 0, totalMultiple = 0;
            boolean hasUngraded = false;

            for (ExamAnswer a : answers) {
                maxScore += a.getMaxScore();
                if (a.getScore() != null) totalScore += a.getScore();
                else hasUngraded = true;

                if (a.getQuestion().getType() == QuestionType.MULTIPLE) {
                    totalMultiple++;
                    if (a.getSelectedOptionId() != null &&
                            optionMap.containsKey(a.getSelectedOptionId()) &&
                            optionMap.get(a.getSelectedOptionId()).isCorrect()) {
                        correctMultiple++;
                    }
                }
            }

            int correctPct = totalMultiple > 0
                    ? Math.round(correctMultiple * 100f / totalMultiple) : 0;

            return new ExamAnalyticsDto.StudentStatDto(
                    sub.getChatId(), totalScore, maxScore,
                    correctPct, correctMultiple, totalMultiple, hasUngraded
            );
        }).toList();

        return new ExamAnalyticsDto(
                exam.getId(), exam.getTitle(), subs.size(), questionStats, studentStats
        );
    }
}
