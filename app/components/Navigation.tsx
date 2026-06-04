import { NavLink } from "react-router";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-gray-900 dark:text-white font-medium"
    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors";

export function Navigation() {
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <NavLink
            to="/"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            සිංහල{" "}
            <span className="text-base font-normal text-gray-500">trainer</span>
          </NavLink>
          <div className="flex gap-6">
            <NavLink to="/" className={linkClass} end>
              ホーム
            </NavLink>
            <NavLink to="/lesson" className={linkClass}>
              レッスン
            </NavLink>
            <NavLink to="/table" className={linkClass}>
              表
            </NavLink>
            <NavLink to="/quiz" className={linkClass}>
              クイズ
            </NavLink>
            <NavLink to="/convert" className={linkClass}>
              変換
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
