import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface SingleSelectProps {
  options: Option[];
  selectedId: string;
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const SingleSelect: React.FC<SingleSelectProps> = ({
  options,
  selectedId,
  onChange,
  placeholder = 'Select option...',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelectOption = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .map(part => part[0])
      .filter(Boolean)
      .join('')
      .toLowerCase();
  };

  const filteredAndSortedOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || options.length <= 5) return options;

    const matched = options
      .map(opt => {
        const name = opt.name.toLowerCase();
        const initials = getInitials(opt.name);

        const initialsStartsWith = initials.startsWith(q);
        const nameStartsWith = name.startsWith(q);
        const initialsContains = initials.includes(q);
        const nameContains = name.includes(q);

        let rank = 5; // No match
        if (initialsStartsWith) {
          rank = 1;
        } else if (nameStartsWith) {
          rank = 2;
        } else if (initialsContains) {
          rank = 3;
        } else if (nameContains) {
          rank = 4;
        }

        return { opt, rank };
      })
      .filter(item => item.rank < 5);

    // Sort by rank ascending
    matched.sort((a, b) => a.rank - b.rank);

    return matched.map(item => item.opt);
  }, [options, searchQuery]);

  const selectedOption = options.find(opt => opt.id === selectedId);
  const displayText = selectedOption ? selectedOption.name : placeholder;
  const showSearch = options.length > 5;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-left focus:outline-none focus:ring-1 focus:ring-brand shadow-sm transition-all duration-200"
      >
        <span className={`truncate max-w-[90%] ${selectedOption ? 'text-text-primary' : 'text-text-muted'}`}>
          {displayText}
        </span>
        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {showSearch && (
            <div className="p-2 border-b border-border sticky top-0 bg-surface z-10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by name or initials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 text-xs border border-border rounded focus:ring-1 focus:ring-brand outline-none bg-surface text-text-primary"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="p-1.5 space-y-0.5 overflow-y-auto flex-1">
            {filteredAndSortedOptions.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-2">No matching options</div>
            ) : (
              filteredAndSortedOptions.map(option => {
                const isSelected = option.id === selectedId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-left rounded-md transition-colors ${
                      isSelected 
                        ? 'bg-brand/5 text-brand font-semibold' 
                        : 'text-text-primary hover:bg-subtle'
                    }`}
                  >
                    <span className="truncate">{option.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
