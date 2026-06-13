import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

const NAV = [
  { to: "/dashboard",  label: "ダッシュボード" },
  { to: "/map",        label: "マップ" },
  { to: "/congestion", label: "混雑モニター" },
  { to: "/store",      label: "店舗管理" },
  { to: "/products",   label: "商品管理" },
  { to: "/coupons",    label: "クーポン管理" },
  { to: "/payment",    label: "決済" },
];

export default function Layout() {
  const { userName, stores, activeStoreId, setActiveStore, logout } = useAuth();
  const navigate = useNavigate();
  const activeName = stores.find((s) => s.store_id === activeStoreId)?.name;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-indigo-950 flex flex-col shrink-0">
        <div className="px-5 pt-6 pb-4 border-b border-indigo-800">
          <p className="text-white font-bold text-lg">58 in OMU</p>
          <p className="text-indigo-300 text-xs mt-0.5">店舗管理</p>
        </div>

        {/* 店舗セレクター */}
        {stores.length > 0 && (
          <div className="px-3 py-3 border-b border-indigo-800">
            <p className="text-indigo-400 text-xs mb-1 px-1">アクティブ店舗</p>
            <select
              className="w-full bg-indigo-900 text-white text-sm rounded-lg px-2 py-1.5 border border-indigo-700 focus:outline-none focus:border-indigo-400"
              value={activeStoreId ?? ""}
              onChange={(e) => setActiveStore(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-indigo-200 hover:bg-indigo-800"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-indigo-800 text-xs text-indigo-300 space-y-1">
          <p className="truncate">{userName}</p>
          {activeName && <p className="truncate text-indigo-400">{activeName}</p>}
          <button
            className="mt-2 text-red-400 hover:text-red-300 transition"
            onClick={handleLogout}
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}
