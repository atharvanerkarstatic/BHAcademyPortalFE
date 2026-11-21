"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Search,
  Phone,
  MapPin,
  Building,
  List,
  Download,
  FileSpreadsheet,
  Upload,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable } from "@/components/common/data-table";
import type { Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  exportAccountsAction,
  importAccountsAction,
  importAccountBhbpAction,
  getSampleImportAction,
} from "@/features/accounts/action";
import type {
  AccountItem,
  AccountPageResponse,
  BulkImportResponse,
  BulkImportError,
} from "@/features/accounts/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth-context";
import { downloadCsv } from "@/lib/download";
import { portalGet } from "@/lib/portal-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const EMPTY_PAGE: AccountPageResponse = {
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

export default function AccountsPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const activeSearch = useDebouncedValue(searchInput.trim(), 350);
  const [page, setPage] = useState(1);

  // Active top tab: "list" | "bulk_bp" | "bulk_users"
  const [activeTab, setActiveTab] = useState<"list" | "bulk_bp" | "bulk_users">(
    "list"
  );

  // State for image preview modal
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const previewDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = previewDialogRef.current;
    if (!dialog) {
      return;
    }
    if (previewImage) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [previewImage]);

  // Bulk update file uploads
  const [bulkBpFile, setBulkBpFile] = useState<File | null>(null);
  const [bulkUsersFile, setBulkUsersFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canCreate = can("users.create") || can("accounts.create");
  const canExport = can("users.read") || can("accounts.export");
  const canImport = can("accounts.import") || can("system.all");

  const {
    data: pageData = EMPTY_PAGE,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.accounts.list({
      page,
      size: PAGE_SIZE,
      search: activeSearch,
    }),
    queryFn: ({ signal }) =>
      portalGet<AccountPageResponse>(
        "accounts",
        { page, size: PAGE_SIZE, search: activeSearch },
        signal
      ),
    placeholderData: keepPreviousData,
  });

  const isPending = isLoading;

  const refreshAccounts = async (showSuccessToast: boolean) => {
    const result = await refetch();
    if (result.error) {
      toastError(result.error.message || "Failed to load accounts");
    } else if (showSuccessToast) {
      success("Accounts refreshed successfully");
    }
  };

  const loadAccounts = (
    targetPage = page,
    _searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    setPage(targetPage);
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    void refreshAccounts(showSuccessToast);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setPage(1);
  };

  const handleDownloadAccounts = async () => {
    setIsExporting(true);
    try {
      const res = await exportAccountsAction();
      if (res.success && res.data) {
        downloadCsv(res.data, res.filename || "accounts_export.csv");
        success("Accounts CSV downloaded successfully");
      } else {
        toastError(res.error || "Failed to download accounts CSV");
      }
    } catch {
      toastError("Failed to export accounts");
    } finally {
      setIsExporting(false);
    }
  };

  // Bulk Import result dialog state
  const [importResult, setImportResult] = useState<BulkImportResponse | null>(
    null
  );
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState<
    "bhbp" | "users" | null
  >(null);

  const handleDownloadSample = async (type: "bhbp" | "users") => {
    setDownloadingSample(type);
    try {
      const res = await getSampleImportAction(
        type === "bhbp" ? "ACCOUNT_BHBP" : "ACCOUNTS"
      );
      if (res.success && res.data) {
        downloadCsv(res.data, res.filename || `${type}_sample.csv`);
        success("Sample template downloaded successfully!");
      } else {
        toastError(res.error || "Failed to download sample file");
      }
    } catch {
      toastError("Failed to download sample file");
    } finally {
      setDownloadingSample(null);
    }
  };

  const handleUploadBpFile = async () => {
    if (!bulkBpFile) {
      toastError("Please select a file to upload");
      return;
    }
    setIsBulkUploading(true);
    const formData = new FormData();
    formData.append("file", bulkBpFile);

    try {
      const res = await importAccountBhbpAction(formData);
      if (res.success && res.data) {
        setImportResult(res.data);
        if (res.data.failureCount > 0) {
          setErrorDialogOpen(true);
          toastError(
            res.message || "Bulk import finished with errors. Review below."
          );
        } else {
          success(res.message || "BP numbers updated successfully!");
        }
        setBulkBpFile(null);
        loadAccounts(page, activeSearch);
      } else {
        toastError(res.error || "Failed to upload BP numbers file");
      }
    } catch {
      toastError("An error occurred during upload");
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleUploadUsersFile = async () => {
    if (!bulkUsersFile) {
      toastError("Please select a file to upload");
      return;
    }
    setIsBulkUploading(true);
    const formData = new FormData();
    formData.append("file", bulkUsersFile);

    try {
      const res = await importAccountsAction(formData);
      if (res.success && res.data) {
        setImportResult(res.data);
        if (res.data.failureCount > 0) {
          setErrorDialogOpen(true);
          toastError(
            res.message || "Bulk import finished with errors. Review below."
          );
        } else {
          success(res.message || "Accounts imported successfully!");
        }
        setBulkUsersFile(null);
        loadAccounts(page, activeSearch);
      } else {
        toastError(res.error || "Failed to upload accounts file");
      }
    } catch {
      toastError("An error occurred during upload");
    } finally {
      setIsBulkUploading(false);
    }
  };

  const columns: Array<Column<AccountItem>> = useMemo(() => {
    const cols: Array<Column<AccountItem>> = [
      {
        header: "#",
        cell: (r: AccountItem, index?: number) => (
          <span className="font-mono text-xs text-slate-500">
            {(page - 1) * PAGE_SIZE + (index ?? 0) + 1}
          </span>
        ),
        className: "w-12 text-center",
      },
      {
        header: "User Details",
        cell: (r) => {
          const profilePhoto =
            r.profilePic || r.image || r.profileImage || r.profilePicture;
          return (
            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                onClick={() => {
                  if (profilePhoto) {
                    setPreviewImage({
                      url: profilePhoto,
                      title: r.name || "User Avatar",
                    });
                  }
                }}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition-transform",
                  profilePhoto
                    ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-blue-400"
                    : "cursor-default"
                )}
                title={
                  profilePhoto ? "Click to enlarge photo" : "No photo available"
                }
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={r.name || "User"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </button>
              <div className="space-y-0.5">
                <span className="block text-xs font-semibold text-slate-900">
                  {r.name || "—"}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{r.mobileNumber || r.mobile || "—"}</span>
                </div>
              </div>
            </div>
          );
        },
        className: "min-w-[200px]",
      },
      {
        header: "BP Number",
        cell: (r) => (
          <span className="font-mono text-xs font-medium text-slate-800">
            {r.bhBp || "—"}
          </span>
        ),
        className: "w-32 text-center",
      },
      {
        header: "Location",
        cell: (r) => (
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1 font-medium text-slate-800">
              <Building className="h-3 w-3 text-slate-400" />
              <span>{r.city || "—"}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span>
                {[r.district, r.state].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
          </div>
        ),
        className: "min-w-[160px]",
      },
      {
        header: "Status",
        cell: (r) => {
          const active =
            r.status === "ACTIVE" || r.status === "Active" || r.active === true;
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
        className: "w-24 text-center",
      },
      {
        header: "Details",
        cell: (r) => (
          <Button
            asChild
            variant="outline"
            size="xs"
            className="h-7 border-blue-200 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Link href={`/accounts/${encodeURIComponent(r.bhBp || r.id)}`}>
              Details
            </Link>
          </Button>
        ),
        className: "w-20 text-center",
      },
    ];

    return cols;
  }, [page]);

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Accounts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accounts List" },
        ]}
      />

      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Top Tab Bar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70 px-2 pt-2 text-xs font-medium">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setActiveTab("list");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 transition-colors",
              activeTab === "list"
                ? "border-t-2 border-blue-600 bg-white font-semibold text-blue-600 shadow-xs"
                : "border-t-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <List className="h-4 w-4" />
            Accounts List
          </button>

          {canImport && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setActiveTab("bulk_bp");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 transition-colors",
                activeTab === "bulk_bp"
                  ? "border-t-2 border-blue-600 bg-white font-semibold text-blue-600 shadow-xs"
                  : "border-t-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Bulk Update BP Numbers
            </button>
          )}

          {canImport && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setActiveTab("bulk_users");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 transition-colors",
                activeTab === "bulk_users"
                  ? "border-t-2 border-blue-600 bg-white font-semibold text-blue-600 shadow-xs"
                  : "border-t-2 border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Bulk Update Accounts
            </button>
          )}
        </div>

        {/* TAB 1: ACCOUNTS LIST TABLE */}
        {activeTab === "list" && (
          <div className="space-y-4 p-4">
            <DataTable
              title="Accounts List"
              columns={columns}
              data={pageData.content}
              getRowId={(r) => r.id}
              loading={isPending}
              emptyMessage={
                activeSearch
                  ? `No accounts matching "${activeSearch}"`
                  : "No accounts found"
              }
              action={
                <div className="flex flex-wrap items-center gap-2.5">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="relative flex items-center"
                  >
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 w-44 pr-14 pl-8 text-xs sm:w-56"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={handleSearchClear}
                        className="absolute right-8 text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="hidden"
                    >
                      Search
                    </Button>
                  </form>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      loadAccounts(1, activeSearch, true);
                    }}
                    disabled={isPending}
                    className="h-8 gap-1.5 text-xs text-slate-600"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>

                  {canExport && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleDownloadAccounts();
                      }}
                      disabled={isExporting}
                      className="h-8 gap-1.5 border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Download
                        className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce" : ""}`}
                      />
                      <span>
                        {isExporting ? "Downloading…" : "Download Accounts"}
                      </span>
                    </Button>
                  )}

                  {canCreate && (
                    <Button
                      asChild
                      size="sm"
                      className="h-8 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Link href="/accounts/new">
                        <Plus className="h-4 w-4" />
                        Add Account
                      </Link>
                    </Button>
                  )}
                </div>
              }
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                totalElements: pageData.totalElements,
                totalPages: pageData.totalPages,
                onPageChange: handlePageChange,
              }}
            />
          </div>
        )}

        {/* TAB 2: BULK UPDATE BP NUMBERS */}
        {activeTab === "bulk_bp" && canImport && (
          <div className="space-y-6 p-6">
            <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-700">
                  Upload an Excel or CSV file mapping user Mobile Numbers to
                  their official Berger Paints (BP) numbers.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleDownloadSample("bhbp");
                  }}
                  disabled={downloadingSample === "bhbp"}
                  className="h-8 gap-1.5 border-blue-300 text-xs text-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>
                    {downloadingSample === "bhbp"
                      ? "Downloading…"
                      : "Download Sample BP File"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="bp-file-upload"
                  className="text-xs font-semibold text-slate-700"
                >
                  Select File (.xlsx, .xls, .csv)
                </Label>
                <Input
                  id="bp-file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    setBulkBpFile(e.target.files?.[0] || null);
                  }}
                  className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-xs file:font-medium file:text-blue-600"
                />
              </div>

              <Button
                type="button"
                onClick={() => {
                  void handleUploadBpFile();
                }}
                disabled={!bulkBpFile || isBulkUploading}
                className="h-9 gap-2 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isBulkUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload & Update BP Numbers
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: BULK UPDATE ACCOUNTS */}
        {activeTab === "bulk_users" && canImport && (
          <div className="space-y-6 p-6">
            <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-700">
                  Upload an Excel or CSV spreadsheet containing full account
                  profiles (Mobile Number, Name, BP Number, City, State, etc.).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleDownloadSample("users");
                  }}
                  disabled={downloadingSample === "users"}
                  className="h-8 gap-1.5 border-blue-300 text-xs text-blue-600 hover:bg-blue-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>
                    {downloadingSample === "users"
                      ? "Downloading…"
                      : "Download Sample Accounts File"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="users-file-upload"
                  className="text-xs font-semibold text-slate-700"
                >
                  Select File (.xlsx, .xls, .csv)
                </Label>
                <Input
                  id="users-file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    setBulkUsersFile(e.target.files?.[0] || null);
                  }}
                  className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-xs file:font-medium file:text-blue-600"
                />
              </div>

              <Button
                type="button"
                onClick={() => {
                  void handleUploadUsersFile();
                }}
                disabled={!bulkUsersFile || isBulkUploading}
                className="h-9 gap-2 bg-blue-600 text-xs font-semibold text-white uppercase hover:bg-blue-700"
              >
                {isBulkUploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload & Update Accounts
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Image Preview Modal */}
      {previewImage && (
        <dialog
          ref={previewDialogRef}
          aria-label={previewImage.title}
          onClose={() => {
            setPreviewImage(null);
          }}
          className="animate-in fade-in fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 transition-opacity backdrop:bg-transparent open:flex"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close image preview"
            onClick={() => {
              previewDialogRef.current?.close();
            }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg space-y-3 overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                {previewImage.title}
              </h3>
              <button
                type="button"
                aria-label="Close image preview"
                onClick={() => {
                  previewDialogRef.current?.close();
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-100">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </dialog>
      )}

      {/* Bulk Import Result & Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="flex max-h-[85vh] max-w-2xl flex-col p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-slate-900">
              Bulk Import Validation Issues
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              The import operation completed with errors. Below are the summary
              statistics and rows that failed validation:
            </AlertDialogDescription>
          </AlertDialogHeader>

          {importResult && (
            <div className="my-2 flex-1 space-y-4 overflow-y-auto pr-1">
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-500">
                    Total Rows
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {importResult.totalRows ?? 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">
                    Processed / Succeeded
                  </span>
                  <span className="text-sm font-bold text-emerald-600">
                    {importResult.successCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">
                    Failed Rows
                  </span>
                  <span className="text-sm font-bold text-rose-600">
                    {importResult.failureCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Failed items table */}
              {importResult.errors && importResult.errors.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    Row-Level Error Details
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b bg-slate-50 text-[11px] text-slate-600">
                        <tr>
                          <th className="w-16 px-3 py-2">Row #</th>
                          <th className="w-32 px-3 py-2">
                            Identifier / Mobile
                          </th>
                          <th className="px-3 py-2">Failure Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.errors.map(
                          (err: BulkImportError, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono text-slate-500">
                                {err.rowNumber ?? idx + 1}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-800">
                                {err.identifier || err.field || "—"}
                              </td>
                              <td className="px-3 py-2 font-medium text-rose-600">
                                {err.errorMessage || "Validation error"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">
                  No specific row-level error breakdown was returned.
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter className="mt-4">
            <AlertDialogAction
              onClick={() => {
                setErrorDialogOpen(false);
              }}
              className="h-8 bg-blue-600 px-4 text-xs text-white hover:bg-blue-700"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
