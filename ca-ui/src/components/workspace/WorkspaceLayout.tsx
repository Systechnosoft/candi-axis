/**
 * File: ats-ui/src/components/workspace/WorkspaceLayout.tsx
 * Modified: May 2026
 * Changes:
 * - Replaced h-screen and overflow-hidden with min-h-screen to let the page scroll as a single unit.
 * - Removed overflow constraints from sub-panels so they grow naturally.
 */

'use client';

import React, { useState } from 'react';
import { JobDescription } from '@/types/job-descriptions';
import { CandidateMatch } from '@/types/job-descriptions';
import { 
  Briefcase, ChevronDown, ChevronUp, Edit3, ArrowLeft, 
  Search, Users, Sparkles, HelpCircle, FileText, Loader2 
} from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { Card, CardContent } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import Link from 'next/link';

interface WorkspaceLayoutProps {
  jd: JobDescription;
  matches: CandidateMatch[];
  isLoadingMatches: boolean;
  selectedCandidateId: string | null;
  activeView: 'details' | 'resume';
  onViewChange: (view: 'details' | 'resume') => void;
  onSelectCandidate: (id: string) => void;
  onFindMatches: () => void;
  onEditJd: () => void;
  onBack: () => void;
  children: React.ReactNode; // Renders Left Sidebar, Center Panel, Right Sidebar
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  jd,
  matches,
  isLoadingMatches,
  selectedCandidateId,
  activeView,
  onViewChange,
  onSelectCandidate,
  onFindMatches,
  onEditJd,
  onBack,
  children,
}) => {
  const [isJdExpanded, setIsJdExpanded] = useState(false);

  const formatExperience = (min: number | null, max: number | null) => {
    if (min === null && max === null) return 'No spec';
    const minYears = min !== null ? Math.floor(min / 12) : 0;
    const maxYears = max !== null ? Math.floor(max / 12) : null;
    return maxYears ? `${minYears} - ${maxYears} Years` : `${minYears}+ Years`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans overflow-x-hidden max-w-full">
      {/* ROW 1: Job Header Banner */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-text-secondary transition-colors"
            title="Back to Job Descriptions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
 
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-text-primary tracking-tight leading-none">
                {jd.title}
              </h1>
              <Badge variant={jd.status === 'open' ? 'success' : 'default'}>
                {jd.status === 'open' ? 'Open' : jd.status.charAt(0).toUpperCase() + jd.status.slice(1).toLowerCase()}
              </Badge>
            </div>
            
            <p className="text-xs text-text-muted mt-1.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span>Req. No.: <span className="font-bold text-text-secondary">{jd.requisition_code || 'REQ-001'}</span></span>
              <span>•</span>
              <span>Code: <span className="font-bold text-text-secondary">{jd.code || 'ENG-104'}</span></span>
              {jd.location && (
                <>
                  <span>•</span>
                  <span>{jd.location}</span>
                </>
              )}
              {jd.work_mode && (
                <>
                  <span>•</span>
                  <span className="capitalize">{jd.work_mode.replace('_', ' ')}</span>
                </>
              )}
              {jd.employment_type && (
                <>
                  <span>•</span>
                  <span className="capitalize">{jd.employment_type.replace('_', ' ')}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onFindMatches}
            disabled={isLoadingMatches}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-xs font-bold text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60"
          >
            {isLoadingMatches ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Rematching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                Rematch
              </>
            )}
          </button>

          <button
            onClick={onEditJd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-text-primary rounded-lg border border-slate-200 transition-colors shadow-sm"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            Edit Job Description
          </button>
        </div>
      </div>

      {/* ROW 2: Collapsible JD banner */}
      <div className="px-6 py-3 shrink-0">
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300">
          <div
            onClick={() => setIsJdExpanded(!isJdExpanded)}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-text-primary">Job Description Details</h3>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Click to expand and view the full job description, requirements, and qualifications.
                </p>
              </div>
            </div>
            <div className="text-text-secondary hover:text-text-primary p-1">
              {isJdExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {/* Expanded area */}
          {isJdExpanded && (
            <div className="px-6 pb-6 pt-2 border-t border-border bg-slate-50/20 text-xs text-text-secondary space-y-4 animate-in slide-in-from-top-4 duration-300">
              {jd.job_summary && (
                <div className="space-y-1">
                  <h4 className="font-bold text-text-primary tracking-wider text-[10px]">Job Summary</h4>
                  <div 
                    className="leading-relaxed bg-white border border-slate-100 p-3 rounded-lg prose prose-xs"
                    dangerouslySetInnerHTML={{ __html: jd.job_summary }}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jd.must_have_text && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-emerald-600 tracking-wider text-[10px]">Key Requirements (Must Have)</h4>
                    <div 
                      className="leading-relaxed bg-white border border-slate-100 p-3 rounded-lg prose prose-xs"
                      dangerouslySetInnerHTML={{ __html: jd.must_have_text }}
                    />
                  </div>
                )}
                {jd.nice_to_have_text && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-indigo-600 tracking-wider text-[10px]">Nice to Have</h4>
                    <div 
                      className="leading-relaxed bg-white border border-slate-100 p-3 rounded-lg prose prose-xs"
                      dangerouslySetInnerHTML={{ __html: jd.nice_to_have_text }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 text-[10px] text-text-muted pt-2 border-t border-slate-100">
                <span>Minimum Exp: <span className="font-bold text-text-secondary">{formatExperience(jd.exp_min_months, jd.exp_max_months)}</span></span>
                <span>•</span>
                <span>Created On: <span className="font-bold text-text-secondary">{new Date(jd.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Work Area Grid */}
      <div className="flex-1 flex relative max-w-full overflow-x-hidden">
        {/* Work Area Sidebars + Center Panel */}
        <div className="flex-1 flex max-w-full overflow-x-hidden animate-in fade-in duration-500">
          {children}
        </div>
      </div>

      {/* App Bar Footer Tips */}
      <div className="bg-brand/5 border-t border-brand/10 py-2 px-6 flex items-center gap-2 text-xs text-brand font-medium shrink-0">
        <HelpCircle className="w-4 h-4 text-brand shrink-0" />
        <span>Click on a candidate from the left panel to view their detailed profile, key skills match, and parsing analysis.</span>
      </div>
    </div>
  );
};
export default WorkspaceLayout;
