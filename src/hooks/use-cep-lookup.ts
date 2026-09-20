import * as React from "react";
import { lookupCep, type CepAddress } from "@/lib/cep";

export type CepStatus = "idle" | "loading" | "notfound" | "error";

export function useCepLookup(onFound: (address: CepAddress) => void) {
  const [status, setStatus] = React.useState<CepStatus>("idle");
  const latest = React.useRef("");
  const onFoundRef = React.useRef(onFound);
  onFoundRef.current = onFound;

  const search = React.useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    latest.current = digits;
    if (digits.length !== 8) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      const address = await lookupCep(digits);
      if (latest.current !== digits) return;
      if (!address) {
        setStatus("notfound");
        return;
      }
      setStatus("idle");
      onFoundRef.current(address);
    } catch {
      if (latest.current === digits) setStatus("error");
    }
  }, []);

  return { status, search };
}
