import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SingleSelect } from './SingleSelect';

interface TablePaginationProps {
  totalItems: number;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
}

export function TablePagination({ totalItems, page, setPage, limit, setLimit }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const onLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when limit changes
  };

  return (
    <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-border bg-surface rounded-b-lg text-sm text-text-secondary">
      
      {/* ROWS dropdown */}
      <div className="flex items-center h-8 px-2 border border-border rounded-md bg-surface text-text-secondary relative">
        <span className="text-xs font-semibold mr-2 pointer-events-none">Rows:</span>
        <SingleSelect
          options={[
            { id: '10', name: '10' },
            { id: '20', name: '20' },
            { id: '50', name: '50' }
          ]}
          selectedId={String(limit)}
          onChange={(id) => onLimitChange(Number(id))}
          variant="minimal"
          className="text-text-primary text-xs font-semibold cursor-pointer pl-1 w-14"
        />
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
        <div className="flex items-center justify-center h-8 px-3 bg-surface border border-border text-xs font-semibold text-text-secondary relative z-0">
          Page <span className="text-text-primary mx-1">{page}</span> of <span className="text-text-primary mx-1">{totalPages}</span>
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
