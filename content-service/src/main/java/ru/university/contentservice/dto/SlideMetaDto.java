package ru.university.contentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class SlideMetaDto {
    private UUID id;
    private String title;
}