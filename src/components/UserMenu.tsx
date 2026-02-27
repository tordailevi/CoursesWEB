"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

export function UserMenu() {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json()) as MeResponse;
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      setUser(null);
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="nav-user">
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Bejelentkezés ellenőrzése...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="nav-user">
        <Link href="/login" className="nav-link">
          Belépés
        </Link>
        <Link href="/register" className="nav-link nav-link-accent">
          Regisztráció
        </Link>
      </div>
    );
  }

  return (
    <div className="nav-user">
      <span className="muted" style={{ fontSize: "0.8rem" }}>
        {user.username}{" "}
        {user.role === "admin" ? "(admin)" : ""}
      </span>
      {user.role === "admin" && (
        <Link
          href="/admin"
          className="btn btn-ghost"
          style={{ paddingInline: "0.85rem", fontSize: "0.8rem" }}
        >
          Admin felület
        </Link>
      )}
      <button
        type="button"
        className="btn btn-ghost"
        style={{ paddingInline: "0.85rem", fontSize: "0.8rem" }}
        onClick={handleLogout}
      >
        Kilépés
      </button>
    </div>
  );
}

