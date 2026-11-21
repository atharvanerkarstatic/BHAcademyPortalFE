"use client";

import { Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { uploadMediaAction } from "@/features/accounts/action";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/validations";

export interface ImageUploadFieldProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  pathPrefix?: string;
  disabled?: boolean;
  onUploadingChange?: (isUploading: boolean) => void;
  previewAlt?: string;
  helperText?: string;
  accept?: string;
  className?: string;
}

export function ImageUploadField({
  id,
  value,
  onChange,
  pathPrefix = "image",
  disabled = false,
  onUploadingChange,
  previewAlt = "Uploaded image preview",
  helperText = "Allowed formats: PNG, JPG, JPEG (Max 5 MB)",
  accept = ".jpg,.jpeg,.png",
  className,
}: ImageUploadFieldProps) {
  const { success, error: toastError } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);

  const setUploading = (next: boolean) => {
    setIsUploading(next);
    onUploadingChange?.(next);
  };

  const resetFileInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(
        check.error ||
          "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB)."
      );
      resetFileInput();
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `${pathPrefix}_${Date.now()}`);

      const res = await uploadMediaAction(formData);
      if (res.success && res.data) {
        setFailedPreviewUrl(null);
        onChange(res.data);
        success("Image uploaded successfully.");
      } else {
        toastError(res.error || "Failed to upload image. Please try again.");
        resetFileInput();
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      toastError("Failed to upload image file. Please try again.");
      resetFileInput();
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFailedPreviewUrl(null);
    resetFileInput();
    onChange("");
  };

  const showPreviewImage = Boolean(value) && failedPreviewUrl !== value;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3">
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={isUploading || disabled}
          onChange={(event) => {
            void handleFileChange(event);
          }}
          className="h-9 text-xs file:rounded file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {isUploading ? (
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </div>
        ) : null}
      </div>

      {helperText ? (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      ) : null}

      {value ? (
        <div className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
          {showPreviewImage ? (
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
              <img
                key={value}
                src={value}
                alt={previewAlt}
                className="h-full w-full object-cover"
                onError={() => {
                  setFailedPreviewUrl(value);
                }}
              />
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <div>
              <span className="block font-semibold text-emerald-600">
                Image uploaded successfully
              </span>
              <span className="text-[10px] text-slate-400">Ready to save</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading || disabled}
              onClick={handleClear}
              className="h-7 px-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
              title="Remove image"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
