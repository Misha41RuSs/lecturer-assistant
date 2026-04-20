package ru.university.contentservice.storage;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class FileStorageService {

    private final String storagePath = "storage/slides/";

    public String saveFile(byte[] bytes, String fileName) throws IOException {
        Path path = Paths.get(storagePath + fileName);
        Files.createDirectories(path.getParent());
        Files.write(path, bytes);
        return path.toString();
    }

    public byte[] loadFile(String path) throws IOException {
        return Files.readAllBytes(Path.of(path));
    }
}
