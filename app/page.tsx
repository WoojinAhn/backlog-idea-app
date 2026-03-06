"use client";

import { useState } from "react";

type Result = {
  url: string;
  title: string;
  labels: string[];
} | null;

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create issue");
        return;
      }

      setResult(data);
      setIdea("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-[family-name:var(--font-geist-sans)] dark:bg-zinc-950">
      <main className="w-full max-w-lg px-6">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Backlog Idea
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="아이디어를 자유롭게 적어주세요..."
            rows={5}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !idea.trim()}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "생성 중..." : "이슈 생성"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              이슈가 생성되었습니다
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              {result.title}
            </p>
            <div className="mt-1 flex gap-1.5">
              {result.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  {label}
                </span>
              ))}
            </div>
            <a
              href={result.url.startsWith("https://") ? result.url : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-green-800 underline dark:text-green-300"
            >
              GitHub에서 보기
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
