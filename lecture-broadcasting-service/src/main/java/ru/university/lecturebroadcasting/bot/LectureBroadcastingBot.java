package ru.university.lecturebroadcasting.bot;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.methods.send.SendPhoto;
import org.telegram.telegrambots.meta.api.objects.InputFile;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.bots.DefaultBotOptions;
import org.springframework.web.client.RestTemplate;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardButton;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.StudentRepository;
import io.micrometer.core.instrument.Timer;
import ru.university.lecturebroadcasting.service.AnalyticsServiceClient;
import ru.university.lecturebroadcasting.service.DeliveryMetricsService;
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.PasswordRequiredException;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.QuizServiceClient.ExamDetail.Question;
import ru.university.lecturebroadcasting.service.StudentQuestionService;
import ru.university.lecturebroadcasting.service.WrongPasswordException;

import org.telegram.telegrambots.meta.api.methods.updatingmessages.DeleteMessage;
import org.telegram.telegrambots.meta.api.methods.updatingmessages.EditMessageText;
import org.telegram.telegrambots.meta.api.objects.Message;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ForceReplyKeyboard;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class LectureBroadcastingBot extends TelegramLongPollingBot {

    private static final String CB_PREV_SLIDE = "prev_slide";
    private static final String CB_CURRENT_SLIDE = "current_slide";
    private static final String CB_GOTO_SLIDE = "goto_slide";
    private static final String CB_EXAM_OPT = "exam_opt:";
    private static final String BTN_JOIN = "🔌 Подключиться";
    private static final String BTN_CURRENT = "📍 Текущий слайд";
    private static final String BTN_PREV = "◀ Предыдущий слайд";
    private static final String BTN_QUESTION = "❓ Задать вопрос";
    private static final String BTN_RATE = "⭐ Оценить слайд";
    private static final String BTN_HELP = "ℹ️ Помощь";
    private static final String HELP_TEXT = """
            Команды бота:
            /join <название или id> — подключиться к лекции
            /question <текст> — задать вопрос преподавателю
            /rate <1-5> — оценить понимание текущего слайда
            /current — повторно получить текущий слайд
            /prev — получить предыдущий слайд
            /slide — выбрать слайд по номеру
            /help — показать эту подсказку

            Когда преподаватель запустит тест, вопросы придут автоматически.
            """;

    private final ConcurrentHashMap<Long, String> pendingPasswordJoin = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, String> pendingCommand = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, ExamSession> examSessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> lastSlideMessageId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> lastStudentPhotoMessageId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> lastQuestionMessageId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> lectureCurrentSlide = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Integer> studentCurrentSlide = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> pendingGoToSlide = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, java.util.Timer> questionTimers = new ConcurrentHashMap<>();

    private final String botUsername;
    private final StudentRepository studentRepository;
    private final LectureService lectureService;
    private final QuizServiceClient quizServiceClient;
    private final AnalyticsServiceClient analyticsServiceClient;
    private final StudentQuestionService studentQuestionService;
    private final DeliveryMetricsService deliveryMetricsService;
    private final RestTemplate restTemplate;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Autowired
    public LectureBroadcastingBot(
            DefaultBotOptions options,
            @Value("${telegram.bot.token}") String botToken,
            @Value("${telegram.bot.username}") String botUsername,
            StudentRepository studentRepository,
            LectureService lectureService,
            QuizServiceClient quizServiceClient,
            AnalyticsServiceClient analyticsServiceClient,
            StudentQuestionService studentQuestionService,
            DeliveryMetricsService deliveryMetricsService,
            RestTemplate restTemplate,
            io.micrometer.core.instrument.MeterRegistry meterRegistry) {

        super(options, botToken);

        this.botUsername = botUsername;
        this.studentRepository = studentRepository;
        this.lectureService = lectureService;
        this.quizServiceClient = quizServiceClient;
        this.analyticsServiceClient = analyticsServiceClient;
        this.studentQuestionService = studentQuestionService;
        this.deliveryMetricsService = deliveryMetricsService;
        this.restTemplate = restTemplate;
        this.meterRegistry = meterRegistry;
    }

    private Timer buildTelegramApiTimer(String method, String lectureId) {
        return Timer.builder("telegram.api.latency")
                .description("Telegram API latency")
                .tag("method", method)
                .tag("lectureId", lectureId != null ? lectureId : "unknown")
                .publishPercentileHistogram(true)
                .register(meterRegistry);
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
        org.telegram.telegrambots.meta.api.objects.User from = update.getMessage().getFrom();
        text = normalizeKeyboardButton(text);
        String cmd = baseCommand(text.split("\\s+", 2)[0]);

        log.info("Telegram message: chatId={} cmd='{}'", chatId, cmd);

        // Ответ на пароль от лекции (приоритет выше прочих pending)
        if (pendingPasswordJoin.containsKey(chatId) && !cmd.startsWith("/")) {
            String lectureName = pendingPasswordJoin.remove(chatId);
            tryJoinWithPassword(chatId, lectureName, text.trim(), from);
            return;
        }

        // Ответ на номер слайда
        if (pendingGoToSlide.remove(chatId) != null && !cmd.startsWith("/")) {
            handleGoToSlideByNumber(chatId, text.trim());
            return;
        }

        // Ответ на двухшаговую команду (/question, /join, /rate без аргументов)
        if (pendingCommand.containsKey(chatId) && !cmd.startsWith("/")) {
            String pending = pendingCommand.remove(chatId);
            switch (pending) {
                case "question" -> handleQuestionText(chatId, text.trim(), from);
                case "rate" -> handleRatingText(chatId, text.trim(), from);
                case "join" -> {
                    String key = LectureService.normalizeLectureJoinKey(text.trim());
                    if (key.isEmpty()) { sendText(chatId, "Укажите название лекции или её id."); return; }
                    tryJoinWithPassword(chatId, key, null, from);
                }
            }
            return;
        }

        // Студент проходит тест — ввёл открытый ответ
        if (examSessions.containsKey(chatId) && !cmd.startsWith("/")) {
            handleOpenAnswer(chatId, text.trim());
            return;
        }

        if ("/start".equals(cmd)) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length > 1 && parts[1].startsWith("join_")) {
                String lectureKey = parts[1].substring(5);
                tryJoinWithPassword(chatId, lectureKey, null, from);
                return;
            }
            sendTextWithMainKeyboard(chatId, "Привет! Я бот для лекций.\n\n" + HELP_TEXT);
            return;
        }

        if ("/help".equals(cmd)) {
            sendTextWithMainKeyboard(chatId, HELP_TEXT);
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

        if ("/question".equals(cmd)) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length >= 2 && !parts[1].isBlank()) {
                handleQuestionText(chatId, parts[1].trim(), from);
            } else {
                requestInput(chatId, "question", "Введите текст вашего вопроса:");
            }
            return;
        }

        if ("/join".equals(cmd)) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length >= 2 && !parts[1].isBlank()) {
                String key = LectureService.normalizeLectureJoinKey(parts[1]);
                if (key.isEmpty()) { sendText(chatId, "Укажите название лекции или её id."); return; }
                tryJoinWithPassword(chatId, key, null, from);
            } else {
                requestInput(chatId, "join", "Введите название или ID лекции:");
            }
            return;
        }

        if ("/rate".equals(cmd)) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length >= 2 && !parts[1].isBlank()) {
                handleRatingText(chatId, parts[1].trim(), from);
            } else {
                requestInput(chatId, "rate", "Оцените понимание слайда (1-5):");
            }
            return;
        }

        if ("/current".equals(cmd)) {
            studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
                if (student.getLecture() == null ||
                        student.getLecture().getStatus() != ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE) {
                    sendText(chatId, "Вы не подключены к активной лекции.");
                    return;
                }
                int slideNum = lectureCurrentSlide.getOrDefault(chatId, student.getLecture().getCurrentSlide());
                try {
                    byte[] img = lectureService.getSlideImage(student.getLecture(), slideNum);
                    sendPhoto(chatId, img, slideNum);
                } catch (Exception e) {
                    sendText(chatId, "Не удалось загрузить слайд.");
                }
            }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
            return;
        }

        if ("/prev".equals(cmd)) {
            handlePrevSlide(chatId);
            return;
        }

        if ("/slide".equals(cmd)) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length >= 2 && !parts[1].isBlank()) {
                handleGoToSlideByNumber(chatId, parts[1].trim());
            } else {
                pendingGoToSlide.put(chatId, true);
                sendText(chatId, "Введите номер слайда:");
            }
            return;
        }

        sendTextWithMainKeyboard(chatId, HELP_TEXT);
    }

    private String normalizeKeyboardButton(String text) {
        return switch (text) {
            case BTN_JOIN -> "/join";
            case BTN_CURRENT -> "/current";
            case BTN_PREV -> "/prev";
            case BTN_QUESTION -> "/question";
            case BTN_RATE -> "/rate";
            case BTN_HELP -> "/help";
            default -> text;
        };
    }

    private void requestInput(long chatId, String commandKey, String promptText) {
        pendingCommand.put(chatId, commandKey);
        try {
            execute(SendMessage.builder()
                    .chatId(chatId)
                    .text(promptText)
                    .replyMarkup(ForceReplyKeyboard.builder().forceReply(true).selective(true).build())
                    .build());
        } catch (TelegramApiException e) {
            log.warn("requestInput failed chatId={}: {}", chatId, e.getMessage());
        }
    }

    private void handleQuestionText(long chatId, String questionText, org.telegram.telegrambots.meta.api.objects.User from) {
        studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
            if (student.getLecture() == null || student.getLecture().getStatus() != ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE) {
                sendText(chatId, "Вы не подключены к активной лекции.");
                return;
            }
            Integer slideNumber = studentCurrentSlide.get(chatId);
            Long slideId = slideNumber != null ? (long) slideNumber : null;
            studentQuestionService.add(student.getLecture().getId(), chatId, questionText, slideId);
            sendText(chatId, "✅ Ваш вопрос отправлен преподавателю.\nСтатус: отправлен.");
        }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
    }

    private void handleRatingText(long chatId, String ratingText, org.telegram.telegrambots.meta.api.objects.User from) {
        studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
            if (student.getLecture() == null || student.getLecture().getStatus() != ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE) {
                sendText(chatId, "Вы не подключены к активной лекции.");
                return;
            }
            try {
                int rating = Integer.parseInt(ratingText.trim());
                if (rating < 1 || rating > 5) {
                    sendText(chatId, "Оценка должна быть от 1 до 5.");
                    return;
                }
                Integer slideNumber = studentCurrentSlide.get(chatId);
                Long slideId = slideNumber != null ? (long) slideNumber : null;
                studentQuestionService.sendRating(student.getLecture().getId(), chatId, rating, slideId);
                sendText(chatId, "✅ Ваша оценка (" + rating + "/5) записана.");
            } catch (NumberFormatException e) {
                sendText(chatId, "Пожалуйста, введите число от 1 до 5.");
            }
        }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
    }

    private void handleCallbackQuery(Update update) {
        String data = update.getCallbackQuery().getData();
        long chatId = update.getCallbackQuery().getMessage().getChatId();

        if (CB_PREV_SLIDE.equals(data)) {
            handlePrevSlide(chatId);
            return;
        }

        if (CB_CURRENT_SLIDE.equals(data)) {
            studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
                if (student.getLecture() == null ||
                        student.getLecture().getStatus() != ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE) {
                    sendText(chatId, "Вы не подключены к активной лекции.");
                    return;
                }
                int slideNum = lectureCurrentSlide.getOrDefault(chatId, student.getLecture().getCurrentSlide());
                try {
                    byte[] img = lectureService.getSlideImage(student.getLecture(), slideNum);
                    sendPhoto(chatId, img, slideNum);
                } catch (Exception e) {
                    sendText(chatId, "Не удалось загрузить слайд.");
                }
            }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
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
            if (student.getLecture() == null ||
                    student.getLecture().getStatus() != ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE) {
                sendText(chatId, "Вы не подключены к активной лекции.");
                return;
            }
            int current = studentCurrentSlide.getOrDefault(chatId,
                    lectureCurrentSlide.getOrDefault(chatId, student.getLecture().getCurrentSlide()));
            int prev = current - 1;
            if (prev < 1) { sendText(chatId, "Вы уже на первом слайде."); return; }
            try {
                byte[] img = lectureService.getSlideImage(student.getLecture(), prev);
                sendPhoto(chatId, img, prev);
            } catch (Exception e) {
                sendText(chatId, "Не удалось загрузить слайд.");
            }
        }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
    }

    private void cancelQuestionTimer(long chatId) {
        java.util.Timer t = questionTimers.remove(chatId);
        if (t != null) t.cancel();
    }

    private InlineKeyboardMarkup buildQuestionKeyboard(Question q) {
        List<List<InlineKeyboardButton>> keyboard = q.options().stream()
                .map(opt -> {
                    String btnText = opt.text().length() > 60
                            ? opt.text().substring(0, 57) + "..."
                            : opt.text();
                    return List.of(InlineKeyboardButton.builder()
                            .text(btnText)
                            .callbackData(CB_EXAM_OPT + opt.id())
                            .build());
                })
                .toList();
        return InlineKeyboardMarkup.builder().keyboard(keyboard).build();
    }

    private void scheduleQuestionTimer(long chatId, ExamSession session, Question q, Integer msgId) {
        if (q.timeLimitSec() == null) return;
        int totalSec = q.timeLimitSec();
        java.util.Timer t = new java.util.Timer(true);
        questionTimers.put(chatId, t);
        int qIdx = session.currentIndex();
        String header = String.format("Вопрос %d/%d", qIdx + 1, session.total());
        boolean isMultiple = session.isMultiple();
        String suffix = isMultiple ? "\n\nВыберите ответ:" : "\n\n✏️ Напишите ответ:";
        InlineKeyboardMarkup markup = isMultiple ? buildQuestionKeyboard(q) : null;

        if (msgId != null) {
            for (int elapsed = 10; elapsed < totalSec; elapsed += 10) {
                final int remaining = totalSec - elapsed;
                t.schedule(new java.util.TimerTask() {
                    @Override
                    public void run() {
                        ExamSession cur = examSessions.get(chatId);
                        if (cur == null || cur.currentIndex() != qIdx) return;
                        Integer curMsgId = lastQuestionMessageId.get(chatId);
                        if (!msgId.equals(curMsgId)) return;
                        try {
                            String updatedText = header + " ⏱ " + remaining + " с\n\n" + q.text() + suffix;
                            EditMessageText edit = EditMessageText.builder()
                                    .chatId(chatId).messageId(msgId)
                                    .text(updatedText)
                                    .replyMarkup(markup)
                                    .build();
                            execute(edit);
                        } catch (TelegramApiException ex) {
                            log.debug("countdown edit failed: {}", ex.getMessage());
                        }
                    }
                }, (long) elapsed * 1000L);
            }
        }

        t.schedule(new java.util.TimerTask() {
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
        }, (long) totalSec * 1000L);
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
        Integer prevId = lastQuestionMessageId.remove(chatId);
        if (prevId != null) {
            try { execute(DeleteMessage.builder().chatId(chatId).messageId(prevId).build()); }
            catch (TelegramApiException ignored) {}
        }

        if (!session.hasMore()) {
            UUID examId = session.getExamId();
            examSessions.remove(chatId);
            cancelQuestionTimer(chatId);
            sendText(chatId, buildExamResultMessage(chatId, examId));
            return;
        }

        Question q = session.currentQuestion();
        String header = String.format("Вопрос %d/%d", session.currentIndex() + 1, session.total());
        String timeHint = q.timeLimitSec() != null ? " ⏱ " + q.timeLimitSec() + " с" : "";

        Message sent = null;
        try {
            if (session.isMultiple()) {
                String msgText = header + timeHint + "\n\n" + q.text() + "\n\nВыберите ответ:";
                SendMessage msg = SendMessage.builder()
                        .chatId(chatId)
                        .text(msgText)
                        .replyMarkup(buildQuestionKeyboard(q))
                        .build();
                sent = execute(msg);
            } else {
                SendMessage msg = SendMessage.builder()
                        .chatId(chatId)
                        .text(header + timeHint + "\n\n" + q.text() + "\n\n✏️ Напишите ответ:")
                        .build();
                sent = execute(msg);
            }
        } catch (TelegramApiException e) {
            log.error("sendQuestion failed chatId={}", chatId, e);
        }

        if (sent != null) {
            lastQuestionMessageId.put(chatId, sent.getMessageId());
        }
        scheduleQuestionTimer(chatId, session, q, sent != null ? sent.getMessageId() : null);
    }

    private String buildExamResultMessage(long chatId, UUID examId) {
        return quizServiceClient.getSubmissions(examId).stream()
                .filter(result -> Objects.equals(result.chatId(), chatId))
                .findFirst()
                .map(result -> {
                    String percent = result.maxScore() > 0
                            ? " (" + Math.round(result.totalScore() * 100f / result.maxScore()) + "%)"
                            : "";
                    String reviewNotice = result.hasUngraded()
                            ? "\nЕсть открытые ответы — преподаватель проверит их отдельно."
                            : "";
                    return "✅ Тест завершён!\n\nВаш результат: "
                            + result.totalScore() + "/" + result.maxScore() + percent
                            + reviewNotice;
                })
                .orElse("✅ Тест завершён! Ваши ответы записаны.");
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

    private void tryJoinWithPassword(long chatId, String lectureName, String password, org.telegram.telegrambots.meta.api.objects.User tgUser) {
        try {
            String firstName = tgUser != null ? tgUser.getFirstName() : null;
            String lastName = tgUser != null ? tgUser.getLastName() : null;
            String username = tgUser != null ? tgUser.getUserName() : null;
            Student student = lectureService.joinLecture(lectureName, chatId, password, firstName, lastName, username);
            pendingPasswordJoin.remove(chatId);
            sendTextWithMainKeyboard(chatId, "Вы подключились к лекции: " + student.getLecture().getName());
            analyticsServiceClient.sendStudentJoinedEvent(student.getLecture().getId(), chatId);
            int currentSlide = student.getLecture().getCurrentSlide();
            if (student.getLecture().getStatus() == ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE && currentSlide > 0) {
                sendSlideToStudent(student.getLecture().getId(), chatId, null, currentSlide);
            }

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

    public void notifyLectureEndedToStudents(Long lectureId, String lectureName, List<Long> chatIds) {
        if (chatIds == null || chatIds.isEmpty()) return;
        String title = Objects.requireNonNullElse(lectureName, "лекция");
        String msg = "Лекция «" + title + "» завершена. Вы отключены.\n\n/join <название> — подключиться к другой.";
        for (Long chatId : chatIds) sendTrackedText(lectureId, chatId, msg);
    }

    public void notifyLectureStartedToStudents(Long lectureId, String lectureName, int currentSlide, List<Long> chatIds) {
        if (chatIds == null || chatIds.isEmpty()) return;
        String title = Objects.requireNonNullElse(lectureName, "лекция");
        String msg = "Лекция «" + title + "» началась.\n\n"
                + "Используйте /current, чтобы повторно получить текущий слайд.";
        for (Long chatId : chatIds) {
            sendTrackedText(lectureId, chatId, msg);
            if (currentSlide > 0) {
                sendSlideToStudent(lectureId, chatId, null, currentSlide);
            }
        }
    }

    // Вызывается лектором при смене слайда — только текст, всегда последнее сообщение
    public void sendSlideToStudent(Long lectureId, long chatId, byte[] imageBytes, int slideNumber) {
        lectureCurrentSlide.put(chatId, slideNumber);

        Integer prevMsgId = lastSlideMessageId.remove(chatId);
        if (prevMsgId != null) {
            try {
                Timer.Sample deleteSample = Timer.start(meterRegistry);
                execute(DeleteMessage.builder().chatId(chatId).messageId(prevMsgId).build());
                deleteSample.stop(buildTelegramApiTimer("deleteMessage", lectureId != null ? lectureId.toString() : "unknown"));
            } catch (TelegramApiException e) {
                log.debug("deleteMessage failed chatId={} msgId={}: {}", chatId, prevMsgId, e.getMessage());
            }
        }

        InlineKeyboardMarkup markup = InlineKeyboardMarkup.builder()
                .keyboardRow(List.of(
                        InlineKeyboardButton.builder().text("◀ Предыдущий").callbackData(CB_PREV_SLIDE).build(),
                        InlineKeyboardButton.builder().text("📍 Текущий").callbackData(CB_CURRENT_SLIDE).build(),
                        InlineKeyboardButton.builder().text("🔢 Слайд №…").callbackData(CB_GOTO_SLIDE).build()
                ))
                .build();

        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            Message sent = execute(SendMessage.builder()
                    .chatId(chatId)
                    .text("Лектор показывает слайд " + slideNumber)
                    .replyMarkup(markup)
                    .build());
            sample.stop(buildTelegramApiTimer("sendMessage", lectureId != null ? lectureId.toString() : "unknown"));
            lastSlideMessageId.put(chatId, sent.getMessageId());
            deliveryMetricsService.recordDeliveryStatus(lectureId, true);
        } catch (TelegramApiException e) {
            log.error("sendSlideMessage failed chatId={}", chatId, e);
            deliveryMetricsService.recordDeliveryStatus(lectureId, false);
        }
    }

    // Вызывается по запросу студента — картинка, удаляет предыдущую запрошенную
    private void sendPhoto(long chatId, byte[] imageBytes, int slideNumber) {
        if (imageBytes == null || imageBytes.length == 0) {
            sendText(chatId, "Не удалось загрузить картинку слайда " + slideNumber);
            return;
        }
        studentCurrentSlide.put(chatId, slideNumber);

        Integer prevPhotoId = lastStudentPhotoMessageId.remove(chatId);
        if (prevPhotoId != null) {
            try {
                execute(DeleteMessage.builder().chatId(chatId).messageId(prevPhotoId).build());
            } catch (TelegramApiException e) {
                log.debug("delete prev student photo failed: {}", e.getMessage());
            }
        }

        String lecIdStr = studentRepository.findByChatId(chatId)
                .map(s -> s.getLecture())
                .filter(Objects::nonNull)
                .map(l -> l.getId().toString())
                .orElse("unknown");

        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            Message sent = executeSendPhoto(SendPhoto.builder()
                    .chatId(chatId)
                    .photo(new InputFile(new ByteArrayInputStream(imageBytes), "slide.jpg"))
                    .caption("Слайд " + slideNumber)
                    .build());
            sample.stop(buildTelegramApiTimer("sendPhoto", lecIdStr));
            lastStudentPhotoMessageId.put(chatId, sent.getMessageId());
            studentRepository.findByChatId(chatId).ifPresent(student -> {
                if (student.getLecture() != null) {
                    analyticsServiceClient.sendSlideRequestedEvent(
                            student.getLecture().getId(), chatId, slideNumber);
                }
            });
        } catch (TelegramApiException e) {
            log.error("sendPhoto failed chatId={}", chatId, e);
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
            if (student.getLecture() == null ||
                    student.getLecture().getStatus() != ru.university.lecturebroadcasting.entity.LectureStatus.ACTIVE) {
                sendText(chatId, "Вы не подключены к активной лекции.");
                return;
            }
            try {
                byte[] img = lectureService.getSlideImage(student.getLecture(), slideNum);
                sendPhoto(chatId, img, slideNum);
            } catch (Exception e) {
                sendText(chatId, "Слайд " + slideNum + " не найден.");
            }
        }, () -> sendText(chatId, "Вы не подключены. Используйте /join."));
    }

    public void sendTextMessage(Long lectureId, long chatId, String text) {
        sendTrackedText(lectureId, chatId, text);
    }

    private void sendTrackedText(Long lectureId, long chatId, String text) {
        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            execute(SendMessage.builder().chatId(chatId).text(text).build());
            sample.stop(buildTelegramApiTimer("sendMessage", lectureId != null ? lectureId.toString() : "unknown"));
            deliveryMetricsService.recordDeliveryStatus(lectureId, true);
        } catch (TelegramApiException e) {
            log.error("sendText failed chatId={}", chatId, e);
            deliveryMetricsService.recordDeliveryStatus(lectureId, false);
        }
    }

    private void sendText(long chatId, String text) {
        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            execute(SendMessage.builder().chatId(chatId).text(text).build());
            sample.stop(buildTelegramApiTimer("sendMessage", "unknown"));
        } catch (TelegramApiException e) {
            log.error("sendText failed chatId={}", chatId, e);
        }
    }

    private void sendTextWithMainKeyboard(long chatId, String text) {
        try {
            Timer.Sample sample = Timer.start(meterRegistry);
            execute(SendMessage.builder()
                    .chatId(chatId)
                    .text(text)
                    .replyMarkup(mainKeyboard())
                    .build());
            sample.stop(buildTelegramApiTimer("sendMessage", "unknown"));
        } catch (TelegramApiException e) {
            log.error("sendText failed chatId={}", chatId, e);
        }
    }

    private ReplyKeyboardMarkup mainKeyboard() {
        KeyboardRow row1 = new KeyboardRow();
        row1.add(new KeyboardButton(BTN_CURRENT));
        row1.add(new KeyboardButton(BTN_PREV));

        KeyboardRow row2 = new KeyboardRow();
        row2.add(new KeyboardButton(BTN_QUESTION));
        row2.add(new KeyboardButton(BTN_RATE));

        KeyboardRow row3 = new KeyboardRow();
        row3.add(new KeyboardButton(BTN_JOIN));
        row3.add(new KeyboardButton(BTN_HELP));

        return ReplyKeyboardMarkup.builder()
                .keyboard(List.of(row1, row2, row3))
                .resizeKeyboard(true)
                .oneTimeKeyboard(false)
                .build();
    }

    private String getLectureIdFromChatId(String chatIdStr) {
        if (chatIdStr == null || chatIdStr.trim().isEmpty()) return "unknown";
        try {
            long chatId = Long.parseLong(chatIdStr);
            Optional<Student> studentOpt = studentRepository.findByChatId(chatId);
            if (studentOpt.isPresent() && studentOpt.get().getLecture() != null) {
                return String.valueOf(studentOpt.get().getLecture().getId());
            }
        } catch (Exception ignored) {}
        return "unknown";
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T extends java.io.Serializable, Method extends org.telegram.telegrambots.meta.api.methods.BotApiMethod<T>> T execute(Method method) throws TelegramApiException {
        String chatIdStr = null;
        try {
            java.lang.reflect.Method getChatIdMethod = method.getClass().getMethod("getChatId");
            Object val = getChatIdMethod.invoke(method);
            if (val != null) {
                chatIdStr = String.valueOf(val);
            }
        } catch (Exception ignored) {}

        String lectureId = getLectureIdFromChatId(chatIdStr);

        try {
            String url = getOptions().getBaseUrl() + getBotToken() + "/" + method.getMethod();

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("X-Lecture-Id", lectureId);

            String requestJson = objectMapper.writeValueAsString(method);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(requestJson, headers);

            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    entity,
                    String.class
            );

            return method.deserializeResponse(response.getBody());
        } catch (Exception e) {
            log.error("Error executing Telegram API method: {}", e.getMessage(), e);
            throw new TelegramApiException("Failed to execute bot method via RestTemplate", e);
        }
    }

    public Message executeSendPhoto(SendPhoto sendPhoto) throws TelegramApiException {
        String lectureId = getLectureIdFromChatId(sendPhoto.getChatId());

        try {
            String url = getOptions().getBaseUrl() + getBotToken() + "/sendPhoto";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);
            headers.set("X-Lecture-Id", lectureId);

            org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            body.add("chat_id", sendPhoto.getChatId());
            if (sendPhoto.getCaption() != null) {
                body.add("caption", sendPhoto.getCaption());
            }
            if (sendPhoto.getReplyMarkup() != null) {
                body.add("reply_markup", objectMapper.writeValueAsString(sendPhoto.getReplyMarkup()));
            }

            InputFile photo = sendPhoto.getPhoto();
            if (photo.getNewMediaFile() != null) {
                body.add("photo", new org.springframework.core.io.FileSystemResource(photo.getNewMediaFile()));
            } else if (photo.getNewMediaStream() != null) {
                byte[] bytes = photo.getNewMediaStream().readAllBytes();
                body.add("photo", new org.springframework.core.io.ByteArrayResource(bytes) {
                    @Override
                    public String getFilename() {
                        return photo.getMediaName() != null ? photo.getMediaName() : "photo.jpg";
                    }
                });
            } else {
                body.add("photo", photo.getAttachName());
            }

            org.springframework.http.HttpEntity<org.springframework.util.MultiValueMap<String, Object>> entity =
                    new org.springframework.http.HttpEntity<>(body, headers);

            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.POST,
                    entity,
                    String.class
            );

            TelegramResponse<Message> apiResponse = objectMapper.readValue(
                    response.getBody(),
                    new com.fasterxml.jackson.core.type.TypeReference<TelegramResponse<Message>>() {}
            );

            if (!apiResponse.isOk()) {
                throw new TelegramApiException("Telegram error: " + apiResponse.getDescription());
            }
            return apiResponse.getResult();
        } catch (Exception e) {
            log.error("Error executing sendPhoto: {}", e.getMessage(), e);
            throw new TelegramApiException("Failed to execute sendPhoto via RestTemplate", e);
        }
    }

    public double getLectureTrafficMb(String lectureId) {
        double outboundBytes = 0;
        double inboundBytes = 0;

        try {
            io.micrometer.core.instrument.Counter outboundCounter = meterRegistry.find("telegram.traffic.outbound.bytes")
                    .tag("lecture_id", lectureId)
                    .counter();
            if (outboundCounter != null) {
                outboundBytes = outboundCounter.count();
            }
        } catch (Exception ignored) {}

        try {
            io.micrometer.core.instrument.Counter inboundCounter = meterRegistry.find("telegram.traffic.inbound.bytes")
                    .tag("lecture_id", lectureId)
                    .counter();
            if (inboundCounter != null) {
                inboundBytes = inboundCounter.count();
            }
        } catch (Exception ignored) {}

        double totalBytes = outboundBytes + inboundBytes;
        return totalBytes / (1024.0 * 1024.0);
    }

    public static class TelegramResponse<T> {
        private boolean ok;
        private T result;
        private String description;

        public boolean isOk() { return ok; }
        public void setOk(boolean ok) { this.ok = ok; }
        public T getResult() { return result; }
        public void setResult(T result) { this.result = result; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
}
