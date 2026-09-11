import { useSeo } from "@/hooks/use-seo";

export function TerminosCondiciones() {
  useSeo(
    "Termos e condições · Malatrasi WoodWorks",
    "Condições de venda, preços, pagamento, entrega e garantias da Malatrasi WoodWorks.",
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
        Termos e condições
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Última atualização: 11 de setembro de 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            1. Identificação do vendedor
          </h2>
          <p className="mt-2">
            A venda por meio deste site é realizada por{" "}
            <strong>[Razão social / nome do titular]</strong>, CNPJ/CPF{" "}
            <strong>[CNPJ/CPF]</strong>, com endereço em{" "}
            <strong>[endereço]</strong>. Você pode entrar em contato pelo
            email{" "}
            <a href="mailto:contato@malatrasiwoodworks.com.br" className="text-accent hover:underline">
              contato@malatrasiwoodworks.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            2. Objeto
          </h2>
          <p className="mt-2">
            Estas condições regulam a compra de produtos prontos e sob
            encomenda por meio deste site, por consumidores finais residentes
            no Brasil, conforme o Código de Defesa do Consumidor (Lei nº
            8.078/1990). Ao finalizar um pedido ou solicitar um orçamento,
            você aceita estas condições integralmente.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            3. Processo de pedido e orçamento
          </h2>
          <p className="mt-2">
            Para produtos do catálogo, o pedido é confirmado quando você
            finaliza a compra e recebe um email de confirmação com o número
            do pedido. Para peças sob encomenda, o processo começa com uma
            solicitação de orçamento; o pedido só é criado depois que você
            aprova o valor e o prazo informados por nós.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            4. Preços
          </h2>
          <p className="mt-2">
            Todos os preços são exibidos em reais (R$). Peças sob encomenda
            não têm preço fixo no catálogo — o valor final é informado no
            orçamento, após avaliarmos a madeira, as medidas e o acabamento
            solicitados. O custo de entrega é exibido separadamente antes da
            confirmação do pedido.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            5. Formas de pagamento
          </h2>
          <p className="mt-2">
            Aceitamos Pix, transferência bancária, dinheiro ou outra forma a
            combinar diretamente com você após a confirmação do pedido. Não
            processamos pagamentos online neste site.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            6. Entrega e prazos
          </h2>
          <p className="mt-2">
            Os prazos e custos de entrega disponíveis são exibidos no
            carrinho antes da confirmação do pedido e dependem do método
            escolhido. Os prazos são estimados e podem variar por causas
            alheias à Malatrasi WoodWorks (questões logísticas, feriados,
            áreas de difícil acesso).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            7. Direito de arrependimento e trocas
          </h2>
          <p className="mt-2">
            Para compras feitas fora do estabelecimento comercial, você tem{" "}
            <strong>7 dias corridos a partir do recebimento</strong> para
            exercer o direito de arrependimento, conforme o art. 49 do
            Código de Defesa do Consumidor. Peças produzidas sob encomenda,
            por serem personalizadas conforme suas especificações, podem não
            ser elegíveis para arrependimento fora dos casos de defeito —
            isso é informado no momento da aprovação do orçamento. Para mais
            detalhes, consulte nossa{" "}
            <a href="/devolucoes" className="text-accent hover:underline">
              Política de trocas e devoluções
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            8. Garantia legal
          </h2>
          <p className="mt-2">
            Todos os produtos contam com a garantia legal prevista no Código
            de Defesa do Consumidor contra defeitos de fabricação. Se você
            receber um produto com defeito, entre em contato pela área de
            suporte da sua conta ou por email.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            9. Responsabilidade
          </h2>
          <p className="mt-2">
            A Malatrasi WoodWorks não será responsável por atrasos ou
            descumprimentos causados por força maior. A descrição dos
            produtos é feita de boa-fé; por serem peças em madeira maciça,
            variações naturais de veio e tonalidade podem diferir levemente
            das imagens.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            10. Propriedade intelectual
          </h2>
          <p className="mt-2">
            O conteúdo deste site (textos, imagens, marca e design) é
            propriedade da Malatrasi WoodWorks ou de seus licenciantes e não
            pode ser reproduzido sem autorização.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            11. Lei aplicável e resolução de conflitos
          </h2>
          <p className="mt-2">
            Estas condições são regidas pela legislação brasileira de
            consumo. Como consumidor, você pode apresentar qualquer
            reclamação no foro do seu domicílio ou recorrer aos órgãos de
            defesa do consumidor (Procon).
          </p>
        </section>
      </div>
    </div>
  );
}
