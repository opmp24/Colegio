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
  role: "admin" | "profesor" | "usuario";
  email: string | null;
  pin: string | null;
  is_blocked: boolean | null;
  avatar_url: string | null;
  created_at: string;
  permissions: string[] | null;
}

export interface Subject {
  id: string;
  course_id: string;
  name: string;
  profesor_name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Event {
  id: string;
  course_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  type: "test" | "exam" | "homework" | "essay" | "other";
  due_date: string;
  created_by: string;
  created_at: string;
}

export type EventType = Event["type"];
export type UserRole = Profile["role"];

export interface LoginPinResult {
  auth_email: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  is_blocked: boolean;
}
