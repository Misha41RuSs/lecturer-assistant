import { useState } from "react";
import { Plus, Trash2, Clock, Check, BarChart3, ChevronDown, ChevronRight, ChevronLeft, Eye, Edit2, Star } from "lucide-react";
import { toast } from "sonner";

interface Answer { id: number; text: string; correct: boolean; }
interface Question { id: number; text: string; time: number | null; type: "multiple" | "open"; answers?: Answer[]; }

interface StudentAnswer {
  questionId: number;
  selectedAnswerId?: number;
  openText?: string;
  score: number | null; // null = not graded yet (for open)
  maxScore: number;
}

interface StudentResult {
  student: string;
  date: string;
  answers: StudentAnswer[];
}

interface Test {
  id: number;
  title: string;
  totalTime: number | null; // total test time in minutes, null = no limit
  questions: Question[];
  assignedTo: string[];
  results: StudentResult[];
}

const initialTests: Test[] = [
  {
    id: 1, title: "Тест: Основы алгоритмов", totalTime: 15,
    questions: [
      { id: 1, text: "Что такое машинное обучение?", time: 60, type: "multiple", answers: [
        { id: 1, text: "Обучение на данных", correct: true },
        { id: 2, text: "Ручное программирование", correct: false },
        { id: 3, text: "Загрузка моделей из интернета", correct: false },
      ]},
      { id: 2, text: "Назовите алгоритм обучения с учителем.", time: 45, type: "open" },
      { id: 3, text: "В чём разница между O(n) и O(n²)?", time: null, type: "open" },
    ],
    assignedTo: ["Введение в ИИ"],
    results: [
      { student: "Алексей Петров", date: "03.04.2026", answers: [
        { questionId: 1, selectedAnswerId: 1, score: 10, maxScore: 10 },
        { questionId: 2, openText: "Линейная регрессия — классический пример алгоритма обучения с учителем", score: 10, maxScore: 10 },
        { questionId: 3, openText: "O(n) растёт линейно, O(n²) — квадратично, разница критична на больших данных", score: 8, maxScore: 10 },
      ]},
      { student: "Мария Смирнова", date: "03.04.2026", answers: [
        { questionId: 1, selectedAnswerId: 1, score: 10, maxScore: 10 },
        { questionId: 2, openText: "Деревья решений", score: 8, maxScore: 10 },
        { questionId: 3, openText: "Одно быстрее другого", score: 3, maxScore: 10 },
      ]},
      { student: "Иван Козлов", date: "03.04.2026", answers: [
        { questionId: 1, selectedAnswerId: 2, score: 0, maxScore: 10 },
        { questionId: 2, openText: "Не помню", score: null, maxScore: 10 },
        { questionId: 3, openText: "", score: 0, maxScore: 10 },
      ]},
      { student: "Ольга Новикова", date: "03.04.2026", answers: [
        { questionId: 1, selectedAnswerId: 1, score: 10, maxScore: 10 },
        { questionId: 2, openText: "Метод k-ближайших соседей, SVM, нейросети", score: 10, maxScore: 10 },
        { questionId: 3, openText: "При O(n) — линейный рост, при O(n²) если n=1000, то 1 млн операций. Критично!", score: 10, maxScore: 10 },
      ]},
    ],
  },
  {
    id: 2, title: "Опрос: Качество лекции", totalTime: null,
    questions: [
      { id: 101, text: "Насколько понятна была лекция? (1-5)", time: null, type: "open" },
      { id: 102, text: "Что можно улучшить?", time: null, type: "open" },
    ],
    assignedTo: [],
    results: [],
  },
];

function getStudentTotal(result: StudentResult): { score: number; max: number; hasUngraded: boolean } {
  let score = 0, max = 0, hasUngraded = false;
  for (const a of result.answers) {
    max += a.maxScore;
    if (a.score === null) hasUngraded = true;
    else score += a.score;
  }
  return { score, max, hasUngraded };
}

