import { Check } from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/database";

const STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

export function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
        Este pedido está {ORDER_STATUS_LABELS[status].toLowerCase()}.
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <li key={step} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div
                className={`h-0.5 flex-1 ${
                  i === 0 ? "opacity-0" : done ? "bg-accent" : "bg-black/10"
                }`}
              />
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-accent text-white" : "bg-bg-muted text-text-muted"
                }`}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </div>
              <div
                className={`h-0.5 flex-1 ${
                  i === STEPS.length - 1
                    ? "opacity-0"
                    : i < currentIndex
                      ? "bg-accent"
                      : "bg-black/10"
                }`}
              />
            </div>
            <span
              className={`mt-2 text-[11px] font-medium sm:text-xs ${
                done ? "text-primary" : "text-text-muted"
              }`}
            >
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
