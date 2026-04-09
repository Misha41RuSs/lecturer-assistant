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

    private void handleTextMessage(Update update) {
        String text = update.getMessage().getText().trim();
        long chatId = update.getMessage().getChatId();

        if (text.startsWith("/join")) {
            String[] parts = text.split("\\s+", 2);
            if (parts.length < 2 || parts[1].isBlank()) {
                sendText(chatId, "Использование: /join <название лекции>");
                return;
            }
            String lectureName = parts[1].trim();
            try {
                Student student = lectureService.joinLecture(lectureName, chatId);
                sendText(chatId, "Вы подключились к лекции: " + student.getLecture().getName());
            } catch (IllegalArgumentException e) {
                sendText(chatId, "Лекция не найдена или недоступна: " + lectureName);
            }
        }
    }

    private void handleCallbackQuery(Update update) {
        String data = update.getCallbackQuery().getData();
        long chatId = update.getCallbackQuery().getMessage().getChatId();

        if (CALLBACK_PREV_SLIDE.equals(data)) {
            studentRepository.findByChatId(chatId).ifPresentOrElse(student -> {
                int currentSlide = student.getLecture().getCurrentSlide();
                int prevSlide = currentSlide - 1;
                if (prevSlide < 1) {
                    sendText(chatId, "Вы уже на первом слайде.");
                    return;
                }
                try {
                    byte[] imageBytes = lectureService.getSlideImage(prevSlide);
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