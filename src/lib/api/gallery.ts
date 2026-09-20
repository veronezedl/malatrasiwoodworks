import { supabase } from "@/lib/supabase";
import type { DbGalleryPhoto } from "@/types/database";

export async function listGalleryPhotos(): Promise<DbGalleryPhoto[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveGalleryPhotos(): Promise<DbGalleryPhoto[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadGalleryPhoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("gallery")
    .upload(path, file, { cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return data.publicUrl;
}

export type GalleryPhotoInput = Omit<
  DbGalleryPhoto,
  "id" | "created_at" | "updated_at"
>;

export async function createGalleryPhoto(input: GalleryPhotoInput): Promise<void> {
  const { error } = await supabase.from("gallery_photos").insert(input);
  if (error) throw error;
}

export async function updateGalleryPhoto(
  id: string,
  input: Partial<GalleryPhotoInput>,
): Promise<void> {
  const { error } = await supabase
    .from("gallery_photos")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
  if (error) throw error;
}
