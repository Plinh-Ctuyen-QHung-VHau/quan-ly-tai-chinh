import { useEffect, useState } from "react";
import { getReceiptSignedUrl } from "../services/storageService";

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
