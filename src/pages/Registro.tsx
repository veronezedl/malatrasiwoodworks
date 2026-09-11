import { UserPlus } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { RegistroForm } from "@/components/RegistroForm";

export function Registro() {
  useSeo(
    "Criar conta · Malatrasi WoodWorks",
    "Cadastre-se na Malatrasi WoodWorks para acompanhar seus pedidos e dados de entrega.",
  );

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10">
          <UserPlus className="size-6 text-accent" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-primary">
          Criar conta
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Cadastre-se para acompanhar seus pedidos e salvar seu endereço de
          entrega.
        </p>
      </div>

      <div className="mt-8 rounded-brand border border-black/10 bg-white p-6 sm:p-8">
        <RegistroForm />
      </div>
    </section>
  );
}
