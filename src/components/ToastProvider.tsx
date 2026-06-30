import { createContext, useContext, type ReactNode } from 'react';
import { useToast } from '@/hooks/useToast';

type ToastContextType = ReturnType<typeof useToast> | null;

const ToastContext = createContext<ToastContextType>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toast = useToast();
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToastContext();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center w-64 max-w-xs p-4 mb-4 rounded-lg shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : toast.type === 'warning'
              ? 'bg-yellow-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
          role="alert"
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L2.93 12l-1.414 1.414a1 1 0 101.414 1.414L10 13.414l4.293 4.293a1 1 0 001.414-1.414l-1.414-1.414L13.414 12l1.414 1.414a1 1 0 001.414-1.414l-1.414-1.414L10 11.414z" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L2.93 12l-1.414 1.414a1 1 0 101.414 1.414L10 13.414l4.293 4.293a1 1 0 001.414-1.414l-1.414-1.414L10 11.414z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.049 4.347a1 1 0 00-1.414 0L8 8.293V11a1 1 0 002 0V8.293l-0.951-3.947a1 1 0 00-1.414 0zM9 7a3 3 0 100 6 3 3 0 000-6z" />
              </svg>
            )}
            <div className="ml-3 text-sm">{toast.message}</div>
            <button
              onClick={() => {
                // removal handled by auto timeout; optionally could expose remove
              }}
              className="ml-auto flex-no-shrink h-5 w-5 text-white/50 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};