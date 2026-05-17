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
import ru.university.lecturebroadcasting.entity.LectureParticipant;
import ru.university.lecturebroadcasting.entity.LectureStatus;
import ru.university.lecturebroadcasting.entity.Student;
import ru.university.lecturebroadcasting.repository.BannedUserRepository;
import ru.university.lecturebroadcasting.repository.LectureParticipantRepository;
import ru.university.lecturebroadcasting.repository.LectureRepository;
import ru.university.lecturebroadcasting.repository.StudentRepository;
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
    private final LectureParticipantRepository participantRepository;
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

    @Transactional
    public void deleteLecture(Long id) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        if (lecture.getStatus() == LectureStatus.ACTIVE) {
            throw new IllegalStateException("Cannot delete an active lecture");
        }

        bannedUserRepository.deleteByLectureId(id);
        studentRepository.deleteByLecture_Id(id);

        log.info("Deleting lecture {}", id);
        lectureRepository.deleteById(id);
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

    @Transactional
    public StopLectureResult stopLecture(Long id) {
        Lecture lecture = lectureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + id));
        lecture.setStatus(LectureStatus.STOPPED);
        lectureRepository.save(lecture);

        List<Student> attached = studentRepository.findByLecture_Id(id);
        List<Long> chatIds = attached.stream().map(Student::getChatId).toList();

        attached.forEach(s -> s.setLecture(null));
        studentRepository.saveAll(attached);

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

        Optional<Long> joinableByName = findJoinableLectureIdByNameNative(key);
        Lecture lecture;
        if (joinableByName.isPresent()) {
            lecture = lectureRepository.findById(joinableByName.get())
                    .orElseThrow(() -> new IllegalStateException("Inconsistent DB for lecture id"));
        } else if (findAnyLectureIdByNameNative(key).isPresent()) {
            throw new IllegalStateException("Lecture has ended (STOPPED): " + key);
        } else if (key.chars().allMatch(Character::isDigit)) {
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

        if (bannedUserRepository.existsByLectureIdAndChatId(lecture.getId(), chatId)) {
            throw new IllegalArgumentException("Вы отключены от этой лекции (доступ запрещён).");
        }

        Student student = studentRepository.findByChatId(chatId)
                .orElseGet(() -> new Student(chatId, lecture));
        student.setLecture(lecture);
        if (firstName != null) student.setFirstName(firstName);
        if (lastName != null) student.setLastName(lastName);
        if (username != null) student.setUsername(username);
        Student saved = studentRepository.save(student);

        // Сохраняем или обновляем снимок участника
        LectureParticipant participant = participantRepository
                .findByLectureIdAndChatId(lecture.getId(), chatId)
                .orElse(new LectureParticipant(lecture.getId(), chatId, null, null, null));
        participant.setFirstName(saved.getFirstName());
        participant.setLastName(saved.getLastName());
        participant.setUsername(saved.getUsername());
        participant.setKicked(false); // если переподключился — сбрасываем флаг кика
        participantRepository.save(participant);

        return saved;
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

    public static String normalizeLectureJoinKey(String raw) {
        if (raw == null) {
            return "";
        }
        String s = Normalizer.normalize(raw.strip(), Normalizer.Form.NFKC);
        s = s.replaceAll("[\\u200B-\\u200D\\uFEFF]", "");
        return s.strip();
    }

    @Transactional
    public SlideUpdateResult updateCurrentSlide(Long lectureId, int slideNumber) {
        Lecture lecture = lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalArgumentException("Lecture not found: " + lectureId));

        lecture.setCurrentSlide(slideNumber);
        lectureRepository.save(lecture);

        log.info("Fetching slide image: lectureId={} sequenceId={} slideNumber={}",
                lectureId, lecture.getSequenceId(), slideNumber);
        byte[] imageBytes = contentServiceClient.getSlideImage(lecture.getSequenceId(), slideNumber);

        if (imageBytes != null) {
            log.info("Slide image fetched successfully: lectureId={} slideNumber={} size={} bytes",
                    lectureId, slideNumber, imageBytes.length);
        } else {
            log.warn("Slide image is null: lectureId={} slideNumber={}", lectureId, slideNumber);
        }

        List<Long> chatIds = studentRepository.findByLecture(lecture)
                .stream()
                .map(Student::getChatId)
                .toList();

        log.info("Slide update result: lectureId={} slideNumber={} studentsCount={}",
                lectureId, slideNumber, chatIds.size());

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
                .map(s -> new StudentDto(s.getChatId(), s.getFirstName(), s.getLastName(), s.getUsername(), false))
                .toList();
    }

    public List<StudentDto> getAllStudents(Long lectureId) {
        List<LectureParticipant> participants = participantRepository.findByLectureId(lectureId);
        if (!participants.isEmpty()) {
            return participants.stream()
                    .map(p -> new StudentDto(p.getChatId(), p.getFirstName(), p.getLastName(), p.getUsername(), p.isKicked()))
                    .toList();
        }
        // Если participants пусты — лекция активна и никто ещё не заджойнился через новый код
        return getStudents(lectureId);
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
        // Помечаем как выгнанного
        participantRepository.findByLectureIdAndChatId(lectureId, chatId)
                .ifPresent(p -> {
                    p.setKicked(true);
                    participantRepository.save(p);
                });
    }
}
