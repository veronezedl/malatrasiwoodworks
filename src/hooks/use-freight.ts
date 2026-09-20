import * as React from "react";
import { formatCep } from "@/lib/cep";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { listShippingRates } from "@/lib/api/shippingRates";
import type { DbShippingMethod } from "@/types/database";

const STORAGE_KEY = "malatrasi-woodworks-cart-cep";

interface StoredCep {
  cep: string;
  uf: string | null;
  city: string | null;
}

function readStored(): StoredCep {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredCep;
  } catch {
    // Sem armazenamento: começa sem CEP.
  }
  return { cep: "", uf: null, city: null };
}

export type FreightStatus = "ok" | "need-cep" | "no-weight" | "no-rate";

export interface FreightQuote {
  status: FreightStatus;
  price: number;
  // Detalhe do frete por peso (para mostrar "3,2 kg x R$ 8,00/kg").
  detail: { kg: number; ratePerKg: number } | null;
}

export const FREIGHT_STATUS_TEXT: Record<Exclude<FreightStatus, "ok">, string> = {
  "need-cep": "Informe o CEP",
  "no-weight": "Peso indisponível",
  "no-rate": "Estado não atendido",
};

// CEP de entrega informado no carrinho + cotação do frete por peso e estado:
// valor por kg do estado do CEP x peso total dos itens. A regra oficial roda
// no servidor (supabase/functions/_shared/orderPricing.ts); aqui é só a prévia.
export function useFreight() {
  const [stored] = React.useState(readStored);
  const [cep, setCep] = React.useState(stored.cep);
  const [uf, setUf] = React.useState<string | null>(stored.uf);
  const [city, setCity] = React.useState<string | null>(stored.city);
  const [rates, setRates] = React.useState<Record<string, number>>({});

  const lookup = useCepLookup((address) => {
    setUf(address.uf || null);
    setCity(address.city || null);
  });

  React.useEffect(() => {
    listShippingRates()
      .then((list) =>
        setRates(Object.fromEntries(list.map((r) => [r.uf, Number(r.price_per_kg)]))),
      )
      .catch(() => {
        // Best-effort: sem tabela, o frete por peso aparece como não atendido.
      });
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cep, uf, city }));
    } catch {
      // Ignora falha de armazenamento.
    }
  }, [cep, uf, city]);

  function onCepChange(value: string) {
    const masked = formatCep(value);
    setCep(masked);
    if (masked.replace(/\D/g, "").length < 8) {
      setUf(null);
      setCity(null);
    }
    lookup.search(masked);
  }

  function quote(
    method: DbShippingMethod,
    weight: { kg: number; complete: boolean },
  ): FreightQuote {
    if (method.pricing_type !== "weight") {
      return { status: "ok", price: method.price, detail: null };
    }
    if (!uf) return { status: "need-cep", price: 0, detail: null };
    if (!weight.complete || weight.kg <= 0) return { status: "no-weight", price: 0, detail: null };
    const ratePerKg = rates[uf];
    if (!ratePerKg) return { status: "no-rate", price: 0, detail: null };
    return {
      status: "ok",
      price: Math.round(ratePerKg * weight.kg * 100) / 100,
      detail: { kg: weight.kg, ratePerKg },
    };
  }

  return { cep, uf, city, lookupStatus: lookup.status, onCepChange, quote };
}
