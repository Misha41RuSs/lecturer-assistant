package ru.university.lecturebroadcasting.bot;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

import jakarta.annotation.PostConstruct;

@Slf4j
@Configuration
public class TelegramBotConfig {

    private final LectureBroadcastingBot bot;

    public TelegramBotConfig(LectureBroadcastingBot bot) {
        this.bot = bot;
    }

    @PostConstruct
    public void registerBot() {
        try {
            TelegramBotsApi api = new TelegramBotsApi(DefaultBotSession.class);
            api.registerBot(bot);
            log.info("Telegram bot '@{}' зарегистрирован, long polling запущен", bot.getBotUsername());
        } catch (TelegramApiException e) {
            log.error("КРИТИЧНО: не удалось зарегистрировать Telegram-бота (проверьте TELEGRAM_BOT_TOKEN): {}", e.getMessage(), e);
            throw new IllegalStateException(
                    "Telegram bot registration failed — без этого апдейты (/ping, /join) не приходят. Проверьте токен в .env и что нет второго процесса с тем же токеном.",
                    e);
        }
    }
}