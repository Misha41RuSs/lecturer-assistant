package ru.university.lecturebroadcasting.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.university.lecturebroadcasting.entity.AccessType;
import ru.university.lecturebroadcasting.entity.Lecture;
import ru.university.lecturebroadcasting.entity.LectureStatus;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.StudentRepository;
import ru.university.lecturebroadcasting.repository.BannedUserRepository;
import ru.university.lecturebroadcasting.dto.StudentDto;

import java.text.Normalizer;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LectureService {

    private final LectureRepository lectureRepository;
    private final StudentRepository studentRepository;
    private final BannedUserRepository bannedUserRepository;
    private final ContentServiceClient contentServiceClient;
    private final AnalyticsServiceClient analyticsServiceClient;
    private final EntityManager entityManager;

    @Transactional
    public Lecture createLecture(String name, java.util.UUID sequenceId) {
        return createLecture(name, sequenceId, AccessType.OPEN, null);
    }

    @Transactional
    public Lecture createLecture(String name, java.util.UUID sequenceId, AccessType accessType, String password) {
        String cleaned = normalizeLectureJoinKey(name);
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("Lecture name must not be blank");
        }
        Lecture lecture = new Lecture(cleaned, sequenceId);
        lecture.setAccessType(accessType != null ? accessType : AccessType.OPEN);
        lecture.setPassword(password != null && !password.isBlank() ? password.trim() : null);
        Lecture saved = lectureRepository.save(lecture);
        log.info("Lecture created: id={} name={} status={} accessType={} sequenceId={}",
                saved.getId(), saved.getName(), saved.getStatus(), saved.getAccessType(), saved.getSequenceId());
        return saved;
    }

    public List<Lecture> findAllOrderByIdDesc() {
        return lectureRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public long countLectures() {
        return lectureRepository.count();
    }

    public Lecture getLecture(Long id) {
        return lectureRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Lecture not found"));
    }

    @Transactional
    public Lecture startLecture(Long id) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        lecture.setStatus(LectureStatus.ACTIVE);
        return lectureRepository.save(lecture);
    }

    /**
     * Завершает лекцию, отвязывает всех студентов в БД (для /join и колбеков бота).
     * Список chatId отдаётся наружу для уведомления в Telegram после коммита транзакции.
     */
    @Transactional
    public StopLectureResult stopLecture(Long id) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        lecture.setStatus(LectureStatus.STOPPED);
        lectureRepository.save(lecture);

        List<Student> attached = studentRepository.findByLecture_Id(id);
        List<Long> chatIds = attached.stream().map(Student::getChatId).toList();

        log.info("Lecture stopped: id={} name={} disconnectedStudents={}",
                lecture.getId(), lecture.getName(), chatIds.size());
        return new StopLectureResult(lecture, chatIds);
    }

    public record StopLectureResult(Lecture lecture, List<Long> disconnectedChatIds) {}

    @Transactional
    public Student joinLecture(String lectureNameOrId, Long chatId, String firstName, String lastName, String username) {
        return joinLecture(lectureNameOrId, chatId, null, firstName, lastName, username);
    }

    @Transactional
    public Student joinLecture(String lectureNameOrId, Long chatId, String password, String firstName, String lastName, String username) {
        String key = normalizeLectureJoinKey(lectureNameOrId);
        if (key.isEmpty()) {
            throw new IllegalArgumentException("Lecture name or id is empty");
        }

        // Ищем сначала по имени — это основной путь (работает и для "123", и для "Алгебра")
        Optional<Long> joinableByName = findJoinableLectureIdByNameNative(key);
        Lecture lecture;
        if (joinableByName.isPresent()) {
            lecture = lectureRepository.findById(joinableByName.get())
                    .orElseThrow(() -> new IllegalStateException("Inconsistent DB for lecture id"));
        } else if (findAnyLectureIdByNameNative(key).isPresent()) {
            throw new IllegalStateException("Lecture has ended (STOPPED): " + key);
        } else if (key.chars().allMatch(Character::isDigit)) {
            // Имя не нашли — пробуем как числовой id (запасной путь)
            long id = Long.parseLong(key);
            var joinableById = lectureRepository.findByIdAndStatusIn(
                    id, List.of(LectureStatus.CREATED, LectureStatus.ACTIVE));
            if (joinableById.isPresent()) {
                lecture = joinableById.get();
            } else if (lectureRepository.findById(id).isPresent()) {
                throw new IllegalStateException("Lecture has ended (STOPPED) for id: " + id);
            } else {
                throw new IllegalArgumentException("Active lecture not found: " + key);
            }
        } else {
            log.warn("Join by name failed: key='{}' (len={}). Rows in lectures table: {}.",
                    key, key.length(), lectureRepository.count());
            throw new IllegalArgumentException("Active lecture not found: " + key);
        }

        // Проверка пароля
        if (lecture.getAccessType() == AccessType.PASSWORD) {
            String lp = lecture.getPassword();
            if (lp != null && !lp.isBlank()) {
                if (password == null || password.isBlank()) {
                    throw new PasswordRequiredException("Password required for lecture: " + lecture.getName());
                }
                if (!password.trim().equals(lp.trim())) {
                    throw new WrongPasswordException("Wrong password for lecture: " + lecture.getName());
                }
            }
        }

        // Check banned users
        if (bannedUserRepository.existsByLectureIdAndChatId(lecture.getId(), chatId)) {
            throw new IllegalArgumentException("Вы отключены от этой лекции (доступ запрещён).");
        }

        Student student = studentRepository.findByChatId(chatId)
                .orElseGet(() -> new Student(chatId, lecture));
        student.setLecture(lecture);
        if (firstName != null) student.setFirstName(firstName);
        if (lastName != null) student.setLastName(lastName);
        if (username != null) student.setUsername(username);
        return studentRepository.save(student);
    }

    @Transactional
    public Lecture updateLectureName(Long id, String name) {
        return updateLecture(id, name, null, null);
    }

    @Transactional
    public Lecture updateLecture(Long id, String name, AccessType accessType, String password) {
        String cleaned = normalizeLectureJoinKey(name);
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("Lecture name must not be blank");
        }
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        lecture.setName(cleaned);
        if (accessType != null) {
            lecture.setAccessType(accessType);
        }
        if (accessType == AccessType.PASSWORD && password != null && !password.isBlank()) {
            lecture.setPassword(password.trim());
        } else if (accessType == AccessType.OPEN) {
            lecture.setPassword(null);
        }
        return lectureRepository.save(lecture);
    }

    /**
     * Прямой SQL через Hibernate — обходит сбои маппинга scalar id у Spring Data native query в PostgreSQL.
     */
    private Optional<Long> findJoinableLectureIdByNameNative(String nameKey) {
        Query q = entityManager.createNativeQuery(
                "SELECT id FROM lectures WHERE lower(trim(name)) = lower(trim(:n)) "
                        + "AND status IN ('CREATED', 'ACTIVE') LIMIT 1");
        q.setParameter("n", nameKey);
        List<?> rows = q.getResultList();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(scalarToLong(rows.get(0)));
    }

    private Optional<Long> findAnyLectureIdByNameNative(String nameKey) {
        Query q = entityManager.createNativeQuery(
                "SELECT id FROM lectures WHERE lower(trim(name)) = lower(trim(:n)) LIMIT 1");
        q.setParameter("n", nameKey);
        List<?> rows = q.getResultList();
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(scalarToLong(rows.get(0)));
    }

    private static long scalarToLong(Object cell) {
        if (cell instanceof Number n) {
            return n.longValue();
        }
        throw new IllegalStateException("Expected numeric id, got "
                + (cell == null ? "null" : cell.getClass().getName()));
    }

    /**
     * Same rules for names from web and Telegram: strip unicode whitespace, NFC normalization,
     * remove zero-width / BOM so /join matches what lecturers type in the UI.
     */
    public static String normalizeLectureJoinKey(String raw) {
        if (raw == null) {
            return "";
        }
        String s = Normalizer.normalize(raw.strip(), Normalizer.Form.NFKC);
        s = s.replaceAll("[\\u200B-\\u200D\\uFEFF]", "");
        return s.strip();
    }

    /**
     * Updates current slide, fetches image from content-service,
     * broadcasts to all subscribed students via Telegram bot.
     * Returns (lecture, slideImageBytes) for the caller (bot) to send.
     */
    @Transactional
    public SlideUpdateResult updateCurrentSlide(Long lectureId, int slideNumber) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));

        lecture.setCurrentSlide(slideNumber);
        lectureRepository.save(lecture);

        byte[] imageBytes = contentServiceClient.getSlideImage(lecture.getSequenceId(), slideNumber);
        List<Long> chatIds = studentRepository.findByLecture(lecture)
                .stream()
                .map(Student::getChatId)
                .toList();

        analyticsServiceClient.sendSlideChangedEvent(lectureId, slideNumber);

        return new SlideUpdateResult(lecture, imageBytes, chatIds);
    }

    public byte[] getSlideImage(Lecture lecture, int slideNumber) {
        return contentServiceClient.getSlideImage(lecture.getSequenceId(), slideNumber);
    }

    public record SlideUpdateResult(Lecture lecture, byte[] imageBytes, List<Long> chatIds) {}

    public List<Long> getStudentChatIds(Long lectureId) {
        return studentRepository.findByLecture_Id(lectureId)
                .stream()
                .map(Student::getChatId)
                .toList();
    }

    public List<StudentDto> getStudents(Long lectureId) {
        return studentRepository.findByLecture_Id(lectureId)
                .stream()
                .map(s -> new StudentDto(s.getChatId(), s.getFirstName(), s.getLastName(), s.getUsername()))
                .toList();
    }

    @Transactional
    public void kickStudent(Long lectureId, Long chatId) {
        if (!bannedUserRepository.existsByLectureIdAndChatId(lectureId, chatId)) {
            bannedUserRepository.save(new ru.university.lecturebroadcasting.entity.BannedUser(lectureId, chatId));
        }
        studentRepository.findByChatId(chatId).ifPresent(student -> {
            if (student.getLecture() != null && student.getLecture().getId().equals(lectureId)) {
                student.setLecture(null);
                studentRepository.save(student);
            }
        });
    }
}