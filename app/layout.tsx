import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Backlog Idea",
  description: "Quickly create backlog issues from ideas",
};

function detectLocale(): "ko" | "en" {
  const explicit = process.env.LOCALE;
  if (explicit) return explicit === "ko" ? "ko" : "en";
  const lang = process.env.LANG || "";
  return lang.startsWith("ko") ? "ko" : "en";
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = detectLocale();
  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
