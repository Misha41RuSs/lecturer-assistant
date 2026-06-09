package ru.university.lecturebroadcasting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
@EnableAsync
public class LectureBroadcastingApplication {

    public static void main(String[] args) {
        SpringApplication.run(LectureBroadcastingApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate(ru.university.lecturebroadcasting.bot.TelegramTrafficInterceptor telegramTrafficInterceptor) {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setInterceptors(java.util.List.of(telegramTrafficInterceptor));
        return restTemplate;
    }
}