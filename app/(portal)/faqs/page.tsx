"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus, RefreshCw, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

import { ConfirmDeleteDialog } from "@/components/common/confirm-delete-dialog";
import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteFaqAction } from "@/features/faqs/action";
import type { FaqItem, FaqPageResponse } from "@/features/faqs/types";
import { useAuth } from "@/lib/auth-context";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 10;

const EMPTY_PAGE: FaqPageResponse = {
  content: [],
  page: 1,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

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
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("en");
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);

  const canCreate = can("faqs.create");
  const canUpdate = can("faqs.update");
  const canDelete = can("faqs.delete");

  const {
    data: pageData = EMPTY_PAGE,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.faqs.list({ page, size: pageSize, language }),
    queryFn: ({ signal }) =>
      portalGet<FaqPageResponse>(
        "faqs",
        { page, size: pageSize, language },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const isPending = isLoading;

  const refreshFaqs = async (showSuccessToast: boolean) => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load FAQs");
    } else if (showSuccessToast) {
      success("FAQs refreshed successfully");
    }
  };

  const loadFaqs = (
    targetPage = page,
    targetLang = language,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    setLanguage(targetLang);
    void refreshFaqs(showSuccessToast);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFaqAction(id),
    onSuccess: async (res) => {
      setFaqToDelete(null);
      if (res.success) {
        success(res.message || "FAQ deleted successfully");
        await queryClient.invalidateQueries({ queryKey: queryKeys.faqs.all });
      } else {
        toastError(res.error || "Failed to delete FAQ");
      }
    },
    onError: () => {
      setFaqToDelete(null);
      toastError("Failed to delete FAQ");
    },
  });

  const isDeleting = deleteMutation.isPending;

  const confirmDelete = () => {
    if (!faqToDelete) {
      return;
    }
    deleteMutation.mutate(faqToDelete.id);
  };

  // Live client-side search filtering on the current fetched items
  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return pageData.content;
    }
    const query = search.toLowerCase();
    return pageData.content.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        String(item.id).includes(query)
    );
  }, [pageData.content, search]);

  const columns: Array<Column<FaqItem>> = useMemo(() => {
    const cols: Array<Column<FaqItem>> = [
      { header: "ID", cell: (r) => r.id, className: "w-16 font-mono text-xs" },
      {
        header: "Display Order",
        cell: (r) => r.displayOrder,
        className: "w-28 text-center",
      },
      {
        header: "Question",
        cell: (r) => (
          <div className="max-w-md">
            <p className="line-clamp-2 font-medium text-slate-900">
              {r.question}
            </p>
            <span className="font-mono text-xs text-slate-400 uppercase">
              {r.language}
            </span>
          </div>
        ),
      },
      {
        header: "Answer",
        cell: (r) => (
          <div className="max-w-lg">
            <p className="line-clamp-2 text-sm whitespace-pre-line text-slate-600">
              {r.answer}
            </p>
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
                onClick={() => {
                  setFaqToDelete(r);
                }}
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
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "FAQs List" },
        ]}
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
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search FAQs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                className="h-8 w-44 pl-8 text-xs sm:w-56"
              />
            </div>

            {/* Language filter dropdown defaulting to en */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="faq-lang"
                className="hidden text-xs font-semibold text-slate-600 sm:inline"
              >
                Language:
              </label>
              <select
                id="faq-lang"
                value={language}
                onChange={(e) => {
                  handleLanguageChange(e.target.value);
                }}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2 text-xs font-medium text-slate-700 outline-none focus-visible:ring-3"
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
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Add FAQ button visible only if user has faqs.create permission */}
            {canCreate && (
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
              >
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
      <ConfirmDeleteDialog
        open={Boolean(faqToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setFaqToDelete(null);
          }
        }}
        title="Delete FAQ?"
        description={
          <>
            Are you sure you want to delete this FAQ ?
            <br />
            <strong className="mt-2 line-clamp-2 text-slate-800">
              {faqToDelete?.question}
            </strong>
            <br />
            This action cannot be undone.
          </>
        }
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
