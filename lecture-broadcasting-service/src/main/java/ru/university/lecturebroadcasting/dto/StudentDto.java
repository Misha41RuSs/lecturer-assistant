package ru.university.lecturebroadcasting.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    private Long chatId;
    private String firstName;
    private String lastName;
    private String username;
}
