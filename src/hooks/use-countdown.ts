import * as React from "react";

export interface CountdownValue {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function compute(endsAt: string | null): CountdownValue {
  if (!endsAt) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };

  const totalSeconds = Math.floor(diffMs / 1000);
  // Horas totales (no % 24) — una promo de más de un día debe seguir
  // leyéndose como "HH:MM:SS" sin necesitar un campo aparte de días.
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, expired: false };
}

export function useCountdown(endsAt: string | null): CountdownValue {
  const [value, setValue] = React.useState<CountdownValue>(() => compute(endsAt));

  React.useEffect(() => {
    setValue(compute(endsAt));
    if (!endsAt) return;
    const interval = window.setInterval(() => {
      setValue(compute(endsAt));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  return value;
}
