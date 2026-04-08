import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, FileText, Users, Clock, LayoutGrid, List, Presentation } from "lucide-react";

const allLectures = [
  { id: 1, title: "Введение в ИИ", slides: 42, students: 86, date: "02.04.2026", running: false },
  { id: 2, title: "Основы машинного обучения", slides: 35, students: 72, date: "01.04.2026", running: true },
  { id: 3, title: "Структуры данных", slides: 28, students: 54, date: "28.03.2026", running: false },
  { id: 4, title: "Нейронные сети", slides: 50, students: 91, date: "05.04.2026", running: false },
  { id: 5, title: "Компьютерное зрение", slides: 33, students: 45, date: "20.03.2026", running: false },
  { id: 6, title: "Основы NLP", slides: 38, students: 67, date: "03.04.2026", running: false },
  { id: 7, title: "Рекуррентные сети", slides: 12, students: 0, date: "15.03.2026", running: false },
  { id: 8, title: "Трансформеры и GPT", slides: 45, students: 110, date: "10.03.2026", running: false },
];

export function MyLecturesPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = allLectures.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Мои лекции</h1>
          <p className="text-sm text-neutral-500">Все ваши лекции в одном месте</p>
        </div>
        <Link to="/upload/new"
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Создать лекцию
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="flex border border-neutral-300 rounded-lg overflow-hidden ml-auto">
          <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-neutral-200" : "bg-white hover:bg-neutral-50"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-neutral-200" : "bg-white hover:bg-neutral-50"}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <div key={l.id} className="bg-white rounded-xl p-5 border border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm truncate pr-2">{l.title}</h4>
                {l.running && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-neutral-500 mb-4">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{l.slides} сл.</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{l.students}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{l.date}</span>
              </div>
              <div className="flex gap-2">
                <Link to={`/slide-manager/${l.id}`} className="flex-1 text-center px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-sm">Слайды</Link>
                <Link to={`/settings/${l.id}`} className="flex-1 text-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
                  Настроить
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Название</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600 hidden sm:table-cell">Слайды</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600 hidden md:table-cell">Студенты</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600 hidden sm:table-cell">Дата</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-3 px-4 text-sm">
                      <span className="flex items-center gap-2">
                        {l.title}
                        {l.running && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm hidden sm:table-cell">{l.slides}</td>
                    <td className="py-3 px-4 text-sm hidden md:table-cell">{l.students}</td>
                    <td className="py-3 px-4 text-sm text-neutral-500 hidden sm:table-cell">{l.date}</td>
                    <td className="py-3 px-4">
                      <Link to={`/slide-manager/${l.id}`} className="text-orange-500 hover:text-orange-600 text-sm">Открыть</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && <div className="text-center py-16 text-neutral-500">Ничего не найдено</div>}
    </div>
  );
}