package ru.university.lecturebroadcasting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LectureBroadcastingApplication {

    public static void main(String[] args) {
        SpringApplication.run(LectureBroadcastingApplication.class, args);
    }
}