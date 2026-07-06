import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/Guards/ProtectedRoute";
import { TeacherRoute } from "@/components/Guards/TeacherRoute";
import { CanCreateRoute } from "@/components/Guards/CanCreateRoute";
import AppLayout from "@/components/Layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import CreateEvent from "@/pages/CreateEvent";
import CoursesPage from "@/pages/CoursesPage";
import SubjectsPage from "@/pages/SubjectsPage";
import EvaluationTypesPage from "@/pages/EvaluationTypesPage";
import UsersPage from "@/pages/UsersPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

function DashboardRouter() {
  return <Dashboard />;
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
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        document.documentElement.classList.add("keyboard-open");
      }
    };
    const onFocusOut = () => document.documentElement.classList.remove("keyboard-open");
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
              <Route path="/tipos-evaluacion" element={<TeacherRoute><EvaluationTypesPage /></TeacherRoute>} />
              <Route path="/usuarios" element={<TeacherRoute><UsersPage /></TeacherRoute>} />
              <Route path="/ajustes" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
