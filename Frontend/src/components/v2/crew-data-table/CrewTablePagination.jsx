import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocaleNumber } from '@/utils/formatters';
import { usePagination } from '@/hooks/use-pagination';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS } from './crewTableHelpers';

export default function CrewTablePagination({ table, totalFiltered }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const rangeStart = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage: pageIndex + 1,
    totalPages: pageCount,
    paginationItemsToDisplay: 5,
  });

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-muted-foreground">Sayfa başına</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => value && table.setPageSize(Number(value))}
        >
          <SelectTrigger
            aria-label="Sayfa başına satır sayısı"
            className="h-8 w-20 text-xs tabular-nums"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="min-w-20">
            <SelectGroup>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} className="tabular-nums">
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <p
          className="whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {totalFiltered === 0
            ? '0 kayıt'
            : `${formatLocaleNumber(rangeStart, 0)}–${formatLocaleNumber(rangeEnd, 0)} / ${formatLocaleNumber(totalFiltered, 0)} kayıt`}
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>

          {showLeftEllipsis && (
            <span className="px-1 text-xs text-muted-foreground">...</span>
          )}

          {pages.map((page) => {
            const isActive = page === pageIndex + 1;
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

          {showRightEllipsis && (
            <span className="px-1 text-xs text-muted-foreground">...</span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
