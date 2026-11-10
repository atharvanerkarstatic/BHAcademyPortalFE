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
  cell: (row: T, index?: number) => ReactNode;
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
  getRowId?: (row: T, index?: number) => string | number;
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
  emptyMessage = "No items found",
  action,
  headerRight,
  pagination,
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="Logo" className="h-6 w-auto" />
          )}
          {Icon && <Icon className="h-5 w-5 text-blue-600" />}
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {search !== undefined && onSearchChange && (
            <Input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full sm:w-64"
            />
          )}
          {headerRight}
          {action}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
              {columns.map((col) => (
                <TableHead key={col.header} className={cn("text-xs font-semibold text-slate-700", col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-slate-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={getRowId ? getRowId(row, index) : ((row as any)?._rowId ?? (row as any)?.id ?? (row as any)?.key ?? index)}>
                  {columns.map((col) => (
                    <TableCell key={col.header} className={col.className}>
                      {col.cell(row, index)}
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
              of <span className="font-medium text-slate-700">{pagination.totalElements}</span> results
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.page <= 1}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="First Page"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 text-xs text-slate-600">
                Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{" "}
                <span className="font-semibold text-slate-900">{pagination.totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
