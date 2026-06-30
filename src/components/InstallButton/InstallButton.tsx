import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface InstallButtonProps {
  variant?: "full" | "compact";
  className?: string;
}

const InstallButton: React.FC<InstallButtonProps> = ({ variant = "full", className = "" }) => {
  const { isInstallable, isInstalled, install } = useInstallPrompt();

  if (!isInstallable || isInstalled) return null;

  if (variant === "compact") {
    return (
      <button
        onClick={install}
        className={`text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold underline underline-offset-2 transition-colors ${className}`}
      >
        Instalar App
      </button>
    );
  }

  return (
    <button
      onClick={install}
      className={`w-full py-3 bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Instalar App
    </button>
  );
};

export default InstallButton;
