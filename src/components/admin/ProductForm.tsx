import * as React from "react";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createProduct, updateProduct, uploadProductImage } from "@/lib/api/products";
import { listCategories } from "@/lib/api/categories";
import type { DbCategory, DbProduct } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slug";

interface ProductFormProps {
  // null = criar produto novo.
  productId: string | null;
  onSaved: () => void;
}

export function ProductForm({ productId, onSaved }: ProductFormProps) {
  const isNew = !productId;
  const { showToast } = useToast();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [categories, setCategories] = React.useState<DbCategory[]>([]);
  const [categoryId, setCategoryId] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [imageUrl2, setImageUrl2] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [woodType, setWoodType] = React.useState("");
  const [isCustomOrder, setIsCustomOrder] = React.useState(false);
  const [active, setActive] = React.useState(true);
  const [featured, setFeatured] = React.useState(false);
  const [visibleInStore, setVisibleInStore] = React.useState(true);
  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [uploadingImage2, setUploadingImage2] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef2 = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    listCategories()
      .then((cats) => {
        setCategories(cats);
        setCategoryId((current) => current || cats[0]?.id || "");
      })
      .catch(() => setCategories([]));
  }, []);

  React.useEffect(() => {
    if (isNew || !productId) return;
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle()
      .then(({ data }) => {
        const product = data as DbProduct | null;
        if (product) {
          setName(product.name);
          setSlug(product.slug);
          setCategoryId(product.category_id);
          setPrice(String(product.price));
          setImageUrl(product.image_url);
          setImageUrl2(product.image_url_2 ?? "");
          setDescription(product.description);
          setWoodType(product.wood_type ?? "");
          setIsCustomOrder(product.is_custom_order);
          setActive(product.active);
          setFeatured(product.featured);
          setVisibleInStore(product.visible_in_store);
        }
        setLoading(false);
      });
  }, [productId, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const input = {
        name,
        slug: slug || slugify(name),
        category_id: categoryId,
        price: Number(price) || 0,
        image_url: imageUrl,
        image_url_2: imageUrl2 || null,
        description,
        wood_type: woodType || null,
        is_custom_order: isCustomOrder,
        active,
        featured,
        visible_in_store: visibleInStore,
      };
      if (isNew) {
        await createProduct(input);
        showToast("Produto criado");
      } else if (productId) {
        await updateProduct(productId, input);
        showToast("Produto atualizado");
      }
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadProductImage(file);
      setImageUrl(url);
      showToast("Imagem enviada");
    } catch (err) {
      showToast("Não foi possível enviar a imagem", err instanceof Error ? err.message : undefined);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImageFile2(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage2(true);
    try {
      const url = await uploadProductImage(file);
      setImageUrl2(url);
      showToast("Imagem enviada");
    } catch (err) {
      showToast("Não foi possível enviar a imagem", err instanceof Error ? err.message : undefined);
    } finally {
      setUploadingImage2(false);
      if (fileInputRef2.current) fileInputRef2.current.value = "";
    }
  }

  if (loading) {
    return <p className="text-text-muted">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="p-name">Nome</Label>
        <Input
          id="p-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-slug">Slug (URL)</Label>
        <Input
          id="p-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={name ? slugify(name) : "gerado-automaticamente"}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="p-category">Categoria</Label>
          <Select
            id="p-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (inativa)" : ""}
              </option>
            ))}
          </Select>
          {categories.length === 0 && (
            <p className="text-xs text-accent">
              Cadastre uma categoria em Categorias antes de criar produtos.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-price">
            Preço (R$){isCustomOrder ? " — deixe 0 se for só sob orçamento" : ""}
          </Label>
          <Input
            id="p-price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-image">Imagem 1 do produto</Label>
        <p className="text-xs text-text-muted">
          Recomendado: foto quadrada (proporção 1:1), pelo menos 1000×1000px,
          em JPG ou PNG — o catálogo corta pra quadrado automaticamente, então
          fotos já quadradas evitam corte estranho.
        </p>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="size-16 rounded-brand border border-black/10 object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-brand border border-dashed border-black/20 text-text-muted">
              <ImagePlus className="size-6" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
          >
            {uploadingImage ? "Enviando..." : "Enviar imagem"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
        </div>
        <Input
          id="p-image"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://... (ou envie um arquivo acima)"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-image-2">Imagem 2 do produto (opcional)</Label>
        <p className="text-xs text-text-muted">
          Mesmo formato da imagem 1 (quadrada, 1000×1000px ou mais). Se
          preenchida, o catálogo mostra as duas imagens como carrossel.
        </p>
        <div className="flex items-center gap-3">
          {imageUrl2 ? (
            <img
              src={imageUrl2}
              alt=""
              className="size-16 rounded-brand border border-black/10 object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-brand border border-dashed border-black/20 text-text-muted">
              <ImagePlus className="size-6" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef2.current?.click()}
            disabled={uploadingImage2}
          >
            {uploadingImage2 ? "Enviando..." : "Enviar imagem"}
          </Button>
          <input
            ref={fileInputRef2}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile2}
          />
        </div>
        <Input
          id="p-image-2"
          value={imageUrl2}
          onChange={(e) => setImageUrl2(e.target.value)}
          placeholder="https://... (opcional, ou envie um arquivo acima)"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-wood-type">Tipo de madeira (opcional)</Label>
        <Input
          id="p-wood-type"
          value={woodType}
          onChange={(e) => setWoodType(e.target.value)}
          placeholder="Ex: Freijó, Cumaru, Pinus..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-description">Descrição</Label>
        <Textarea
          id="p-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Produto ativo
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
        />
        Mostrar na vitrine da página inicial
      </label>
      <div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={isCustomOrder}
            onChange={(e) => setIsCustomOrder(e.target.checked)}
          />
          Peça sob encomenda (exige orçamento)
        </label>
        <p className="mt-1 text-xs text-text-muted">
          Em vez do botão "Adicionar ao carrinho", o produto mostra "Solicitar
          orçamento" e leva à página de orçamento sob medida.
        </p>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={visibleInStore}
            onChange={(e) => setVisibleInStore(e.target.checked)}
          />
          Visível na loja
        </label>
        <p className="mt-1 text-xs text-text-muted">
          Desative para manter o produto vendável por link direto sem
          aparecer no catálogo público.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Salvando..." : "Salvar produto"}
      </Button>
    </form>
  );
}
