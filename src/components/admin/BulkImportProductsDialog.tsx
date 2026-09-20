import * as React from "react";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { parseCsv } from "@/lib/csv";
import { slugify } from "@/lib/slug";
import { listCategories } from "@/lib/api/categories";
import type { DbCategory } from "@/types/database";
import {
  bulkCreateProducts,
  type BulkImportResult,
  type BulkProductInput,
} from "@/lib/api/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BulkImportProductsDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Colunas aceitas no cabeçalho do CSV — vários aliases em português para não
// precisar editar planilhas já existentes em outro idioma/formato.
const COLUMN_ALIASES: Record<string, string> = {
  nome: "name",
  name: "name",
  slug: "slug",
  categoria: "category",
  category: "category",
  preco: "price",
  preço: "price",
  price: "price",
  imagem: "image_url",
  image: "image_url",
  image_url: "image_url",
  imagem2: "image_url_2",
  imagem_2: "image_url_2",
  image2: "image_url_2",
  image_url_2: "image_url_2",
  descricao: "description",
  descrição: "description",
  description: "description",
  madeira: "wood_type",
  wood_type: "wood_type",
  sob_encomenda: "is_custom_order",
  is_custom_order: "is_custom_order",
  ativo: "active",
  active: "active",
  destaque: "featured",
  featured: "featured",
  visivel: "visible_in_store",
  visível: "visible_in_store",
  visible_in_store: "visible_in_store",
};

const TEMPLATE_CSV =
  "nome,slug,categoria,preco,imagem,imagem2,descricao,madeira,sob_encomenda,ativo,destaque,visivel\n" +
  '"Tábua de Corte Artesanal","",Utilidades,180.00,https://exemplo.com/foto.jpg,,"Tábua de corte em peça única.",Cumaru,false,true,false,true\n';

function parseBoolean(value: string, fallback: boolean): boolean {
  const v = value.trim().toLowerCase();
  if (v === "") return fallback;
  if (["true", "1", "sim", "yes", "ativo"].includes(v)) return true;
  if (["false", "0", "nao", "não", "inativo"].includes(v)) return false;
  return fallback;
}

interface ParsedRow {
  row: number;
  name: string;
  slug: string;
  categoryName: string;
  categoryId: string | null;
  price: string;
  imageUrl: string;
  imageUrl2: string;
  description: string;
  woodType: string;
  isCustomOrder: boolean;
  active: boolean;
  featured: boolean;
  visibleInStore: boolean;
  errors: string[];
  warnings: string[];
}

function parseRows(text: string, categories: DbCategory[]): ParsedRow[] {
  const table = parseCsv(text);
  if (table.length === 0) return [];

  const header = table[0].map((h) => COLUMN_ALIASES[h.trim().toLowerCase()] ?? "");
  const seenSlugs = new Set<string>();
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  return table.slice(1).map((cells, i) => {
    const get = (key: string) => {
      const idx = header.indexOf(key);
      return idx === -1 ? "" : (cells[idx] ?? "").trim();
    };

    const name = get("name");
    const priceRaw = get("price").replace(",", ".");
    const imageUrl = get("image_url");
    const imageUrl2 = get("image_url_2");
    const slugInput = get("slug");
    const slug = slugInput || slugify(name);
    const categoryName = get("category");
    const matchedCategory = categoryByName.get(categoryName.toLowerCase());
    const isCustomOrder = parseBoolean(get("is_custom_order"), false);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name) errors.push("Falta o nome.");
    if (!imageUrl) errors.push("Falta a URL da imagem.");
    const priceNum = Number(priceRaw || "0");
    if (priceRaw && (Number.isNaN(priceNum) || priceNum < 0)) {
      errors.push("Preço inválido.");
    }
    if (!isCustomOrder && (!priceRaw || priceNum <= 0)) {
      errors.push("Preço inválido.");
    }
    if (!slug) errors.push("Não foi possível gerar o slug.");
    if (slug && seenSlugs.has(slug)) {
      errors.push(`Slug "${slug}" repetido neste mesmo arquivo.`);
    }
    if (slug) seenSlugs.add(slug);
    if (!categoryName) {
      errors.push("Falta a categoria.");
    } else if (!matchedCategory) {
      errors.push(`Categoria "${categoryName}" não cadastrada. Crie-a em Categorias antes.`);
    } else if (!matchedCategory.active) {
      warnings.push(`Categoria "${categoryName}" está inativa.`);
    }

    return {
      row: i + 2, // +1 pelo cabeçalho, +1 porque a linha 1 é a primeira de dados.
      name,
      slug,
      categoryName,
      categoryId: matchedCategory?.id ?? null,
      price: priceRaw || "0",
      imageUrl,
      imageUrl2,
      description: get("description"),
      woodType: get("wood_type"),
      isCustomOrder,
      active: parseBoolean(get("active"), true),
      featured: parseBoolean(get("featured"), false),
      visibleInStore: parseBoolean(get("visible_in_store"), true),
      errors,
      warnings,
    };
  });
}

