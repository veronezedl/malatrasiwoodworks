import * as React from "react";
import { BR_STATES } from "@/data/states";
import { formatCep, joinStreetNumber } from "@/lib/cep";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { saveGuestDraft, type GuestCustomerInput } from "@/lib/api/guestCheckout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  addressLine1: string;
  number: string;
  addressLine2: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  region: string;
  marketingOptIn: boolean;
}

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  cpfCnpj: "",
  addressLine1: "",
  number: "",
  addressLine2: "",
  neighborhood: "",
  postalCode: "",
  city: "",
  region: "",
  marketingOptIn: false,
};

// Mapeia cada campo do formulário para a coluna real de customers, usado
// pelo autosave (ver saveGuestDraft em lib/api/guestCheckout.ts).
const FIELD_KEY_MAP: Record<Exclude<keyof FormState, "number">, keyof GuestCustomerInput> = {
  fullName: "full_name",
  email: "email",
  phone: "phone",
  cpfCnpj: "cpf_cnpj",
  addressLine1: "address_line1",
  addressLine2: "address_line2",
  neighborhood: "neighborhood",
  postalCode: "postal_code",
  city: "city",
  region: "region",
  marketingOptIn: "marketing_opt_in",
};

// Uma visita nova deve começar um rascunho limpo, não reabrir um lead
// antigo que o admin já possa ter contactado — por isso sessionStorage, não
// localStorage.
const DRAFT_STORAGE_KEY = "mww-guest-checkout-draft-id";

interface GuestCheckoutFormProps {
  idPrefix?: string;
  onLoginClick?: () => void;
  onSubmit: (customer: GuestCustomerInput, draftCustomerId: string | null) => Promise<void>;
}

