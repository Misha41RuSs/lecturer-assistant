import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, Users, Clock, FileText, Search, MoreVertical, Trash2, Copy, Settings, Presentation } from "lucide-react";
import { toast } from "sonner";

const initialLectures = [
  { id: 1, title: "Введение в ИИ", slides: 42, students: 86, date: "02.04.2026", running: false },
  { id: 2, title: "Основы машинного обучения", slides: 35, students: 72, date: "01.04.2026", running: true },
  { id: 3, title: "Структуры данных", slides: 28, students: 54, date: "28.03.2026", running: false },
  { id: 4, title: "Нейронные сети", slides: 50, students: 91, date: "05.04.2026", running: false },
  { id: 5, title: "Компьютерное зрение", slides: 33, students: 45, date: "20.03.2026", running: false },
  { id: 6, title: "Основы NLP", slides: 38, students: 67, date: "03.04.2026", running: false },
];

export function HomePage() {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState(initialLectures);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const filtered = lectures.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()));
  const runningCount = lectures.filter((l) => l.running).length;
  const totalStudents = lectures.reduce((s, l) => s + l.students, 0);

  const handleDelete = (id: number) => {
    setLectures((p) => p.filter((l) => l.id !== id));
    setMenuOpen(null);
    toast.success("Лекция удалена");
  };

  const handleDuplicate = (id: number) => {
    const src = lectures.find((l) => l.id === id);
    if (!src) return;
    setLectures((p) => [...p, { ...src, id: Date.now(), title: `${src.title} (копия)`, running: false }]);
    setMenuOpen(null);
    toast.success("Лекция скопирована");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Главная</h1>
          <p className="text-sm text-neutral-500">Управляйте и проводите ваши лекции</p>
        </div>
        <button onClick={() => navigate("/upload/new")}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Новая лекция
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1">{lectures.length}</div>
          <div className="text-sm text-neutral-500">Всего лекций</div>
        </div>
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1 text-orange-500">{runningCount}</div>
          <div className="text-sm text-neutral-500">Запущено сейчас</div>
        </div>
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1">{totalStudents}</div>
          <div className="text-sm text-neutral-500">Всего студентов</div>
        </div>
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-neutral-200">
          <div className="text-2xl lg:text-3xl mb-1">97%</div>
          <div className="text-sm text-neutral-500">Средняя вовлечённость</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск лекций..."
          className="w-full sm:w-80 pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      {/* Lectures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((lecture) => (
          <div key={lecture.id} className="bg-white rounded-xl p-5 border border-neutral-200 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="text-sm truncate">{lecture.title}</h4>
                {lecture.running && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
                  </span>
                )}
              </div>
              <div className="relative flex-shrink-0">
                <button onClick={() => setMenuOpen(menuOpen === lecture.id ? null : lecture.id)} className="p-1 hover:bg-neutral-100 rounded">
                  <MoreVertical className="w-4 h-4 text-neutral-400" />
                </button>
                {menuOpen === lecture.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 w-48 py-1">
                    <Link to={`/settings/${lecture.id}`} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-50">
                      <Settings className="w-3.5 h-3.5" /> Настройки
                    </Link>
                    <button onClick={() => handleDuplicate(lecture.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-neutral-50">
                      <Copy className="w-3.5 h-3.5" /> Дублировать
                    </button>
                    <button onClick={() => handleDelete(lecture.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 mb-5">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{lecture.slides} сл.</span>
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{lecture.students}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{lecture.date}</span>
            </div>

            <div className="flex gap-2">
              <Link to={`/slide-manager/${lecture.id}`}
                className="flex-1 text-center px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm">
                Слайды
              </Link>
              {lecture.running ? (
                <Link to={`/live/${lecture.id}`}
                  className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1.5">
                  <Presentation className="w-3.5 h-3.5" /> Перейти
                </Link>
              ) : (
                <Link to={`/settings/${lecture.id}`}
                  className="flex-1 text-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                  Настроить
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-neutral-500">{search ? "Ничего не найдено" : "Нет лекций. Создайте первую!"}</div>
      )}
    </div>
  );
}