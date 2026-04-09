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

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Slf4j
@Component
public class LectureBroadcastingBot extends TelegramLongPollingBot {

    private static final String CALLBACK_PREV_SLIDE = "prev_slide";

    private final String botUsername;
    private final StudentRepository studentRepository;
    private final LectureService lectureService;

    public LectureBroadcastingBot(
            @Value("${telegram.bot.token}") String botToken,
            @Value("${telegram.bot.username}") String botUsername,
            StudentRepository studentRepository,
            LectureService lectureService) {
        super(botToken);
        this.botUsername = botUsername;
        this.studentRepository = studentRepository;
        this.lectureService = lectureService;
    }

    @Override
    public String getBotUsername() {
        return botUsername;
    }

    @Override
    public void onUpdateReceived(Update update) {
        if (update.hasMessage() && update.getMessage().hasText()) {
            handleTextMessage(update);
        } else if (update.hasCallbackQuery()) {
            handleCallbackQuery(update);
        }
    }

    /** Команда без @username, в нижнем регистре: /ping, /join */
    private static String baseCommand(String firstToken) {
        if (firstToken == null) {
            return "";
        }
        int at = firstToken.indexOf('@');
        String head = at > 0 ? firstToken.substring(0, at) : firstToken;
        return head.toLowerCase(Locale.ROOT);
    }

    private void handleTextMessage(Update update) {
        String text = update.getMessage().getText().trim();
        long chatId = update.getMessage().getChatId();

        String firstToken = text.split("\\s+", 2)[0];
        String cmd = baseCommand(firstToken);
        log.info("Telegram входящее: chatId={} firstToken='{}'", chatId, firstToken);

        if ("/ping".equals(cmd)) {
            try {
                long n = lectureService.countLectures();
                sendText(chatId, "ok, join-sql-v1, лекций в БД (таблица lectures): " + n
                        + "\nЕсли число 0, а в DBeaver есть строки — вы смотрите не ту БД (нужна broadcasting_db).");
            } catch (Exception e) {
                log.error("/ping: ошибка БД chatId={}", chatId, e);
                sendText(chatId, "Ошибка при обращении к БД: " + e.getMessage());
            }
            return;
        }

        if ("/join".equals(cmd) || text.toLowerCase(Locale.ROOT).startsWith("/join")) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length < 2 || parts[1].isBlank()) {
                sendText(chatId,
                        "Использование: /join <название лекции>\n"
                                + "Или по числовому id из адреса настроек: /join 7\n"
                                + "(страница вида …/settings/7 → id = 7)");
                return;
            }
            String lectureName = LectureService.normalizeLectureJoinKey(parts[1]);
            if (lectureName.isEmpty()) {
                sendText(chatId, "Укажите название лекции или её id после команды /join.");
                return;
            }
            try {
                Student student = lectureService.joinLecture(lectureName, chatId);
                sendText(chatId, "Вы подключились к лекции: " + student.getLecture().getName());
            } catch (IllegalStateException e) {
                sendText(chatId,
                        "Лекция «" + lectureName + "» уже завершена (лектор нажал «Завершить») — к ней нельзя подключиться.\n\n"
                                + "Чтобы снова открыть доступ, лектору нужно в веб-интерфейсе открыть настройки этой лекции и снова нажать «Начать лекцию» (статус станет ACTIVE).");
            } catch (IllegalArgumentException e) {
                sendText(chatId,
                        "Лекция не найдена: " + lectureName + "\n\n"
                                + "Проверьте название в разделе «Мои лекции» или список лекций в API (GET /lectures).\n"
                                + "Можно подключиться по id: /join <число из URL …/settings/…>");
            } catch (RuntimeException e) {
                log.error("/join internal error chatId={} key={}", chatId, lectureName, e);
                sendText(chatId,
                        "Техническая ошибка при подключении (см. логи контейнера lecture_broadcasting_service).");
            }
            return;
        }

        sendText(chatId, "Команды: /ping — проверка бота и БД, /join <название или id лекции>");
    }

    /**
     * После POST /lectures/{id}/stop — сообщить студентам и очистить подписку уже в сервисе;
     * здесь только текст в Telegram.
     */
    public void notifyLectureEndedToStudents(String lectureName, List<Long> chatIds) {
        if (chatIds == null || chatIds.isEmpty()) {
            return;
        }
        String title = Objects.requireNonNullElse(lectureName, "лекция");
        String msg = "Лекция «" + title + "» завершена лектором. Вы отключены от трансляции.\n\n"
                + "Чтобы подключиться к другой лекции, снова отправьте /join <название или id>.";
        for (Long chatId : chatIds) {
            sendText(chatId, msg);
        }
    }

    private void handleCallbackQuery(Update update) {
        String data = update.getCallbackQuery().getData();
        long chatId = update.getCallbackQuery().getMessage().getChatId();

        if (CALLBACK_PREV_SLIDE.equals(data)) {
            studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
                if (student.getLecture() == null) {
                    sendText(chatId, "Вы не подключены к лекции. Используйте /join <название>.");
                    return;
                }
                int currentSlide = student.getLecture().getCurrentSlide();
                int prevSlide = currentSlide - 1;
                if (prevSlide < 1) {
                    sendText(chatId, "Вы уже на первом слайде.");
                    return;
                }
                try {
                    byte[] imageBytes = lectureService.getSlideImage(student.getLecture(), prevSlide);
                    sendSlideToStudent(chatId, imageBytes, prevSlide);
                } catch (Exception e) {
                    sendText(chatId, "Не удалось загрузить предыдущий слайд.");
                    log.error("Failed to fetch previous slide {} for chatId {}", prevSlide, chatId, e);
                }
            }, () -> sendText(chatId, "Вы не подключены ни к одной лекции. Используйте /join <название>."));
        }
    }

    public void sendSlideToStudent(long chatId, byte[] imageBytes, int slideNumber) {
        InlineKeyboardButton prevButton = InlineKeyboardButton.builder()
                .text("Показать предыдущий слайд")
                .callbackData(CALLBACK_PREV_SLIDE)
                .build();
        InlineKeyboardMarkup keyboard = InlineKeyboardMarkup.builder()
                .keyboardRow(List.of(prevButton))
                .build();

        SendPhoto sendPhoto = SendPhoto.builder()
                .chatId(chatId)
                .photo(new InputFile(new ByteArrayInputStream(imageBytes), "slide_" + slideNumber + ".jpg"))
                .caption("Слайд " + slideNumber)
                .replyMarkup(keyboard)
                .build();

        try {
            execute(sendPhoto);
        } catch (TelegramApiException e) {
            log.error("Failed to send slide {} to chatId {}", slideNumber, chatId, e);
        }
    }

    private void sendText(long chatId, String text) {
        SendMessage message = SendMessage.builder()
                .chatId(chatId)
                .text(text)
                .build();
        try {
            execute(message);
        } catch (TelegramApiException e) {
            log.error("Failed to send message to chatId {}", chatId, e);
        }
    }
}