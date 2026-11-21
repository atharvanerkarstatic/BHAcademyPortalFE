"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  LanguageItem,
  LanguagePageResponse,
} from "@/features/languages/types";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

interface LanguageSelectProps {
  value?: string | number | null;
  onChange: (
    languageId: string,
    languageName: string,
    languageCode?: string | null
  ) => void;
  disabled?: boolean;
  buttonClassName?: string;
  displayFormat?: "pill" | "input";
  showCodeOnly?: boolean;
}

const PAGE_SIZE = 10;

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
  buttonClassName,
  displayFormat = "pill",
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.languages.list({ page: 0, size: PAGE_SIZE }),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        portalGet<LanguagePageResponse>(
          "languages",
          { page: pageParam, size: PAGE_SIZE },
          signal
        ),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.hasNext ? allPages.length + 1 : undefined,
      staleTime: 5 * 60_000,
    });

  const languages = useMemo<Array<LanguageItem>>(() => {
    if (!data?.pages) {
      return [];
    }
    return data.pages.flatMap((page) => page.content ?? []);
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

  const stringValue =
    value !== undefined && value !== null ? String(value) : "";
  const lowerVal = stringValue.trim().toLowerCase();

  const selectedLang = languages.find((lang) => {
    if (!lowerVal) {
      return false;
    }
    const lId = (lang.languageId || "").toLowerCase();
    const lName = (lang.language || "").toLowerCase();
    const lCode = (lang.languageCode || "").toLowerCase();
    return lId === lowerVal || lName === lowerVal || lCode === lowerVal;
  });

  let displayText = "Select Language | Change";
  if (selectedLang) {
    const label = selectedLang.nativeName
      ? `${selectedLang.nativeName} (${selectedLang.language})`
      : selectedLang.language;
    displayText = `${label} Language | Change`;
  } else if (stringValue) {
    displayText = `${stringValue} Language | Change`;
  }

  const renderDropdownContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 p-4 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Loading languages…
        </div>
      );
    }

    if (languages.length === 0) {
      return (
        <div className="p-3 text-center text-xs text-slate-500">
          No languages found
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        {languages.map((lang) => {
          const lId = (lang.languageId || "").toLowerCase();
          const lName = (lang.language || "").toLowerCase();
          const lCode = (lang.languageCode || "").toLowerCase();
          const isSelected =
            Boolean(lowerVal) &&
            (lId === lowerVal || lName === lowerVal || lCode === lowerVal);
          return (
            <button
              key={lang.languageId}
              type="button"
              onClick={() => {
                onChange(lang.languageId, lang.language, lang.languageCode);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-slate-100",
                isSelected && "bg-blue-50 font-semibold text-blue-900"
              )}
            >
              <div className="flex flex-col truncate">
                <span className="truncate font-medium text-slate-900">
                  {lang.nativeName
                    ? `${lang.nativeName} (${lang.language})`
                    : lang.language}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {lang.languageCode ? lang.languageCode.toLowerCase() : ""}
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
                "Load More Languages"
              )}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {displayFormat === "pill" ? (
        <button
          type="button"
          suppressHydrationWarning
          disabled={disabled}
          onClick={() => {
            setOpen((prev) => !prev);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700",
            buttonClassName
          )}
        >
          <span>{displayText}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      ) : (
        <button
          type="button"
          suppressHydrationWarning
          disabled={disabled}
          onClick={() => {
            setOpen((prev) => !prev);
          }}
          className={cn(
            "border-input flex h-9 w-full items-center justify-between rounded-lg border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
            buttonClassName
          )}
        >
          <span className="truncate">
            {selectedLang ? selectedLang.language : "Select a language..."}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-500 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      )}

      {open ? (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-72 w-64 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {renderDropdownContent()}
        </div>
      ) : null}
    </div>
  );
}
