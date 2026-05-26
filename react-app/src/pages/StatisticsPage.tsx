import { Fragment, useEffect, useState } from "react";
import { Users, ClipboardList, CheckCircle, ChevronDown, ChevronUp, Star, Download, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { listLectures, LectureListItem, getAllStudents, StudentDto } from "../app/api/client";
import { getSlideRequestStats } from "../app/api/analytics.api";
import { getExamsByLecture, getExamSubmissions, getExamAnalytics } from "../app/api/quiz.api";

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
  ratingDistribution: Record<number, number>
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
interface ExamAnalytics {
  questionStats?: QuestionStat[]
  studentStats?: StudentStat[]
}
interface QuestionStat {
  orderIndex: number
  questionText: string
  questionType: string
  correctPct: number
  optionStats?: OptionStat[]
}
interface OptionStat {
  optionText: string
  correct: boolean
  chosenCount: number
  chosenPct: number
}
interface StudentStat {
  chatId: number
  correctPct: number
  correctAnswers: number
  totalMultiple: number
}
interface GroupStatsRow {
  key: string
  groupName: string
  studentCount: number
  answeredCount: number
  avgScore: number | null
  avgRating: number | null
  avgCorrectPct: number | null
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
interface StudentExamRow {
  chatId: number
  name: string
  groupName: string
  sub?: SubmRow
  pct: number | null
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  CLOSED: 'Завершён',
  DRAFT: 'Черновик',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-neutral-100 text-neutral-600',
  DRAFT: 'bg-yellow-100 text-yellow-700',
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || 'bg-neutral-100 text-neutral-600'}`}>
      {statusLabel(status)}
    </span>
  );
}

function ViewToggle({
  current,
  onChange,
}: {
  current: 'students' | 'groups'
  onChange: (value: 'students' | 'groups') => void
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-neutral-200 bg-white p-1"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onChange('students')}
        className={`px-2.5 py-1 text-xs rounded-md ${current === 'students' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
      >
        По студентам
      </button>
      <button
        type="button"
        onClick={() => onChange('groups')}
        className={`px-2.5 py-1 text-xs rounded-md ${current === 'groups' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}
      >
        По группам
      </button>
    </div>
  );
}

export function StatisticsPage() {
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<number>(0);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [slideStats, setSlideStats] = useState<SlideStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentsExpanded, setStudentsExpanded] = useState(false);
  const [examViewModes, setExamViewModes] = useState<Record<string, 'students' | 'groups'>>({});
  const [surveyViewModes, setSurveyViewModes] = useState<Record<string, 'students' | 'groups'>>({});
  const [examAnalytics, setExamAnalytics] = useState<Record<string, ExamAnalytics>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listLectures()
      .then(setLectures)
      .catch(() => toast.error("Не удалось загрузить список лекций"));
  }, []);

  useEffect(() => {
    setStudentsExpanded(false);
    setExamViewModes({});
    setSurveyViewModes({});
    setExamAnalytics({});
    setExpandedGroups({});

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

      await Promise.all(examList.map(async (exam: any) => {
        const isLiveQuestion = exam.title?.startsWith('Быстрый вопрос:');
        const displayTitle = isLiveQuestion
          ? '⚡ ' + exam.title.replace(/^Быстрый вопрос:\s*/, '')
          : exam.title;
        if (exam.status === 'DRAFT') {
          if (exam.examType === 'SURVEY') return;
          examRows.push({ id: exam.id, title: displayTitle, status: exam.status, submissionCount: 0, avgScore: null, maxScore: null, submissions: [], expanded: false });
          return;
        }

        const subs: any[] = await getExamSubmissions(exam.id).catch(() => []);

        if (exam.examType === 'SURVEY') {
          // Satisfaction options are sent as "1 ⭐"..."5 ⭐"; keep this parser in sync with LivePresentationPage.
          const ratings = subs
            .flatMap((s: any) => s.answers ?? [])
            .map((a: any) => parseInt(a.selectedOptionText))
            .filter((n: number) => !isNaN(n) && n >= 1 && n <= 5);
          const ratingDistribution: Record<number, number> = {};
          ratings.forEach((rating: number) => {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
          });
          const avgRating = ratings.length > 0
            ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length
            : null;
          const submissions = subs.map((s: any) => {
            const rating = (s.answers ?? [])
              .map((a: any) => parseInt(a.selectedOptionText))
              .find((n: number) => !isNaN(n) && n >= 1 && n <= 5);
            return { chatId: s.chatId, rating: rating ?? null };
          });
          surveyRows.push({ id: exam.id, title: displayTitle, status: exam.status, responseCount: subs.length, avgRating, ratingDistribution, submissions });
        } else {
          const submissions: SubmRow[] = subs.map((s: any) => ({ chatId: s.chatId, totalScore: s.totalScore, maxScore: s.maxScore, hasUngraded: s.hasUngraded }));
          const gradedSubs = submissions.filter(s => s.maxScore > 0);
          const avgScore = gradedSubs.length > 0
            ? gradedSubs.reduce((sum, s) => sum + (s.totalScore / s.maxScore) * 100, 0) / gradedSubs.length
            : null;
          examRows.push({ id: exam.id, title: displayTitle, status: exam.status, submissionCount: submissions.length, avgScore, maxScore: gradedSubs[0]?.maxScore ?? null, submissions, expanded: false });
        }
      }));

      setExams(examRows);
      setSurveys(surveyRows);
    }).finally(() => setLoading(false));
  }, [selectedLectureId]);

  const loadExamAnalytics = async (id: string) => {
    if (examAnalytics[id]) return;
    try {
      const data = await getExamAnalytics(id) as ExamAnalytics;
      setExamAnalytics(prev => ({ ...prev, [id]: data }));
    } catch {
      // Optional block: base statistics should stay usable if analytics is unavailable.
    }
  };

  const toggleExam = (id: string) => {
    const exam = exams.find(e => e.id === id);
    const nowExpanded = !exam?.expanded;
    setExams(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
    if (nowExpanded) void loadExamAnalytics(id);
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
  const completionCount = students.filter(st =>
    conductedExams.some(e => e.submissions.some(s => s.chatId === st.chatId))
  ).length;
  const completionPct = students.length > 0
    ? Math.round(completionCount / students.length * 100)
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

  const getExamStudentRows = (exam: ExamRow): StudentExamRow[] => {
    const submissionsByChatId = new Map(exam.submissions.map(sub => [sub.chatId, sub]));
    return students
      .map(student => {
        const sub = submissionsByChatId.get(student.chatId);
        return {
          chatId: student.chatId,
          name: getStudentName(student.chatId),
          groupName: getStudentGroup(student.chatId),
          sub,
          pct: sub && sub.maxScore > 0 ? Math.round((sub.totalScore / sub.maxScore) * 100) : null,
        };
      })
      .sort((a, b) => {
        if (!a.sub && !b.sub) return a.name.localeCompare(b.name, 'ru');
        if (!a.sub) return -1;
        if (!b.sub) return 1;
        return (a.pct ?? 0) - (b.pct ?? 0);
      });
  };

  const studentRowClass = (row: StudentExamRow) => {
    if (!row.sub || row.pct === null || row.sub.hasUngraded) return 'border-b border-neutral-50';
    if (row.pct >= 70) return 'border-b border-neutral-50 bg-green-50';
    if (row.pct >= 50) return 'border-b border-neutral-50 bg-yellow-50';
    return 'border-b border-neutral-50 bg-red-50';
  };

  const buildExamGroupRows = (exam: ExamRow): GroupStatsRow[] => {
    const analyticsByChatId = new Map((examAnalytics[exam.id]?.studentStats ?? []).map(stat => [stat.chatId, stat]));
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
        const groupAnalytics = groupStudents
          .map(student => analyticsByChatId.get(student.chatId))
          .filter((stat): stat is StudentStat => Boolean(stat) && stat.totalMultiple > 0);
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
          avgCorrectPct: groupAnalytics.length > 0
            ? groupAnalytics.reduce((sum, stat) => sum + stat.correctPct, 0) / groupAnalytics.length
            : null,
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
          avgCorrectPct: null,
          distribution: {},
          students: rowStudents,
        };
      });
  };

  const renderDistributionBar = (distribution: Record<string, number>) => {
    const bands = [
      { label: '90–100', color: 'bg-green-500' },
      { label: '70–89', color: 'bg-emerald-400' },
      { label: '50–69', color: 'bg-yellow-400' },
      { label: '<50', color: 'bg-red-400' },
    ];
    const total = bands.reduce((sum, band) => sum + (distribution[band.label] || 0), 0);
    if (total === 0) return <span className="text-neutral-400">—</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="flex w-28 h-2.5 overflow-hidden rounded-full bg-neutral-100">
          {bands.map(band => {
            const count = distribution[band.label] || 0;
            if (!count) return null;
            return (
              <div
                key={band.label}
                className={band.color}
                style={{ width: `${Math.round(count / total * 100)}%` }}
                title={`${band.label}: ${count}`}
              />
            );
          })}
        </div>
        <span className="text-xs text-neutral-500">{total}</span>
      </div>
    );
  };

  const renderRatingDistribution = (survey: SurveyRow) => (
    <div className="mt-3 space-y-1.5">
      {[5, 4, 3, 2, 1].map(star => {
        const count = survey.ratingDistribution[star] || 0;
        const pct = survey.responseCount > 0 ? Math.round(count / survey.responseCount * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 w-3">{star}</span>
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <div className="flex-1 bg-neutral-100 rounded-full h-1.5 max-w-32">
              <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-neutral-400 w-4">{count}</span>
          </div>
        );
      })}
    </div>
  );

  const renderQuestionAnalytics = (examId: string) => {
    const questions = (examAnalytics[examId]?.questionStats ?? [])
      .filter(question => question.questionType === 'MULTIPLE');
    if (questions.length === 0) return null;
    return (
      <div className="mt-4 border-t border-neutral-100 pt-4">
        <div className="text-sm font-medium mb-2">Разбор по вопросам</div>
        <div className="space-y-2">
          {questions.map(question => {
            const topWrong = (question.optionStats ?? [])
              .filter(option => !option.correct && option.chosenCount > 0)
              .sort((a, b) => b.chosenCount - a.chosenCount)[0];
            return (
              <div key={`${examId}:${question.orderIndex}`} className="rounded-lg border border-neutral-200 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-neutral-800">
                      {question.orderIndex + 1}. {question.questionText}
                    </div>
                    {topWrong && (
                      <div className="text-xs text-neutral-500 mt-1">
                        Чаще выбирали: «{topWrong.optionText}» · {topWrong.chosenPct}%
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 text-sm font-medium ${
                    question.correctPct >= 70 ? 'text-green-600' : question.correctPct >= 50 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {question.correctPct}% верно
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
                    <div className="flex items-start gap-2">
                      {expandedGroups[row.key] ? <ChevronUp className="w-4 h-4 text-neutral-400 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-neutral-400 mt-0.5" />}
                      <div>
                        <div className="font-medium">{row.groupName}</div>
                        {kind === 'exam' && row.avgCorrectPct !== null && (
                          <div className="text-xs text-neutral-400 mt-0.5">Точность по вопросам: {Math.round(row.avgCorrectPct)}%</div>
                        )}
                      </div>
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
                  {kind === 'exam' && <td className="py-2 px-3 text-sm">{renderDistributionBar(row.distribution)}</td>}
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

  const renderExamStudents = (exam: ExamRow) => {
    const rows = getExamStudentRows(exam);
    if (rows.length === 0) {
      return <div className="px-4 py-3 text-sm text-neutral-400">Нет студентов</div>;
    }
    return (
      <div className="px-4 py-3">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="text-left py-1.5 text-xs text-neutral-500">Студент</th>
              <th className="text-left py-1.5 text-xs text-neutral-500">Группа</th>
              <th className="text-left py-1.5 text-xs text-neutral-500">Баллы</th>
              <th className="text-left py-1.5 text-xs text-neutral-500">Результат</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.chatId} className={studentRowClass(row)}>
                <td className="py-1.5 text-sm">
                  <span className="font-medium">{row.name}</span>
                </td>
                <td className="py-1.5 text-sm text-neutral-500">{row.groupName}</td>
                <td className="py-1.5 text-sm">{row.sub ? `${row.sub.totalScore}/${row.sub.maxScore}` : '—'}</td>
                <td className="py-1.5 text-sm">
                  {!row.sub ? (
                    <span className="text-neutral-400">Нет ответа</span>
                  ) : row.sub.hasUngraded ? (
                    <span className="text-yellow-600">Не проверено</span>
                  ) : (
                    <span className={(row.pct ?? 0) >= 60 ? 'text-green-600' : 'text-red-500'}>{row.pct}%</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {renderQuestionAnalytics(exam.id)}
      </div>
    );
  };

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
            <option key={l.id} value={l.id}>{l.name} ({statusLabel(l.status)})</option>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              { icon: Users, color: "bg-orange-100 text-orange-600", val: String(students.length), label: "Студентов" },
              { icon: ClipboardList, color: "bg-blue-100 text-blue-600", val: String(conductedExams.length), label: "Тестов проведено" },
              { icon: CheckCircle, color: "bg-green-100 text-green-600", val: overallAvg !== null ? `${overallAvg}%` : "—", label: "Средний балл" },
              { icon: UserCheck, color: "bg-purple-100 text-purple-600", val: completionPct !== null ? `${completionPct}%` : "—", label: "Выполнили тест" },
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

          <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-6">
            <h3 className="text-sm font-medium mb-3">Тесты ({exams.length})</h3>
            {exams.length === 0 ? (
              <p className="text-sm text-neutral-400">Нет тестов для этой лекции</p>
            ) : (
              <div className="space-y-2">
                {exams.map(exam => {
                  const mode = examViewModes[exam.id] || 'students';
                  return (
                    <div key={exam.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleExam(exam.id)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusBadge status={exam.status} />
                          <span className="text-sm font-medium truncate">{exam.title}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm text-neutral-500">{exam.submissionCount} ответов</span>
                          {exam.avgScore !== null && (
                            <span className="text-sm font-medium text-orange-600">{Math.round(exam.avgScore)}%</span>
                          )}
                          <ViewToggle
                            current={mode}
                            onChange={value => setExamViewModes(prev => ({ ...prev, [exam.id]: value }))}
                          />
                          {exam.expanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                        </div>
                      </button>

                      {exam.expanded && (
                        <div className="border-t border-neutral-200">
                          {mode === 'students'
                            ? renderExamStudents(exam)
                            : renderGroupRows(buildExamGroupRows(exam), 'exam')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {surveys.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-6">
              <h3 className="text-sm font-medium mb-3">Удовлетворённость ({surveys.length})</h3>
              <div className="space-y-3">
                {surveys.map(survey => {
                  const mode = surveyViewModes[survey.id] || 'students';
                  return (
                    <div key={survey.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-neutral-100">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{survey.title}</div>
                          <div className="text-xs text-neutral-400 mt-0.5">{survey.responseCount} ответов</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {survey.avgRating !== null ? (
                            <div className="text-lg font-semibold text-yellow-600">{survey.avgRating.toFixed(1)} ⭐</div>
                          ) : (
                            <div className="text-sm text-neutral-400">Нет ответов</div>
                          )}
                          <ViewToggle
                            current={mode}
                            onChange={value => setSurveyViewModes(prev => ({ ...prev, [survey.id]: value }))}
                          />
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        {mode === 'students'
                          ? renderRatingDistribution(survey)
                          : renderGroupRows(buildSurveyGroupRows(survey), 'survey')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {slideStats && slideStats.totalRequests > 0 && (
            <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-6">
              <h3 className="text-sm font-medium">Слайды, на которые возвращались ({slideStats.totalRequests})</h3>
              <p className="text-xs text-neutral-500 mt-1 mb-3">Вероятные точки непонимания</p>
              <div className="space-y-2">
                {slideStats.topSlides.slice(0, 5).map((s) => {
                  const maxCount = slideStats.topSlides[0]?.count || 1;
                  const width = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={s.slideNumber} className="flex items-center gap-3">
                      <span className="w-16 text-sm text-neutral-500">Слайд {s.slideNumber}</span>
                      <div className="flex-1 bg-neutral-100 rounded-full h-2">
                        <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${width}%` }} />
                      </div>
                      <span className="w-12 text-sm font-medium text-orange-600">{s.count}×</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-neutral-200 mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => setStudentsExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 text-left"
            >
              <h3 className="text-sm font-medium">Участники ({students.length})</h3>
              {studentsExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>
            {studentsExpanded && (
              <div className="border-t border-neutral-200 p-5">
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
