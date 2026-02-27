export type UserRole = "user" | "admin";

export type User = {
  id: string;
  username: string;
  password: string; // NOTE: plain text for demo only – do NOT use in production
  role: UserRole;
};

export type CourseProgress = {
  courseId: string;
  completedQuestionIds: string[];
  answers?: Record<string, number[]>;
  score: number;
};

export type UserState = {
  user: User | null;
  progress: CourseProgress[];
};

