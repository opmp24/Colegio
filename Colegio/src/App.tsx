import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TeacherRoute } from "@/components/TeacherRoute";
import { CanCreateRoute } from "@/components/CanCreateRoute";
import AppLayout from "@/components/Layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import TeacherDashboard from "@/pages/TeacherDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import CreateEvent from "@/pages/CreateEvent";
import CoursesPage from "@/pages/CoursesPage";
import SubjectsPage from "@/pages/SubjectsPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import { useAuth } from "@/context/AuthContext";
import { useCourses } from "@/hooks/useCourses";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function DashboardRouter() {
  const { profile } = useAuth();
  const { data: courses } = useCourses();
  const isTeacher = profile?.role === "profesor" || profile?.role === "admin";

  if (!courses) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-slate-400 mt-4 text-sm">Cargando...</p>
      </div>
    );
  }

  if (courses.length === 0 && isTeacher) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h2 className="text-lg font-bold text-slate-700 mb-2">No hay cursos aún</h2>
        <p className="text-sm text-slate-500 mb-6">Crea tu primer curso para empezar a gestionar actividades.</p>
        <a
          href="/cursos"
          className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
        >
          Ir a Gestión de Cursos
        </a>
      </div>
    );
  }

  return isTeacher ? <TeacherDashboard /> : <StudentDashboard />;
}

function RedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirect = sessionStorage.getItem("redirect");
    if (redirect) {
      sessionStorage.removeItem("redirect");
      const path = redirect.replace("/Colegio", "") || "/";
      if (path !== "/") navigate(path, { replace: true });
    }
  }, [navigate]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RedirectHandler />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardRouter />} />
              <Route path="/crear" element={<CanCreateRoute><CreateEvent /></CanCreateRoute>} />
              <Route path="/cursos" element={<TeacherRoute><CoursesPage /></TeacherRoute>} />
              <Route path="/asignaturas" element={<TeacherRoute><SubjectsPage /></TeacherRoute>} />
              <Route path="/usuarios" element={<TeacherRoute><UsersPage /></TeacherRoute>} />
              <Route path="/ajustes" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
