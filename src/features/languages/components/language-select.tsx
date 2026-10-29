"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { getLanguagesAction } from "@/features/languages/action";
import type { LanguageItem } from "@/features/languages/types";
import { cn } from "@/lib/utils";

type LanguageSelectProps = {
  value?: string | number | null; // languageId or language name or code
  onChange: (languageId: string, languageName: string, languageCode?: string | null) => void;
  disabled?: boolean;
  buttonClassName?: string;
  displayFormat?: "pill" | "input"; // "pill" for blue button like in screenshot
  showCodeOnly?: boolean; // When true, displays and emphasizes code instead of languageId
};

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
  buttonClassName,
  displayFormat = "pill",
  showCodeOnly = false,
}: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageSize = 10;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getLanguagesAction({ page: 1, size: pageSize })
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setLanguages(res.data.content || []);
          setHasNext(Boolean(res.data.hasNext));
          setPage(1);
        }
      })
      .catch((err) => console.error("Failed to load languages:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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
      const res = await getLanguagesAction({ page: nextPage, size: pageSize });
      if (res.success && res.data) {
        setLanguages((prev) => [...prev, ...(res.data?.content || [])]);
        setHasNext(Boolean(res.data.hasNext));
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more languages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const stringValue = value !== undefined && value !== null ? String(value) : "";
  const lowerVal = stringValue.trim().toLowerCase();

  const selectedLang = languages.find((l) => {
    if (!lowerVal) return false;
    const lId = String(l.languageId || "").toLowerCase();
    const lName = String(l.language || "").toLowerCase();
    const lCode = String(l.languageCode || "").toLowerCase();
    return lId === lowerVal || lName === lowerVal || lCode === lowerVal;
  });

  const displayText = selectedLang
    ? `${selectedLang.nativeName ? `${selectedLang.nativeName} (${selectedLang.language})` : selectedLang.language} Language | Change`
    : stringValue
    ? `${stringValue} Language | Change`
    : "Select Language | Change";

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {displayFormat === "pill" ? (
        <button
          type="button"
          suppressHydrationWarning
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors",
            buttonClassName
          )}
        >
          <span>{displayText}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      ) : (
        <button
          type="button"
          suppressHydrationWarning
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
            buttonClassName
          )}
        >
          <span className="truncate">
            {selectedLang ? selectedLang.language : "Select a language..."}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-64 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center p-4 text-xs text-slate-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Loading languages…
            </div>
          ) : languages.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">No languages found</div>
          ) : (
            <div className="space-y-0.5">
              {languages.map((lang) => {
                const lId = String(lang.languageId || "").toLowerCase();
                const lName = String(lang.language || "").toLowerCase();
                const lCode = String(lang.languageCode || "").toLowerCase();
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
                      <span className="truncate text-slate-900 font-medium">
                        {lang.nativeName ? `${lang.nativeName} (${lang.language})` : lang.language}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {lang.languageCode ? lang.languageCode.toLowerCase() : ""}
                      </span>
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
                      "Load More Languages"
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
