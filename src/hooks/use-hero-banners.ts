import * as React from "react";
import type { DbHeroBanner } from "@/types/database";
import {
  DEFAULT_HERO_SETTINGS,
  getHeroSettings,
  listActiveHeroBanners,
  type HeroSettingsInput,
} from "@/lib/api/heroBanners";

export function useHeroBanners() {
  const [banners, setBanners] = React.useState<DbHeroBanner[]>([]);
  const [settings, setSettings] = React.useState<HeroSettingsInput>(DEFAULT_HERO_SETTINGS);

  React.useEffect(() => {
    let cancelled = false;
    // Best-effort: sem banners o hero fica só com o texto, e sem configurações
    // valem os padrões (5s, opacidade 100%).
    listActiveHeroBanners()
      .then((data) => {
        if (!cancelled) setBanners(data);
      })
      .catch(() => {});
    getHeroSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { banners, settings };
}
