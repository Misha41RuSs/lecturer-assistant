package ru.university.quizservice.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.quizservice.dto.CreateQuestionDto;
import ru.university.quizservice.dto.QuestionDetailDto;
import ru.university.quizservice.dto.QuestionSendDto;
import ru.university.quizservice.entity.*;
import ru.university.quizservice.repository.QuestionRepository;
import ru.university.quizservice.repository.QuestionResponseRepository;
import ru.university.quizservice.repository.QuestionSendRepository;

import java.util.List;
import java.util.UUID;

@Service
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionSendRepository questionSendRepository;
    private final QuestionResponseRepository questionResponseRepository;

    public QuestionService(QuestionRepository questionRepository,
                           QuestionSendRepository questionSendRepository,
                           QuestionResponseRepository questionResponseRepository) {
        this.questionRepository = questionRepository;
        this.questionSendRepository = questionSendRepository;
        this.questionResponseRepository = questionResponseRepository;
    }

    @Transactional
    public Question create(CreateQuestionDto dto) {
        Question q = buildQuestion(dto);
        return questionRepository.save(q);
    }

    public Question get(UUID id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + id));
    }

    public List<Question> listByLecture(Long lectureId) {
        return questionRepository.findByLectureId(lectureId);
    }

    @Transactional
    public Question update(UUID id, CreateQuestionDto dto) {
        Question q = get(id);
        q.setText(dto.text());
        q.setType(QuestionType.valueOf(dto.type()));
        q.setTimeLimitSec(dto.timeLimitSec());
        q.getOptions().clear();
        if (dto.options() != null) {
            int idx = 0;
            for (CreateQuestionDto.OptionDto oDto : dto.options()) {
                QuestionOption opt = new QuestionOption();
                opt.setQuestion(q);
                opt.setOrderIndex(idx++);
                opt.setText(oDto.text());
                opt.setCorrect(oDto.correct());
                q.getOptions().add(opt);
            }
        }
        return questionRepository.save(q);
    }

    @Transactional
    public void delete(UUID id) {
        questionRepository.delete(get(id));
    }

    public QuestionDetailDto toDto(Question q) {
        return new QuestionDetailDto(
                q.getId(), q.getLectureId(), q.getText(), q.getType().name(), q.getTimeLimitSec(),
                q.getOptions().stream()
                        .map(o -> new QuestionDetailDto.OptionDto(o.getId(), o.getText(), o.isCorrect()))
                        .toList()
        );
    }

    @Transactional
    public QuestionSendDto sendQuestion(UUID questionId, Long lectureId, int slideNumber) {
        Question q = get(questionId);
        QuestionSend send = new QuestionSend();
        send.setQuestionId(questionId);
        send.setLectureId(lectureId);
        send.setSlideNumber(slideNumber);
        questionSendRepository.save(send);
        return toSendDto(send, q);
    }

    @Transactional
    public QuestionResponse respond(UUID sendId, Long chatId, UUID selectedOptionId, String openText) {
        QuestionSend send = questionSendRepository.findById(sendId)
                .orElseThrow(() -> new IllegalArgumentException("QuestionSend not found: " + sendId));
        if (questionResponseRepository.existsByQuestionSend_IdAndChatId(sendId, chatId)) {
            throw new IllegalStateException("Already answered: sendId=" + sendId + " chatId=" + chatId);
        }
        Question q = get(send.getQuestionId());

        QuestionResponse response = new QuestionResponse();
        response.setQuestionSend(send);
        response.setChatId(chatId);

        if (q.getType() == QuestionType.MULTIPLE && selectedOptionId != null) {
            response.setSelectedOptionId(selectedOptionId);
            boolean correct = q.getOptions().stream()
                    .anyMatch(o -> o.getId().equals(selectedOptionId) && o.isCorrect());
            response.setCorrect(correct);
        } else {
            response.setOpenText(openText);
        }
        return questionResponseRepository.save(response);
    }

    public List<QuestionSendDto> getQuestionSendsForLecture(Long lectureId) {
        return questionSendRepository.findByLectureIdOrderBySentAtAsc(lectureId).stream()
                .map(send -> {
                    Question q = questionRepository.findById(send.getQuestionId()).orElse(null);
                    return toSendDto(send, q);
                })
                .toList();
    }

    private QuestionSendDto toSendDto(QuestionSend send, Question q) {
        List<QuestionResponse> responses = questionResponseRepository.findByQuestionSend_Id(send.getId());
        int totalResponses = responses.size();
        int correctResponses = (int) responses.stream().filter(r -> Boolean.TRUE.equals(r.getCorrect())).count();
        List<QuestionSendDto.OpenResponseDto> openResponses = responses.stream()
                .filter(r -> r.getOpenText() != null)
                .map(r -> new QuestionSendDto.OpenResponseDto(r.getChatId(), r.getOpenText()))
                .toList();

        List<QuestionSendDto.OptionDto> options = q == null ? List.of() :
                q.getOptions().stream()
                        .map(o -> new QuestionSendDto.OptionDto(o.getId(), o.getText(), o.isCorrect()))
                        .toList();

        return new QuestionSendDto(
                send.getId(),
                send.getQuestionId(),
                q != null ? q.getText() : "",
                q != null ? q.getType().name() : "",
                q != null ? q.getTimeLimitSec() : null,
                options,
                send.getSlideNumber(),
                send.getSentAt(),
                totalResponses,
                correctResponses,
                openResponses
        );
    }

    Question buildQuestion(CreateQuestionDto dto) {
        Question q = new Question();
        q.setLectureId(dto.lectureId());
        q.setText(dto.text());
        q.setType(QuestionType.valueOf(dto.type()));
        q.setTimeLimitSec(dto.timeLimitSec());
        if (dto.options() != null) {
            int idx = 0;
            for (CreateQuestionDto.OptionDto oDto : dto.options()) {
                QuestionOption opt = new QuestionOption();
                opt.setQuestion(q);
                opt.setOrderIndex(idx++);
                opt.setText(oDto.text());
                opt.setCorrect(oDto.correct());
                q.getOptions().add(opt);
            }
        }
        return q;
    }
}
