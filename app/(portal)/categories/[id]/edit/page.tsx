"use client";

import { Suspense, useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Languages, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { getCategoryByIdAction, updateCategoryAction } from "@/features/categories/action";
import type { CategoryItem, UpdateCategoryPayload } from "@/features/categories/types";

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
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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

    let hasPopulatedFromCache = false;

    // 1. Immediately try to populate from category data table list stored in sessionStorage
    try {
      const stored =
        sessionStorage.getItem(`category_${id}`) ||
        sessionStorage.getItem("selected_category");
      if (stored) {
        const parsed = JSON.parse(stored) as CategoryItem;
        if (String(parsed.categoryId) === String(id)) {
          populateFromItem(parsed);
          hasPopulatedFromCache = true;
          setFetching(false);
        }
      }
    } catch {
      // ignore storage error
    }

    // 2. Fetch category from category list action as source of truth / fallback
    let mounted = true;
    (async () => {
      if (!hasPopulatedFromCache) {
        setFetching(true);
      }

      const res = await getCategoryByIdAction(id);
      if (!mounted) return;

      if (res.success && res.data) {
        populateFromItem(res.data);
        setError(null);
      } else if (!hasPopulatedFromCache) {
        const msg = res.error || "Failed to load category details";
        setError(msg);
        toastError(msg);
      }
      setFetching(false);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, populateFromItem]);

  const handleTranslationChange = (key: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [key]: value }));
  };

  const cleanupStorage = () => {
    try {
      sessionStorage.removeItem(`category_${id}`);
      sessionStorage.removeItem("selected_category");
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCategory = category.trim();
    if (!cleanCategory) {
      setError("Category name is required.");
      return;
    }

    if (cleanCategory.length > 255) {
      setError("Character size limit exceeded: Category Name must not exceed 255 characters.");
      return;
    }

    if (imageUrl.trim().length > 500) {
      setError("Character size limit exceeded: Image URL must not exceed 500 characters.");
      return;
    }

    for (const [key, val] of Object.entries(translations)) {
      if (val && val.length > 255) {
        setError(`Character size limit exceeded: ${key} must not exceed 255 characters.`);
        return;
      }
    }

    const payload: UpdateCategoryPayload = {
      category: cleanCategory,
      imageUrl: imageUrl.trim() || undefined,
      displayOrder: Number(displayOrder) || 0,
      status,
      featured,
      ...translations,
    };

    startTransition(async () => {
      const res = await updateCategoryAction(id, payload);
      if (res.success) {
        cleanupStorage();
        success(res.message || "Category updated successfully");
        router.push("/categories");
      } else {
        console.error("Backend error from updateCategoryAction:", res.error);

        const errText = (res.error || "").toLowerCase();
        let displayMsg = "Failed to update category. Please check all fields and try again.";
        if (
          errText.includes("character") ||
          errText.includes("size") ||
          errText.includes("limit") ||
          errText.includes("too long") ||
          errText.includes("length")
        ) {
          displayMsg = "Character size limit exceeded. Please ensure all inputs are within the allowed limit.";
        }

        setError(displayMsg);
        toastError(displayMsg);
      }
    });
  };

  if (fetching) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading category details…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <Link href="/categories" onClick={cleanupStorage}>
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Edit Category (${id})`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Categories List", href: "/categories" },
          { label: `Edit ${id}` },
        ]}
      />

      <form onSubmit={handleSubmit} noValidate className="w-full space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Basic Information Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <CardTitle>Basic Information</CardTitle>
            </div>
            <CardDescription>
              Update category details, display order, status, and image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category"
                  placeholder="e.g. Interior Textures"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="e.g. https://domain.com/category-image.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">
                  Display Order <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">
                  Status <span className="text-red-500">*</span>
                </Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-end pb-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="featured"
                    checked={featured}
                    onCheckedChange={(checked) => setFeatured(Boolean(checked))}
                  />
                  <Label htmlFor="featured" className="cursor-pointer font-medium text-slate-700">
                    Mark as Featured Category
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multilingual Translations Card */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-indigo-600" />
              <CardTitle>Multilingual Translations (Optional)</CardTitle>
            </div>
            <CardDescription>
              Provide regional translations for the category name across 10 Indian languages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {TRANSLATION_LANGUAGES.map((lang) => {
                const key = `category${lang.code}`;
                return (
                  <div key={lang.code} className="grid gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-xs font-semibold text-slate-700">
                        {lang.name}
                      </Label>
                      <span className="text-xs font-mono text-slate-400 uppercase">{lang.code}</span>
                    </div>
                    <Input
                      id={key}
                      placeholder={`Category in ${lang.name}`}
                      value={translations[key] || ""}
                      onChange={(e) => handleTranslationChange(key, e.target.value)}
                      maxLength={255}
                      className="bg-white"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={isPending}
          >
            <Link href="/categories" onClick={cleanupStorage}>
              Cancel
            </Link>
          </Button>

          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-32"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditCategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading page…</p>
        </div>
      }
    >
      <EditCategoryContent />
    </Suspense>
  );
}
