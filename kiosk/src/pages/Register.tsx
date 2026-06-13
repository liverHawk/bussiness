import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!name || !email || !password) { setError("すべての項目を入力してください"); return; }
    if (password.length < 8) { setError("パスワードは8文字以上で入力してください"); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      setDone(true);
    } catch {
      setError("登録に失敗しました。メールアドレスが既に使用されている可能性があります。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-[480px]">
        <h1 className="text-2xl font-bold text-indigo-600 text-center mb-8">新規アカウント登録</h1>

        {done ? (
          <div className="text-center">
            <p className="text-emerald-500 font-semibold mb-6">登録が完了しました！</p>
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
              onClick={() => navigate("/")}
            >
              ログインへ
            </button>
          </div>
        ) : (
          <>
            <label className="block text-sm text-gray-600 mb-1">名前 / 店舗名</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="例：カフェ58" value={name} onChange={(e) => setName(e.target.value)}
            />

            <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              type="email" placeholder="store@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
            />

            <label className="block text-sm text-gray-600 mb-1">パスワード（8文字以上）</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              onClick={handleRegister} disabled={loading}
            >
              {loading ? "登録中…" : "アカウントを作成"}
            </button>
            <button
              className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm py-2 transition"
              onClick={() => navigate("/")}
            >
              ← ログインに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
}
