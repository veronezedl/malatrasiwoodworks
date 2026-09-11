import { CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-brand border border-black/10 bg-white p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">
              {toast.title}
            </p>
            {toast.description && (
              <p className="mt-0.5 text-xs text-text-muted">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-text-muted hover:text-primary"
            onClick={() => dismissToast(toast.id)}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
