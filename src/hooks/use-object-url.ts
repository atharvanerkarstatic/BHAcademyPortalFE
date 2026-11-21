"use client";

import { useEffect, useState } from "react";

interface ObjectUrlEntry {
  file: File;
  url: string;
}

export function useObjectUrl(file: File | null | undefined): string | null {
  const [entry, setEntry] = useState<ObjectUrlEntry | null>(null);

  useEffect(() => {
    let revoked = false;
    const url = file ? URL.createObjectURL(file) : null;

    if (file && url) {
      queueMicrotask(() => {
        if (!revoked) {
          setEntry({ file, url });
        }
      });
    }

    return () => {
      revoked = true;
      if (url) {
        URL.revokeObjectURL(url);
        setEntry((prev) => (prev?.url === url ? null : prev));
      }
    };
  }, [file]);

  if (!file || entry?.file !== file) {
    return null;
  }

  return entry.url;
}
