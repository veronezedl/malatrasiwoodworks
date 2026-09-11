import * as React from "react";
import { Flame } from "lucide-react";
import { getActivePromotion } from "@/lib/api/promotions";
import { useCountdown } from "@/hooks/use-countdown";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function PromoBanner() {
  const [endsAt, setEndsAt] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    getActivePromotion()
      .then((promo) => {
        if (promo) {
          setEndsAt(promo.ends_at);
          setMessage(promo.message);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const { hours, minutes, seconds, expired } = useCountdown(endsAt);

  if (!loaded || !endsAt || expired) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-accent py-2 text-center text-xs font-semibold text-white sm:text-sm">
      <Flame className="size-4 shrink-0" />
      <span>
        {message} {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
