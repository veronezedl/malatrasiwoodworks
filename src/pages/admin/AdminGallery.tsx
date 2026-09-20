import * as React from "react";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import {
  createGalleryPhoto,
  deleteGalleryPhoto,
  listGalleryPhotos,
  updateGalleryPhoto,
  uploadGalleryPhoto,
} from "@/lib/api/gallery";
import type { DbGalleryPhoto } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyForm = { imageUrl: "", caption: "", active: true };

type GalleryFormState = typeof emptyForm;

function photoToForm(photo: DbGalleryPhoto): GalleryFormState {
  return {
    imageUrl: photo.image_url,
    caption: photo.caption ?? "",
    active: photo.active,
  };
}

function GalleryFormFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: GalleryFormState;
  onChange: (form: GalleryFormState) => void;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadGalleryPhoto(file);
      onChange({ ...form, imageUrl: url });
      showToast("Imagem enviada");
    } catch (err) {
      showToast("Não foi possível enviar a imagem", err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-image`}>Foto</Label>
        <div className="flex items-center gap-3">
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
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
            disabled={uploading}
          >
            {uploading ? "Enviando..." : "Enviar imagem"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        <Input
          id={`${idPrefix}-image`}
          value={form.imageUrl}
          onChange={(e) => onChange({ ...form, imageUrl: e.target.value })}
          placeholder="https://... (ou envie um arquivo acima)"
          required
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor={`${idPrefix}-caption`}>Legenda (opcional)</Label>
        <Input
          id={`${idPrefix}-caption`}
          value={form.caption}
          onChange={(e) => onChange({ ...form, caption: e.target.value })}
          placeholder="Ex: Mesa de centro entregue em Bauru"
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={form.active}
          onChange={(e) => onChange({ ...form, active: e.target.checked })}
        />
        Ativa
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Desative para tirar essa foto da galeria pública sem excluir o
        registro.
      </p>
    </>
  );
}

interface EditGalleryDialogProps {
  photo: DbGalleryPhoto | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditGalleryDialog({ photo, onClose, onSaved }: EditGalleryDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<GalleryFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (photo) setForm(photoToForm(photo));
  }, [photo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return;
    setSaving(true);
    try {
      await updateGalleryPhoto(photo.id, {
        image_url: form.imageUrl,
        caption: form.caption || null,
        active: form.active,
      });
      showToast("Foto atualizada");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar foto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <GalleryFormFields idPrefix="edit-g" form={form} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminGallery() {
  useSeo(
    "Fotos de Clientes · Admin Malatrasi WoodWorks",
    "Gestão da galeria de fotos de clientes satisfeitos exibida no site.",
  );
  const { showToast } = useToast();
  const [photos, setPhotos] = React.useState<DbGalleryPhoto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<GalleryFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingPhoto, setEditingPhoto] = React.useState<DbGalleryPhoto | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setPhotos(await listGalleryPhotos());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createGalleryPhoto({
        image_url: form.imageUrl,
        caption: form.caption || null,
        active: form.active,
      });
      showToast("Foto adicionada");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(photo: DbGalleryPhoto) {
    if (!window.confirm("Excluir esta foto da galeria?")) return;
    try {
      await deleteGalleryPhoto(photo.id);
      showToast("Foto excluída");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(photo: DbGalleryPhoto) {
    await updateGalleryPhoto(photo.id, { active: !photo.active });
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, active: !p.active } : p)),
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Fotos de Clientes</h1>
      <p className="mt-1 text-sm text-text-muted">
        Fotos de peças entregues/clientes satisfeitos, exibidas publicamente
        no site como prova social.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Nova foto
        </h2>

        <div className="mt-4">
          <GalleryFormFields idPrefix="g" form={form} onChange={setForm} />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Adicionar foto"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Carregando fotos...
        </p>
      ) : photos.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há fotos cadastradas.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-brand border border-black/10 bg-white"
            >
              <img
                src={photo.image_url}
                alt={photo.caption ?? ""}
                className="aspect-square w-full object-cover"
              />
              <div className="p-3">
                {photo.caption && (
                  <p className="line-clamp-2 text-xs text-text-muted">{photo.caption}</p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button type="button" onClick={() => toggleActive(photo)}>
                    <Badge variant={photo.active ? "success" : "default"}>
                      {photo.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPhoto(photo)}
                      className="text-text-muted hover:text-primary"
                      aria-label="Editar foto"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(photo)}
                      className="text-text-muted hover:text-accent"
                      aria-label="Excluir foto"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditGalleryDialog
        photo={editingPhoto}
        onClose={() => setEditingPhoto(null)}
        onSaved={() => {
          setEditingPhoto(null);
          load();
        }}
      />
    </div>
  );
}
