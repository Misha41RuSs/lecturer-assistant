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
import ru.university.lecturebroadcasting.service.LectureService;
import ru.university.lecturebroadcasting.service.PasswordRequiredException;
import ru.university.lecturebroadcasting.service.QuizServiceClient;
import ru.university.lecturebroadcasting.service.QuizServiceClient.ExamDetail.Question;
import ru.university.lecturebroadcasting.service.WrongPasswordException;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class LectureBroadcastingBot extends TelegramLongPollingBot {

    private static final String CB_PREV_SLIDE = "prev_slide";
    private static final String CB_EXAM_OPT = "exam_opt:"; // exam_opt:<optionId>

    private final ConcurrentHashMap<Long, String> pendingPasswordJoin = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, ExamSession> examSessions = new ConcurrentHashMap<>();

    private final String botUsername;
    private final StudentRepository studentRepository;
    private final LectureService lectureService;
    private final QuizServiceClient quizServiceClient;

    public LectureBroadcastingBot(
            @Value("${telegram.bot.token}") String botToken,
            @Value("${telegram.bot.username}") String botUsername,
            StudentRepository studentRepository,
            LectureService lectureService,
            QuizServiceClient quizServiceClient) {
        super(botToken);
        this.botUsername = botUsername;
        this.studentRepository = studentRepository;
        this.lectureService = lectureService;
        this.quizServiceClient = quizServiceClient;
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

    private void handleMultipleChoiceAnswer(long chatId, String optionId) {
        ExamSession session = examSessions.get(chatId);
        if (session == null) return;

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
            sendText(chatId, "Тест завершён! Ваши ответы записаны. Результаты сообщит преподаватель.");
            return;
        }

        Question q = session.currentQuestion();
        String header = String.format("Вопрос %d/%d", session.currentIndex() + 1, session.total());
        String timeHint = q.timeLimitSec() != null ? " (" + q.timeLimitSec() + " с)" : "";

        if (session.isMultiple()) {
            StringBuilder sb = new StringBuilder();
            sb.append(header).append(timeHint).append("\n\n").append(q.text()).append("\n\nВыберите ответ:");

            List<InlineKeyboardButton> row = q.options().stream()
                    .map(opt -> InlineKeyboardButton.builder()
                            .text(opt.text())
                            .callbackData(CB_EXAM_OPT + opt.id())
                            .build())
                    .toList();

            // По одной кнопке в строку для читаемости
            List<List<InlineKeyboardButton>> keyboard = row.stream()
                    .map(btn -> List.of(btn))
                    .toList();

            SendMessage msg = SendMessage.builder()
                    .chatId(chatId)
                    .text(sb.toString())
                    .replyMarkup(InlineKeyboardMarkup.builder().keyboard(keyboard).build())
                    .build();
            try { execute(msg); } catch (TelegramApiException e) { log.error("sendQuestion failed", e); }
        } else {
            sendText(chatId, header + timeHint + "\n\n" + q.text() + "\n\nНапишите ответ:");
        }
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
        InlineKeyboardButton prevBtn = InlineKeyboardButton.builder()
                .text("Показать предыдущий слайд")
                .callbackData(CB_PREV_SLIDE)
                .build();
        SendPhoto photo = SendPhoto.builder()
                .chatId(chatId)
                .photo(new InputFile(new ByteArrayInputStream(imageBytes), "slide_" + slideNumber + ".jpg"))
                .caption("Слайд " + slideNumber)
                .replyMarkup(InlineKeyboardMarkup.builder().keyboardRow(List.of(prevBtn)).build())
                .build();
        try { execute(photo); } catch (TelegramApiException e) { log.error("sendSlide failed", e); }
    }

    private void sendText(long chatId, String text) {
        try {
            execute(SendMessage.builder().chatId(chatId).text(text).build());
        } catch (TelegramApiException e) {
            log.error("sendText failed chatId={}", chatId, e);
        }
    }
}