"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Tag, TagType, TagSuggestion } from '@/types/tags';
import { tagsApi } from '@/lib/api/tags';
import { X, Search, Loader2, Star } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';

export interface TagSelectorProps {
  typeFilter?: TagType;
  selectedTags: Tag[];
  onChange?: (tags: Tag[]) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function TagSelector({ typeFilter, selectedTags = [], onChange, placeholder = "Search skills...", className = "", readOnly = false }: TagSelectorProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || readOnly) return;
    setLoading(true);
    const fetchSuggestions = async () => {
      try {
        const data = await tagsApi.getSuggestions({ search: query, type: typeFilter });
        // Filter out already selected
        const selectedIds = new Set(selectedTags.map(t => t.id));
        setSuggestions(data.filter((t: TagSuggestion) => !selectedIds.has(t.id)));
      } catch (err) {
        console.error('Failed to load suggestions', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce a bit
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query, typeFilter, isOpen, selectedTags, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, readOnly]);

  const handleSelect = (suggestion: TagSuggestion) => {
    if (readOnly) return;
    // We cast to Tag assuming the consumer of the component only needs the core fields for tracking selected state
    const newSelected = [...selectedTags, suggestion as unknown as Tag];
    onChange?.(newSelected);
    setQuery('');
    setIsOpen(false);
  };

  const handleRemove = (tagId: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    onChange?.(selectedTags.filter(t => t.id !== tagId));
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div 
        className={`min-h-10 p-1 flex flex-wrap gap-2 items-center border border-border rounded-md bg-surface ${!readOnly ? 'input-base cursor-text focus-within:ring-2 ring-brand-500/20' : 'bg-subtle'}`}
        onClick={() => !readOnly && setIsOpen(true)}
      >
        {selectedTags.map(tag => (
          <Badge key={tag.id} variant={tag.type === 'skill' ? 'info' : 'default'} className="flex items-center gap-1.5 group select-none" title={tag.is_starred ? "Must-have skill" : undefined}>
            {!readOnly ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const updated = selectedTags.map(t => t.id === tag.id ? { ...t, is_starred: !t.is_starred } : t);
                  onChange?.(updated);
                }}
                className={`p-0.5 rounded transition-colors ${
                  tag.is_starred 
                    ? 'text-amber-500 hover:text-amber-600' 
                    : 'text-text-muted hover:text-amber-500'
                }`}
                title={tag.is_starred ? "Mark as optional" : "Mark as must-have"}
              >
                <Star className="w-3.5 h-3.5" fill={tag.is_starred ? "currentColor" : "none"} />
              </button>
            ) : (
              tag.is_starred && (
                <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              )
            )}
            <span>{tag.name}</span>
            {!readOnly && (
              <button 
                type="button" 
                onClick={(e) => handleRemove(tag.id, e)}
                className="hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="w-3 h-3 text-text-secondary group-hover:text-text-primary" />
              </button>
            )}
          </Badge>
        ))}
        
        {readOnly && selectedTags.length === 0 && (
          <span className="text-sm text-text-muted px-2 py-1">No skills assigned</span>
        )}
        
        {!readOnly && (
          <div className="flex-1 flex items-center min-w-[120px]">
            <Search className="w-4 h-4 text-text-muted ml-1" />
            <input
              type="text"
              className="flex-1 min-w-0 bg-transparent outline-none px-2 py-1 text-sm text-text-primary"
              placeholder={selectedTags.length === 0 ? placeholder : "Add more..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = query.trim().replace(/,$/, '');
                  if (val) {
                    if (!selectedTags.some(t => t.name.toLowerCase() === val.toLowerCase())) {
                      const newTag: Tag = {
                        id: val,
                        name: val,
                        type: typeFilter || 'skill',
                        active: true,
                      };
                      onChange?.([...selectedTags, newTag]);
                    }
                    setQuery('');
                    setIsOpen(false);
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-full z-50 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            </div>
          ) : suggestions.length > 0 ? (
            <ul className="flex flex-col">
              {suggestions.map(tag => (
                <li 
                  key={tag.id} 
                  className="px-3 py-2 text-sm text-text-primary hover:bg-surface-hover cursor-pointer flex justify-between items-center"
                  onClick={() => handleSelect(tag)}
                >
                  <span>{tag.name}</span>
                  <span className="text-xs text-text-muted capitalize">{tag.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-center text-text-muted">
              {query ? "No active skills found matching your search." : "No suggestions available."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