export function BulkImportProductsDialog({
  open,
  onClose,
  onImported,
}: BulkImportProductsDialogProps) {
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [categories, setCategories] = React.useState<DbCategory[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<BulkImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open]);

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      setRows(parseRows(String(reader.result ?? ""), categories));
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validRows = rows.filter((r) => r.errors.length === 0);

  async function handleImport() {
    setImporting(true);
    try {
      const items: BulkProductInput[] = validRows.map((r) => ({
        row: r.row,
        input: {
          name: r.name,
          slug: r.slug,
          category_id: r.categoryId as string,
          price: Number(r.price) || 0,
          image_url: r.imageUrl,
          image_url_2: r.imageUrl2 || null,
        price_tiers: [],
        width_cm: null,
        height_cm: null,
        weight_kg: null,
          description: r.description,
          wood_type: r.woodType || null,
          is_custom_order: r.isCustomOrder,
          active: r.active,
          featured: r.featured,
          visible_in_store: r.visibleInStore,
        },
      }));
      const res = await bulkCreateProducts(items);
      setResult(res);
      if (res.created > 0) onImported();
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importação em massa de produtos</DialogTitle>
        </DialogHeader>

        {!result && (
          <>
            <p className="text-xs text-text-muted">
              A coluna "categoria" precisa bater com o nome exato de uma
              categoria já cadastrada em Categorias.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="size-4" /> Baixar modelo CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" /> {fileName || "Escolher arquivo CSV"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
            </div>

            {rows.length > 0 && (
              <>
                <p className="text-sm text-text-muted">
                  {validRows.length} de {rows.length} linhas prontas para importar.
                  {rows.length - validRows.length > 0 && (
                    <span className="text-accent">
                      {" "}
                      {rows.length - validRows.length} com erros (não serão importadas).
                    </span>
                  )}
                </p>

                <div className="max-h-64 overflow-y-auto rounded-brand border border-black/10">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-bg-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Linha</th>
                        <th className="px-3 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">Preço</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.row} className="border-t border-black/5">
                          <td className="px-3 py-2 text-text-muted">{r.row}</td>
                          <td className="px-3 py-2">{r.name || "—"}</td>
                          <td className="px-3 py-2">{r.price || "—"}</td>
                          <td className="px-3 py-2">
                            {r.errors.length > 0 ? (
                              <Badge variant="accent" title={r.errors.join(" ")}>
                                <AlertTriangle className="size-3" /> {r.errors[0]}
                              </Badge>
                            ) : r.warnings.length > 0 ? (
                              <Badge variant="default" title={r.warnings.join(" ")}>
                                {r.warnings[0]}
                              </Badge>
                            ) : (
                              <Badge variant="success">Pronta</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={validRows.length === 0 || importing}
                  onClick={handleImport}
                >
                  {importing
                    ? "Importando..."
                    : `Importar ${validRows.length} ${validRows.length === 1 ? "produto" : "produtos"}`}
                </Button>
              </>
            )}
          </>
        )}

        {result && (
          <>
            <p className="text-sm text-text">
              <span className="font-semibold text-primary">{result.created}</span>{" "}
              {result.created === 1 ? "produto criado" : "produtos criados"}.
              {result.errors.length > 0 && (
                <span className="text-accent">
                  {" "}
                  {result.errors.length} {result.errors.length === 1 ? "falhou" : "falharam"}.
                </span>
              )}
            </p>
            {result.errors.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-brand border border-black/10 p-3 text-xs text-text-muted">
                {result.errors.map((e) => (
                  <li key={e.row}>
                    Linha {e.row} ({e.name || "sem nome"}): {e.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Importar outro arquivo
              </Button>
              <Button type="button" className="flex-1" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
