"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { getCategoriesAction } from "@/features/categories/action";
import type { CategoryItem } from "@/features/categories/types";
import { cn } from "@/lib/utils";

type CategorySelectProps = {
  value: string;
  onChange: (categoryId: string, categoryName?: string) => void;
  disabled?: boolean;
  required?: boolean;
};

export function CategorySelect({
  value,
  onChange,
  disabled = false,
  required = false,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageSize = 10;

  // Load initial page of categories
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getCategoriesAction({ page: 1, size: pageSize, sort: "asc" })
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setCategories(res.data.content || []);
          setHasNext(Boolean(res.data.hasNext));
          setPage(1);
        }
      })
      .catch((err) => console.error("Failed to load categories for select:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleLoadMore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loadingMore || !hasNext) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await getCategoriesAction({ page: nextPage, size: pageSize, sort: "asc" });
      if (res.success && res.data) {
        setCategories((prev) => [...prev, ...(res.data?.content || [])]);
        setHasNext(Boolean(res.data.hasNext));
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more categories:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const selectedCategory = categories.find((c) => String(c.categoryId) === String(value));

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        suppressHydrationWarning
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-slate-400",
          open && "border-blue-600 ring-2 ring-blue-500/20"
        )}
      >
        <span className="truncate">
          {selectedCategory ? (
            <span className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{selectedCategory.category}</span>
              <span className="font-mono text-xs text-slate-400">({selectedCategory.categoryId})</span>
            </span>
          ) : value ? (
            <span className="font-mono text-slate-800">{value}</span>
          ) : (
            "Select a category..."
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>



      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-xs text-slate-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Loading categories…
            </div>
          ) : categories.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">No categories found</div>
          ) : (
            <div className="space-y-0.5">
              {categories.map((cat) => {
                const isSelected = String(cat.categoryId) === String(value);
                return (
                  <button
                    key={cat.categoryId}
                    type="button"
                    onClick={() => {
                      onChange(String(cat.categoryId), cat.category);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100",
                      isSelected && "bg-blue-50 font-medium text-blue-900"
                    )}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate text-slate-900 font-medium">{cat.category}</span>
                      <span className="font-mono text-xs text-slate-400">{cat.categoryId}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600 ml-2" />}
                  </button>
                );
              })}

              {hasNext && (
                <div className="border-t border-slate-100 p-1.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-50 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading more…
                      </>
                    ) : (
                      "Load More Categories"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
