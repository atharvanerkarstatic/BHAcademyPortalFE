"use client";

import { Suspense, useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Languages, Loader2, X } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { getCategoryByIdAction, updateCategoryAction } from "@/features/categories/action";
import { uploadMediaAction } from "@/features/accounts/action";
import type { CategoryItem, UpdateCategoryPayload } from "@/features/categories/types";
import { sanitizeTextInput, sanitizeNonNegativeNumber, validateImageFile } from "@/lib/validations";

const TRANSLATION_LANGUAGES = [
  { code: "Hi", name: "Hindi (हिन्दी)" },
  { code: "Bn", name: "Bengali (বাংলা)" },
  { code: "Kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "Ml", name: "Malayalam (മലയാളം)" },
  { code: "Or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "Ta", name: "Tamil (தமிழ்)" },
  { code: "Te", name: "Telugu (తెలుగు)" },
  { code: "As", name: "Assamese (অসমীয়া)" },
  { code: "Gu", name: "Gujarati (ગુજરાતી)" },
  { code: "Mr", name: "Marathi (मराठी)" },
] as const;

function EditCategoryContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { success, error: toastError } = useToast();
  const [fetching, setFetching] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [featured, setFeatured] = useState<boolean>(false);

  const [translations, setTranslations] = useState<Record<string, string>>({
    categoryAs: "",
    categoryBn: "",
    categoryGu: "",
    categoryHi: "",
    categoryKn: "",
    categoryMl: "",
    categoryMr: "",
    categoryOr: "",
    categoryTa: "",
    categoryTe: "",
  });

  const populateFromItem = useCallback((item: CategoryItem) => {
    setCategory(item.category || "");
    setImageUrl((item.imageUrl || "").trim());
    setDisplayOrder(typeof item.displayOrder === "number" ? item.displayOrder : 0);
    setStatus(item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setFeatured(Boolean(item.featured));

    setTranslations({
      categoryAs: item.categoryAs || "",
      categoryBn: item.categoryBn || "",
      categoryGu: item.categoryGu || "",
      categoryHi: item.categoryHi || "",
      categoryKn: item.categoryKn || "",
      categoryMl: item.categoryMl || "",
      categoryMr: item.categoryMr || "",
      categoryOr: item.categoryOr || "",
      categoryTa: item.categoryTa || "",
      categoryTe: item.categoryTe || "",
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    (async () => {
      setFetching(true);
      const res = await getCategoryByIdAction(id);
      if (!mounted) return;

      if (res.success && res.data) {
        populateFromItem(res.data);
      } else {
        toastError(res.error || "Failed to load category details");
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id, populateFromItem, toastError]);

  const handleBack = () => {
    router.back();
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    const check = validateImageFile(file);
    if (!check.valid) {
      toastError(check.error || "Only .png, .jpg, and .jpeg image formats are allowed (Max 5 MB).");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `category_image_${Date.now()}`);

      const res = await uploadMediaAction(formData);
      if (res.success && res.data) {
        setImageUrl(res.data);
        success("Image uploaded successfully and converted to URL.");
      } else {
        toastError(res.error || "Failed to upload image. Please try again.");
      }
    } catch (err) {
      console.error("Category image upload failed:", err);
      toastError("Failed to upload image file. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTranslationChange = (key: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isUploadingImage) {
      toastError("Please wait for image upload to complete.");
      return;
    }

    const cleanCategory = sanitizeTextInput(category, 255);
    if (!cleanCategory) {
      toastError("Category name is required.");
      return;
    }

    const cleanImageUrl = sanitizeTextInput(imageUrl, 500);

    const sanitizedTranslations: Record<string, string> = {};
    for (const [key, val] of Object.entries(translations)) {
      if (!val) continue;
      sanitizedTranslations[key] = sanitizeTextInput(val, 255);
    }

    const payload: UpdateCategoryPayload = {
      category: cleanCategory,
      imageUrl: cleanImageUrl || undefined,
      displayOrder: sanitizeNonNegativeNumber(displayOrder, 0, 0),
      status,
      featured,
      ...sanitizedTranslations,
    };

    startTransition(async () => {
      const res = await updateCategoryAction(id, payload);
      if (res.success) {
        success("Category updated successfully");
        router.push("/categories");
      } else {
        toastError(res.error || "Failed to update category. Please try again.");
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Categories"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Categories List", href: "/categories" },
          { label: "Edit Category" },
        ]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 py-4 bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Edit Category
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-slate-600 hover:text-slate-900">
            <Link href="/categories">
              <ArrowLeft className="h-4 w-4" />
              Back to Categories List
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} autoComplete="off" className="mx-auto max-w-2xl space-y-4">
            {/* Category Name */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-cat-name"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Category Name <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-cat-name"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Interior Textures"
                  maxLength={255}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Category Image Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
              <Label
                htmlFor="edit-cat-image-file"
                className="text-xs font-semibold text-slate-700 sm:text-right pt-2"
              >
                Category Image
              </Label>
              <div className="sm:col-span-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Input
                    id="edit-cat-image-file"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    disabled={isUploadingImage || isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) handleImageUpload(file);
                    }}
                    className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {isUploadingImage && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Allowed formats: PNG, JPG, JPEG (Max 5 MB)
                </p>

                {/* Uploaded Image Preview & Remove */}
                {imageUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50/70 w-fit">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Category Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <div>
                        <span className="font-semibold text-emerald-600 block">
                          Image uploaded successfully
                        </span>
                        <span className="text-[10px] text-slate-400">Ready to save</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImageUrl("")}
                        className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Display Order */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-cat-order"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Display Order <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <Input
                  id="edit-cat-order"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(sanitizeNonNegativeNumber(e.target.value, 0, 0))}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-cat-status"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Status <span className="text-rose-500">*</span>
              </Label>
              <div className="sm:col-span-3">
                <select
                  id="edit-cat-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {/* Featured Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-cat-featured"
                className="text-xs font-semibold text-slate-700 sm:text-right"
              >
                Featured
              </Label>
              <div className="sm:col-span-3 flex items-center gap-2">
                <Checkbox
                  id="edit-cat-featured"
                  checked={featured}
                  onCheckedChange={(checked) => setFeatured(Boolean(checked))}
                />
                <Label
                  htmlFor="edit-cat-featured"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Display as Featured Category
                </Label>
              </div>
            </div>

            {/* Multilingual Section Divider */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Languages className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Multilingual Translations (Optional)
                </h3>
              </div>
              <div className="space-y-3">
                {TRANSLATION_LANGUAGES.map((lang) => {
                  const key = `category${lang.code}`;
                  return (
                    <div key={lang.code} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <Label
                        htmlFor={key}
                        className="text-xs font-medium text-slate-600 sm:text-right"
                      >
                        {lang.name}
                      </Label>
                      <div className="sm:col-span-3">
                        <Input
                          id={key}
                          placeholder={`Category in ${lang.name}`}
                          value={translations[key] || ""}
                          onChange={(e) => handleTranslationChange(key, e.target.value)}
                          maxLength={255}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-24 h-8 text-xs font-semibold uppercase"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                SAVE
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isPending}
                className="min-w-24 h-8 text-xs font-medium uppercase border-slate-300"
              >
                <Link href="/categories">CANCEL</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditCategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[350px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <EditCategoryContent />
    </Suspense>
  );
}
