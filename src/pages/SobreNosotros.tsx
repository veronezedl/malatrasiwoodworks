import { useSeo } from "@/hooks/use-seo";
import { AboutSection } from "@/components/AboutSection";

export function SobreNosotros() {
  useSeo(
    "Sobre nós · Malatrasi WoodWorks",
    "Conheça a Malatrasi WoodWorks: marcenaria artesanal em madeira maciça, com peças prontas e sob encomenda.",
  );
  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-heading text-4xl font-bold text-primary">
          Sobre nós
        </h1>
      </div>
      <div className="mt-6">
        <AboutSection expanded />
      </div>
    </div>
  );
}
