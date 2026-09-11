import { CheckCircle2 } from "lucide-react";

const WORKSHOP_BULLETS = [
  "Madeira maciça selecionada",
  "Acabamento feito à mão",
  "Orçamento sem compromisso",
];

const STATS = [
  { value: "+10", label: "Anos de ofício" },
  { value: "100%", label: "Madeira maciça" },
  { value: "1:1", label: "Peças sob medida" },
];

export function AboutSection({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  return (
    <section className="bg-bg-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-start">
        <div>
          <h2 className="font-heading text-3xl font-bold text-primary">
            Marcenaria artesanal, feita para durar
          </h2>
          <p className="mt-4 text-text-muted">
            Na Malatrasi WoodWorks trabalhamos madeira maciça para criar
            móveis e peças com identidade própria — do catálogo pronto à
            encomenda personalizada, cada peça é pensada para durar gerações.
          </p>
          {expanded && (
            <p className="mt-4 text-text-muted">
              Acompanhamos cada pedido do início ao fim: da escolha da
              madeira e do acabamento até a entrega, com atendimento direto e
              transparente em cada etapa.
            </p>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-brand border border-black/5 bg-white p-4 text-center"
              >
                <p className="font-heading text-2xl font-bold text-accent">
                  {stat.value}
                </p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-brand border border-black/5 bg-white p-6 sm:p-8">
          <h3 className="font-heading text-xl font-bold text-primary">
            Sob encomenda · Sem sustos
          </h3>
          <ul className="mt-5 space-y-4">
            {WORKSHOP_BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                <span className="text-sm text-text">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
