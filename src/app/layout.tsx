import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import "./globals.css";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileMainPad from "@/components/MobileMainPad";
import { type SessionData, sessionOptions } from "@/lib/session";
import { getUserProfile, isValidUserId } from "@/lib/user-profiles";

async function getSessionProfileLabel(): Promise<string | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const uid = session.userId;
  if (!uid || !isValidUserId(uid)) return null;
  return getUserProfile(uid)?.name ?? null;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
  title: "AlphA Bank",
  description: "AlphA Bank — Personal Finance Dashboard",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profileLabel = await getSessionProfileLabel();

  return (
    <html
      lang="ko"
      className={cn("font-sans overflow-x-hidden", geistSans.variable, manrope.variable)}
      suppressHydrationWarning
    >
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
      <body className="antialiased bg-background text-foreground overflow-x-hidden min-w-0">
        <div className="flex h-screen overflow-hidden min-w-0">
          {/* 데스크탑 사이드바 */}
          <div className="relative z-[100] hidden md:flex md:shrink-0">
            <Sidebar />
          </div>

          {/* 우측 메인 영역 */}
          <div className="flex flex-1 flex-col overflow-hidden relative min-w-0">
            <MobileHeader profileLabel={profileLabel} />
            <MobileMainPad>{children}</MobileMainPad>
          </div>
        </div>
      </body>
    </html>
  );
}
