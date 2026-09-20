import * as React from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { ProductWithCategory } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface AdminProductQuickViewProps {
  product: ProductWithCategory;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
  onToggleVisibleInStore: () => void;
  onEdit: () => void;
  onDelete: () => void;
  trigger?: React.ReactNode;
}

export function AdminProductQuickView({
  product,
  onToggleActive,
  onToggleFeatured,
  onToggleVisibleInStore,
  onEdit,
  onDelete,
  trigger,
}: AdminProductQuickViewProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary"
          >
            <Eye className="size-4" /> Ver mais
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <img
          src={product.image_url}
          alt={product.name}
          className="h-36 w-full rounded-brand object-cover"
        />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-text-muted">Categoria</p>
            <p className="text-text">{product.category?.name}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Preço</p>
            <p className="font-semibold text-primary">
              {product.is_custom_order ? "Sob orçamento" : currency.format(product.price)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Madeira</p>
            <p className="text-text">{product.wood_type || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Slug</p>
            <p className="break-all text-text">{product.slug}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted">Descrição</p>
          <p className="mt-1 text-sm text-text">{product.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onToggleActive}>
            <Badge variant={product.active ? "success" : "default"}>
              {product.active ? "Ativo" : "Inativo"}
            </Badge>
          </button>
          <button type="button" onClick={onToggleFeatured}>
            <Badge variant={product.featured ? "accent" : "default"}>
              {product.featured ? "Na vitrine" : "Oculto"}
            </Badge>
          </button>
          <button type="button" onClick={onToggleVisibleInStore}>
            <Badge variant={product.visible_in_store ? "success" : "default"}>
              {product.visible_in_store ? "Na loja" : "Oculto da loja"}
            </Badge>
          </button>
          {product.is_custom_order && <Badge variant="primary">Sob encomenda</Badge>}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil className="size-4" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-accent hover:bg-accent hover:text-white"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="size-4" /> Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
