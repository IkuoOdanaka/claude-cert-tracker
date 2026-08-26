import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { ProgressIssueNotice } from "@/components/ProgressIssueNotice";
import { SiteHeader } from "@/components/SiteHeader";
import { ProgressProvider } from "@/features/progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Claude 資格トラッカー",
    template: "%s | Claude 資格トラッカー",
  },
  description:
    "Anthropic の Claude 認定資格を取るための学習トラッカー(非公式)。取りたい資格を選ぶと必要なコースが並び、消化状況を記録できます。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <ProgressProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-ink"
          >
            本文へスキップ
          </a>
          <SiteHeader />
          <ProgressIssueNotice />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            {children}
          </main>
          <SiteFooter />
        </ProgressProvider>
      </body>
    </html>
  );
}
