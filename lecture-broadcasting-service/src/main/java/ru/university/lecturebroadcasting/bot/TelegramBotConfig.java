package ru.university.lecturebroadcasting.bot;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Bean; // <--- ДОБАВИТЬ ИМПОРТ
import org.springframework.context.annotation.Configuration;
import org.telegram.telegrambots.bots.DefaultBotOptions; // <--- ДОБАВИТЬ ИМПОРТ
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;

@Slf4j
@Configuration
public class TelegramBotConfig {

    private final LectureBroadcastingBot bot;

    public TelegramBotConfig(@Lazy LectureBroadcastingBot bot) {
        this.bot = bot;
    }

    @Bean
    public DefaultBotOptions defaultBotOptions() {
        DefaultBotOptions options = new DefaultBotOptions();
        options.setBaseUrl("https://tg-proxy.mrus7684.workers.dev/bot");
        return options;
    }

    @EventListener(ContextRefreshedEvent.class)
    public void registerBot() {
        if ("change_me".equals(bot.getBotToken()) || bot.getBotToken() == null || bot.getBotToken().isBlank()) {
            log.warn("Telegram bot token is 'change_me' or empty. Skipping bot registration to allow normal startup.");
            return;
        }

        try {
            TelegramBotsApi api = new TelegramBotsApi(DefaultBotSession.class);
            api.registerBot(bot);
            log.info("Telegram bot '@{}' зарегистрирован, long polling запущен", bot.getBotUsername());
        } catch (TelegramApiException e) {
            log.error("КРИТИЧНО: не удалось зарегистрировать Telegram-бота (проверьте TELEGRAM_BOT_TOKEN): {}", e.getMessage(), e);
            log.warn("Telegram bot registration failed. Skipping bot startup to allow the rest of the application to run.");
        }
    }
}