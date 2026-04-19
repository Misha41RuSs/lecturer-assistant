package ru.university.lecturebroadcasting.bot;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.methods.send.SendPhoto;
import org.telegram.telegrambots.meta.api.objects.InputFile;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.StudentRepository;
import ru.university.lecturebroadcasting.service.AnalyticsServiceClient;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.PasswordRequiredException;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.QuizServiceClient.ExamDetail.Question;
import ru.university.lecturebroadcasting.service.WrongPasswordException;

import org.telegram.telegrambots.meta.api.methods.updatingmessages.EditMessageMedia;
import org.telegram.telegrambots.meta.api.objects.media.InputMediaPhoto;
import org.telegram.telegrambots.meta.api.objects.Message;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class LectureBroadcastingBot extends TelegramLongPollingBot {

    private static final String CB_PREV_SLIDE = "prev_slide";
    private static final String CB_GOTO_SLIDE = "goto_slide";
    private static final String CB_EXAM_OPT = "exam_opt:";

    private final ConcurrentHashMap<Long, String> pendingPasswordJoin = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, ExamSession> examSessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> lastSlideMessageId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> pendingGoToSlide = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Timer> questionTimers = new ConcurrentHashMap<>();

    private final String botUsername;
    private final StudentRepository studentRepository;
    private final LectureService lectureService;
    private final QuizServiceClient quizServiceClient;
    private final AnalyticsServiceClient analyticsServiceClient;

    public LectureBroadcastingBot(
            @Value("${telegram.bot.token}") String botToken,
            @Value("${telegram.bot.username}") String botUsername,
            StudentRepository studentRepository,
            LectureService lectureService,
            QuizServiceClient quizServiceClient,
            AnalyticsServiceClient analyticsServiceClient) {
        super(botToken);
        this.botUsername = botUsername;
        this.studentRepository = studentRepository;
        this.lectureService = lectureService;
        this.quizServiceClient = quizServiceClient;
        this.analyticsServiceClient = analyticsServiceClient;
    }

    @Override
    public String getBotUsername() { return botUsername; }

    @Override
    public void onUpdateReceived(Update update) {
        if (update.hasMessage() && update.getMessage().hasText()) {
            handleTextMessage(update);
        } else if (update.hasCallbackQuery()) {
            handleCallbackQuery(update);
        }
    }

    private static String baseCommand(String token) {
        if (token == null) return "";
        int at = token.indexOf('@');
        return (at > 0 ? token.substring(0, at) : token).toLowerCase(Locale.ROOT);
    }

    private void handleTextMessage(Update update) {
        String text = update.getMessage().getText().trim();
        long chatId = update.getMessage().getChatId();
        String cmd = baseCommand(text.split("\\s+", 2)[0]);

        log.info("Telegram message: chatId={} cmd='{}'", chatId, cmd);

        if ("/start".equals(cmd)) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length > 1 && parts[1].startsWith("join_")) {
                String lectureKey = parts[1].substring(5);
                tryJoinWithPassword(chatId, lectureKey, null);
                return;
            }
            sendText(chatId,
                    "Привет! Я бот для лекций.\n\n" +
                    "/join <название или id> — подключиться к лекции\n" +
                    "/ping — проверка связи\n\n" +
                    "Когда преподаватель запустит тест, вопросы придут автоматически.");
            return;
        }

        if ("/ping".equals(cmd)) {
            try {
                sendText(chatId, "ok, лекций в БД: " + lectureService.countLectures());
            } catch (Exception e) {
                sendText(chatId, "Ошибка БД: " + e.getMessage());
            }
            return;
        }

        if (pendingPasswordJoin.containsKey(chatId) && !cmd.startsWith("/")) {
            String lectureName = pendingPasswordJoin.remove(chatId);
            tryJoinWithPassword(chatId, lectureName, text.trim());
            return;
        }

        if (pendingGoToSlide.remove(chatId) != null && !cmd.startsWith("/")) {
            handleGoToSlideByNumber(chatId, text.trim());
            return;
        }

        // Студент проходит тест — ввёл открытый ответ
        if (examSessions.containsKey(chatId) && !cmd.startsWith("/")) {
            handleOpenAnswer(chatId, text.trim());
            return;
        }

        if ("/join".equals(cmd) || cmd.startsWith("/join")) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length < 2 || parts[1].isBlank()) {
                sendText(chatId, "Использование: /join <название или id лекции>");
                return;
            }
            String key = LectureService.normalizeLectureJoinKey(parts[1]);
            if (key.isEmpty()) {
                sendText(chatId, "Укажите название лекции или её id.");
                return;
            }
            tryJoinWithPassword(chatId, key, null);
            return;
        }

        sendText(chatId, "Команды:\n/join <название или id> — подключиться к лекции\n/ping — проверка");
    }

    private void handleCallbackQuery(Update update) {
        String data = update.getCallbackQuery().getData();
        long chatId = update.getCallbackQuery().getMessage().getChatId();

        if (CB_PREV_SLIDE.equals(data)) {
            handlePrevSlide(chatId);
            return;
        }

        if (CB_GOTO_SLIDE.equals(data)) {
            pendingGoToSlide.put(chatId, true);
            sendText(chatId, "Введите номер слайда:");
            return;
        }

        if (data.startsWith(CB_EXAM_OPT)) {
            String optionId = data.substring(CB_EXAM_OPT.length());
            handleMultipleChoiceAnswer(chatId, optionId);
        }
    }

    private void handlePrevSlide(long chatId) {
        studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
            if (student.getLecture() == null) {
                sendText(chatId, "Вы не подключены к лекции. Используйте /join.");
                return;
            }
            int prev = student.getLecture().getCurrentSlide() - 1;
            if (prev < 1) { sendText(chatId, "Вы уже на первом слайде."); return; }
            try {
                byte[] img = lectureService.getSlideImage(student.getLecture(), prev);
                sendSlideToStudent(chatId, img, prev);
            } catch (Exception e) {
                sendText(chatId, "Не удалось загрузить слайд.");
            }
        }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
    }

    private void cancelQuestionTimer(long chatId) {
        Timer t = questionTimers.remove(chatId);
        if (t != null) t.cancel();
    }

    private void scheduleQuestionTimer(long chatId, ExamSession session, Question q) {
        if (q.timeLimitSec() == null) return;
        Timer t = new Timer(true);
        questionTimers.put(chatId, t);
        int qIdx = session.currentIndex();
        t.schedule(new TimerTask() {
            @Override
            public void run() {
                ExamSession cur = examSessions.get(chatId);
                if (cur == null || cur.currentIndex() != qIdx) return;
                cancelQuestionTimer(chatId);
                quizServiceClient.submitAnswer(cur.getExamId(), chatId,
                        UUID.fromString(q.id()), null, null);
                cur.advance();
                sendText(chatId, "⏰ Время вышло! Ответ на вопрос не засчитан.");
                sendNextQuestion(chatId, cur);
            }
        }, q.timeLimitSec() * 1000L);
    }

    private void handleMultipleChoiceAnswer(long chatId, String optionId) {
        ExamSession session = examSessions.get(chatId);
        if (session == null) return;
        cancelQuestionTimer(chatId);

        Question q = session.currentQuestion();
        quizServiceClient.submitAnswer(
                session.getExamId(), chatId,
                UUID.fromString(q.id()),
                UUID.fromString(optionId), null);

        session.advance();
        sendNextQuestion(chatId, session);
    }

    private void handleOpenAnswer(long chatId, String text) {
        ExamSession session = examSessions.get(chatId);
        if (session == null) return;
        cancelQuestionTimer(chatId);

        Question q = session.currentQuestion();
        quizServiceClient.submitAnswer(
                session.getExamId(), chatId,
                UUID.fromString(q.id()),
                null, text);

        session.advance();
        sendNextQuestion(chatId, session);
    }

    private void sendNextQuestion(long chatId, ExamSession session) {
        if (!session.hasMore()) {
            examSessions.remove(chatId);
            cancelQuestionTimer(chatId);
            sendText(chatId, "Тест завершён! Ваши ответы записаны. Результаты сообщит преподаватель.");
            return;
        }

        Question q = session.currentQuestion();
        String header = String.format("Вопрос %d/%d", session.currentIndex() + 1, session.total());
        String timeHint = q.timeLimitSec() != null ? " ⏱ " + q.timeLimitSec() + " с" : "";

        if (session.isMultiple()) {
            List<List<InlineKeyboardButton>> keyboard = q.options().stream()
                    .map(opt -> List.of(InlineKeyboardButton.builder()
                            .text(opt.text())
                            .callbackData(CB_EXAM_OPT + opt.id())
                            .build()))
                    .toList();
            String text = header + timeHint + "\n\n" + q.text() + "\n\nВыберите ответ:";
            SendMessage msg = SendMessage.builder()
                    .chatId(chatId)
                    .text(text)
                    .replyMarkup(InlineKeyboardMarkup.builder().keyboard(keyboard).build())
                    .build();
            try { execute(msg); } catch (TelegramApiException e) { log.error("sendQuestion failed", e); }
        } else {
            sendText(chatId, header + timeHint + "\n\n" + q.text() + "\n\nНапишите ответ:");
        }

        scheduleQuestionTimer(chatId, session, q);
    }

    public void sendExamToStudent(long chatId, UUID examId) {
        QuizServiceClient.ExamDetail detail = quizServiceClient.startSubmission(examId, chatId);
        if (detail == null || detail.questions().isEmpty()) {
            sendText(chatId, "Не удалось загрузить тест.");
            return;
        }

        ExamSession session = new ExamSession(examId, detail);
        examSessions.put(chatId, session);

        sendText(chatId, "📝 Начался тест: " + detail.title() +
                (detail.totalTimeSec() != null ? "\nВремя: " + detail.totalTimeSec() / 60 + " мин." : ""));
        sendNextQuestion(chatId, session);
    }

    private void tryJoinWithPassword(long chatId, String lectureName, String password) {
        try {
            Student student = lectureService.joinLecture(lectureName, chatId, password);
            pendingPasswordJoin.remove(chatId);
            sendText(chatId, "Вы подключились к лекции: " + student.getLecture().getName());
            analyticsServiceClient.sendStudentJoinedEvent(student.getLecture().getId());
        } catch (PasswordRequiredException e) {
            pendingPasswordJoin.put(chatId, lectureName);
            sendText(chatId, "🔒 Лекция защищена паролем. Введите пароль:");
        } catch (WrongPasswordException e) {
            pendingPasswordJoin.put(chatId, lectureName);
            sendText(chatId, "❌ Неверный пароль. Попробуйте ещё раз:");
        } catch (IllegalStateException e) {
            sendText(chatId, "Лекция уже завершена.");
        } catch (IllegalArgumentException e) {
            sendText(chatId, "Лекция не найдена: " + lectureName);
        } catch (RuntimeException e) {
            log.error("/join error chatId={}", chatId, e);
            sendText(chatId, "Техническая ошибка при подключении.");
        }
    }

    public void notifyLectureEndedToStudents(String lectureName, List<Long> chatIds) {
        if (chatIds == null || chatIds.isEmpty()) return;
        String title = Objects.requireNonNullElse(lectureName, "лекция");
        String msg = "Лекция «" + title + "» завершена. Вы отключены.\n\n/join <название> — подключиться к другой.";
        for (Long chatId : chatIds) sendText(chatId, msg);
    }

    public void sendSlideToStudent(long chatId, byte[] imageBytes, int slideNumber) {
        InlineKeyboardMarkup markup = InlineKeyboardMarkup.builder()
                .keyboardRow(List.of(
                        InlineKeyboardButton.builder().text("◀ Предыдущий").callbackData(CB_PREV_SLIDE).build(),
                        InlineKeyboardButton.builder().text("🔢 Слайд №…").callbackData(CB_GOTO_SLIDE).build()
                ))
                .build();

        Integer prevMsgId = lastSlideMessageId.get(chatId);
        if (prevMsgId != null) {
            try {
                InputMediaPhoto media = InputMediaPhoto.builder()
                        .media("attach://slide.jpg")
                        .mediaName("slide.jpg")
                        .newMediaStream(new ByteArrayInputStream(imageBytes))
                        .caption("Слайд " + slideNumber)
                        .build();
                EditMessageMedia edit = EditMessageMedia.builder()
                        .chatId(chatId)
                        .messageId(prevMsgId)
                        .media(media)
                        .replyMarkup(markup)
                        .build();
                execute(edit);
                return;
            } catch (TelegramApiException e) {
                log.warn("editMessageMedia failed for chatId={}, sending new: {}", chatId, e.getMessage());
                lastSlideMessageId.remove(chatId);
            }
        }

        SendPhoto photo = SendPhoto.builder()
                .chatId(chatId)
                .photo(new InputFile(new ByteArrayInputStream(imageBytes), "slide.jpg"))
                .caption("Слайд " + slideNumber)
                .replyMarkup(markup)
                .build();
        try {
            Message sent = execute(photo);
            lastSlideMessageId.put(chatId, sent.getMessageId());
        } catch (TelegramApiException e) {
            log.error("sendSlide failed chatId={}", chatId, e);
        }
    }

    private void handleGoToSlideByNumber(long chatId, String input) {
        int slideNum;
        try {
            slideNum = Integer.parseInt(input.trim());
        } catch (NumberFormatException e) {
            sendText(chatId, "Введите число — номер слайда.");
            return;
        }
        studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
            if (student.getLecture() == null) {
                sendText(chatId, "Вы не подключены к лекции.");
                return;
            }
            try {
                byte[] img = lectureService.getSlideImage(student.getLecture(), slideNum);
                sendSlideToStudent(chatId, img, slideNum);
            } catch (Exception e) {
                sendText(chatId, "Слайд " + slideNum + " не найден.");
            }
        }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
    }

    private void sendText(long chatId, String text) {
        try {
            execute(SendMessage.builder().chatId(chatId).text(text).build());
        } catch (TelegramApiException e) {
            log.error("sendText failed chatId={}", chatId, e);
        }
    }
}