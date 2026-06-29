import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function TeacherRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-school-bg">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (profile?.role !== "admin" && profile?.role !== "profesor") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
