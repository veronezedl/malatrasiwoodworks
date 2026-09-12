import { Hammer, Ruler, Sparkles, Headset } from "lucide-react";

const BENEFITS = [
  {
    icon: Hammer,
    title: "Feito à mão",
    subtitle: "Marcenaria artesanal",
  },
  {
    icon: Ruler,
    title: "Sob medida",
    subtitle: "Peças personalizadas",
  },
  {
    icon: Sparkles,
    title: "Madeira selecionada",
    subtitle: "Qualidade garantida",
  },
  {
    icon: Headset,
    title: "Atendimento próximo",
    subtitle: "Do orçamento à entrega",
  },
];

export function BenefitCards() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {BENEFITS.map(({ icon: Icon, title, subtitle }) => (
        <div
          key={title}
          className="flex flex-col items-center gap-3 rounded-brand border border-black/5 bg-bg-muted p-6 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Icon className="size-6 text-primary" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold text-primary">
              {title}
            </p>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
