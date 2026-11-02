"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type PaginationProps = {
  page: number;
  pageSize?: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
};

type DataTableProps<T> = {
  title?: string;
  icon?: LucideIcon;
  logoSrc?: string;
  columns: Column<T>[];
  data: T[];
  getRowId?: (row: T) => string | number;
  loading?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
  action?: ReactNode;
  headerRight?: ReactNode;
  pagination?: PaginationProps;
};

export function DataTable<T>({
  title,
  icon: Icon,
  logoSrc,
  columns,
  data,
  getRowId,
  loading = false,
  search,
  onSearchChange,
  emptyMessage = "No records found",
  action,
  headerRight,
  pagination,
}: DataTableProps<T>) {
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Tab-style title strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-2 pt-2">
        <div className="inline-flex items-center gap-2 border-t-2 border-blue-500 px-4 py-2.5 text-sm font-medium text-slate-700">
          {logoSrc ? (
            <img src={logoSrc} alt={title} className="h-6 w-auto object-contain" />
          ) : Icon ? (
            <Icon className="h-4 w-4" />
          ) : null}
          {title}
        </div>
        {(action || headerRight) && <div className="px-3 pb-2">{action || headerRight}</div>}
      </div>

      <div className="p-4 sm:p-6">
        {onSearchChange && (
          <div className="mb-4 flex items-center justify-end gap-2">
            <label htmlFor="table-search" className="text-sm font-semibold text-slate-700">
              Search:
            </label>
            <Input
              id="table-search"
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full sm:w-56"
            />
          </div>
        )}

        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="border-b-2 border-blue-500 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.header} className={cn("font-bold text-slate-900", col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-slate-500">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-slate-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={getRowId ? getRowId(row) : ((row as any)?.id ?? (row as any)?.key ?? Math.random())}>
                  {columns.map((col) => (
                    <TableCell key={col.header} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination && pagination.totalPages > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {pagination.totalElements === 0 ? 0 : Math.min((pagination.page - 1) * (pagination.pageSize || 10) + 1, pagination.totalElements)}
              </span>{" "}
              to{" "}
              <span className="font-medium text-slate-700">
                {Math.min(pagination.page * (pagination.pageSize || 10), pagination.totalElements)}
              </span>{" "}
              of <span className="font-medium text-slate-700">{pagination.totalElements}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <div className="px-2 text-xs font-medium text-slate-700">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </div>

              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}