export function GuestCheckoutForm({
  idPrefix = "guest",
  onLoginClick,
  onSubmit,
}: GuestCheckoutFormProps) {
  const [form, setForm] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const draftIdRef = React.useRef<string | null>(
    typeof window !== "undefined" ? window.sessionStorage.getItem(DRAFT_STORAGE_KEY) : null,
  );

  function persistDraftId(id: string | null) {
    draftIdRef.current = id;
    if (typeof window === "undefined") return;
    if (id) window.sessionStorage.setItem(DRAFT_STORAGE_KEY, id);
    else window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  async function autosave(fields: Partial<GuestCustomerInput>) {
    const id = await saveGuestDraft(draftIdRef.current, fields);
    if (id) persistDraftId(id);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Para selects/checkboxes (sempre têm um valor, nunca vazios) o autosave
  // dispara na hora; os campos de texto salvam no onBlur.
  function updateAndSave<K extends Exclude<keyof FormState, "number">>(key: K, value: FormState[K]) {
    update(key, value);
    autosave({ [FIELD_KEY_MAP[key]]: value } as Partial<GuestCustomerInput>);
  }

  function saveAddressLine() {
    const line = joinStreetNumber(form.addressLine1, form.number);
    if (line) autosave({ address_line1: line });
  }

  function handleBlur(key: Exclude<keyof FormState, "number" | "addressLine1">) {
    const value = form[key];
    if (typeof value === "string" && !value.trim()) return;
    autosave({ [FIELD_KEY_MAP[key]]: value } as Partial<GuestCustomerInput>);
  }

  const cep = useCepLookup((address) => {
    setForm((f) => ({
      ...f,
      addressLine1: address.street || f.addressLine1,
      neighborhood: address.neighborhood || f.neighborhood,
      city: address.city || f.city,
      region: address.uf || f.region,
    }));
    setErrors((e) => ({
      ...e,
      addressLine1: undefined,
      neighborhood: undefined,
      city: undefined,
    }));
    autosave({
      ...(address.street
        ? { address_line1: joinStreetNumber(address.street, form.number) }
        : {}),
      ...(address.neighborhood ? { neighborhood: address.neighborhood } : {}),
      ...(address.city ? { city: address.city } : {}),
      ...(address.uf ? { region: address.uf } : {}),
    });
    document.getElementById(`${idPrefix}-${address.street ? "number" : "addressLine1"}`)?.focus();
  });

  function handleCepChange(value: string) {
    const masked = formatCep(value);
    update("postalCode", masked);
    cep.search(masked);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) next.fullName = "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Email inválido.";
    if (!form.phone.trim()) next.phone = "Informe um telefone de contato.";
    if (!form.addressLine1.trim()) next.addressLine1 = "Informe seu endereço.";
    if (!form.number.trim()) next.number = "Informe o número.";
    if (!form.neighborhood.trim()) next.neighborhood = "Informe o bairro.";
    if (!form.postalCode.trim()) next.postalCode = "Informe o CEP.";
    if (!form.city.trim()) next.city = "Informe sua cidade.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(
        {
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          cpf_cnpj: form.cpfCnpj || undefined,
          address_line1: joinStreetNumber(form.addressLine1, form.number),
          address_line2: form.addressLine2 || undefined,
          neighborhood: form.neighborhood,
          postal_code: form.postalCode,
          city: form.city,
          region: form.region || undefined,
          country_code: "BR",
          marketing_opt_in: form.marketingOptIn,
        },
        draftIdRef.current,
      );
      // O pedido já nasceu com esses dados — um rascunho novo (se reabrir o
      // checkout na mesma aba) não deve reaproveitar este cliente.
      persistDraftId(null);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o pedido. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="mb-5 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          {formError}
        </div>
      )}

      <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-muted">
        Dados de contato
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-fullName`}>Nome completo</Label>
          <Input
            id={`${idPrefix}-fullName`}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            onBlur={() => handleBlur("fullName")}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && <p className="text-xs text-accent">{errors.fullName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-xs text-accent">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>Telefone (WhatsApp)</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            placeholder="+55 11 99999-0000"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="text-xs text-accent">{errors.phone}</p>}
        </div>
      </div>

      <h2 className="mt-6 font-heading text-sm font-semibold uppercase tracking-wide text-text-muted">
        Endereço de entrega
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-postalCode`}>CEP</Label>
          <Input
            id={`${idPrefix}-postalCode`}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={form.postalCode}
            onChange={(e) => handleCepChange(e.target.value)}
            onBlur={() => handleBlur("postalCode")}
            aria-invalid={!!errors.postalCode}
          />
          {cep.status === "loading" && (
            <p className="text-xs text-text-muted">Buscando endereço...</p>
          )}
          {cep.status === "notfound" && (
            <p className="text-xs text-text-muted">
              CEP não encontrado. Preencha o endereço manualmente.
            </p>
          )}
          {cep.status === "error" && (
            <p className="text-xs text-text-muted">
              Não foi possível buscar o endereço. Preencha manualmente.
            </p>
          )}
          {errors.postalCode && <p className="text-xs text-accent">{errors.postalCode}</p>}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-4 sm:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-addressLine1`}>Endereço</Label>
            <Input
              id={`${idPrefix}-addressLine1`}
              placeholder="Rua, avenida..."
              value={form.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              onBlur={saveAddressLine}
              aria-invalid={!!errors.addressLine1}
            />
            {errors.addressLine1 && (
              <p className="text-xs text-accent">{errors.addressLine1}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-number`}>Número</Label>
            <Input
              id={`${idPrefix}-number`}
              placeholder="123 ou S/N"
              value={form.number}
              onChange={(e) => update("number", e.target.value)}
              onBlur={saveAddressLine}
              aria-invalid={!!errors.number}
            />
            {errors.number && <p className="text-xs text-accent">{errors.number}</p>}
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-addressLine2`}>Complemento (opcional)</Label>
          <Input
            id={`${idPrefix}-addressLine2`}
            value={form.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
            onBlur={() => handleBlur("addressLine2")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-neighborhood`}>Bairro</Label>
          <Input
            id={`${idPrefix}-neighborhood`}
            value={form.neighborhood}
            onChange={(e) => update("neighborhood", e.target.value)}
            onBlur={() => handleBlur("neighborhood")}
            aria-invalid={!!errors.neighborhood}
          />
          {errors.neighborhood && <p className="text-xs text-accent">{errors.neighborhood}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-city`}>Cidade</Label>
          <Input
            id={`${idPrefix}-city`}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            aria-invalid={!!errors.city}
          />
          {errors.city && <p className="text-xs text-accent">{errors.city}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-region`}>Estado</Label>
          <Select
            id={`${idPrefix}-region`}
            value={form.region}
            onChange={(e) => updateAndSave("region", e.target.value)}
          >
            <option value="">Selecione...</option>
            {BR_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-cpfCnpj`}>CPF / CNPJ (opcional)</Label>
          <Input
            id={`${idPrefix}-cpfCnpj`}
            value={form.cpfCnpj}
            onChange={(e) => update("cpfCnpj", e.target.value)}
            onBlur={() => handleBlur("cpfCnpj")}
          />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-2 text-xs text-text-muted">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-accent"
          checked={form.marketingOptIn}
          onChange={(e) => updateAndSave("marketingOptIn", e.target.checked)}
        />
        Quero receber ofertas e novidades da Malatrasi WoodWorks por email.
      </label>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="mt-6 w-full"
        disabled={submitting}
      >
        {submitting ? "Processando..." : "Finalizar pedido"}
      </Button>
      <p className="mt-2 text-center text-xs text-text-muted">
        Você escolhe Pix, cartão ou boleto na próxima etapa, no Mercado Pago.
      </p>

      {onLoginClick && (
        <p className="mt-4 text-center text-sm text-text-muted">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={onLoginClick}
            className="font-medium text-accent hover:underline"
          >
            Entrar
          </button>
        </p>
      )}
    </form>
  );
}
