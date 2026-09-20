import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Upload } from "lucide-react";
import { deleteProduct, listProducts, updateProduct } from "@/lib/api/products";
import type { ProductWithCategory } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminProductQuickView } from "@/components/admin/AdminProductQuickView";
import { EditProductDialog } from "@/components/admin/EditProductDialog";
import { BulkImportProductsDialog } from "@/components/admin/BulkImportProductsDialog";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function AdminProducts() {
  useSeo("Produtos · Admin Malatrasi WoodWorks", "Gestão do catálogo.");
  const { showToast } = useToast();
  const [products, setProducts] = React.useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setProducts(await listProducts());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(product: ProductWithCategory) {
    await updateProduct(product.id, { active: !product.active });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, active: !p.active } : p,
      ),
    );
  }

  async function toggleFeatured(product: ProductWithCategory) {
    await updateProduct(product.id, { featured: !product.featured });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, featured: !p.featured } : p,
      ),
    );
  }

  async function toggleVisibleInStore(product: ProductWithCategory) {
    await updateProduct(product.id, { visible_in_store: !product.visible_in_store });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, visible_in_store: !p.visible_in_store } : p,
      ),
    );
  }

  async function handleDelete(product: ProductWithCategory) {
    if (!window.confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast("Produto excluído");
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-primary">
            Produtos
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="size-4" /> Importação em massa
          </Button>
          <Button asChild>
            <Link to="/admin/produtos/novo">
              <Plus className="size-4" /> Novo produto
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando produtos...</p>
      ) : (
        <>
          {/* Mobile: lista de cards — a tabela não cabe bem em telas pequenas */}
          <div className="mt-6 space-y-3 md:hidden">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="size-14 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{product.name}</p>
                    <p className="text-xs text-text-muted">{product.category?.name}</p>
                    <p className="mt-0.5 font-semibold text-primary">
                      {product.is_custom_order ? "Sob orçamento" : currency.format(product.price)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => toggleActive(product)}>
                    <Badge variant={product.active ? "success" : "default"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </button>
                  <button type="button" onClick={() => toggleFeatured(product)}>
                    <Badge variant={product.featured ? "accent" : "default"}>
                      {product.featured ? "Na vitrine" : "Oculto"}
                    </Badge>
                  </button>
                  <button type="button" onClick={() => toggleVisibleInStore(product)}>
                    <Badge variant={product.visible_in_store ? "success" : "default"}>
                      {product.visible_in_store ? "Na loja" : "Oculto da loja"}
                    </Badge>
                  </button>
                  <div className="ml-auto">
                    <AdminProductQuickView
                      product={product}
                      onToggleActive={() => toggleActive(product)}
                      onToggleFeatured={() => toggleFeatured(product)}
                      onToggleVisibleInStore={() => toggleVisibleInStore(product)}
                      onEdit={() => setEditingProductId(product.id)}
                      onDelete={() => handleDelete(product)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabela completa */}
          <div className="mt-6 hidden overflow-x-auto rounded-brand border border-black/10 bg-white md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Vitrine</th>
                  <th className="px-4 py-3 font-medium">Visibilidade</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="size-10 rounded object-cover"
                        />
                        <span className="font-medium text-text">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {product.category?.name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {product.is_custom_order ? "Sob orçamento" : currency.format(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleActive(product)}>
                        <Badge variant={product.active ? "success" : "default"}>
                          {product.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleFeatured(product)}>
                        <Badge variant={product.featured ? "accent" : "default"}>
                          {product.featured ? "Na vitrine" : "Oculto"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleVisibleInStore(product)}>
                        <Badge variant={product.visible_in_store ? "success" : "default"}>
                          {product.visible_in_store ? "Na loja" : "Oculto"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AdminProductQuickView
                          product={product}
                          onToggleActive={() => toggleActive(product)}
                          onToggleFeatured={() => toggleFeatured(product)}
                          onToggleVisibleInStore={() => toggleVisibleInStore(product)}
                          onEdit={() => setEditingProductId(product.id)}
                          onDelete={() => handleDelete(product)}
                          trigger={
                            <button
                              type="button"
                              className="text-text-muted hover:text-primary"
                              aria-label={`Ver mais sobre ${product.name}`}
                            >
                              <Eye className="size-4" />
                            </button>
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setEditingProductId(product.id)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`Editar ${product.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-text-muted hover:text-accent"
                          aria-label={`Excluir ${product.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EditProductDialog
        productId={editingProductId}
        onClose={() => setEditingProductId(null)}
        onSaved={() => {
          setEditingProductId(null);
          load();
        }}
      />

      <BulkImportProductsDialog
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImported={load}
      />
    </div>
  );
}
