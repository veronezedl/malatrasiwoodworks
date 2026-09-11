import { useSeo } from "@/hooks/use-seo";

export function PoliticaPrivacidad() {
  useSeo(
    "Política de privacidade · Malatrasi WoodWorks",
    "Como a Malatrasi WoodWorks coleta, usa e protege seus dados pessoais.",
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
        Política de privacidade
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Última atualização: 11 de setembro de 2026
      </p>

      <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            1. Responsável pelo tratamento
          </h2>
          <p className="mt-2">
            <strong>[Razão social / nome do titular]</strong>, com CNPJ/CPF{" "}
            <strong>[CNPJ/CPF]</strong> e endereço em{" "}
            <strong>[endereço]</strong> (a seguir, "Malatrasi WoodWorks",
            "nós"), é a responsável pelo tratamento dos dados pessoais
            coletados por meio deste site, nos termos da Lei Geral de
            Proteção de Dados (LGPD, Lei nº 13.709/2018). Você pode entrar em
            contato pelo email{" "}
            <a href="mailto:contato@malatrasiwoodworks.com.br" className="text-accent hover:underline">
              contato@malatrasiwoodworks.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            2. Quais dados coletamos
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Dados de conta e pedido:</strong> nome completo, email,
              telefone, endereço de entrega, CEP, cidade, estado e,
              opcionalmente, CPF/CNPJ.
            </li>
            <li>
              <strong>Dados de orçamento sob encomenda:</strong> descrição da
              peça desejada, tipo de madeira, medidas e, se enviada, imagem de
              referência.
            </li>
            <li>
              <strong>Comunicações:</strong> mensagens que você nos envia pelo
              formulário de contato ou pela área de suporte da sua conta.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            3. Para que usamos seus dados
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Gerenciar sua conta e processar seus pedidos e orçamentos.</li>
            <li>
              Enviar comunicações necessárias sobre o status do seu pedido
              (por email).
            </li>
            <li>
              Enviar comunicações comerciais, somente se você marcou a opção
              de marketing ao se cadastrar (você pode cancelar a qualquer
              momento).
            </li>
            <li>Cumprir obrigações legais e fiscais.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            4. Base legal
          </h2>
          <p className="mt-2">
            Tratamos seus dados conforme necessário para a execução do
            contrato de compra e venda (gestão de pedidos e orçamentos), seu
            consentimento expresso (comunicações comerciais) e o cumprimento
            de obrigações legais.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            5. Com quem compartilhamos seus dados
          </h2>
          <p className="mt-2">
            Não vendemos seus dados. Compartilhamos apenas com os fornecedores
            necessários para operar a loja, atuando como operadores do
            tratamento:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Supabase</strong> — hospedagem do banco de dados e
              autenticação.
            </li>
            <li>
              <strong>Resend</strong> — envio de emails transacionais
              (confirmação de pedido, mudanças de status).
            </li>
            <li>
              Nosso fornecedor de entrega, apenas os dados de endereço
              necessários para entregar seu pedido.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            6. Por quanto tempo guardamos seus dados
          </h2>
          <p className="mt-2">
            Enquanto sua conta estiver ativa, e posteriormente pelos prazos
            exigidos pela legislação fiscal e de consumo aplicável para a
            conservação de documentação de compra e venda.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            7. Seus direitos
          </h2>
          <p className="mt-2">
            Você pode exercer a qualquer momento seus direitos de acesso,
            correção, eliminação, oposição, limitação e portabilidade dos
            seus dados, escrevendo para{" "}
            <a href="mailto:contato@malatrasiwoodworks.com.br" className="text-accent hover:underline">
              contato@malatrasiwoodworks.com.br
            </a>
            . Você também tem o direito de apresentar reclamação à Autoridade
            Nacional de Proteção de Dados (ANPD) caso considere que seus
            dados não foram tratados corretamente.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            8. Menores de idade
          </h2>
          <p className="mt-2">
            Nossos serviços são direcionados a maiores de 18 anos. Não
            coletamos intencionalmente dados de menores.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-primary">
            9. Alterações nesta política
          </h2>
          <p className="mt-2">
            Podemos atualizar esta política para refletir mudanças legais ou
            operacionais. Sempre publicaremos a versão vigente nesta página,
            com a data da última atualização.
          </p>
        </section>
      </div>
    </div>
  );
}