export function TestsPage() {
  const [tests, setTests] = useState<Test[]>(initialTests);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "create" | "stats" | "student-detail">("list");
  const [expandedTest, setExpandedTest] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newTotalTime, setNewTotalTime] = useState("");
  const [questionType, setQuestionType] = useState<"multiple" | "open">("multiple");
  const [questionText, setQuestionText] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [answers, setAnswers] = useState<Answer[]>([
    { id: 1, text: "", correct: false }, { id: 2, text: "", correct: false },
  ]);
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);

  const selectedTest = tests.find((t) => t.id === selectedTestId);

  const startCreate = () => {
    setNewTitle(""); setNewTotalTime(""); setEditQuestions([]); setQuestionText("");
    setAnswers([{ id: 1, text: "", correct: false }, { id: 2, text: "", correct: false }]);
    setView("create");
  };

  const addQuestion = () => {
    if (!questionText.trim()) { toast.error("Введите текст вопроса"); return; }
    if (questionType === "multiple" && !answers.some((a) => a.correct)) { toast.error("Отметьте правильный ответ"); return; }
    if (questionType === "multiple" && answers.some((a) => !a.text.trim())) { toast.error("Заполните все варианты"); return; }
    const q: Question = {
      id: Date.now(), text: questionText, time: timeLimit ? parseInt(timeLimit) : null, type: questionType,
      ...(questionType === "multiple" ? { answers: [...answers] } : {}),
    };
    setEditQuestions([...editQuestions, q]);
    setQuestionText("");
    setAnswers([{ id: Date.now() + 1, text: "", correct: false }, { id: Date.now() + 2, text: "", correct: false }]);
    toast.success("Вопрос добавлен");
  };

  const saveTest = () => {
    if (!newTitle.trim()) { toast.error("Введите название теста"); return; }
    if (editQuestions.length === 0) { toast.error("Добавьте хотя бы один вопрос"); return; }
    const newTest: Test = {
      id: Date.now(), title: newTitle,
      totalTime: newTotalTime ? parseInt(newTotalTime) : null,
      questions: editQuestions, assignedTo: [], results: [],
    };
    setTests([...tests, newTest]);
    setView("list");
    toast.success("Тест создан");
  };

  const deleteTest = (id: number) => {
    setTests(tests.filter((t) => t.id !== id));
    setExpandedTest(null);
    toast.success("Тест удалён");
  };

  const showStats = (id: number) => { setSelectedTestId(id); setView("stats"); };

  const gradeOpenAnswer = (studentName: string, questionId: number, score: number) => {
    setTests(tests.map((t) => {
      if (t.id !== selectedTestId) return t;
      return {
        ...t,
        results: t.results.map((r) => {
          if (r.student !== studentName) return r;
          return { ...r, answers: r.answers.map((a) => a.questionId === questionId ? { ...a, score } : a) };
        }),
      };
    }));
    toast.success("Оценка сохранена");
  };

  // Breadcrumb component
  const Breadcrumbs = ({ items }: { items: { label: string; onClick?: () => void }[] }) => (
    <div className="flex items-center gap-1 text-sm text-neutral-500 mb-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-orange-500 transition-colors">{item.label}</button>
          ) : (
            <span className="text-neutral-900">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );

  // ========== Student detail view ==========
  if (view === "student-detail" && selectedTest && selectedStudent) {
    const result = selectedTest.results.find((r) => r.student === selectedStudent);
    if (!result) { setView("stats"); return null; }
    const totals = getStudentTotal(result);

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Breadcrumbs items={[
          { label: "Тесты", onClick: () => setView("list") },
          { label: selectedTest.title, onClick: () => setView("stats") },
          { label: result.student },
        ]} />
        <h1 className="mb-1">{result.student}</h1>
        <p className="text-sm text-neutral-500 mb-6">
          {result.date} &middot; Итого: {totals.score}/{totals.max}
          {totals.hasUngraded && <span className="text-orange-500 ml-2">Есть непроверенные ответы</span>}
        </p>

        <div className="space-y-4">
          {selectedTest.questions.map((q, i) => {
            const ans = result.answers.find((a) => a.questionId === q.id);
            const isCorrectMultiple = q.type === "multiple" && ans?.selectedAnswerId !== undefined &&
              q.answers?.find((a) => a.id === ans.selectedAnswerId)?.correct;

            return (
              <div key={q.id} className="bg-white rounded-xl p-5 border border-neutral-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 bg-orange-500 text-white rounded-lg flex items-center justify-center text-sm flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm mb-1">{q.text}</p>
                    <div className="flex gap-2 text-xs text-neutral-500">
                      <span className="px-1.5 py-0.5 bg-neutral-100 rounded">{q.type === "multiple" ? "Множ. выбор" : "Открытый ответ"}</span>
                      {q.time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{q.time}с</span>}
                    </div>
                  </div>
                  {ans && (
                    <div className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                      ans.score === null ? "bg-yellow-100 text-yellow-700" :
                      ans.score >= ans.maxScore * 0.7 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {ans.score === null ? "Не проверено" : `${ans.score}/${ans.maxScore}`}
                    </div>
                  )}
                </div>

                {q.type === "multiple" && q.answers && (
                  <div className="space-y-1.5 ml-10">
                    {q.answers.map((opt) => {
                      const selected = ans?.selectedAnswerId === opt.id;
                      const correct = opt.correct;
                      return (
                        <div key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          selected && correct ? "bg-green-50 border border-green-200" :
                          selected && !correct ? "bg-red-50 border border-red-200" :
                          !selected && correct ? "bg-green-50/50 border border-green-100" :
                          "bg-neutral-50 border border-neutral-200"
                        }`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selected ? (correct ? "bg-green-500 border-green-500 text-white" : "bg-red-500 border-red-500 text-white") : "border-neutral-300"
                          }`}>
                            {selected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="flex-1">{opt.text}</span>
                          {correct && <span className="text-xs text-green-600">Правильный</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "open" && ans && (
                  <div className="ml-10 space-y-3">
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                      <div className="text-xs text-neutral-500 mb-1">Ответ студента:</div>
                      <p className="text-sm">{ans.openText || <span className="text-neutral-400 italic">Пустой ответ</span>}</p>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Оценка (0–{ans.maxScore}):</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} max={ans.maxScore}
                          value={ans.score ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Math.min(ans.maxScore, Math.max(0, parseInt(e.target.value) || 0));
                            gradeOpenAnswer(result.student, q.id, val as number);
                          }}
                          className="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-sm text-neutral-500">из {ans.maxScore}</span>
                        {ans.score === null && <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">Требует проверки</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== Stats view ==========
  if (view === "stats" && selectedTest) {
    const results = selectedTest.results.map((r) => ({ ...r, totals: getStudentTotal(r) }));
    const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.totals.score, 0) / results.length) : 0;
    const maxPossible = selectedTest.questions.length * 10;
    const passed = results.filter((r) => r.totals.score >= r.totals.max * 0.7).length;
    const ungraded = results.filter((r) => r.totals.hasUngraded).length;

    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Breadcrumbs items={[
          { label: "Тесты", onClick: () => setView("list") },
          { label: selectedTest.title },
        ]} />
        <h1 className="mb-1">{selectedTest.title}</h1>
        <p className="text-sm text-neutral-500 mb-6">
          {selectedTest.totalTime ? `${selectedTest.totalTime} мин. на тест` : "Без ограничения времени"}
          {" · "}{selectedTest.questions.length} вопросов
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-2xl mb-1">{results.length}</div>
            <div className="text-sm text-neutral-500">Прошли тест</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-2xl mb-1">{avg}/{maxPossible}</div>
            <div className="text-sm text-neutral-500">Средний балл</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="text-2xl mb-1 text-green-600">{passed}</div>
            <div className="text-sm text-neutral-500">Сдали (≥70%)</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className={`text-2xl mb-1 ${ungraded > 0 ? "text-yellow-600" : ""}`}>{ungraded}</div>
            <div className="text-sm text-neutral-500">Ждут проверки</div>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="bg-white rounded-xl p-5 border border-neutral-200">
            <h3 className="text-sm mb-4">Результаты — нажмите на студента для подробностей</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-2.5 px-3 text-sm text-neutral-600">Студент</th>
                    <th className="text-left py-2.5 px-3 text-sm text-neutral-600">Баллы</th>
                    <th className="text-left py-2.5 px-3 text-sm text-neutral-600 hidden sm:table-cell">Дата</th>
                    <th className="text-left py-2.5 px-3 text-sm text-neutral-600">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}
                      onClick={() => { setSelectedStudent(r.student); setView("student-detail"); }}
                      className="border-b border-neutral-100 hover:bg-orange-50 cursor-pointer transition-colors">
                      <td className="py-2.5 px-3 text-sm flex items-center gap-2">
                        {r.student}
                        {r.totals.hasUngraded && <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" title="Есть непроверенные" />}
                      </td>
                      <td className="py-2.5 px-3 text-sm">{r.totals.score}/{r.totals.max}</td>
                      <td className="py-2.5 px-3 text-sm text-neutral-500 hidden sm:table-cell">{r.date}</td>
                      <td className="py-2.5 px-3">
                        {r.totals.hasUngraded ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">На проверке</span>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.totals.score >= r.totals.max * 0.7 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {r.totals.score >= r.totals.max * 0.7 ? "Сдал" : "Не сдал"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 border border-neutral-200 text-center text-neutral-500 text-sm">
            Тест ещё никто не проходил
          </div>
        )}

        <div className="bg-white rounded-xl p-5 border border-neutral-200 mt-6">
          <h3 className="text-sm mb-4">Вопросы теста ({selectedTest.questions.length})</h3>
          <div className="space-y-2">
            {selectedTest.questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg">
                <div className="w-6 h-6 bg-orange-500 text-white rounded flex items-center justify-center text-xs flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm mb-1">{q.text}</p>
                  <div className="flex gap-2 text-xs text-neutral-500">
                    <span className="px-1.5 py-0.5 bg-neutral-100 rounded">{q.type === "multiple" ? "Выбор" : "Открытый"}</span>
                    {q.time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{q.time}с</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== Create view ==========
  if (view === "create") {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Breadcrumbs items={[
          { label: "Тесты", onClick: () => setView("list") },
          { label: "Создание теста" },
        ]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="mb-0">Создание теста</h1>
          <button onClick={saveTest} className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 text-sm self-start sm:self-auto">
            <Check className="w-4 h-4" /> Сохранить тест
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
          <div className="space-y-4">
            {/* Title & total time */}
            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <div className="mb-4">
                <label className="block text-sm mb-1.5">Название теста</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="напр. Тест: Основы алгоритмов"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm mb-1.5">Общее время на весь тест (мин), пусто = без ограничения</label>
                <input type="number" value={newTotalTime} onChange={(e) => setNewTotalTime(e.target.value)}
                  placeholder="15"
                  className="w-full sm:w-40 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>

            {/* New question form */}
            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <h3 className="text-sm mb-4">Новый вопрос</h3>
              <div className="mb-4">
                <label className="block text-sm mb-2">Тип</label>
                <div className="flex gap-2">
                  {(["multiple", "open"] as const).map((t) => (
                    <button key={t} onClick={() => setQuestionType(t)}
                      className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm ${
                        questionType === t ? "border-orange-500 bg-orange-50" : "border-neutral-300"
                      }`}>
                      {t === "multiple" ? "Мн. выбор" : "Открытый"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm mb-1.5">Текст вопроса</label>
                <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Введите вопрос..." rows={3}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
              </div>

              {questionType === "multiple" && (
                <div className="mb-4">
                  <label className="block text-sm mb-2">Варианты ответов</label>
                  <div className="space-y-2">
                    {answers.map((a) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <button onClick={() => setAnswers(answers.map((x) => x.id === a.id ? { ...x, correct: !x.correct } : x))}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            a.correct ? "bg-orange-500 border-orange-500 text-white" : "border-neutral-300"
                          }`}>
                          {a.correct && <Check className="w-3 h-3" />}
                        </button>
                        <input type="text" value={a.text}
                          onChange={(e) => setAnswers(answers.map((x) => x.id === a.id ? { ...x, text: e.target.value } : x))}
                          placeholder="Вариант..."
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                            a.correct ? "border-orange-300 bg-orange-50" : "border-neutral-300 bg-neutral-50"
                          }`} />
                        {answers.length > 2 && (
                          <button onClick={() => setAnswers(answers.filter((x) => x.id !== a.id))} className="text-neutral-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setAnswers([...answers, { id: Date.now(), text: "", correct: false }])}
                    className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 mt-2">
                    <Plus className="w-4 h-4" /> Добавить вариант
                  </button>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm mb-1.5">Время на вопрос (сек), пусто = без лимита</label>
                <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="60"
                  className="w-full sm:w-40 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <button onClick={addQuestion}
                className="w-full bg-orange-500 text-white py-2.5 rounded-lg hover:bg-orange-600 text-sm">
                Добавить вопрос
              </button>
            </div>
          </div>

          {/* Questions sidebar */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200 h-fit lg:sticky lg:top-4">
            <h3 className="text-sm mb-4">Вопросы ({editQuestions.length})</h3>
            {editQuestions.length === 0 ? (
              <div className="text-sm text-neutral-500 text-center py-8">Добавьте вопросы</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {editQuestions.map((q, i) => (
                  <div key={q.id} className="border border-neutral-200 rounded-lg p-3 group">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-orange-500 text-white rounded flex items-center justify-center text-xs flex-shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{q.text}</p>
                        <div className="flex gap-2 text-xs text-neutral-500 mt-1">
                          <span className="px-1.5 py-0.5 bg-neutral-100 rounded">{q.type === "multiple" ? "Выбор" : "Открытый"}</span>
                          {q.time && <span><Clock className="w-3 h-3 inline" /> {q.time}с</span>}
                        </div>
                      </div>
                      <button onClick={() => setEditQuestions(editQuestions.filter((x) => x.id !== q.id))}
                        className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== List view ==========
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Тесты</h1>
          <p className="text-sm text-neutral-500">Создавайте и управляйте тестами для лекций</p>
        </div>
        <button onClick={startCreate}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 text-sm self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Создать тест
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-neutral-200 text-center">
          <p className="text-neutral-500 mb-4">Нет тестов. Создайте первый!</p>
          <button onClick={startCreate} className="bg-orange-500 text-white px-5 py-2.5 rounded-lg hover:bg-orange-600 text-sm">
            Создать тест
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const ungraded = test.results.filter((r) => r.answers.some((a) => a.score === null)).length;
            return (
              <div key={test.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <button onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-sm truncate flex items-center gap-2">
                        {test.title}
                        {ungraded > 0 && <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{ungraded} на проверке</span>}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {test.questions.length} вопросов
                        {test.totalTime && <> &middot; {test.totalTime} мин.</>}
                        {test.results.length > 0 && <> &middot; {test.results.length} результатов</>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {expandedTest === test.id ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
                  </div>
                </button>

                {expandedTest === test.id && (
                  <div className="border-t border-neutral-200 p-4">
                    <div className="space-y-2 mb-4">
                      {test.questions.map((q, i) => (
                        <div key={q.id} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 bg-neutral-200 rounded text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="flex-1">{q.text}</span>
                          <span className="text-xs text-neutral-500 px-1.5 py-0.5 bg-neutral-100 rounded flex-shrink-0">
                            {q.type === "multiple" ? "Выбор" : "Открытый"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-neutral-100">
                      <button onClick={() => showStats(test.id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50">
                        <BarChart3 className="w-3.5 h-3.5" /> Результаты
                      </button>
                      <button onClick={() => deleteTest(test.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 ml-auto">
                        <Trash2 className="w-3.5 h-3.5" /> Удалить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}
