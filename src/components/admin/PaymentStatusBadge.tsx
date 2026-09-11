import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/types/database";

const VARIANT: Record<PaymentStatus, "default" | "success"> = {
  pending: "default",
  paid: "success",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
