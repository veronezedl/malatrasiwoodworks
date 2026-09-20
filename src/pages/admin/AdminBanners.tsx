import * as React from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import {
  createHeroBanner,
  deleteHeroBanner,
  listHeroBanners,
  swapHeroBannerOrder,
  updateHeroBanner,
} from "@/lib/api/heroBanners";
import { uploadProductImage } from "@/lib/api/products";
import type { DbHeroBanner } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminBanners() {
  useSeo(
    "Banners da Home · Admin Malatrasi WoodWorks",
    "Imagens exibidas ao lado direito do banner da página inicial.",
  );
  const { showToast } = useToast();
  const [banners, setBanners] = React.useState<DbHeroBanner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setBanners(await listHeroBanners());
    } catch (err) {
      showToast("Não foi possível carregar os banners", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      let order = banners.reduce((max, b) => Math.max(max, b.sort_order), 0);
      for (const file of files) {
        const url = await uploadProductImage(file);
        order += 1;
        await createHeroBanner(url, order);
      }
      showToast(files.length === 1 ? "Banner adicionado" : "Banners adicionados");
      await load();
    } catch (err) {
      showToast("Não foi possível enviar a imagem", err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const other = banners[index + direction];
    if (!other) return;
    try {
      await swapHeroBannerOrder(banners[index], other);
      await load();
    } catch (err) {
      showToast("Não foi possível reordenar", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(banner: DbHeroBanner) {
    try {
      await updateHeroBanner(banner.id, { active: !banner.active });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, active: !b.active } : b)),
      );
    } catch (err) {
      showToast("Não foi possível atualizar", err instanceof Error ? err.message : undefined);
    }
  }

  async function handleDelete(banner: DbHeroBanner) {
    if (!window.confirm("Excluir este banner?")) return;
    try {
      await deleteHeroBanner(banner.id);
      showToast("Banner excluído");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Banners da Home</h1>
      <p className="mt-1 text-sm text-text-muted">
        Imagens exibidas ao lado direito do texto do banner da página inicial. Com mais de
        uma imagem ativa, elas se alternam sozinhas a cada 5 segundos.
      </p>
      <p className="mt-2 text-xs text-text-muted">
        Recomendado: foto vertical na proporção 4:5 (ex.: 1200×1500px), em JPG ou PNG, com o
        assunto principal no centro — no celular a imagem aparece em formato mais largo e
        pode cortar as bordas.
      </p>

      <div className="mt-6">
        <Button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <ImagePlus /> {uploading ? "Enviando..." : "Adicionar imagens"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando banners...</p>
      ) : banners.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há banners. Enquanto não houver imagem ativa, o lado direito do banner
          da home fica vazio.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="overflow-hidden rounded-brand border border-black/10 bg-white"
            >
              <img
                src={banner.image_url}
                alt={`Banner ${index + 1}`}
                className={`aspect-[4/5] w-full object-cover ${banner.active ? "" : "opacity-40"}`}
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <button type="button" onClick={() => toggleActive(banner)}>
                  <Badge variant={banner.active ? "success" : "default"}>
                    {banner.active ? "Ativo" : "Inativo"}
                  </Badge>
                </button>
                <div className="flex items-center gap-3 text-text-muted">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="hover:text-primary disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === banners.length - 1}
                    className="hover:text-primary disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner)}
                    className="hover:text-accent"
                    aria-label="Excluir banner"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
