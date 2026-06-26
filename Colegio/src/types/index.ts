export interface Course {
  id: string;
  name: string;
  grade: string;
  section: string;
  color: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: "admin" | "teacher" | "student" | "parent";
  avatar_url: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  type: "test" | "exam" | "homework" | "essay" | "other";
  due_date: string;
  created_by: string;
  created_at: string;
}

export type EventType = Event["type"];
