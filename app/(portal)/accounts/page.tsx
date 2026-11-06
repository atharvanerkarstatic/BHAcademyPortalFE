"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Search,
  Phone,
  MapPin,
  Building,
  ShieldCheck,
  List,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
  ArrowUpDown,
  User,
  X,
  ExternalLink,
} from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
import { StatusText } from "@/components/common/status-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import {
  getAccountsAction,
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
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Active top tab: "list" (matches screenshot 1) | "bulk_bp" | "bulk_users"
  const [activeTab, setActiveTab] = useState<"list" | "bulk_bp" | "bulk_users">("list");

  // State for image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Bulk update file uploads
  const [bulkBpFile, setBulkBpFile] = useState<File | null>(null);
  const [bulkUsersFile, setBulkUsersFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [pageData, setPageData] = useState<AccountPageResponse>({
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

  const canCreate = can("users.create") || can("accounts.create");
  const canExport = can("users.read") || can("accounts.export");
  const canImport = can("accounts.import") || can("system.all");

  const loadAccounts = (
    targetPage = page,
    searchTerm = activeSearch,
    showSuccessToast = false
  ) => {
    startTransition(async () => {
      const res = await getAccountsAction({
        page: targetPage,
        size: pageSize,
        search: searchTerm,
      });

      if (res.success && res.data) {
        setPageData(res.data);
        if (showSuccessToast) {
          success("Accounts refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load accounts");
      }
    });
  };

  // Reset search filter whenever navigating away or returning to this route
  useEffect(() => {
    return () => {
      setSearchInput("");
      setActiveSearch("");
      setPage(1);
    };
  }, [pathname]);

  // Debounced search: as soon as typing stops, update activeSearch and query API
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== activeSearch) {
        setActiveSearch(searchInput);
        setPage(1);
        loadAccounts(1, searchInput);
      }
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    loadAccounts(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadAccounts(newPage, activeSearch);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(1);
    loadAccounts(1, searchInput);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
    loadAccounts(1, "");
  };

  const handleDownloadAccounts = async () => {
    setIsExporting(true);
    try {
      const res = await exportAccountsAction();
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || "accounts_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
  const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState<"bhbp" | "users" | null>(null);

  const handleDownloadSample = async (type: "bhbp" | "users") => {
    setDownloadingSample(type);
    try {
      const res = await getSampleImportAction(type === "bhbp" ? "ACCOUNT_BHBP" : "ACCOUNTS");
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || `${type}_sample.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
          toastError(res.message || "Bulk import finished with errors. Review below.");
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
          toastError(res.message || "Bulk import finished with errors. Review below.");
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

  const columns: Column<AccountItem>[] = useMemo(() => {
    const cols: Column<AccountItem>[] = [
      {
        header: "#",
        cell: (r: AccountItem, index?: number) => (
          <span className="font-mono text-xs text-slate-500">
            {(page - 1) * pageSize + (index ?? 0) + 1}
          </span>
        ),
        className: "w-12 text-center",
      },
      {
        header: "User Details",
        cell: (r) => {
          const profilePhoto = r.profilePic || r.image || r.profileImage || r.profilePicture;
          return (
            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                onClick={() => {
                  if (profilePhoto) {
                    setPreviewImage({ url: profilePhoto, title: r.name || "User Avatar" });
                  }
                }}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden transition-transform",
                  profilePhoto ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-blue-400" : "cursor-default"
                )}
                title={profilePhoto ? "Click to enlarge photo" : "No photo available"}
              >
                {profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePhoto}
                    alt={r.name || "User"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </button>
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 block text-xs">
                  {r.name || "—"}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
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
            <div className="font-medium text-slate-800 flex items-center gap-1">
              <Building className="h-3 w-3 text-slate-400" />
              <span>{r.city || "—"}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span>{[r.district, r.state].filter(Boolean).join(", ") || "—"}</span>
            </div>
          </div>
        ),
        className: "min-w-[160px]",
      },
      {
        header: "Status",
        cell: (r) => {
          const active = r.status === "ACTIVE" || r.status === "Active" || r.active === true;
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
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
          <Button asChild variant="outline" size="xs" className="h-7 text-xs font-medium text-blue-600 border-blue-200 hover:bg-blue-50">
            <Link href={`/accounts/${encodeURIComponent(r.bhBp || r.id)}`}>
              Details
            </Link>
          </Button>
        ),
        className: "w-20 text-center",
      },
    ];

    return cols;
  }, [page, pageSize]);

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Accounts"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounts List" }]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Top Tab Bar */}
        <div className="flex flex-wrap items-center border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-xs font-medium">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setActiveTab("list")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg transition-colors",
              activeTab === "list"
                ? "font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
                : "border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <List className="h-4 w-4" />
            Accounts List
          </button>

          {canImport && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveTab("bulk_bp")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg transition-colors",
                activeTab === "bulk_bp"
                  ? "font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
                  : "border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
              onClick={() => setActiveTab("bulk_users")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg transition-colors",
                activeTab === "bulk_users"
                  ? "font-semibold border-t-2 border-blue-600 bg-white text-blue-600 shadow-xs"
                  : "border-t-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Bulk Update Accounts
            </button>
          )}
        </div>

        {/* TAB 1: ACCOUNTS LIST TABLE */}
        {activeTab === "list" && (
          <div className="p-4 space-y-4">
            <DataTable
              title="Accounts List"
              columns={columns}
              data={pageData.content}
              getRowId={(r) => r.id}
              loading={isPending}
              emptyMessage={activeSearch ? `No accounts matching "${activeSearch}"` : "No accounts found"}
              action={
                <div className="flex flex-wrap items-center gap-2.5">
                  <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="h-8 w-44 pl-8 pr-14 text-xs sm:w-56"
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
                    <Button type="submit" variant="ghost" size="sm" className="hidden">
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
                    className="gap-1.5 text-slate-600 h-8 text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>

                  {canExport && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAccounts}
                      disabled={isExporting}
                      className="gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 h-8 text-xs"
                    >
                      <Download className={`h-3.5 w-3.5 ${isExporting ? "animate-bounce" : ""}`} />
                      <span>{isExporting ? "Downloading…" : "Download Accounts"}</span>
                    </Button>
                  )}

                  {canCreate && (
                    <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-semibold">
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
                pageSize,
                totalElements: pageData.totalElements,
                totalPages: pageData.totalPages,
                onPageChange: handlePageChange,
              }}
            />
          </div>
        )}

        {/* TAB 2: BULK UPDATE BP NUMBERS */}
        {activeTab === "bulk_bp" && canImport && (
          <div className="p-6 space-y-6">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-slate-700">
                  Upload an Excel or CSV file mapping user Mobile Numbers to their official Berger Paints (BP) numbers.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSample("bhbp")}
                  disabled={downloadingSample === "bhbp"}
                  className="gap-1.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{downloadingSample === "bhbp" ? "Downloading…" : "Download Sample BP File"}</span>
                </Button>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bp-file-upload" className="text-xs font-semibold text-slate-700">
                  Select File (.xlsx, .xls, .csv)
                </Label>
                <Input
                  id="bp-file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setBulkBpFile(e.target.files?.[0] || null)}
                  className="text-xs file:text-xs file:font-medium file:text-blue-600 file:bg-blue-50 file:border-0 file:rounded-md file:mr-3"
                />
              </div>

              <Button
                type="button"
                onClick={handleUploadBpFile}
                disabled={!bulkBpFile || isBulkUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold uppercase h-9"
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
          <div className="p-6 space-y-6">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-slate-700">
                  Upload an Excel or CSV spreadsheet containing full account profiles (Mobile Number, Name, BP Number, City, State, etc.).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSample("users")}
                  disabled={downloadingSample === "users"}
                  className="gap-1.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{downloadingSample === "users" ? "Downloading…" : "Download Sample Accounts File"}</span>
                </Button>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="users-file-upload" className="text-xs font-semibold text-slate-700">
                  Select File (.xlsx, .xls, .csv)
                </Label>
                <Input
                  id="users-file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setBulkUsersFile(e.target.files?.[0] || null)}
                  className="text-xs file:text-xs file:font-medium file:text-blue-600 file:bg-blue-50 file:border-0 file:rounded-md file:mr-3"
                />
              </div>

              <Button
                type="button"
                onClick={handleUploadUsersFile}
                disabled={!bulkUsersFile || isBulkUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold uppercase h-9"
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
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs transition-opacity animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-semibold text-sm text-slate-800">{previewImage.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Result & Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-slate-900">
              Bulk Import Validation Issues
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              The import operation completed with errors. Below are the summary statistics and rows that failed validation:
            </AlertDialogDescription>
          </AlertDialogHeader>

          {importResult && (
            <div className="space-y-4 my-2 overflow-y-auto flex-1 pr-1">
              {/* Summary Stats Badges */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Rows</span>
                  <span className="font-bold text-slate-800 text-sm">{importResult.totalRows ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Processed / Succeeded</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {importResult.successCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Failed Rows</span>
                  <span className="font-bold text-rose-600 text-sm">{importResult.failureCount ?? 0}</span>
                </div>
              </div>

              {/* Failed items table */}
              {importResult.errors && importResult.errors.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    Row-Level Error Details
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[11px] text-slate-600 border-b">
                        <tr>
                          <th className="px-3 py-2 w-16">Row #</th>
                          <th className="px-3 py-2 w-32">Identifier / Mobile</th>
                          <th className="px-3 py-2">Failure Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.errors.map((err: BulkImportError, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono text-slate-500">{err.rowNumber ?? idx + 1}</td>
                            <td className="px-3 py-2 font-mono text-slate-800">{err.identifier || err.field || "—"}</td>
                            <td className="px-3 py-2 text-rose-600 font-medium">{err.errorMessage || "Validation error"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No specific row-level error breakdown was returned.</p>
              )}
            </div>
          )}

          <AlertDialogFooter className="mt-4">
            <AlertDialogAction
              onClick={() => setErrorDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
