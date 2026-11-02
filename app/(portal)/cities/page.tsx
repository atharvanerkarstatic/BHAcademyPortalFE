"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Pencil, Trash2, Search, MapPin } from "lucide-react";

import { DataTable, type Column } from "@/components/common/data-table";
import { PageHeader } from "@/components/common/page-header";
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
import { getCitiesAction, deleteCityAction } from "@/features/cities/action";
import type { CityItem } from "@/features/cities/types";

export default function CitiesPage() {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [cities, setCities] = useState<CityItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isPending, startTransition] = useTransition();

  // Delete modal state
  const [cityToDelete, setCityToDelete] = useState<CityItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permission flags
  const canCreate = can("pincode.create") || can("system.all");
  const canUpdate = can("pincode.update") || can("system.all");
  const canDelete = can("pincode.delete") || can("system.all");

  const loadCities = (showSuccessToast = false) => {
    startTransition(async () => {
      const res = await getCitiesAction();
      if (res.success && res.data) {
        setCities(res.data);
        if (showSuccessToast) {
          success(res.message || "Cities refreshed successfully");
        }
      } else {
        toastError(res.error || "Failed to load cities");
      }
    });
  };

  useEffect(() => {
    loadCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmDelete = async () => {
    if (!cityToDelete) return;
    setIsDeleting(true);

    const res = await deleteCityAction(cityToDelete.id);
    setIsDeleting(false);
    setCityToDelete(null);

    if (res.success) {
      success(res.message || "PinCode record deleted successfully");
      loadCities();
    } else {
      toastError(res.error || "Failed to delete city");
    }
  };

  // Live real-time search filtering as user types (same as FAQ)
  const filteredData = useMemo(() => {
    if (!search.trim()) return cities;
    const query = search.toLowerCase();
    return cities.filter(
      (item) =>
        (item.city && item.city.toLowerCase().includes(query)) ||
        (item.state && item.state.toLowerCase().includes(query)) ||
        (item.pinCode && item.pinCode.toLowerCase().includes(query)) ||
        (item.division && item.division.toLowerCase().includes(query)) ||
        (item.region && item.region.toLowerCase().includes(query)) ||
        String(item.id).includes(query)
    );
  }, [cities, search]);

  // Client-side pagination over filtered results
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, page, pageSize]);

  const columns: Column<CityItem>[] = useMemo(() => {
    const cols: Column<CityItem>[] = [
      { header: "ID", cell: (r) => r.id, className: "w-16 font-mono text-xs" },
      {
        header: "Pincode",
        cell: (r) => <span className="font-mono font-semibold text-blue-700">{r.pinCode}</span>,
        className: "w-28",
      },
      {
        header: "City",
        cell: (r) => (
          <div>
            <p className="font-semibold text-slate-900">{r.city}</p>
            {r.cityHi && <span className="text-xs text-slate-400">{r.cityHi}</span>}
          </div>
        ),
      },
      {
        header: "State",
        cell: (r) => (
          <div>
            <p className="font-medium text-slate-800">{r.state}</p>
            {r.stateHi && <span className="text-xs text-slate-400">{r.stateHi}</span>}
          </div>
        ),
      },
      {
        header: "Division",
        cell: (r) => r.division || "—",
        className: "w-32 text-slate-600",
      },
      {
        header: "Region",
        cell: (r) => r.region || "—",
        className: "w-32 text-slate-600",
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        cell: (r) => (
          <div className="flex items-center gap-1">
            {canUpdate && (
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Link href={`/cities/${r.id}/edit`} title="Edit City">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setCityToDelete(r)}
                title="Delete City"
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
        title="Manage Cities"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Cities" }]}
      />

      <DataTable
        title="Cities List"
        logoSrc="/logo.png"
        columns={columns}
        data={paginatedData}
        getRowId={(r) => r.id}
        loading={isPending}
        headerRight={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Search input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search city, state, pin..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs bg-slate-50 border-slate-300"
              />
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => loadCities(true)}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {/* Add City button on top */}
            {canCreate && (
              <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/cities/new">
                  <Plus className="h-4 w-4" />
                  Add City
                </Link>
              </Button>
            )}
          </div>
        }
        pagination={{
          page,
          pageSize,
          totalElements: filteredData.length,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(cityToDelete)} onOpenChange={(open) => !open && setCityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete City / PinCode?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this city record?
              <br />
              <strong className="text-slate-800 line-clamp-2 mt-2">
                {cityToDelete?.city} ({cityToDelete?.pinCode}) - {cityToDelete?.state}
              </strong>
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

