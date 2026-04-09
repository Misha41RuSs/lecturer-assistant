import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Home, BookOpen, BarChart3, ClipboardList, ChevronDown, Menu, X, LogOut } from "lucide-react";

export function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Главная" },
    { path: "/my-lectures", icon: BookOpen, label: "Мои лекции" },
    { path: "/tests", icon: ClipboardList, label: "Тесты" },
    { path: "/statistics", icon: BarChart3, label: "Статистика" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-neutral-100">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static z-50 h-full w-[220px] bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <Link to="/" className="text-lg flex items-center gap-2">
            <span className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs">L</span>
            LectureApp
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-0.5 transition-colors text-sm ${
                  active
                    ? "bg-orange-50 text-orange-600 border border-orange-200"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-neutral-200 relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 px-3 py-2.5 w-full hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs">ПП</div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm truncate">Проф. Петров</div>
              <div className="text-xs text-neutral-500 truncate">petrov@univ.ru</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-neutral-200 rounded-lg shadow-lg p-1">
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                <LogOut className="w-4 h-4" /> Выйти
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-neutral-200">
          <button onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <span className="text-sm">LectureApp</span>
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
