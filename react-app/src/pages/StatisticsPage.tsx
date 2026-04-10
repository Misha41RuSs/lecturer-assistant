import { useEffect, useState } from "react";
import { Users, HelpCircle, CheckCircle, Target, Download, ChevronUp, ChevronDown, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { listLectures, LectureListItem } from "../app/api/client";
import { getLectureDashboard } from "../app/api/analytics.api";

interface SlideActivity { slideNumber: number; count: number }

interface DashboardData {
  lectureId: string;
  totalEvents: number;
  slideChanges: number;
  studentsJoined: number;
  eventsByType: Record<string, number>;
  slideActivity: SlideActivity[];
}

// Цвета для pie-чарта типов событий
const EVENT_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"];

export function StatisticsPage() {
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<number>(0);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"slideNumber" | "count">("slideNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const perPage = 5;

  // Загружаем список лекций
  useEffect(() => {
    listLectures()
      .then(setLectures)
      .catch(() => toast.error("Не удалось загрузить список лекций"));
  }, []);

  // Загружаем дашборд при выборе лекции
  useEffect(() => {
    if (!selectedLectureId) { setDashboard(null); return; }
    const lec = lectures.find(l => l.id === selectedLectureId);
    if (!lec) return;
    setLoadingDashboard(true);
    getLectureDashboard(String(selectedLectureId))
      .then((d: DashboardData) => setDashboard(d))
      .catch(() => toast.error("Не удалось загрузить аналитику"))
      .finally(() => setLoadingDashboard(false));
  }, [selectedLectureId, lectures]);

  const slideData: SlideActivity[] = dashboard?.slideActivity ?? [];

  const filtered = slideData
    .filter(s => String(s.slideNumber).includes(search))
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return mul * (a[sortBy] - b[sortBy]);
    });
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleSort = (col: "slideNumber" | "count") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  // Pie: распределение типов событий
  const eventPieData = dashboard
    ? Object.entries(dashboard.eventsByType).map(([name, value], i) => ({
        name,
        value,
        color: EVENT_COLORS[i % EVENT_COLORS.length],
      }))
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Статистика</h1>
          <p className="text-sm text-neutral-500">Аналитика по лекциям из analytics-service</p>
        </div>
        <button
          onClick={() => toast.success("CSV экспортирован")}
          className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Экспорт CSV
        </button>
      </div>

      {/* Фильтр лекции */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedLectureId}
          onChange={e => { setSelectedLectureId(Number(e.target.value)); setPage(0); }}
          className="px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value={0}>Выберите лекцию</option>
          {lectures.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {!selectedLectureId && (
        <div className="bg-white rounded-xl p-12 border border-neutral-200 text-center text-neutral-400 text-sm">
          Выберите лекцию для просмотра аналитики
        </div>
      )}

      {selectedLectureId > 0 && loadingDashboard && (
        <div className="text-center py-12 text-neutral-400 text-sm">Загрузка аналитики...</div>
      )}

      {selectedLectureId > 0 && !loadingDashboard && dashboard && (
        <>
          {/* Карточки */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Users, color: "bg-orange-100 text-orange-600", val: String(dashboard.studentsJoined), label: "Студентов зашло" },
              { icon: HelpCircle, color: "bg-orange-100 text-orange-600", val: String(dashboard.totalEvents), label: "Всего событий" },
              { icon: CheckCircle, color: "bg-green-100 text-green-600", val: String(dashboard.slideChanges), label: "Смен слайдов" },
              { icon: Target, color: "bg-green-100 text-green-600", val: String(slideData.length), label: "Активных слайдов" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xl">{s.val}</div>
                    <div className="text-xs text-neutral-500">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Графики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <h3 className="text-sm mb-4">Активность по слайдам</h3>
              {slideData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={slideData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="slideNumber" tick={{ fontSize: 12 }} label={{ value: 'Слайд', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [v, 'Событий']} labelFormatter={(l) => `Слайд ${l}`} />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-neutral-400 text-sm">Нет данных</div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-neutral-200">
              <h3 className="text-sm mb-4">Распределение событий</h3>
              {eventPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={eventPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}>
                      {eventPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-neutral-400 text-sm">Нет данных</div>
              )}
            </div>
          </div>

          {/* Таблица активности слайдов */}
          <div className="bg-white rounded-xl p-5 border border-neutral-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-sm">Активность по слайдам</h3>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text" value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Поиск по номеру..."
                  className="pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th
                      onClick={() => handleSort("slideNumber")}
                      className="text-left py-2.5 px-3 text-sm text-neutral-600 cursor-pointer hover:text-neutral-900"
                    >
                      Слайд <SortIcon col="slideNumber" />
                    </th>
                    <th
                      onClick={() => handleSort("count")}
                      className="text-left py-2.5 px-3 text-sm text-neutral-600 cursor-pointer hover:text-neutral-900"
                    >
                      Событий <SortIcon col="count" />
                    </th>
                    <th className="text-left py-2.5 px-3 text-sm text-neutral-600">Доля</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s, i) => {
                    const total = slideData.reduce((acc, x) => acc + x.count, 0);
                    const pct = total > 0 ? Math.round(s.count / total * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-2.5 px-3 text-sm">Слайд {s.slideNumber}</td>
                        <td className="py-2.5 px-3 text-sm">{s.count}</td>
                        <td className="py-2.5 px-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-neutral-100 rounded-full h-1.5 max-w-[120px]">
                              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-neutral-500 text-xs">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-sm">Нет данных по активности слайдов</div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-neutral-500">
                  {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} из {filtered.length}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                    className="px-3 py-1 border border-neutral-300 rounded text-sm hover:bg-neutral-50 disabled:opacity-40">Назад</button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 border border-neutral-300 rounded text-sm hover:bg-neutral-50 disabled:opacity-40">Вперёд</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}