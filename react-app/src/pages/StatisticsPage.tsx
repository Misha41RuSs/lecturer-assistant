import { useState } from "react";
import { Users, HelpCircle, CheckCircle, Target, Search, Download, ChevronUp, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const lectures = [
  { id: 0, title: "Все лекции" },
  { id: 1, title: "Введение в ИИ" },
  { id: 2, title: "Основы машинного обучения" },
  { id: 3, title: "Структуры данных" },
];

const tests = [
  { id: 0, title: "Все тесты" },
  { id: 1, title: "Тест: Основы алгоритмов" },
  { id: 2, title: "Опрос: Качество лекции" },
];

const gradeData = [
  { name: "2", value: 3 },
  { name: "3", value: 6 },
  { name: "4", value: 11 },
  { name: "5", value: 18 },
];

const pieData = [
  { name: "Сдали", value: 41, color: "#22c55e" },
  { name: "Не сдали", value: 6, color: "#ef4444" },
];

const allStudents = [
  { name: "Алексей Петров", score: 92, total: 100, grade: 5, status: "Сдал", test: "Тест: Основы алгоритмов", lecture: "Введение в ИИ" },
  { name: "Мария Смирнова", score: 78, total: 100, grade: 4, status: "Сдал", test: "Тест: Основы алгоритмов", lecture: "Введение в ИИ" },
  { name: "Иван Козлов", score: 64, total: 100, grade: 2, status: "Не сдал", test: "Тест: Основы алгоритмов", lecture: "Структуры данных" },
  { name: "Ольга Новикова", score: 85, total: 100, grade: 5, status: "Сдал", test: "Тест: Основы алгоритмов", lecture: "Основы машинного обучения" },
  { name: "Дмитрий Волков", score: 61, total: 100, grade: 3, status: "Сдал", test: "Опрос: Качество лекции", lecture: "Введение в ИИ" },
  { name: "Екатерина Лебедева", score: 97, total: 100, grade: 5, status: "Сдал", test: "Тест: Основы алгоритмов", lecture: "Введение в ИИ" },
  { name: "Андрей Соколов", score: 73, total: 100, grade: 4, status: "Сдал", test: "Опрос: Качество лекции", lecture: "Основы машинного обучения" },
  { name: "Наталья Морозова", score: 55, total: 100, grade: 2, status: "Не сдал", test: "Тест: Основы алгоритмов", lecture: "Структуры данных" },
];

export function StatisticsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "score" | "grade">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selectedLecture, setSelectedLecture] = useState(0);
  const [selectedTest, setSelectedTest] = useState(0);
  const perPage = 5;

  const filtered = allStudents
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .filter((s) => selectedLecture === 0 || s.lecture === lectures.find((l) => l.id === selectedLecture)?.title)
    .filter((s) => selectedTest === 0 || s.test === tests.find((t) => t.id === selectedTest)?.title)
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return mul * a.name.localeCompare(b.name);
      return mul * ((a as any)[sortBy] - (b as any)[sortBy]);
    });

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleSort = (col: "name" | "score" | "grade") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  const avg = filtered.length > 0 ? Math.round(filtered.reduce((s, r) => s + r.score, 0) / filtered.length) : 0;
  const passed = filtered.filter((s) => s.status === "Сдал").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Статистика</h1>
          <p className="text-sm text-neutral-500">Результаты студентов по лекциям и тестам</p>
        </div>
        <button onClick={() => toast.success("CSV экспортирован")}
          className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm self-start sm:self-auto">
          <Download className="w-4 h-4" /> Экспорт CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={selectedLecture} onChange={(e) => { setSelectedLecture(Number(e.target.value)); setPage(0); }}
          className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
          {lectures.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <select value={selectedTest} onChange={(e) => { setSelectedTest(Number(e.target.value)); setPage(0); }}
          className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
          {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users, color: "bg-orange-100 text-orange-600", val: String(filtered.length), label: "Студентов" },
          { icon: HelpCircle, color: "bg-orange-100 text-orange-600", val: `${avg}%`, label: "Средний балл" },
          { icon: CheckCircle, color: "bg-green-100 text-green-600", val: String(passed), label: "Сдали" },
          { icon: Target, color: "bg-green-100 text-green-600", val: filtered.length > 0 ? `${Math.round(passed / filtered.length * 100)}%` : "—", label: "Успеваемость" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-neutral-200">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
              <div>
                <div className="text-xl">{s.val}</div>
                <div className="text-xs text-neutral-500">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 border border-neutral-200">
          <h3 className="text-sm mb-4">Распределение оценок</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={gradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 border border-neutral-200">
          <h3 className="text-sm mb-4">Успеваемость</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl p-5 border border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-sm">Результаты</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Поиск..."
              className="pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-56" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200">
                <th onClick={() => handleSort("name")} className="text-left py-2.5 px-3 text-sm text-neutral-600 cursor-pointer hover:text-neutral-900">
                  Студент <SortIcon col="name" />
                </th>
                <th className="text-left py-2.5 px-3 text-sm text-neutral-600 hidden md:table-cell">Тест</th>
                <th className="text-left py-2.5 px-3 text-sm text-neutral-600 hidden lg:table-cell">Лекция</th>
                <th onClick={() => handleSort("score")} className="text-left py-2.5 px-3 text-sm text-neutral-600 cursor-pointer hover:text-neutral-900 hidden sm:table-cell">
                  Баллы <SortIcon col="score" />
                </th>
                <th onClick={() => handleSort("grade")} className="text-left py-2.5 px-3 text-sm text-neutral-600 cursor-pointer hover:text-neutral-900">
                  Оценка <SortIcon col="grade" />
                </th>
                <th className="text-left py-2.5 px-3 text-sm text-neutral-600">Статус</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => (
                <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="py-2.5 px-3 text-sm">{s.name}</td>
                  <td className="py-2.5 px-3 text-sm text-neutral-500 hidden md:table-cell">{s.test}</td>
                  <td className="py-2.5 px-3 text-sm text-neutral-500 hidden lg:table-cell">{s.lecture}</td>
                  <td className="py-2.5 px-3 text-sm hidden sm:table-cell">{s.score}/{s.total}</td>
                  <td className="py-2.5 px-3 text-sm">{s.grade}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "Сдал" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && <div className="text-center py-8 text-neutral-500 text-sm">Нет данных по выбранным фильтрам</div>}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-neutral-500">{page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} из {filtered.length}</div>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-3 py-1 border border-neutral-300 rounded text-sm hover:bg-neutral-50 disabled:opacity-40">Назад</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 border border-neutral-300 rounded text-sm hover:bg-neutral-50 disabled:opacity-40">Вперёд</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
