"use client";

import type { CourseProgress } from "@/models/user";

const GUEST_PROGRESS_KEY = "course_app_guest_progress";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function loadGuestProgress(): CourseProgress[] {
  return readJson<CourseProgress[]>(GUEST_PROGRESS_KEY, []);
}

export function saveGuestProgress(progress: CourseProgress[]) {
  writeJson(GUEST_PROGRESS_KEY, progress);
}

