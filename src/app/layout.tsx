import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileFirstVisitLogoIntro from "@/components/MobileFirstVisitLogoIntro";
import { Suspense } from "react";
import MobileTabBar, { MobileTabBarFallback } from "@/components/MobileTabBar";
import MobileMainPad from "@/components/MobileMainPad";
import { AppSerwistProvider } from "@/components/AppSerwistProvider";
import { OverlayProvider } from "@/components/ui";
import { buildTokenCSS } from "@/lib/design-tokens";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#3498DB",
};

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
  applicationName: "AlphA Bank",
  title: "AlphA Bank",
  description: "AlphA Bank — Personal Finance Dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AlphA Bank",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon-32x32.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={cn("font-sans overflow-x-hidden", geistSans.variable, manrope.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* 디자인 토큰 (--tk-*) — 단일 소스: src/lib/design-tokens.ts */}
        <style id="design-tokens" dangerouslySetInnerHTML={{ __html: buildTokenCSS() }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
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
      <body className="antialiased bg-background text-foreground overflow-x-hidden min-w-0">
        <AppSerwistProvider>
          <OverlayProvider>
            <div className="flex h-screen overflow-hidden min-w-0">
              {/* 데스크탑 사이드바 */}
              <div className="relative z-[100] hidden md:flex md:shrink-0">
                <Sidebar />
              </div>

              {/* 우측 메인 영역 */}
              <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
                <MobileFirstVisitLogoIntro />
                <MobileHeader />
                <MobileMainPad>{children}</MobileMainPad>
              </div>
              <Suspense fallback={<MobileTabBarFallback />}>
                <MobileTabBar />
              </Suspense>
            </div>
          </OverlayProvider>
        </AppSerwistProvider>
      </body>
    </html>
  );
}
