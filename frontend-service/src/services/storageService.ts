import { supabase } from "./supabaseClient";

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

export async function uploadReceiptImage(uri: string, userId: string) {
  const blob = await uriToBlob(uri);
  const storagePath = `${userId}/${Date.now()}_receipt.jpg`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(storagePath, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return storagePath;
}
