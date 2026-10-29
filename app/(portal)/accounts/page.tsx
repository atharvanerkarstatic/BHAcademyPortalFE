"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
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

  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Active top tab: "list" (matches screenshot 1) | "bulk_bp" | "bulk_users"
  const [activeTab, setActiveTab] = useState<"list" | "bulk_bp" | "bulk_users">("list");

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

  useEffect(() => {
    const handleReset = () => {
      setActiveTab("list");
      setBulkBpFile(null);
      setBulkUsersFile(null);
    };

    window.addEventListener("popstate", handleReset);
    window.addEventListener("pageshow", handleReset);
    return () => {
      window.removeEventListener("popstate", handleReset);
      window.removeEventListener("pageshow", handleReset);
      handleReset();
    };
  }, []);

  useEffect(() => {
    loadAccounts(page, activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeSearch]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setPage(1);
    setActiveSearch("");
  };

  const handleDownloadAccounts = async () => {
    setIsExporting(true);
    try {
      const res = await exportAccountsAction();
      if (res.success && res.data) {
        let csvText = "";
        if (typeof res.data === "string") {
          csvText = res.data;
        } else {
          // Format as CSV
          const headers = "ID,Name,Mobile,BP Number,State,City,District,Status\n";
          const rows = pageData.content
            .map(
              (a) =>
                `"${a.id}","${a.name}","${a.mobile || ""}","${a.bhBp || ""}","${a.state || ""}","${a.city || ""}","${a.district || ""}","${a.status || "Active"}"`
            )
            .join("\n");
          csvText = headers + rows;
        }

        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `accounts_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        success("Accounts downloaded successfully!");
      } else {
        // Fallback export with current data
        const headers = "ID,Name,Mobile,BP Number,State,City,District,Status\n";
        const rows = pageData.content
          .map(
            (a) =>
              `"${a.id}","${a.name}","${a.mobile || ""}","${a.bhBp || ""}","${a.state || ""}","${a.city || ""}","${a.district || ""}","${a.status || "Active"}"`
          )
          .join("\n");
        const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `accounts_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        success("Accounts exported successfully!");
      }
    } catch {
      toastError("Failed to download accounts");
    } finally {
      setIsExporting(false);
    }
  };

  // State for Import Error Dialog
  const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState<string | null>(null);

  // Download sample file from API
  const handleDownloadSample = async (type: "ACCOUNTS" | "ACCOUNT_BHBP") => {
    setDownloadingSample(type);
    try {
      const res = await getSampleImportAction(type);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename || `${type.toLowerCase()}_sample.csv`;
        a.click();
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

  // Bulk Upload Accounts Handler
  const handleBulkAccountsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUsersFile) {
      toastError("Please choose a file to upload");
      return;
    }

    setIsBulkUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", bulkUsersFile);

      const res = await importAccountsAction(formData);
      if (res.success) {
        const data = res.data;
        const hasErrors = data && data.errors && data.errors.length > 0;

        if (hasErrors) {
          setImportResult(data);
          setErrorDialogOpen(true);
          toastError(
            `Import processed with ${data.errors?.length ?? 0} error(s). Please review the errors.`
          );
        } else {
          success(
            res.message ||
              `Import successful! Processed ${data?.totalRows ?? 0} rows.`
          );
          setBulkUsersFile(null);
          setActiveTab("list");
          loadAccounts(1, "", false);
        }
      } else {
        toastError(res.error || "Bulk upload failed. Please try again.");
      }
    } catch {
      toastError("An unexpected error occurred during bulk upload.");
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Bulk Upload BP Numbers Handler
  const handleBulkBhbpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkBpFile) {
      toastError("Please choose a file to upload");
      return;
    }

    setIsBulkUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", bulkBpFile);

      const res = await importAccountBhbpAction(formData);
      if (res.success) {
        const data = res.data;
        const hasErrors = data && data.errors && data.errors.length > 0;

        if (hasErrors) {
          setImportResult(data);
          setErrorDialogOpen(true);
          toastError(
            `Import processed with ${data.errors?.length ?? 0} error(s). Please review the errors.`
          );
        } else {
          success(
            res.message ||
              `BP numbers imported successfully! Processed ${data?.totalRows ?? 0} rows.`
          );
          setBulkBpFile(null);
          setActiveTab("list");
          loadAccounts(1, "", false);
        }
      } else {
        toastError(res.error || "Bulk update failed. Please try again.");
      }
    } catch {
      toastError("An unexpected error occurred during BP number update.");
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Data table columns matching Course List pattern and uniformity
  const columns: Column<AccountItem>[] = useMemo(() => {
    const cols: Column<AccountItem>[] = [
      {
        header: "ID",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-700">#{r.id}</span>
        ),
        className: "w-16 text-center",
      },
      {
        header: "Image",
        cell: (r) => {
          const imgUrl = r.profileImage || r.image || r.profilePicture;
          const validImg = imgUrl && imgUrl.startsWith("http");
          return (
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {validImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt={r.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-slate-400" />
              )}
            </div>
          );
        },
        className: "w-16",
      },
      {
        header: "Name",
        cell: (r) => (
          <div className="max-w-xs space-y-0.5">
            <p className="font-medium text-slate-900 leading-snug">{r.name}</p>
            {r.emailId && (
              <p className="text-[11px] text-slate-500 font-normal truncate max-w-[180px]">
                {r.emailId}
              </p>
            )}
          </div>
        ),
        className: "min-w-40",
      },
      {
        header: "Mobile",
        cell: (r) => (
          <span className="font-mono text-xs text-slate-700">{r.mobile || r.mobileNumber || "—"}</span>
        ),
        className: "w-36",
      },
      {
        header: "BP Number",
        cell: (r) => (
          <span className="font-mono text-xs font-semibold text-slate-700">{r.bhBp || "—"}</span>
        ),
        className: "w-32",
      },
      {
        header: "State",
        cell: (r) => (
          <span className="text-xs text-slate-700">{r.state || "—"}</span>
        ),
        className: "w-36",
      },
      {
        header: "City",
        cell: (r) => (
          <span className="text-xs text-slate-700">{r.city || "—"}</span>
        ),
        className: "w-32",
      },
      {
        header: "District",
        cell: (r) => (
          <span className="text-xs text-slate-700">{r.district?.trim() ? r.district : "—"}</span>
        ),
        className: "w-32",
      },
      {
        header: "Status",
        cell: (r) => {
          const isActive = r.status?.toLowerCase() === "active" || r.active === true;
          return (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}
            >
              {isActive ? "Active" : "Inactive"}
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
  }, []);

  return (
    <div className="w-full space-y-4 pb-12">
      <PageHeader
        title="Manage Accounts"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounts List" }]}
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Top Tab Bar:
            - Accounts List (Active tab)
            - Bulk Update BP Numbers
            - Bulk Update Accounts
        */}
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
                  {/* Search Input beside Refresh - exact same behavior & style as Courses page */}
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

                  {/* Refresh button */}
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

                  {/* Download Accounts button */}
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

                  {/* Add Account button */}
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
        {activeTab === "bulk_bp" && (
          <div className="p-6 space-y-6">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-slate-700">
                  Upload a CSV file containing updated BP numbers for existing accounts.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingSample === "ACCOUNT_BHBP"}
                  onClick={() => handleDownloadSample("ACCOUNT_BHBP")}
                  className="h-7 text-xs font-medium gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-3 w-3" />
                  {downloadingSample === "ACCOUNT_BHBP" ? "Downloading…" : "Download Sample File"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-800">Required Columns:</span>{" "}
                <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800 font-mono">mobile,bhBp</code>
              </p>
            </div>

            <form onSubmit={handleBulkBhbpSubmit} className="space-y-5 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                  Choose File <span className="text-rose-500">*</span>
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => setBulkBpFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {bulkBpFile && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      Selected: {bulkBpFile.name} ({(bulkBpFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:pl-32 pt-2">
                <Button
                  type="submit"
                  disabled={isBulkUploading || !bulkBpFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-28 h-8 text-xs font-semibold gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isBulkUploading ? "Uploading…" : "Upload & Process"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBulkBpFile(null);
                    setActiveTab("list");
                  }}
                  className="h-8 text-xs font-medium uppercase border-slate-300"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: BULK UPLOAD ACCOUNTS */}
        {activeTab === "bulk_users" && (
          <div className="p-6 space-y-6">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-slate-700">
                  Upload a CSV file containing multiple user accounts to create or import.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingSample === "ACCOUNTS"}
                  onClick={() => handleDownloadSample("ACCOUNTS")}
                  className="h-7 text-xs font-medium gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                >
                  <Download className="h-3 w-3" />
                  {downloadingSample === "ACCOUNTS" ? "Downloading…" : "Download Sample File"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-800">Supported Headers:</span>{" "}
                <span className="font-mono text-slate-600">
                  bhBp, name, mobile, languageId, languageName, professionId, professionName, msBp, msProfile, msRole, msStatus, lmsBp, pincode, city, state, dob, yoe, gender, kycStatus, aadharNumber, region, division, blocked, geolocation, profileImage, userType, points, interestIds, msiBp
                </span>
              </p>
            </div>

            <form onSubmit={handleBulkAccountsSubmit} className="space-y-5 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <Label className="text-xs font-semibold text-slate-700 sm:text-right">
                  Choose File <span className="text-rose-500">*</span>
                </Label>
                <div className="sm:col-span-3">
                  <Input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => setBulkUsersFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs file:bg-slate-100 file:border-0 file:rounded file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {bulkUsersFile && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      Selected: {bulkUsersFile.name} ({(bulkUsersFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:pl-32 pt-2">
                <Button
                  type="submit"
                  disabled={isBulkUploading || !bulkUsersFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-28 h-8 text-xs font-semibold gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isBulkUploading ? "Uploading…" : "Upload & Process"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBulkUsersFile(null);
                    setActiveTab("list");
                  }}
                  className="h-8 text-xs font-medium uppercase border-slate-300"
                >
                  CANCEL
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      {/* Bulk Import Error Dialog Modal */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent
          size="xl"
          className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[88vh] flex flex-col p-6 overflow-hidden bg-white shadow-2xl border border-slate-200"
        >
          <AlertDialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-slate-900">
                  Bulk Upload Validation Errors
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500">
                  Some rows in your file could not be processed due to validation or duplication issues.
                </AlertDialogDescription>
              </div>
            </div>

            {/* Counts Summary Cards */}
            {importResult && (
              <div className="grid grid-cols-3 gap-3 pt-3 w-full">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-slate-500 uppercase">Total Rows</div>
                  <div className="text-lg font-bold text-slate-800">{importResult.totalRows ?? 0}</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-emerald-700 uppercase">Success</div>
                  <div className="text-lg font-bold text-emerald-700">{importResult.successCount ?? 0}</div>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 text-center">
                  <div className="text-[11px] font-medium text-rose-700 uppercase">Failures</div>
                  <div className="text-lg font-bold text-rose-700">{importResult.failureCount ?? importResult.errors?.length ?? 0}</div>
                </div>
              </div>
            )}
          </AlertDialogHeader>

          {/* Errors Table */}
          <div className="flex-1 overflow-y-auto my-3 border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-16">Row #</th>
                  <th className="py-2 px-3 w-28">Identifier</th>
                  <th className="py-2 px-3 w-28">Field</th>
                  <th className="py-2 px-3 w-32">Rejected Value</th>
                  <th className="py-2 px-3">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResult?.errors && importResult.errors.length > 0 ? (
                  importResult.errors.map((err, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">
                        {err.rowNumber || "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 truncate max-w-[120px]">
                        {err.identifier || "—"}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {err.field || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-rose-700 truncate max-w-[140px]">
                        {err.rejectedValue ? `"${err.rejectedValue}"` : "—"}
                      </td>
                      <td className="py-2 px-3 text-rose-600 font-medium">
                        {err.errorMessage}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No errors to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AlertDialogFooter className="border-t pt-3 flex sm:justify-between items-center w-full">
            <p className="text-xs text-slate-500">
              Fix the errors in your CSV file and upload again.
            </p>
            <AlertDialogAction
              onClick={() => setErrorDialogOpen(false)}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 h-8"
            >
              Close & Fix File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
