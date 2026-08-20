import React, { useState, useEffect } from 'react';
import { Search, Download, FilterX, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  onClearFilters?: () => void;
  children?: React.ReactNode;
}

export function FilterBar({ searchValue = '', onSearchChange, onRefresh, onClearFilters, children }: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Keep local state in sync if parent changes it (e.g. cleared externally)
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  const handleSearchSubmit = () => {
    onSearchChange?.(localSearch);
    if (localSearch === searchValue && onRefresh) {
      onRefresh(); // Force refresh if they click Search without changing the text
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    
    // Automatically trigger search when completely cleared
    if (val === '') {
      onSearchChange?.('');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
      <div className="flex items-center gap-1 md:col-start-1 md:row-start-1">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="search here..." 
            className="pl-9 pr-3 h-[34px] text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-full bg-surface"
            value={localSearch}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button onClick={handleSearchSubmit} className="h-[34px] px-4 text-sm font-medium rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors">
          Search
        </button>
      </div>
      
      {children}

      <div className="flex items-center gap-1 justify-end md:col-start-4 md:row-start-1">
        <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Download">
          <Download className="w-4 h-4" />
        </button>
        <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Clear Filters" onClick={() => {
          setLocalSearch('');
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
