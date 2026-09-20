export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  uf: string;
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

// Devolve null quando o CEP não existe; lança em falha de rede/timeout.
export async function lookupCep(digits: string): Promise<CepAddress | null> {
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error("CEP lookup failed");
  const data = (await res.json()) as {
    erro?: boolean | string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro) return null;
  return {
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}
