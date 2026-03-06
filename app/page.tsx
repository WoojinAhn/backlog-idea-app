"use client";

import { useState, useEffect } from "react";

type Locale = "en" | "ko";

const uiMessages = {
  en: {
    placeholder: "Describe your idea freely...",
    format: "Format Issue",
    formatting: "Formatting...",
    titleLabel: "Title",
    labelsLabel: "Labels",
    bodyLabel: "Body",
    create: "Create Issue",
    creating: "Creating...",
    back: "Back",
    success: "Issue created",
    viewOnGithub: "View on GitHub",
    networkError: "Network error",
  },
  ko: {
    placeholder: "아이디어를 자유롭게 적어주세요...",
    format: "이슈 포맷팅",
    formatting: "포맷팅 중...",
    titleLabel: "제목",
    labelsLabel: "라벨",
    bodyLabel: "본문",
    create: "이슈 생성",
    creating: "생성 중...",
    back: "뒤로",
    success: "이슈가 생성되었습니다",
    viewOnGithub: "GitHub에서 보기",
    networkError: "네트워크 오류",
  },
} as const;

type CreatedResult = { url: string; title: string; labels: string[] };
type Draft = { title: string; labels: string[]; body: string };

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [validLabels, setValidLabels] = useState<string[]>([]);

  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two-step flow
  const [draft, setDraft] = useState<Draft | null>(null);
  const [result, setResult] = useState<CreatedResult | null>(null);

  const t = uiMessages[locale];

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.locale) setLocale(data.locale);
        if (Array.isArray(data.validLabels)) setValidLabels(data.validLabels);
      })
      .catch(() => {});
  }, []);

  async function handleFormat(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to format issue");
        return;
      }
      setDraft({ title: data.title, labels: data.labels, body: data.body });
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!draft) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direct: true,
          title: draft.title,
          labels: draft.labels,
          body: draft.body,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create issue");
        return;
      }
      setResult(data);
      setDraft(null);
      setIdea("");
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setDraft(null);
    setError(null);
  }

  function toggleLabel(label: string) {
    if (!draft) return;
    const has = draft.labels.includes(label);
    setDraft({
      ...draft,
      labels: has
        ? draft.labels.filter((l) => l !== label)
        : [...draft.labels, label],
    });
  }

  const inputClasses =
    "w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-[family-name:var(--font-geist-sans)] dark:bg-zinc-950">
      <main className="w-full max-w-lg px-6">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Backlog Idea
        </h1>

        {/* Step 1: Idea input */}
        {!draft && !result && (
          <form onSubmit={handleFormat} className="space-y-4">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={t.placeholder}
              rows={5}
              className={`${inputClasses} resize-none`}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? t.formatting : t.format}
            </button>
          </form>
        )}

        {/* Step 2: Edit draft */}
        {draft && !result && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t.titleLabel}
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className={inputClasses}
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t.labelsLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {validLabels.map((label) => {
                  const active = draft.labels.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      disabled={loading}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t.bodyLabel}
              </label>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={12}
                className={`${inputClasses} resize-y font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed`}
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading || !draft.title.trim()}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? t.creating : t.create}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {t.success}
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
              {t.viewOnGithub}
            </a>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-3 block text-sm text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              {t.format === "Format Issue" ? "New idea" : "새 아이디어"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
