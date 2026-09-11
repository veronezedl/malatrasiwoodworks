import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/admin/ProductForm";

interface EditProductDialogProps {
  // El id del producto a editar, o null cuando el diálogo está cerrado.
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProductDialog({ productId, onClose, onSaved }: EditProductDialogProps) {
  return (
    <Dialog open={!!productId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
        </DialogHeader>
        {productId && <ProductForm productId={productId} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}
