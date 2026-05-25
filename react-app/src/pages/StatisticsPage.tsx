import { Fragment, useEffect, useState } from "react";
import { Users, ClipboardList, CheckCircle, ChevronDown, ChevronUp, Star, Download } from "lucide-react";
import { toast } from "sonner";
import { listLectures, LectureListItem, getAllStudents, StudentDto } from "../app/api/client";
import { getSlideRequestStats } from "../app/api/analytics.api";
import { getExamsByLecture, getExamSubmissions } from "../app/api/quiz.api";

interface ExamRow {
  id: string
  title: string
  status: string
  submissionCount: number
  avgScore: number | null
  maxScore: number | null
  submissions: SubmRow[]
  expanded: boolean
}
interface SurveyRow {
  id: string
  title: string
  status: string
  responseCount: number
  avgRating: number | null
  submissions: SurveySubmissionRow[]
}
interface SubmRow {
  chatId: number
  totalScore: number
  maxScore: number
  hasUngraded: boolean
}
interface SurveySubmissionRow {
  chatId: number
  rating: number | null
}
interface SlideStats {
  lectureId: number
  totalRequests: number
  topSlides: { slideNumber: number; count: number }[]
  byStudent: { chatId: number; requestCount: number }[]
}
interface GroupStatsRow {
  key: string
  groupName: string
  studentCount: number
  answeredCount: number
  avgScore: number | null
  avgRating: number | null
  distribution: Record<string, number>
  students: {
    chatId: number
    name: string
    answered: boolean
    totalScore?: number
    maxScore?: number
    percent?: number | null
    rating?: number | null
    hasUngraded?: boolean
  }[]
}

