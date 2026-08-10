/**
 * File: ats-ui/src/components/workspace/LeftSidebarCandidates.tsx
 * Modified: May 2026
 * Changes:
 * - Removed internal vertical scrollbars to support single vertical page scrollbar.
 * - Replaced "View All Matches" footer with page-based pagination controls (10 matches per page).
 * - Added client-side skills-tag search multi-select filter.

 */

'use client';

import React, { useState, useEffect } from 'react';
import { CandidateMatch } from '@/types/job-descriptions';
import { Search, ChevronRight, Loader2, Users, ChevronLeft, Tag as TagIcon, X } from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';

interface LeftSidebarCandidatesProps {
  matches: CandidateMatch[];
  isLoading: boolean;
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  onFindMatches: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  jdTags: any[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
}

export const LeftSidebarCandidates: React.FC<LeftSidebarCandidatesProps> = ({
  matches,
  isLoading,
  selectedCandidateId,
  onSelectCandidate,
  onFindMatches,
  isCollapsed = false,
  onToggleCollapse,
  jdTags,
  selectedTags,
  onSelectedTagsChange,
}) => {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(matches.length / itemsPerPage));
  const isPagingEnabled = matches.length > itemsPerPage;

  // Reset pagination to page 1 whenever matches array changes
  useEffect(() => {
    setCurrentPage(1);
  }, [matches]);

  // Adjust current page if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Click outside handler for tag filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available tags that can be selected
  const availableTags = jdTags.filter(
    (tag) =>
      !selectedTags.includes(tag.tag_name) &&
      tag.tag_name.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Helper to get initials from candidate name
  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // List of beautiful pastel colors for candidate avatars
  const avatarColors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
  ];

  const getAvatarColor = (id: string) => {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    return avatarColors[sum % avatarColors.length];
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-border flex flex-col items-center py-4 shrink-0 transition-all duration-300 gap-6 select-none">
        <button 
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-brand/10 text-brand rounded-lg transition-all duration-200"
          title="Expand Candidates"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="relative mt-2 p-2 bg-brand/5 text-brand rounded-lg">
          <Users className="w-5 h-5" />
          {matches.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-brand text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white scale-90">
              {matches.length}
            </span>
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted rotate-180 whitespace-nowrap" style={{ writingMode: 'vertical-lr' }}>
          Matching Candidates
        </span>
      </div>
    );
  }

  const paginatedMatches = isPagingEnabled
    ? matches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : matches;

  return (
    <div ref={sidebarRef} className="w-[230px] bg-white border-r border-border flex flex-col shrink-0 transition-all duration-300">
      {/* Title & Count Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text-primary text-sm tracking-wide">Matching Candidates</span>
          <span className="bg-brand/10 text-brand text-xs font-bold px-2 py-0.5 rounded-full">
            {matches.length}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-100 rounded text-text-secondary transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Searchable Multi-select Tag Filter */}
      <div className="p-3 border-b border-border flex flex-col gap-2 relative z-20" ref={dropdownRef}>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          Filter by skills
        </span>
        
        {/* Selected Tags Container */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 pb-1">
            {selectedTags.map((tagName) => (
              <span
                key={tagName}
                className="inline-flex items-center gap-1 bg-brand/10 text-brand text-[10px] font-black px-2 py-0.5 rounded-lg border border-brand/20 transition-all"
              >
                {tagName}
                <button
                  type="button"
                  onClick={() => onSelectedTagsChange(selectedTags.filter((t) => t !== tagName))}
                  className="hover:bg-brand/20 rounded p-0.5 text-brand"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={selectedTags.length > 0 ? "Add skill..." : "Search skill..."}
            value={tagSearchQuery}
            onChange={(e) => {
              setTagSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full text-xs bg-slate-50 border border-border rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-all"
          />
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          
          {selectedTags.length > 0 && (
            <button
              onClick={() => {
                onSelectedTagsChange([]);
                setTagSearchQuery('');
              }}
              className="absolute right-2.5 top-2.5 hover:text-text-primary text-text-muted p-0.5 rounded"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Options */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 animate-in fade-in slide-in-from-top-1 duration-150">
            {availableTags.length === 0 ? (
              <div className="p-3 text-[11px] text-text-muted text-center">
                {jdTags.length === 0 ? "No tags on this JD" : "No matching tags"}
              </div>
            ) : (
              availableTags.map((tag) => (
                <button
                  key={tag.tag_id}
                  onClick={() => {
                    onSelectedTagsChange([...selectedTags, tag.tag_name]);
                    setTagSearchQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between text-left px-3 py-2 text-xs hover:bg-brand/5 hover:text-brand text-text-secondary font-medium transition-colors"
                >
                  <span>{tag.tag_name}</span>
                  <span className="text-[10px] text-text-muted capitalize bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                    {tag.tag_type}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Candidate List */}
      <div className="flex-1 p-4 space-y-3">
        {isLoading && matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-brand mb-2" />
            <p className="text-xs">Finding matches...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl bg-subtle/20">
            {selectedTags.length > 0 ? (
              <>
                <p className="text-xs text-text-secondary font-medium">No candidates matched the selected tags.</p>
                <p className="text-[11px] text-text-muted mt-1">Try clearing some tag filters.</p>
              </>
            ) : (
              <>
                <p className="text-xs text-text-secondary font-medium">No matching candidates found.</p>
                <p className="text-[11px] text-text-muted mt-1">Click Rematch to generate fresh candidate matches.</p>
              </>
            )}
          </div>
        ) : (
          paginatedMatches.map((candidate) => {
            const isSelected = selectedCandidateId === candidate.candidate_id;
            const scoreColor = candidate.overall_match_score >= 8
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : candidate.overall_match_score >= 6
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-50 text-slate-700 border-slate-200';

            return (
              <div
                key={candidate.candidate_id}
                onClick={() => onSelectCandidate(candidate.candidate_id)}
                className={`group cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 relative overflow-hidden
                  ${
                    isSelected
                      ? 'border-brand bg-brand/5 shadow-md shadow-brand/5 ring-1 ring-brand'
                      : 'border-border bg-white hover:bg-surface-hover hover:border-text-muted/30 shadow-sm'
                  }`}
              >
                {/* Visual indicator for selection */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
                )}

                {/* Avatar with initials */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${getAvatarColor(candidate.candidate_id)}`}>
                  {getInitials(candidate.full_name)}
                </div>

                {/* Info block */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-text-primary text-sm truncate leading-snug group-hover:text-brand transition-colors">
                    {candidate.full_name}
                  </h4>
                  <p className="text-xs text-text-secondary truncate mt-0.5 font-medium">
                    {candidate.past_role || 'Candidate'}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Similarity: <span className="font-bold text-text-secondary">{candidate.similarity_score}%</span>
                  </p>
                </div>

                {/* Match Score Badge */}
                <div className={`text-xs font-black px-2 py-0.5 rounded-lg border shrink-0 text-center ${scoreColor}`}>
                  {candidate.overall_match_score.toFixed(1)}/10
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {isPagingEnabled && totalPages > 1 && (
        <div className="px-3 py-2 border-t border-border bg-surface/10 flex items-center justify-between gap-1 select-none font-sans text-xs">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4 text-text-secondary" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-5 h-5 flex items-center justify-center text-xs font-black rounded-md transition-all duration-150 ${
                  currentPage === page
                    ? 'bg-brand text-white shadow-sm ring-1 ring-brand'
                    : 'text-text-secondary hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      )}
    </div>
  );
};
