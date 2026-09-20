import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { BR_STATES } from "@/data/states";
import { formatCep } from "@/lib/cep";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  cpfCnpj: string;
  addressLine1: string;
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
  password: "",
  phone: "",
  cpfCnpj: "",
  addressLine1: "",
  addressLine2: "",
  neighborhood: "",
  postalCode: "",
  city: "",
  region: "",
  marketingOptIn: false,
};

interface RegistroFormProps {
  idPrefix?: string;
  // Se false (uso em popup), não navega para outra página ao terminar:
  // deixa o caller decidir o que fazer via onSuccess.
  redirect?: boolean;
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function RegistroForm({
  idPrefix = "registro",
  redirect = true,
  onSuccess,
  onLoginClick,
}: RegistroFormProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Se já há uma sessão ativa (ex. após redefinir a senha de uma conta que
  // nunca completou a ficha de cliente), não faz sentido criar um usuário
  // novo do Supabase Auth — só falta salvar os dados de cliente.
  const { session } = useAuth();
  const hasSession = !!session;
  const [form, setForm] = React.useState<FormState>(() => ({
    ...initialState,
    email: session?.user.email ?? "",
  }));
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
    document.getElementById(`${idPrefix}-addressLine1`)?.focus();
  });

  function handleCepChange(value: string) {
    const masked = formatCep(value);
    update("postalCode", masked);
    cep.search(masked);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) next.fullName = "Informe seu nome completo.";
    if (!hasSession) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        next.email = "Email inválido.";
      if (form.password.length < 8)
        next.password = "A senha deve ter pelo menos 8 caracteres.";
    }
    if (!form.phone.trim()) next.phone = "Informe um telefone de contato.";
    if (!form.addressLine1.trim()) next.addressLine1 = "Informe seu endereço.";
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

    if (!isSupabaseConfigured) {
      setFormError(
        "O cadastro ainda não está disponível: falta configurar a conexão com o banco de dados.",
      );
      return;
    }

    setSubmitting(true);
    try {
      let authUserId = session?.user.id;
      let email = form.email;

      if (!hasSession) {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: form.email,
            password: form.password,
          });
        if (signUpError) throw signUpError;

        if (signUpData.user && signUpData.user.identities?.length === 0) {
          throw new Error(
            "Já existe uma conta com este email. Faça login para continuar.",
          );
        }

        if (!signUpData.session) {
          showToast(
            "Confira seu email",
            "Confirme sua conta pelo email que enviamos e depois faça login.",
          );
          if (redirect) navigate("/login");
          onSuccess?.();
          return;
        }

        authUserId = signUpData.user?.id;
      } else {
        email = session!.user.email ?? form.email;
      }

      const { error: insertError } = await supabase.from("customers").insert({
        auth_user_id: authUserId,
        full_name: form.fullName,
        email,
        phone: form.phone,
        cpf_cnpj: form.cpfCnpj || null,
        address_line1: form.addressLine1,
        address_line2: form.addressLine2 || null,
        neighborhood: form.neighborhood,
        postal_code: form.postalCode,
        city: form.city,
        region: form.region || null,
        country_code: "BR",
        marketing_opt_in: form.marketingOptIn,
      });
      if (insertError) throw insertError;

      showToast("Conta criada com sucesso", "Agora você já pode ver seus pedidos.");
      if (redirect) navigate(hasSession ? "/conta" : "/");
      onSuccess?.();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível completar o cadastro. Tente novamente.",
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

      {hasSession ? (
        <p className="text-sm text-text-muted">
          Sessão iniciada como <strong>{session!.user.email}</strong>. Só
          precisamos de mais alguns dados para completar sua conta.
        </p>
      ) : (
        <>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-muted">
            Dados de acesso
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-email`}>Email</Label>
              <Input
                id={`${idPrefix}-email`}
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-accent">{errors.email}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-password`}>Senha</Label>
              <Input
                id={`${idPrefix}-password`}
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-xs text-accent">{errors.password}</p>
              )}
            </div>
          </div>
        </>
      )}

      <h2 className="mt-6 font-heading text-sm font-semibold uppercase tracking-wide text-text-muted">
        Dados de contato
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-fullName`}>Nome completo</Label>
          <Input
            id={`${idPrefix}-fullName`}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-xs text-accent">{errors.fullName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>Telefone (WhatsApp)</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            placeholder="+55 11 99999-0000"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-xs text-accent">{errors.phone}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-cpfCnpj`}>CPF / CNPJ (opcional)</Label>
          <Input
            id={`${idPrefix}-cpfCnpj`}
            value={form.cpfCnpj}
            onChange={(e) => update("cpfCnpj", e.target.value)}
          />
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-addressLine1`}>Endereço</Label>
          <Input
            id={`${idPrefix}-addressLine1`}
            placeholder="Rua, número"
            value={form.addressLine1}
            onChange={(e) => update("addressLine1", e.target.value)}
            aria-invalid={!!errors.addressLine1}
          />
          {errors.addressLine1 && (
            <p className="text-xs text-accent">{errors.addressLine1}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-addressLine2`}>Complemento (opcional)</Label>
          <Input
            id={`${idPrefix}-addressLine2`}
            value={form.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-neighborhood`}>Bairro</Label>
          <Input
            id={`${idPrefix}-neighborhood`}
            value={form.neighborhood}
            onChange={(e) => update("neighborhood", e.target.value)}
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
            aria-invalid={!!errors.city}
          />
          {errors.city && <p className="text-xs text-accent">{errors.city}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-region`}>Estado</Label>
          <Select
            id={`${idPrefix}-region`}
            value={form.region}
            onChange={(e) => update("region", e.target.value)}
          >
            <option value="">Selecione...</option>
            {BR_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <label className="mt-6 flex items-start gap-2 text-xs text-text-muted">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-accent"
          checked={form.marketingOptIn}
          onChange={(e) => update("marketingOptIn", e.target.checked)}
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
        {submitting ? "Criando conta..." : "Criar conta"}
      </Button>

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
