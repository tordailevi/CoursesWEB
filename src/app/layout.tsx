import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  title: "Course Trainer",
  description: "Complete courses, answer questions, track your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="app-shell">
            <div className="app-header-inner">
              <Link href="/" className="brand">
                <span className="brand-main">Course Trainer</span>
                <span className="brand-sub">Practice & track progress</span>
              </Link>
              <div className="nav">
                <Link href="/courses" className="nav-link">
                  Courses
                </Link>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        <main className="app-shell">
          <div className="app-main">{children}</div>
        </main>
      </body>
    </html>
  );
}
