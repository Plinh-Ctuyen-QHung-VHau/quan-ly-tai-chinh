import { useEffect, useState } from "react";
import { getReceiptSignedUrl } from "../services/storageService";

/**
 * Hook để lấy signed URL cho ảnh hóa đơn từ Supabase Storage.
 * Tự động xử lý cả public URL và storage path.
 */
export function useSignedUrl(image_url: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image_url) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;

    getReceiptSignedUrl(image_url).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [image_url]);

  return signedUrl;
}