export function StatisticsPage() {
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<number>(0);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [slideStats, setSlideStats] = useState<SlideStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'students' | 'groups'>('students');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listLectures()
      .then(setLectures)
      .catch(() => toast.error("Не удалось загрузить список лекций"));
  }, []);

  useEffect(() => {
    if (!selectedLectureId) {
      setStudents([]);
      setExams([]);
      setSurveys([]);
      setSlideStats(null);
      return;
    }
    setLoading(true);

    Promise.all([
      getAllStudents(String(selectedLectureId)).catch(() => []),
      getExamsByLecture(String(selectedLectureId)).catch(() => []),
      getSlideRequestStats(String(selectedLectureId)).catch(() => null),
    ]).then(async ([studentList, examList, slideStatsData]: [StudentDto[], any[], any]) => {
      setStudents(studentList);
      setSlideStats(slideStatsData);

      const examRows: ExamRow[] = [];
      const surveyRows: SurveyRow[] = [];

      await Promise.all(examList.filter((exam: any) =>
        !exam.title?.startsWith('Быстрый вопрос:')
      ).map(async (exam: any) => {
        if (exam.status === 'DRAFT') {
          if (exam.examType === 'SURVEY') return;
          examRows.push({ id: exam.id, title: exam.title, status: exam.status, submissionCount: 0, avgScore: null, maxScore: null, submissions: [], expanded: false });
          return;
        }

        const subs: any[] = await getExamSubmissions(exam.id).catch(() => []);

        if (exam.examType === 'SURVEY') {
          // Satisfaction options are sent as "1 ⭐"..."5 ⭐"; keep this parser in sync with LivePresentationPage.
          const ratings = subs
            .flatMap((s: any) => s.answers ?? [])
            .map((a: any) => parseInt(a.selectedOptionText))
            .filter((n: number) => !isNaN(n) && n >= 1 && n <= 5);
          const avgRating = ratings.length > 0
            ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length
            : null;
          const submissions = subs.map((s: any) => {
            const rating = (s.answers ?? [])
              .map((a: any) => parseInt(a.selectedOptionText))
              .find((n: number) => !isNaN(n) && n >= 1 && n <= 5);
            return { chatId: s.chatId, rating: rating ?? null };
          });
          surveyRows.push({ id: exam.id, title: exam.title, status: exam.status, responseCount: subs.length, avgRating, submissions });
        } else {
          const submissions: SubmRow[] = subs.map((s: any) => ({ chatId: s.chatId, totalScore: s.totalScore, maxScore: s.maxScore, hasUngraded: s.hasUngraded }));
          const gradedSubs = submissions.filter(s => s.maxScore > 0);
          const avgScore = gradedSubs.length > 0
            ? gradedSubs.reduce((sum, s) => sum + (s.totalScore / s.maxScore) * 100, 0) / gradedSubs.length
            : null;
          examRows.push({ id: exam.id, title: exam.title, status: exam.status, submissionCount: submissions.length, avgScore, maxScore: gradedSubs[0]?.maxScore ?? null, submissions, expanded: false });
        }
      }));

      setExams(examRows);
      setSurveys(surveyRows);
    }).finally(() => setLoading(false));
  }, [selectedLectureId]);

  const toggleExam = (id: string) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStudentName = (chatId: number) => {
    const st = students.find(x => x.chatId === chatId);
    if (st?.realName) return st.realName;
    if (st?.firstName) return `${st.firstName} ${st.lastName || ''}`.trim();
    return `ID ${chatId}`;
  };

  const getStudentGroup = (chatId: number) => {
    const groupName = students.find(x => x.chatId === chatId)?.groupName?.trim();
    return groupName || 'Без группы';
  };

  const getStudentUsername = (chatId: number) => {
    const username = students.find(x => x.chatId === chatId)?.username;
    return username ? `@${username}` : '';
  };

  const csvCell = (value: string | number | boolean | null) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

  const safeFilePart = (value: string) =>
    value.trim().replace(/[^\p{L}\p{N}._-]+/gu, '_').replace(/^_+|_+$/g, '') || 'lecture';

  const exportResultsCsv = () => {
    const selectedLecture = lectures.find(l => l.id === selectedLectureId);
    const rows = conductedExams.flatMap(exam =>
      exam.submissions.map(sub => {
        const percent = sub.maxScore > 0
          ? Math.round((sub.totalScore / sub.maxScore) * 100)
          : '';
        return [
          selectedLecture?.name || '',
          exam.title,
          getStudentName(sub.chatId),
          getStudentUsername(sub.chatId),
          getStudentGroup(sub.chatId),
          sub.chatId,
          sub.totalScore,
          sub.maxScore,
          percent,
          sub.hasUngraded ? 'Да' : 'Нет'
        ];
      })
    );

    if (rows.length === 0) {
      toast.info("Нет результатов для экспорта");
      return;
    }

    const header = [
      'Лекция',
      'Тест',
      'Студент',
      'Telegram',
      'Группа',
      'Chat ID',
      'Баллы',
      'Максимум',
      'Процент',
      'Есть непроверенные ответы'
    ];
    const csv = [header, ...rows]
      .map(row => row.map(csvCell).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `results-${safeFilePart(selectedLecture?.name || String(selectedLectureId))}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV с результатами скачан");
  };

  const conductedExams = exams.filter(e => e.status !== 'DRAFT');
  const allAvg = conductedExams.filter(e => e.avgScore !== null);
  const overallAvg = allAvg.length > 0
    ? Math.round(allAvg.reduce((s, e) => s + e.avgScore!, 0) / allAvg.length)
    : null;
  const satisfactionSurveys = surveys.filter(s => s.avgRating !== null);
  const overallSatisfaction = satisfactionSurveys.length > 0
    ? satisfactionSurveys.reduce((s, sr) => s + sr.avgRating!, 0) / satisfactionSurveys.length
    : null;

  const studentsByGroup = students.reduce<Record<string, StudentDto[]>>((acc, student) => {
    const groupName = student.groupName?.trim() || 'Без группы';
    acc[groupName] = acc[groupName] || [];
    acc[groupName].push(student);
    return acc;
  }, {});

  const scoreBand = (percent: number) => {
    if (percent >= 90) return '90–100';
    if (percent >= 70) return '70–89';
    if (percent >= 50) return '50–69';
    return '<50';
  };

  const buildExamGroupRows = (exam: ExamRow): GroupStatsRow[] => {
    const submissionsByChatId = new Map(exam.submissions.map(sub => [sub.chatId, sub]));
    return Object.entries(studentsByGroup)
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .map(([groupName, groupStudents]) => {
        const rowStudents = groupStudents.map(student => {
          const sub = submissionsByChatId.get(student.chatId);
          const percent = sub && sub.maxScore > 0 ? Math.round((sub.totalScore / sub.maxScore) * 100) : null;
          return {
            chatId: student.chatId,
            name: getStudentName(student.chatId),
            answered: Boolean(sub),
            totalScore: sub?.totalScore,
            maxScore: sub?.maxScore,
            percent,
            hasUngraded: sub?.hasUngraded,
          };
        });
        const answered = rowStudents.filter(student => student.answered);
        const graded = answered.filter(student => student.percent !== null);
        const distribution = graded.reduce<Record<string, number>>((acc, student) => {
          const band = scoreBand(student.percent!);
          acc[band] = (acc[band] || 0) + 1;
          return acc;
        }, {});
        return {
          key: `${exam.id}:${groupName}`,
          groupName,
          studentCount: groupStudents.length,
          answeredCount: answered.length,
          avgScore: graded.length > 0
            ? graded.reduce((sum, student) => sum + student.percent!, 0) / graded.length
            : null,
          avgRating: null,
          distribution,
          students: rowStudents,
        };
      });
  };

  const buildSurveyGroupRows = (survey: SurveyRow): GroupStatsRow[] => {
    const submissionsByChatId = new Map(survey.submissions.map(sub => [sub.chatId, sub]));
    return Object.entries(studentsByGroup)
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .map(([groupName, groupStudents]) => {
        const rowStudents = groupStudents.map(student => {
          const sub = submissionsByChatId.get(student.chatId);
          return {
            chatId: student.chatId,
            name: getStudentName(student.chatId),
            answered: Boolean(sub),
            rating: sub?.rating ?? null,
          };
        });
        const rated = rowStudents.filter(student => student.rating !== null);
        return {
          key: `${survey.id}:${groupName}`,
          groupName,
          studentCount: groupStudents.length,
          answeredCount: rowStudents.filter(student => student.answered).length,
          avgScore: null,
          avgRating: rated.length > 0
            ? rated.reduce((sum, student) => sum + student.rating!, 0) / rated.length
            : null,
          distribution: {},
          students: rowStudents,
        };
      });
  };

  const renderDistribution = (distribution: Record<string, number>) => {
    const labels = ['90–100', '70–89', '50–69', '<50'];
    const total = labels.reduce((sum, label) => sum + (distribution[label] || 0), 0);
    if (total === 0) return <span className="text-neutral-400">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {labels.map(label => distribution[label] ? (
          <span key={label} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
            {label}: {distribution[label]}
          </span>
        ) : null)}
      </div>
    );
  };

  const renderGroupRows = (rows: GroupStatsRow[], kind: 'exam' | 'survey') => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="text-left py-2 px-3 text-xs text-neutral-500">Группа</th>
            <th className="text-left py-2 px-3 text-xs text-neutral-500">Студентов</th>
            <th className="text-left py-2 px-3 text-xs text-neutral-500">% ответивших</th>
            <th className="text-left py-2 px-3 text-xs text-neutral-500">{kind === 'exam' ? 'Средний балл' : 'Средняя оценка'}</th>
            {kind === 'exam' && <th className="text-left py-2 px-3 text-xs text-neutral-500">Распределение</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const answeredPct = row.studentCount > 0 ? Math.round(row.answeredCount / row.studentCount * 100) : 0;
            return (
              <Fragment key={row.key}>
                <tr
                  className="border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => toggleGroup(row.key)}
                >
                  <td className="py-2 px-3 text-sm">
                    <div className="flex items-center gap-2">
                      {expandedGroups[row.key] ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                      <span className="font-medium">{row.groupName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-sm text-neutral-600">{row.studentCount}</td>
                  <td className="py-2 px-3 text-sm text-neutral-600">{answeredPct}% ({row.answeredCount}/{row.studentCount})</td>
                  <td className="py-2 px-3 text-sm">
                    {kind === 'exam'
                      ? row.avgScore !== null ? <span className="font-medium text-orange-600">{Math.round(row.avgScore)}%</span> : <span className="text-neutral-400">—</span>
                      : row.avgRating !== null ? <span className="font-medium text-yellow-600">{row.avgRating.toFixed(1)} ⭐</span> : <span className="text-neutral-400">—</span>
                    }
                  </td>
                  {kind === 'exam' && <td className="py-2 px-3 text-sm">{renderDistribution(row.distribution)}</td>}
                </tr>
                {expandedGroups[row.key] && (
                  <tr className="border-b border-neutral-100 bg-neutral-50/70">
                    <td colSpan={kind === 'exam' ? 5 : 4} className="px-10 py-3">
                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {row.students.map(student => (
                          <div key={student.chatId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                            <span className="font-medium text-neutral-700">{student.name}</span>
                            {kind === 'exam' ? (
                              student.answered ? (
                                <span className={student.hasUngraded ? 'text-yellow-600' : (student.percent ?? 0) >= 60 ? 'text-green-600' : 'text-red-500'}>
                                  {student.hasUngraded ? 'Не проверено' : `${student.percent}%`} · {student.totalScore}/{student.maxScore}
                                </span>
                              ) : <span className="text-neutral-400">Нет ответа</span>
                            ) : (
                              student.answered ? (
                                <span className="text-yellow-600">{student.rating ? `${student.rating} ⭐` : 'Ответ'}</span>
                              ) : <span className="text-neutral-400">Нет ответа</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="mb-1">Статистика</h1>
        <p className="text-sm text-neutral-500">Студенты и результаты тестов по лекции</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <select
          value={selectedLectureId}
          onChange={e => setSelectedLectureId(Number(e.target.value))}
          className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value={0}>Выберите лекцию</option>
          {lectures.map(l => (
            <option key={l.id} value={l.id}>{l.name} ({l.status})</option>
          ))}
        </select>
        {selectedLectureId > 0 && (
          <button
            type="button"
            onClick={exportResultsCsv}
            disabled={loading || conductedExams.every(e => e.submissions.length === 0)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Скачать CSV
          </button>
        )}
      </div>

      {!selectedLectureId && (
        <div className="bg-white rounded-xl p-12 border border-neutral-200 text-center text-neutral-400 text-sm">
          Выберите лекцию для просмотра статистики
        </div>
      )}

      {selectedLectureId > 0 && loading && (
        <div className="text-center py-12 text-neutral-400 text-sm">Загрузка...</div>
      )}

      {selectedLectureId > 0 && !loading && (
        <>
          {/* Сводные карточки */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Users, color: "bg-orange-100 text-orange-600", val: String(students.length), label: "Студентов" },
              { icon: ClipboardList, color: "bg-blue-100 text-blue-600", val: String(conductedExams.length), label: "Тестов проведено" },
              { icon: CheckCircle, color: "bg-green-100 text-green-600", val: overallAvg !== null ? `${overallAvg}%` : "—", label: "Средний балл" },
              { icon: Star, color: "bg-yellow-100 text-yellow-600", val: overallSatisfaction !== null ? overallSatisfaction.toFixed(1) + " ⭐" : "—", label: "Удовлетворённость" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{s.val}</div>
                    <div className="text-xs text-neutral-500">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-6 inline-flex rounded-lg border border-neutral-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('students')}
              className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'students' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
            >
              По студентам
            </button>
            <button
              type="button"
              onClick={() => setViewMode('groups')}
              className={`px-3 py-1.5 text-sm rounded-md ${viewMode === 'groups' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
            >
              По группам
            </button>
          </div>

          {/* Список студентов */}
          <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-6">
            <h3 className="text-sm font-medium mb-3">Студенты ({students.length})</h3>
            {students.length === 0 ? (
              <p className="text-sm text-neutral-400">Нет данных о студентах</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-2 px-3 text-xs text-neutral-500">Студент</th>
                      <th className="text-left py-2 px-3 text-xs text-neutral-500">Telegram Username</th>
                      <th className="text-left py-2 px-3 text-xs text-neutral-500">Группа</th>
                      <th className="text-left py-2 px-3 text-xs text-neutral-500">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.chatId} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-2 px-3 text-sm flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                            {getStudentName(s.chatId)[0] || 'С'}
                          </div>
                          <span className="font-medium">{getStudentName(s.chatId)}</span>
                        </td>
                        <td className="py-2 px-3 text-sm text-neutral-500">{s.username ? `@${s.username}` : '—'}</td>
                        <td className="py-2 px-3 text-sm text-neutral-500">{getStudentGroup(s.chatId)}</td>
                        <td className="py-2 px-3 text-sm">
                          {s.kicked
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Выгнан</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">Участвовал</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Статистика запросов слайдов */}
          {slideStats && slideStats.totalRequests > 0 && (
            <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-6">
              <h3 className="text-sm font-medium mb-3">
                Запросы слайдов ({slideStats.totalRequests})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-500 mb-2">Топ запрошенных слайдов</div>
                  <div className="space-y-1">
                    {slideStats.topSlides.slice(0, 5).map((s) => (
                      <div key={s.slideNumber} className="flex items-center justify-between py-1.5 px-3 bg-neutral-50 rounded-lg">
                        <span className="text-sm">Слайд {s.slideNumber}</span>
                        <span className="text-sm font-medium text-orange-600">{s.count} раз</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 mb-2">Запросы по студентам</div>
                  <div className="space-y-1">
                    {slideStats.byStudent.map((s) => (
                      <div key={s.chatId} className="flex items-center justify-between py-1.5 px-3 bg-neutral-50 rounded-lg">
                        <span className="text-sm">{getStudentName(s.chatId)}</span>
                        <span className="text-sm font-medium text-orange-600">{s.requestCount} запросов</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Опросы удовлетворённости */}
          {surveys.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-6">
              <h3 className="text-sm font-medium mb-3">Удовлетворённость ({surveys.length})</h3>
              {viewMode === 'students' ? (
                <div className="space-y-2">
                  {surveys.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 border border-neutral-200 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{s.responseCount} ответов</div>
                      </div>
                      <div className="text-right">
                        {s.avgRating !== null ? (
                          <div className="text-lg font-semibold text-yellow-600">{s.avgRating.toFixed(1)} ⭐</div>
                        ) : (
                          <div className="text-sm text-neutral-400">Нет ответов</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {surveys.map(s => (
                    <div key={s.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <div className="text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{s.responseCount} ответов</div>
                      </div>
                      {renderGroupRows(buildSurveyGroupRows(s), 'survey')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Тесты */}
          <div className="bg-white rounded-xl p-5 border border-neutral-200">
            <h3 className="text-sm font-medium mb-3">Тесты ({exams.length})</h3>
            {exams.length === 0 ? (
              <p className="text-sm text-neutral-400">Нет тестов для этой лекции</p>
            ) : viewMode === 'students' ? (
              <div className="space-y-2">
                {exams.map(exam => (
                  <div key={exam.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleExam(exam.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          exam.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          exam.status === 'CLOSED' ? 'bg-neutral-100 text-neutral-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{exam.status}</span>
                        <span className="text-sm font-medium">{exam.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-neutral-500">{exam.submissionCount} ответов</span>
                        {exam.avgScore !== null && (
                          <span className="text-sm font-medium text-orange-600">{Math.round(exam.avgScore)}%</span>
                        )}
                        {exam.expanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                      </div>
                    </button>

                    {exam.expanded && exam.submissions.length > 0 && (
                      <div className="border-t border-neutral-200 px-4 py-3">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-neutral-100">
                              <th className="text-left py-1.5 text-xs text-neutral-500">Студент</th>
                              <th className="text-left py-1.5 text-xs text-neutral-500">Баллы</th>
                              <th className="text-left py-1.5 text-xs text-neutral-500">Результат</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exam.submissions.map((sub, i) => {
                              const pct = sub.maxScore > 0 ? Math.round(sub.totalScore / sub.maxScore * 100) : 0;
                              return (
                                <tr key={i} className="border-b border-neutral-50">
                                  <td className="py-1.5 text-sm">
                                    <span className="font-medium">{getStudentName(sub.chatId)}</span>
                                  </td>
                                  <td className="py-1.5 text-sm">{sub.totalScore}/{sub.maxScore}</td>
                                  <td className="py-1.5 text-sm">
                                    {sub.hasUngraded ? (
                                      <span className="text-yellow-600">Не проверено</span>
                                    ) : (
                                      <span className={pct >= 60 ? 'text-green-600' : 'text-red-500'}>{pct}%</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {exam.expanded && exam.submissions.length === 0 && (
                      <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-400">
                        Нет ответов
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map(exam => (
                  <div key={exam.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          exam.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          exam.status === 'CLOSED' ? 'bg-neutral-100 text-neutral-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{exam.status}</span>
                        <span className="text-sm font-medium">{exam.title}</span>
                      </div>
                      <div className="text-sm text-neutral-500">
                        {exam.submissionCount} ответов
                        {exam.avgScore !== null && <span className="ml-3 font-medium text-orange-600">{Math.round(exam.avgScore)}%</span>}
                      </div>
                    </div>
                    {renderGroupRows(buildExamGroupRows(exam), 'exam')}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
