"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CategoryItem,
  CategoryPageResponse,
} from "@/features/categories/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string, categoryName?: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const PAGE_SIZE = 50;

export function CategorySelect({
  value,
  onChange,
  disabled = false,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.categories.list({
        page: 0,
        size: PAGE_SIZE,
        sort: "asc",
        status: "ACTIVE",
      }),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        portalGet<CategoryPageResponse>(
          "categories",
          { page: pageParam, size: PAGE_SIZE, sort: "asc", status: "ACTIVE" },
          signal
        ),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.hasNext ? allPages.length + 1 : undefined,
      staleTime: 5 * 60_000,
    });

  const categories = useMemo<Array<CategoryItem>>(() => {
    if (!data?.pages) {
      return [];
    }
    return data.pages.flatMap((page) =>
      (page.content ?? []).filter(
        (category) =>
          !category.status || category.status.toUpperCase() === "ACTIVE"
      )
    );
  }, [data]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
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

  const handleLoadMore = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }
    void fetchNextPage();
  };

  const selectedCategory = categories.find(
    (cat) => String(cat.categoryId) === value
  );

  const renderTriggerLabel = () => {
    if (selectedCategory) {
      return (
        <span className="flex items-center gap-2">
          <span className="font-medium text-slate-900">
            {selectedCategory.category}
          </span>
          <span className="font-mono text-xs text-slate-400">
            ({selectedCategory.categoryId})
          </span>
        </span>
      );
    }

    if (value) {
      return <span className="font-mono text-slate-800">{value}</span>;
    }

    return "Select a category...";
  };

  const renderDropdownContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading categories…
        </div>
      );
    }

    if (categories.length === 0) {
      return (
        <div className="p-3 text-center text-xs text-slate-500">
          No categories found
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        {categories.map((cat) => {
          const isSelected = String(cat.categoryId) === value;
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
                <span className="truncate font-medium text-slate-900">
                  {cat.category}
                </span>
              </div>
              {isSelected ? (
                <Check className="ml-2 h-4 w-4 shrink-0 text-blue-600" />
              ) : null}
            </button>
          );
        })}

        {hasNextPage ? (
          <div className="border-t border-slate-100 p-1.5 pt-2">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isFetchingNextPage}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-50 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading more…
                </>
              ) : (
                "Load More Categories"
              )}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        suppressHydrationWarning
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between rounded-lg border bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-slate-400",
          open && "border-blue-600 ring-2 ring-blue-500/20"
        )}
      >
        <span className="truncate">{renderTriggerLabel()}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {renderDropdownContent()}
        </div>
      ) : null}
    </div>
  );
}
