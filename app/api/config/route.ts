import { NextResponse } from "next/server";

function detectLocale(): "ko" | "en" {
  const explicit = process.env.LOCALE;
  if (explicit) return explicit === "ko" ? "ko" : "en";
  const lang = process.env.LANG || "";
  return lang.startsWith("ko") ? "ko" : "en";
}

function getValidLabels(): string[] {
  const envLabels = process.env.ISSUE_LABELS;
  if (envLabels) {
    return envLabels.split(",").map((l) => l.trim());
  }
  return ["learning", "infra", "side-project", "content", "core-skill"];
}

export async function GET() {
  return NextResponse.json({
    locale: detectLocale(),
    validLabels: getValidLabels(),
  });
}
