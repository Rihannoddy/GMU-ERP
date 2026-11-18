import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: (row: T) => string | number;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  searchPlaceholder = 'Search records...',
  searchFilter,
  pageSize = 8,
  loading = false,
  emptyTitle = 'No matching records',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  emptyAction,
  toolbarExtra,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchFilter) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => searchFilter(row, q));
  }, [data, query, searchFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
      {(searchFilter || toolbarExtra) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[#E5E9EF]">
          {searchFilter ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#738091] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38] placeholder:text-[#738091] focus:outline-none focus:border-[#D99A32] focus:bg-white transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#738091] hover:text-[#202B38] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div />
          )}
          {toolbarExtra && <div className="flex flex-wrap items-center gap-2">{toolbarExtra}</div>}
        </div>
      )}

      {loading ? (
        <div className="p-4 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#F5F6F8] rounded animate-pulse" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <div className="py-12 px-6 text-center">
          <p className="text-sm font-medium text-[#202B38]">{emptyTitle}</p>
          <p className="text-xs text-[#738091] mt-1">{emptyDescription}</p>
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-xs font-semibold text-[#738091] whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.sortable && col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-[#202B38] transition-colors"
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9EF]">
              {paged.map((row) => (
                <tr key={keyField(row)} className="hover:bg-[#F5F6F8]/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-[#202B38] ${
                        col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && sorted.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E5E9EF] text-xs text-[#738091]">
          <span className="tabular-nums">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-[#E5E9EF] hover:bg-[#F5F6F8] disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 tabular-nums text-[#202B38] font-medium">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-[#E5E9EF] hover:bg-[#F5F6F8] disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
