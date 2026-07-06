import { useNavigate } from "react-router-dom";

export default function BackToSettings() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/ajustes")}
      className="fixed bottom-20 md:bottom-6 right-4 z-50 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90"
      aria-label="Volver a Ajustes"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
  );
}
