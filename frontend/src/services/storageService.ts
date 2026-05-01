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

  // Trả về storage path (không có bucket name) để lưu vào DB.
  // getReceiptSignedUrl() sẽ tạo signed URL tươi khi cần hiển thị.
  console.log("[UPLOAD] uploaded path:", data.path);

  return data.path;
}

/**
 * Lấy signed URL từ image_url đã lưu trong DB.
 * Hỗ trợ cả publicUrl (extract path) và storage path trực tiếp.
 */
const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL = 50 * 60 * 1000; // 50 phút (signed URL có hiệu lực 1 giờ)

export async function getReceiptSignedUrl(image_url: string | null | undefined): Promise<string | null> {
  if (!image_url) return null;

  // Nếu đã có signed URL hợp lệ trong cache
  const cached = SIGNED_URL_CACHE.get(image_url);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  // Trích xuất path từ URL Supabase. 
  // Supabase URL thường có dạng: .../object/[public|sign]/receipts/[userId/filename.jpg]
  // createSignedUrl yêu cầu path KHÔNG CÓ tên bucket.
  let storagePath = image_url;
  
  if (image_url.startsWith("http")) {
    try {
      const url = new URL(image_url);
      const pathParts = url.pathname.split("/");
      // Tìm vị trí của bucket name 'receipts' trong path
      const bucketIndex = pathParts.indexOf("receipts");
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        // Lấy tất cả phần sau bucket name
        storagePath = pathParts.slice(bucketIndex + 1).join("/");
      }
    } catch (e) {
      // Nếu không parse được URL, thử regex cũ làm fallback
      const match = image_url.match(/receipts\/(.+?)(\?|$)/);
      if (match) storagePath = match[1];
    }
  }
  
  // Xóa các query params nếu còn sót (như ?token=...)
  storagePath = storagePath.split("?")[0];

  try {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      console.warn("[SignedUrl] Failed:", error?.message);
      return image_url; // Fallback
    }

    SIGNED_URL_CACHE.set(image_url, {
      url: data.signedUrl,
      expiresAt: Date.now() + SIGNED_URL_TTL,
    });

    return data.signedUrl;
  } catch (err) {
    console.warn("[SignedUrl] Error:", err);
    return image_url;
  }
}
