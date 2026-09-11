import * as React from "react";
import { useOutletContext } from "react-router-dom";
import { Camera, UserCircle } from "lucide-react";
import { updateMyCustomer, uploadAvatar } from "@/lib/api/customers";
import { BR_STATES } from "@/data/states";
import type { CuentaContext } from "@/components/customer/CuentaLayout";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function CuentaPerfil() {
  useSeo("Meu perfil · Malatrasi WoodWorks", "Gerencie seus dados pessoais e endereço de entrega.");
  const { customer, refreshCustomer } = useOutletContext<CuentaContext>();
  const { showToast } = useToast();

  const [form, setForm] = React.useState({
    fullName: customer.full_name ?? "",
    phone: customer.phone ?? "",
    cpfCnpj: customer.cpf_cnpj ?? "",
    addressLine1: customer.address_line1 ?? "",
    addressLine2: customer.address_line2 ?? "",
    postalCode: customer.postal_code ?? "",
    city: customer.city ?? "",
    region: customer.region ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !customer.auth_user_id) return;

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadAvatar(customer.auth_user_id, file);
      await updateMyCustomer(customer.id, { avatar_url: avatarUrl });
      await refreshCustomer();
      showToast("Foto atualizada");
    } catch (err) {
      showToast(
        "Não foi possível enviar a foto",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyCustomer(customer.id, {
        full_name: form.fullName,
        phone: form.phone,
        cpf_cnpj: form.cpfCnpj || null,
        address_line1: form.addressLine1,
        address_line2: form.addressLine2 || null,
        postal_code: form.postalCode,
        city: form.city,
        region: form.region || null,
      });
      await refreshCustomer();
      showToast("Perfil atualizado com sucesso");
    } catch (err) {
      showToast(
        "Não foi possível salvar",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Meu perfil</h1>
      <p className="mt-1 text-sm text-text-muted">
        Gerencie sua foto, seus dados pessoais e seu endereço de entrega.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          {customer.avatar_url ? (
            <img
              src={customer.avatar_url}
              alt={customer.full_name ?? ""}
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-bg-muted">
              <UserCircle className="size-10 text-text-muted" />
            </div>
          )}
          <button
            type="button"
            aria-label="Trocar foto"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-accent text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
          >
            <Camera className="size-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">{customer.full_name || "Sem nome"}</p>
          <p className="text-xs text-text-muted">
            {uploadingAvatar ? "Enviando foto..." : "JPG ou PNG, até 5 MB"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-brand border border-black/10 bg-white p-6 sm:p-8"
      >
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-muted">
          Dados de contato
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={customer.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone (WhatsApp)</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cpfCnpj">CPF / CNPJ (opcional)</Label>
            <Input
              id="cpfCnpj"
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
            <Label htmlFor="addressLine1">Endereço</Label>
            <Input
              id="addressLine1"
              placeholder="Rua, número"
              value={form.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressLine2">Complemento (opcional)</Label>
            <Input
              id="addressLine2"
              value={form.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">CEP</Label>
            <Input
              id="postalCode"
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="region">Estado</Label>
            <Select
              id="region"
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

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="mt-6 w-full sm:w-auto"
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
