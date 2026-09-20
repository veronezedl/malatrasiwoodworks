import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/types/database";

const VARIANT: Record<PaymentStatus, "default" | "success" | "accent"> = {
  pending: "default",
  paid: "success",
  failed: "accent",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
