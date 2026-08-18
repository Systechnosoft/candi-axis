import React from 'react';
import { Search, Download, FilterX, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  onClearFilters?: () => void;
  children?: React.ReactNode;
}

export function FilterBar({ searchValue = '', onSearchChange, onRefresh, onClearFilters, children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="search here..." 
            className="pl-9 pr-3 h-[34px] text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-48 bg-surface"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <button onClick={onRefresh} className="h-[34px] px-4 text-sm font-medium rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors">
          Search
        </button>
      </div>
      
      {children}
      
      <div className="flex-1"></div>

      <div className="flex items-center gap-1 ml-auto">
        <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Download">
          <Download className="w-4 h-4" />
        </button>
        <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Clear Filters" onClick={() => {
          onSearchChange?.('');
          if (onClearFilters) onClearFilters();
        }}>
          <FilterX className="w-4 h-4" />
        </button>
        <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Refresh" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
