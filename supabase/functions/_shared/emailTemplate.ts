// Template de e-mail compartilhado no estilo "Proposta Comercial" que a
// loja já usa hoje em PDF (logo + tabela QTD/DESCRIÇÃO/PREÇO/TOTAL + prazo +
// condições de pagamento). Reaproveitado por notify-new-quote (confirmação
// de orçamento ao cliente) e notify-order-status (extrato do pedido novo).
//
// Mantém as mesmas cores já usadas nos e-mails transacionais do site:
// #b28d3e (dourado), #f1ece2 (creme), #1f1710 (quase preto), #6b5f4f (texto
// secundário).

const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function fmtMoney(value: number | null): string {
  return value == null ? "A calcular" : currencyFmt.format(value);
}

export interface ProposalLineItem {
  description: string;
  quantity: number;
  unitPrice: number | null;
  total: number | null;
}

export interface ProposalEmailParams {
  kind: "orcamento" | "pedido";
  customerName: string;
  heading: string;
  introText: string;
  items: ProposalLineItem[];
  subtotal: number | null;
  shippingCost?: number | null;
  shippingLabel?: string | null;
  total: number | null;
  estimatedDays?: string | null;
  isEstimate: boolean;
  footNote?: string | null;
  siteUrl: string;
  // Sobrescreve a frase padrão de forma de pagamento (ex.: pedidos pagos via
  // Mercado Pago não precisam mostrar a chave Pix/CNPJ, já foram pagos).
  paymentInfo?: string;
}

const DEFAULT_PAYMENT_INFO =
  "Pix, dinheiro ou a combinar. Conta NuBank – Jorge Luis G. Malatrasi | Chave CNPJ: 27.980.086/0001-12";

function renderItemsRows(items: ProposalLineItem[]): string {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1f1710;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1f1710;">${item.description}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5f4f;">${fmtMoney(item.unitPrice)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#1f1710;">${fmtMoney(item.total)}</td>
        </tr>`,
    )
    .join("");
}

export function renderProposalEmailHtml(params: ProposalEmailParams): string {
  const logoUrl = `${params.siteUrl.replace(/\/$/, "")}/logo-mail.png`;
  const subtitle = params.kind === "orcamento" ? "Proposta Comercial" : "Extrato de Pedido";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1ece2;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 0;">
                <img src="${logoUrl}" width="120" alt="Malatrasi WoodWorks" style="display:block;width:120px;height:auto;" />
                <div style="margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#1f1710;">
                  Malatrasi WoodWorks
                </div>
                <div style="margin-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#b28d3e;">
                  ${subtitle}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;">
                ${
                  params.isEstimate
                    ? `<div style="margin-bottom:16px;background:#fdf3e2;border-radius:10px;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#946a1e;">
                        Valor estimado — sujeito a confirmação
                      </div>`
                    : ""
                }
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#1f1710;">
                  ${params.heading}
                </div>
                <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f1710;">
                  Olá ${params.customerName},
                </p>
                <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f1710;">
                  ${params.introText}
                </p>

                <div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b5f4f;">
                  <strong>Cliente:</strong> ${params.customerName}
                </div>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border:1px solid #eeeeee;border-radius:10px;overflow:hidden;">
                  <tr style="background:#f1ece2;">
                    <th style="padding:10px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b5f4f;">Qtd</th>
                    <th style="padding:10px 8px;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b5f4f;">Descrição</th>
                    <th style="padding:10px 8px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b5f4f;">Preço</th>
                    <th style="padding:10px 8px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b5f4f;">Total</th>
                  </tr>
                  ${renderItemsRows(params.items)}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
                  ${
                    params.subtotal != null
                      ? `<tr>
                          <td style="padding:6px 8px 0;color:#6b5f4f;">Subtotal</td>
                          <td style="padding:6px 8px 0;text-align:right;color:#6b5f4f;">${fmtMoney(params.subtotal)}</td>
                        </tr>`
                      : ""
                  }
                  ${
                    params.shippingCost != null
                      ? `<tr>
                          <td style="padding:2px 8px 0;color:#6b5f4f;">Entrega${params.shippingLabel ? ` (${params.shippingLabel})` : ""}</td>
                          <td style="padding:2px 8px 0;text-align:right;color:#6b5f4f;">${fmtMoney(params.shippingCost)}</td>
                        </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding:10px 8px 0;border-top:1px solid #eeeeee;font-weight:700;color:#1f1710;font-size:15px;">Total</td>
                    <td style="padding:10px 8px 0;border-top:1px solid #eeeeee;text-align:right;font-weight:700;color:#1f1710;font-size:15px;">${fmtMoney(params.total)}</td>
                  </tr>
                </table>

                ${
                  params.estimatedDays
                    ? `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5f4f;">
                        <strong>Prazo estimado:</strong> ${params.estimatedDays}
                      </p>`
                    : ""
                }

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                  <tr>
                    <td style="background:#f1ece2;border-radius:10px;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b5f4f;">
                      Todas as peças são feitas com madeira de madeireiras legalizadas
                      (DOF — Documento de Origem Florestal), com acabamento fino e óleo
                      especial atóxico. Por se tratar de produto natural, a madeira pode
                      sofrer pequenas variações de cor e tamanho.
                      <br /><br />
                      <strong>Forma de pagamento:</strong> ${params.paymentInfo ?? DEFAULT_PAYMENT_INFO}
                      ${params.footNote ? `<br /><br />${params.footNote}` : ""}
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b5f4f;text-align:center;">
                  Dúvidas? Responda este email e te ajudamos.<br />
                  (15) 99128-8556 · malatrasiww@gmail.com · @malatrasi_woodworks
                </p>
              </td>
            </tr>
            <tr>
              <td style="height:24px;"></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
