"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Pencil, Trash2, Search } from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { getFaqsAction, deleteFaqAction } from "@/features/faqs/action";
import type { FaqItem, FaqPageResponse } from "@/features/faqs/types";

const LANGUAGES = [
  { code: "en", label: "English (en)" },
  { code: "hi", label: "Hindi (hi)" },
  { code: "bn", label: "Bengali (bn)" },
  { code: "kn", label: "Kannada (kn)" },
  { code: "ml", label: "Malayalam (ml)" },
  { code: "or", label: "Odia (or)" },
  { code: "ta", label: "Tamil (ta)" },
  { code: "te", label: "Telugu (te)" },
  { code: "as", label: "Assamese (as)" },
  { code: "gu", label: "Gujarati (gu)" },
  { code: "mr", label: "Marathi (mr)" },
];

export default function FaqsPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("en");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [pageData, setPageData] = useState<FaqPageResponse>({
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

  // Delete modal state
  const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission flags
  const canCreate = can("faqs.create");
  const canUpdate = can("faqs.update");
  const canDelete = can("faqs.delete");

  const loadFaqs = (targetPage = page, targetLang = language, showSuccessToast = false) => {
    startTransition(async () => {
      const res = await getFaqsAction({
        language: targetLang,
        page: targetPage,
        size: pageSize,
      });
      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("FAQs refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load FAQs");
      }
    });
  };

  useEffect(() => {
    loadFaqs(page, language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, language]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setPage(1); // Reset to page 1 on filter change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const confirmDelete = async () => {
    if (!faqToDelete) return;
    setIsDeleting(true);

    const res = await deleteFaqAction(faqToDelete.id);
    setIsDeleting(false);
    setFaqToDelete(null);

    if (res.success) {
      success(res.message || "FAQ deleted successfully");
      loadFaqs(page, language);
    } else {
      toastError(res.error || "Failed to delete FAQ");
    }
  };

  // Live client-side search filtering on the current fetched items
  const filteredData = useMemo(() => {
    if (!search.trim()) return pageData.content;
    const query = search.toLowerCase();
    return pageData.content.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        String(item.id).includes(query)
    );
  }, [pageData.content, search]);

  const columns: Column<FaqItem>[] = useMemo(() => {
    const cols: Column<FaqItem>[] = [
      { header: "ID", cell: (r) => r.id, className: "w-16 font-mono text-xs" },
      { header: "Display Order", cell: (r) => r.displayOrder, className: "w-28 text-center" },
      {
        header: "Question",
        cell: (r) => (
          <div className="max-w-md">
            <p className="font-medium text-slate-900 line-clamp-2">{r.question}</p>
            <span className="text-xs text-slate-400 font-mono uppercase">{r.language}</span>
          </div>
        ),
      },
      {
        header: "Answer",
        cell: (r) => (
          <div className="max-w-lg">
            <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-line">{r.answer}</p>
          </div>
        ),
      },
      {
        header: "Status",
        cell: (r) => <StatusText active={r.status === "ACTIVE"} />,
        className: "w-24",
      },
      {
        header: "Translations",
        cell: (r) => (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {r.translatedLanguages ?? 1}
          </span>
        ),
        className: "w-28 text-center",
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        cell: (r) => (
          <div className="flex items-center gap-1.5">
            {canUpdate && (
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                title="Edit FAQ"
              >
                <Link href={`/faqs/${r.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setFaqToDelete(r)}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete FAQ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        className: "w-24 text-right",
      });
    }

    return cols;
  }, [canUpdate, canDelete]);

  return (
    <>
      <PageHeader
        title="Manage FAQs"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "FAQs List" }]}
      />

      <DataTable
        title="FAQs List"
        logoSrc="/logo.png"
        columns={columns}
        data={filteredData}
        getRowId={(r) => r.id}
        loading={isPending}
        emptyMessage="No FAQs found"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input beside Refresh */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search FAQs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 pl-8 text-xs sm:w-56"
              />
            </div>

            {/* Language filter dropdown defaulting to en */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="faq-lang" className="text-xs font-semibold text-slate-600 hidden sm:inline">
                Lang:
              </label>
              <select
                id="faq-lang"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs font-medium text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                loadFaqs(1, language, true);
              }}
              disabled={isPending}
              className="gap-1.5 text-slate-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add FAQ button visible only if user has faqs.create permission */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/faqs/new">
                  <Plus className="h-4 w-4" />
                  Add FAQ
                </Link>
              </Button>
            )}
          </div>
        }
        pagination={{
          page,
          pageSize,
          totalElements: pageData.totalElements,
          totalPages: pageData.totalPages,
          onPageChange: handlePageChange,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(faqToDelete)} onOpenChange={(open) => !open && setFaqToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ ?
              <br />
              <strong className="text-slate-800 line-clamp-2 mt-2">{faqToDelete?.question}</strong>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
