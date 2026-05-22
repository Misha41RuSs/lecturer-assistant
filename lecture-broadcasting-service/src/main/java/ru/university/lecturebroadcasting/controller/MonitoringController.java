package ru.university.lecturebroadcasting.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.university.lecturebroadcasting.bot.MessageType;
import ru.university.lecturebroadcasting.service.MessageCounterService;

import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/monitoring")
@RequiredArgsConstructor
public class MonitoringController {

    private final MessageCounterService messageCounterService;

    @GetMapping("/message-stats")
    public Map<String, Object> getMessageStats(@RequestParam(required = false) MessageType type) {
        if (type != null) {
            return Map.of(
                    "type", type.name(),
                    "total", messageCounterService.getTotalCount(type),
                    "lastMinute", messageCounterService.getCurrentMinuteCount(type)
            );
        }

        return Stream.of(MessageType.values())
                .collect(Collectors.toMap(
                        MessageType::name,
                        t -> Map.of(
                                "total", messageCounterService.getTotalCount(t),
                                "lastMinute", messageCounterService.getCurrentMinuteCount(t)
                        )
                ));
    }
}