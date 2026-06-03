import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  children: ReactNode;
}

/**
 * Probes `src` with an Image() and renders <img> on success, the fallback
 * `children` on miss. Renders the fallback while probing so there's no
 * broken-image flash. Ported verbatim from art.jsx.
 */
export function ImageFallback({ src, alt, className, style, loading, children }: Props) {
  const [status, setStatus] = useState<"probing" | "ok" | "failed">("probing");

  useEffect(() => {
    if (src == null || src === "") {
      setStatus("failed");
      return;
    }
    setStatus("probing");
    const img = new Image();
    img.onload = () => setStatus("ok");
    img.onerror = () => setStatus("failed");
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (status === "ok" && src != null) {
    return <img src={src} alt={alt ?? ""} className={className} style={style} loading={loading} />;
  }
  return <>{children}</>;
}
