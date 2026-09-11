import { useSeo } from "@/hooks/use-seo";

export function PoliticaDevoluciones() {
  useSeo(
    "Trocas e devoluções · Malatrasi WoodWorks",
    "Como funciona a garantia na Malatrasi WoodWorks: motivos cobertos, prazos e processo.",
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
        Trocas e devoluções
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Última atualização: 11 de setembro de 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            1. Motivos cobertos pela garantia
          </h2>
          <p className="mt-2">
            Depois que o pedido foi entregue e confirmado, a devolução ou
            reposição se aplica nestes casos:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>O produto chega quebrado, danificado ou com defeito de fabricação.</li>
            <li>Falta alguma unidade ou peça do pedido.</li>
            <li>Você recebeu um produto diferente do que pediu.</li>
            <li>O pedido se perdeu e nunca chegou ao seu endereço.</li>
          </ul>
          <p className="mt-2">
            Peças produzidas sob encomenda, por serem personalizadas conforme
            suas especificações (madeira, medidas e acabamento), só são
            cobertas em caso de defeito de fabricação ou divergência em
            relação ao que foi aprovado no orçamento — não por mudança de
            opinião sobre o design escolhido.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            2. Prazo para reclamar
          </h2>
          <p className="mt-2">
            Você tem <strong>7 dias corridos a partir da entrega confirmada</strong>{" "}
            do pedido para nos avisar e iniciar a reclamação. Depois desse
            prazo, não conseguimos processar a garantia.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            3. Como solicitar
          </h2>
          <p className="mt-2">
            Acesse{" "}
            <a href="/conta/suporte" className="text-accent hover:underline">
              Minha conta → Suporte
            </a>{" "}
            ou escreva para{" "}
            <a href="mailto:contato@malatrasiwoodworks.com.br" className="text-accent hover:underline">
              contato@malatrasiwoodworks.com.br
            </a>{" "}
            informando o número do seu pedido. Para tramitar o caso,
            precisamos que você anexe:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Foto(s) do produto mostrando o problema.</li>
            <li>Foto da embalagem em que chegou.</li>
            <li>Foto da etiqueta de envio do pacote.</li>
          </ul>
          <p className="mt-2">
            Confirmaremos os próximos passos em até 48 horas úteis.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            4. Solução
          </h2>
          <p className="mt-2">
            Se a reclamação for aceita, providenciamos a reposição do produto
            ou o reembolso do valor pago, sem custo adicional para você.
            Combinaremos com você a forma de devolução do valor conforme a
            forma de pagamento utilizada.
          </p>
        </section>
      </div>
    </div>
  );
}
