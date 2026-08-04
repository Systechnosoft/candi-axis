import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Button } from './Button';

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function FilterBar({ searchValue = '', onSearchChange }: FilterBarProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-[14px] placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>
    </div>
  );
}
