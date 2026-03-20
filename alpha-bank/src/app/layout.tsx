import type { Metadata } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AlphA Bank",
  description: "AlphA Bank — Personal Finance Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("font-sans", geistSans.variable, manrope.variable)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('alphabank-theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <div className="flex h-screen overflow-hidden">
          {/* 데스크탑 사이드바 */}
          <div className="relative z-[100] hidden md:flex md:shrink-0">
            <Sidebar />
          </div>

          {/* 우측 메인 영역 */}
          <div className="flex flex-1 flex-col overflow-hidden relative">
            {/* 모바일: 햄버거 메뉴 (좌상단 고정, safe-area 지원) */}
            <div
              className="fixed z-50 md:hidden"
              style={{
                top: "max(1rem, env(safe-area-inset-top, 0px))",
                left: "max(1rem, env(safe-area-inset-left, 0px))",
              }}
            >
              <MobileNav />
            </div>
            <main className="flex-1 overflow-y-auto pt-20 md:pt-0">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
