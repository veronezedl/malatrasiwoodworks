import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { ProductForm } from "@/components/admin/ProductForm";

export function AdminProductForm() {
  const navigate = useNavigate();
  useSeo("Novo produto · Admin Malatrasi WoodWorks", "Gestão do catálogo.");

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/produtos"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Voltar para produtos
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold text-primary">
        Novo produto
      </h1>

      <div className="mt-6 rounded-brand border border-black/10 bg-white p-6">
        <ProductForm productId={null} onSaved={() => navigate("/admin/produtos")} />
      </div>
    </div>
  );
}
