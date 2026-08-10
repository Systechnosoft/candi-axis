import React, { useState, useRef, useEffect } from 'react';
import { CandidateMatch } from "@/types/job-descriptions";
import { Tag } from "@/types/tags";
import { Badge } from "../primitives/Badge";
import { ChevronLeft, ChevronRight, SlidersHorizontal, Loader2, Search, X } from "lucide-react";

interface CandidateMatchesListProps {
  matches: CandidateMatch[];
  isLoading: boolean;
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  jdSkills: Tag[];
}

export const CandidateMatchesList: React.FC<CandidateMatchesListProps> = ({
  matches,
  isLoading,
  selectedCandidateId,
  onSelectCandidate,
  jdSkills,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter JD skills based on search input
  const filteredJdSkills = jdSkills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter matches by selected skills
  const filteredMatches = matches.filter(match => {
    if (selectedSkills.length === 0) return true;
    return selectedSkills.some(skill => 
      match.skills.some(cSkill => cSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(cSkill.toLowerCase()))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMatches = filteredMatches.slice(startIndex, startIndex + itemsPerPage);

  const toggleSkill = (skillName: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillName) 
        ? prev.filter(s => s !== skillName) 
        : [...prev, skillName]
    );
    setCurrentPage(1); // Reset page on filter change
  };

  return (
    <div className="flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-visible w-full h-auto">
      {/* Skill Search & Filter Header */}
      <div className="p-4 border-b border-border bg-subtle/5 space-y-3 relative">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand" /> Find By Skill
          </h3>
          {selectedSkills.length > 0 && (
            <button 
              onClick={() => setSelectedSkills([])} 
              className="text-[10px] font-semibold text-brand hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search Bar Input */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Filter by JD skills..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Options Dropdown Selection Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto border border-border bg-surface rounded-md shadow-lg p-1.5 space-y-0.5">
              {filteredJdSkills.map(skill => {
                const isSelected = selectedSkills.includes(skill.name);
                return (
                  <div
                    key={skill.id}
                    onClick={() => toggleSkill(skill.name)}
                    className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md cursor-pointer transition-colors select-none ${
                      isSelected 
                        ? 'bg-brand/10 text-brand font-bold' 
                        : 'text-text-secondary hover:bg-subtle'
                    }`}
                  >
                    <span>{skill.name}</span>
                    {isSelected && <span className="text-[10px] font-black">✓</span>}
                  </div>
                );
              })}
              {filteredJdSkills.length === 0 && (
                <div className="text-[10px] text-text-muted italic p-2 text-center">
                  No matching JD skills.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Filter Pills (Dismissible) */}
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {selectedSkills.map(skill => (
              <Badge 
                key={skill} 
                variant="default" 
                className="bg-brand/5 border border-brand/20 text-brand text-[9px] pl-2 pr-1.5 py-0.5 flex items-center gap-1 select-none"
              >
                <span>{skill}</span>
                <button 
                  onClick={() => toggleSkill(skill)}
                  className="hover:bg-brand/10 rounded-full p-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Matches List */}
      <div className="p-4 space-y-3 h-auto">
        <div className="flex items-center justify-between text-[11px] text-text-muted font-bold pb-1 select-none">
          <span>Candidates ({filteredMatches.length})</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        ) : paginatedMatches.length === 0 ? (
          <div className="text-center py-12 text-xs text-text-muted italic">
            No matching candidates found.
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedMatches.map((candidate) => {
              const isSelected = selectedCandidateId === candidate.candidate_id;
              return (
                <div
                  key={candidate.candidate_id}
                  onClick={() => onSelectCandidate(candidate.candidate_id)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all hover:scale-[1.01] duration-200 select-none ${
                    isSelected
                      ? 'border-brand bg-brand/5 shadow-sm'
                      : 'border-border bg-surface hover:bg-subtle/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-sm text-text-primary truncate">{candidate.full_name}</p>
                      <p className="text-xs text-text-muted truncate">
                        {candidate.past_role || 'No past designation'}
                      </p>
                    </div>
                    <Badge variant={candidate.overall_match_score >= 7 ? 'success' : candidate.overall_match_score >= 4 ? 'info' : 'error'} className="shrink-0 text-[10px] px-1.5 py-0.5">
                      {candidate.overall_match_score}/10
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-text-muted pt-2.5 mt-2 border-t border-border/40">
                    <span>Similarity: <strong className="text-text-secondary">{(candidate.similarity_score / 10).toFixed(1)}/10</strong></span>
                    <span className="capitalize">{candidate.confidence} confidence</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-3 py-2 border-t border-border bg-subtle/5 flex items-center justify-between text-xs shrink-0 select-none rounded-b-md">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md border border-border bg-surface text-text-secondary hover:bg-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md border border-border bg-surface text-text-secondary hover:bg-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidateMatchesList;