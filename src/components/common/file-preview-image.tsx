"use client";

import { useObjectUrl } from "@/hooks/use-object-url";

interface FilePreviewImageProps {
  file?: File | null;
  fallbackUrl?: string | null;
  alt: string;
  className?: string;
}

export function FilePreviewImage({
  file,
  fallbackUrl,
  alt,
  className,
}: FilePreviewImageProps) {
  const objectUrl = useObjectUrl(file);
  const src = file ? objectUrl : fallbackUrl;

  if (!src) {
    return null;
  }

  return <img src={src} alt={alt} className={className} />;
}
