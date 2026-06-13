import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { useAuth } from "../store/auth";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("メールアドレスとパスワードを入力してください"); return; }
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.accessToken, data.user.id, data.user.name);
      navigate("/dashboard");
    } catch {
      setError("ログインに失敗しました。メールアドレスまたはパスワードを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-[480px]">
        <h1 className="text-3xl font-bold text-indigo-600 text-center mb-1">58 in OMU</h1>
        <p className="text-sm text-gray-400 text-center mb-8">店舗管理アプリ</p>

        <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          type="email" placeholder="store@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        <label className="block text-sm text-gray-600 mb-1">パスワード</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          type="password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          onClick={handleLogin} disabled={loading}
        >
          {loading ? "ログイン中…" : "ログイン"}
        </button>

        <button
          className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm py-2 transition"
          onClick={() => navigate("/register")}
        >
          新規登録はこちら
        </button>
      </div>
    </div>
  );
}
