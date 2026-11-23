"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { Input } from "@/components/ui/input";
import { getLanguagesAction } from "@/features/languages/action";
import type { LanguageItem, LanguagePageResponse } from "@/features/languages/types";

type LanguageReferenceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LanguageReferenceDialog({
  open,
  onOpenChange,
}: LanguageReferenceDialogProps) {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<LanguagePageResponse>({
    content: [],
    page: 1,
    size: pageSize,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    hasNext: false,
    hasPrevious: false,
  });

  const [isPending, startTransition] = useTransition();

  const resetDialogState = useCallback(() => {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialogState();
    }
    onOpenChange(isOpen);
  };

  const loadLanguages = useCallback((targetPage: number, search: string) => {
    startTransition(async () => {
      const res = await getLanguagesAction({
        page: targetPage,
        size: pageSize,
        search,
      });

      if (res.success && res.data) {
        setPageData(res.data);
      }
    });
  }, [pageSize]);

  // When dialog is opened or page/search changes, load languages
  useEffect(() => {
    if (open) {
      loadLanguages(page, activeSearch);
    } else {
      resetDialogState();
    }
  }, [open, page, activeSearch, loadLanguages, resetDialogState]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const columns: Column<LanguageItem>[] = [
    {
      header: "Language ID",
      cell: (r) => (
        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {r.languageId}
        </span>
      ),
      className: "w-28 text-center",
    },
    {
      header: "Language Name",
      cell: (r) => (
        <div className="font-medium text-slate-900">
          {r.language}
          {r.nativeName && (
            <span className="text-slate-400 font-normal text-xs ml-1.5">
              ({r.nativeName})
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Language Code",
      cell: (r) => (
        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
          {r.languageCode || "—"}
        </span>
      ),
      className: "w-28 text-center",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base font-bold text-slate-900">
            Language Reference
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Use these Language IDs and Language Codes when preparing your bulk upload files.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by language name or code…"
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus-visible:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-3 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition-colors flex items-center gap-1.5"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Search
          </button>
          {activeSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setActiveSearch("");
                setPage(1);
              }}
              className="px-2.5 h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200"
            >
              Clear
            </button>
          )}
        </form>

        {/* Data Table with Pagination */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <DataTable
            columns={columns}
            data={pageData.content || []}
            getRowId={(r) => r.languageId}
            loading={isPending}
            emptyMessage={activeSearch ? `No languages matching "${activeSearch}"` : "No languages found"}
            pagination={{
              page,
              pageSize,
              totalElements: pageData.totalElements,
              totalPages: pageData.totalPages,
              onPageChange: (newPage) => setPage(newPage),
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
