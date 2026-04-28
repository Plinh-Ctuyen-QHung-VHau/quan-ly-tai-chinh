import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

import { supabase } from "./supabaseClient";

function getContentType(uri: string) {
  const lower = uri.toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".jpg")) return "image/jpeg";

  return "image/jpeg";
}

function getExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadReceiptImage(uri: string, user_id: string) {
  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists) {
    throw new Error("Không tìm thấy file ảnh trên thiết bị.");
  }

  if ("size" in fileInfo && (!fileInfo.size || fileInfo.size <= 0)) {
    throw new Error("Ảnh trên thiết bị bị rỗng, vui lòng chọn lại ảnh.");
  }

  const contentType = getContentType(uri);
  const ext = getExtension(contentType);
  const storagePath = `${user_id}/${Date.now()}_receipt.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!base64 || base64.length === 0) {
    throw new Error("Không đọc được dữ liệu ảnh.");
  }

  const arrayBuffer = decode(base64);

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error("Dữ liệu ảnh upload bị rỗng.");
  }

  console.log("[UPLOAD] local uri:", uri);
  console.log(
    "[UPLOAD] local file size:",
    "size" in fileInfo ? fileInfo.size : "unknown",
  );
  console.log("[UPLOAD] arrayBuffer bytes:", arrayBuffer.byteLength);
  console.log("[UPLOAD] content type:", contentType);

  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(data.path);

  const image_url = publicUrlData.publicUrl;

  if (!image_url.startsWith("http://") && !image_url.startsWith("https://")) {
    throw new Error("Không lấy được URL ảnh hợp lệ.");
  }

  console.log("[UPLOAD] uploaded path:", data.path);
  console.log("[UPLOAD] image_url:", image_url);

  return image_url;
}
