"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
};

export default function AdminHomePage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as MeResponse;
        setMe(data.user);
      } catch {
        setMe(null);
      }
    }
    void load();
  }, []);

  if (!me) {
    return (
      <div className="card">
        <h1>Admin felület</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          Az admin felület megtekintéséhez admin fiókkal kell belépned.
        </p>
      </div>
    );
  }

  if (me.role !== "admin") {
    return (
      <div className="card">
        <h1>Csak adminoknak</h1>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          Az admin felületet csak admin jogosultsággal lehet elérni.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Admin felület</h1>
      <p className="muted" style={{ marginTop: "0.3rem" }}>
        Felhasználók kezelése, eredmények megtekintése és kurzusok létrehozása.
      </p>

      <div
        style={{
          display: "grid",
          gap: "0.9rem",
          marginTop: "1.2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <Link href="/admin/users" className="card" style={{ textDecoration: "none" }}>
          <h2>Felhasználók</h2>
          <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Felhasználók hozzáadása/törlése és jogosultságuk módosítása (admin / user).
          </p>
        </Link>

        <Link href="/admin/progress" className="card" style={{ textDecoration: "none" }}>
          <h2>Eredmények</h2>
          <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Nézd meg, hogyan teljesítenek a felhasználók a kurzusokban.
          </p>
        </Link>

        <Link href="/admin/courses" className="card" style={{ textDecoration: "none" }}>
          <h2>Kurzusok</h2>
          <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Meglévő kurzusok szerkesztése vagy törlése.
          </p>
        </Link>

        <Link
          href="/admin/courses/new"
          className="card"
          style={{ textDecoration: "none" }}
        >
          <h2>Új kurzus</h2>
          <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Új kurzus létrehozása kérdésekkel és képekkel (drag &amp; drop).
          </p>
        </Link>
      </div>
    </div>
  );
}

