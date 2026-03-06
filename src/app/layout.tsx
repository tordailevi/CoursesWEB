import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  title: "Kurzus tréner",
  description: "Kurzusok teljesítése, kérdések megválaszolása, haladás követése.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>
        <header className="app-header">
          <div className="app-shell">
            <div className="app-header-inner">
              <Link href="/" className="brand">
                <span className="brand-main">Kurzus tréner</span>
                <span className="brand-sub">Gyakorlás és haladás követése</span>
              </Link>
              <div className="nav">
                <Link href="/courses" className="nav-link">
                  Kurzusok
                </Link>
                <Link href="/my-courses" className="nav-link">
                  Kurzusaim
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
