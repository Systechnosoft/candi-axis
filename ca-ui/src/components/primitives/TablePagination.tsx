import React from 'react';
import { ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';

interface TablePaginationProps {
  totalItems: number;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
}

export function TablePagination({ totalItems, page, setPage, limit, setLimit }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return (
    <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-border bg-surface rounded-b-lg text-sm text-text-secondary">
      
      {/* ROWS dropdown */}
      <div className="flex items-center h-8 px-2 border border-border rounded-md bg-surface text-text-secondary relative">
        <span className="text-xs font-semibold uppercase mr-2 pointer-events-none">ROWS:</span>
        <select 
          className="bg-transparent text-text-primary text-xs font-semibold focus:outline-none cursor-pointer appearance-none pr-4 pl-1"
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1); // Reset to page 1 when limit changes
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
      </div>
      
      {/* Pagination Controls */}
      <div className="flex items-center -space-x-px">
        <button 
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex items-center justify-center h-8 px-2 bg-surface border border-border text-text-secondary hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md transition-colors relative z-0 hover:z-10 focus:z-10"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center h-8 px-3 bg-surface border border-border text-xs font-semibold text-text-secondary uppercase relative z-0">
          PAGE <span className="text-text-primary mx-1">{page}</span> OF <span className="text-text-primary mx-1">{totalPages}</span>
        </div>
        <button 
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex items-center justify-center h-8 px-2 bg-surface border border-border text-text-secondary hover:bg-subtle disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md transition-colors relative z-0 hover:z-10 focus:z-10"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Total Items */}
      <div className="flex items-center h-8 px-3 bg-surface border border-border rounded-md text-xs font-semibold text-text-primary">
        Total {totalItems}
      </div>
      
    </div>
  );
}
