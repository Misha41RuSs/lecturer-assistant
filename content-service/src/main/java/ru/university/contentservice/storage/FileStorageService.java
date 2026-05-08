package ru.university.contentservice.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Service
public class FileStorageService {

    private final String storagePath = "storage/slides/";

    public String saveFile(byte[] bytes, String fileName) throws IOException {
        Path path = Paths.get(storagePath + fileName);
        Files.createDirectories(path.getParent());
        Files.write(path, bytes);
        log.info("File saved: fileName={} absolutePath={}", fileName, path.toAbsolutePath());
        return path.toString();
    }

    public byte[] loadFile(String filePath) throws IOException {
        Path path = Path.of(filePath);
        log.debug("Loading file: path={} absolutePath={}", filePath, path.toAbsolutePath());

        if (!Files.exists(path)) {
            log.error("File not found: path={} absolutePath={}", filePath, path.toAbsolutePath());
            throw new IOException("File not found: " + filePath);
        }

        byte[] bytes = Files.readAllBytes(path);
        log.info("File loaded successfully: path={} size={} bytes", filePath, bytes.length);
        return bytes;
    }
}
