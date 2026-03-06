import { NextResponse } from "next/server";
import { detectLocale, getValidLabels } from "@/lib/core";

export async function GET() {
  return NextResponse.json({
    locale: detectLocale(),
    validLabels: getValidLabels(),
  });
}
