import * as React from "react";

interface Toast {
  id: number;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (title: string, description?: string) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);
let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismissToast = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = React.useCallback(
    (title: string, description?: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, title, description }]);
      window.setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast],
  );

  const value = React.useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
