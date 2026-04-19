import { useEffect, useState } from "react";
import { Users, ClipboardList, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { listLectures, LectureListItem } from "../app/api/client";
import { getLectureDashboard } from "../app/api/analytics.api";
import { getExamsByLecture, getExamSubmissions } from "../app/api/quiz.api";

interface StudentRow { chatId: number }
interface ExamRow {
  id: string
  title: string
  status: string
  examType: string
  submissionCount: number
  avgScore: number | null
  maxScore: number | null
  submissions: SubmRow[]
  expanded: boolean
}
interface SubmRow {
  chatId: number
  totalScore: number
  maxScore: number
  hasUngraded: boolean
}

export function StatisticsPage() {
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<number>(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listLectures()
      .then(setLectures)
      .catch(() => toast.error("Не удалось загрузить список лекций"));
  }, []);

  useEffect(() => {
    if (!selectedLectureId) { setStudents([]); setExams([]); return; }
    setLoading(true);

    Promise.all([
      getLectureDashboard(String(selectedLectureId)).catch(() => null),
      getExamsByLecture(String(selectedLectureId)).catch(() => []),
    ]).then(async ([dashboard, examList]: [any, any[]]) => {
      // Студенты из аналитики
      const ids: number[] = dashboard?.studentIds ?? [];
      setStudents(ids.map(chatId => ({ chatId })));

      // Тесты с результатами
      const rows: ExamRow[] = await Promise.all(
        examList.map(async (exam: any) => {
          let submissions: SubmRow[] = [];
          if (exam.status !== 'DRAFT') {
            try {
              const subs: any[] = await getExamSubmissions(exam.id);
              submissions = subs.map(s => ({
                chatId: s.chatId,
                totalScore: s.totalScore,
                maxScore: s.maxScore,
                hasUngraded: s.hasUngraded,
              }));
            } catch { /* ignore */ }
          }
          const gradedSubs = submissions.filter(s => s.maxScore > 0);
          const avgScore = gradedSubs.length > 0
            ? gradedSubs.reduce((sum, s) => sum + (s.totalScore / s.maxScore) * 100, 0) / gradedSubs.length
            : null;
          return {
            id: exam.id,
            title: exam.title,
            status: exam.status,
            examType: exam.examType ?? 'EXAM',
            submissionCount: submissions.length,
            avgScore,
            maxScore: gradedSubs[0]?.maxScore ?? null,
            submissions,
            expanded: false,
          };
        })
      );
      setExams(rows);
    }).finally(() => setLoading(false));
  }, [selectedLectureId]);

  const toggleExam = (id: string) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e));
  };

  const conductedExams = exams.filter(e => e.status !== 'DRAFT');
  const allAvg = conductedExams.filter(e => e.avgScore !== null);
  const overallAvg = allAvg.length > 0
    ? Math.round(allAvg.reduce((s, e) => s + e.avgScore!, 0) / allAvg.length)
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="mb-1">Статистика</h1>
        <p className="text-sm text-neutral-500">Студенты и результаты тестов по лекции</p>
      </div>

      <div className="mb-6">
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
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Users, color: "bg-orange-100 text-orange-600", val: String(students.length), label: "Уникальных студентов" },
              { icon: ClipboardList, color: "bg-blue-100 text-blue-600", val: String(conductedExams.length), label: "Проведено тестов" },
              { icon: CheckCircle, color: "bg-green-100 text-green-600", val: overallAvg !== null ? `${overallAvg}%` : "—", label: "Средний балл" },
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
                      <th className="text-left py-2 px-3 text-xs text-neutral-500">#</th>
                      <th className="text-left py-2 px-3 text-xs text-neutral-500">Telegram Chat ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.chatId} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-2 px-3 text-sm text-neutral-400">{i + 1}</td>
                        <td className="py-2 px-3 text-sm font-mono">{s.chatId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Тесты */}
          <div className="bg-white rounded-xl p-5 border border-neutral-200">
            <h3 className="text-sm font-medium mb-3">Тесты и опросы ({exams.length})</h3>
            {exams.length === 0 ? (
              <p className="text-sm text-neutral-400">Нет тестов для этой лекции</p>
            ) : (
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
                        {exam.examType === 'SURVEY' && (
                          <span className="text-xs text-neutral-400">(опрос)</span>
                        )}
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
                              <th className="text-left py-1.5 text-xs text-neutral-500">Chat ID</th>
                              <th className="text-left py-1.5 text-xs text-neutral-500">Баллы</th>
                              <th className="text-left py-1.5 text-xs text-neutral-500">Результат</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exam.submissions.map((sub, i) => {
                              const pct = sub.maxScore > 0 ? Math.round(sub.totalScore / sub.maxScore * 100) : 0;
                              return (
                                <tr key={i} className="border-b border-neutral-50">
                                  <td className="py-1.5 text-sm font-mono">{sub.chatId}</td>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}