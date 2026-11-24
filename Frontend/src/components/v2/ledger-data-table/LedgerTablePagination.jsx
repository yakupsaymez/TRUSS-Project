import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocaleNumber } from '@/utils/formatters';
import { usePagination } from '@/hooks/use-pagination';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from './ledgerTableHelpers';

export default function LedgerTablePagination({ table, totalFiltered }) {
  const pageCount = Math.max(1, table.getPageCount());
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageSize = table.getState().pagination.pageSize;
  const rangeStart = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalFiltered);

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages: pageCount,
    paginationItemsToDisplay: 5,
  });

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Sayfa başına</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger
            aria-label="Sayfa başına satır sayısı"
            className="h-8 w-20 rounded-lg border-border bg-background text-xs tabular-nums"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)} className="text-xs tabular-nums">
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <p className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
          {formatLocaleNumber(rangeStart, 0)}–{formatLocaleNumber(rangeEnd, 0)} /{' '}
          {formatLocaleNumber(totalFiltered, 0)} kayıt
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {showLeftEllipsis && <span className="px-1 text-xs text-muted-foreground">…</span>}

          {pages.map((page) => {
            const isActive = page === currentPage;
            return (
              <Button
                key={page}
                type="button"
                size="icon-sm"
                variant={isActive ? 'secondary' : 'ghost'}
                onClick={() => table.setPageIndex(page - 1)}
                aria-current={isActive ? 'page' : undefined}
                className="tabular-nums"
              >
                {page}
              </Button>
            );
          })}

          {showRightEllipsis && <span className="px-1 text-xs text-muted-foreground">…</span>}

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
