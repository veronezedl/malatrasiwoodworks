import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/database";

const VARIANT: Record<OrderStatus, "default" | "primary" | "accent" | "success"> = {
  pending: "default",
  confirmed: "primary",
  processing: "primary",
  shipped: "primary",
  delivered: "success",
  cancelled: "accent",
  refunded: "accent",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
  );
}
