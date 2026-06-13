"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<Response | null>("")

  useEffect(() => {
    fetchHealth()
      .then((data) => setStatus(data.status))
      .catch(() => setError("バックエンドに接続できませんでした"));
    
    const test = async () => {
      const res = await fetch(
        "http://localhost:8000",
        {
          
          "headers": {
            "Access-Control-Allow-Origin": "https://potential-happiness-4g6vqx49pqfj6xr-3000.app.github.dev/"
          }
        }
      )
      setSample(res)
    }
    test()
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">58 in OMU</h1>
      <p className="text-gray-500">FastAPI × Next.js × Supabase</p>


      <p>{sample ?? sample.status}</p>


      <div className="border rounded-lg px-6 py-4 text-center">
        <p className="text-sm text-gray-400 mb-1">Backend health</p>
        {status && (
          <span className="text-green-500 font-mono font-semibold">
            ✓ {status}
          </span>
        )}
        {error && (
          <span className="text-red-400 font-mono text-sm">{error}</span>
        )}
        {!status && !error && (
          <span className="text-gray-400 text-sm">確認中...</span>
        )}
      </div>
    </main>
  );
}
