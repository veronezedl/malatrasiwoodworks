import { useSeo } from "@/hooks/use-seo";
import { ContactSection } from "@/components/ContactSection";

export function Contacto() {
  useSeo(
    "Contato · Malatrasi WoodWorks",
    "Tem dúvidas sobre um pedido ou produto? Escreva para nós e respondemos de segunda a sexta, 9h–18h.",
  );
  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-heading text-4xl font-bold text-primary">
          Contato
        </h1>
      </div>
      <ContactSection />
    </div>
  );
}
