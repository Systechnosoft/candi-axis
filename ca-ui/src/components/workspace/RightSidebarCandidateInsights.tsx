/**
 * File: ats-ui/src/components/workspace/RightSidebarCandidateInsights.tsx
 * Modified: May 2026
 * Changes:
 * - Removed absolute heights (h-full) and internal vertical scrollbars to support unified page scrolling.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CandidateMatch } from '@/types/job-descriptions';
import { CircularProgressRing } from '@/components/ats/CircularProgressRing';
import { StarRating } from '@/components/ats/StarRating';
import { Award, CheckCircle2, TrendingUp, Sparkles, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { Card, CardContent } from '@/components/primitives/Card';
import { tagsApi } from '@/lib/api/tags';
import { EntityTag } from '@/types/tags';

interface RightSidebarCandidateInsightsProps {
  candidate: CandidateMatch | null;
  isLoading: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  jobId?: string;
}

export const RightSidebarCandidateInsights: React.FC<RightSidebarCandidateInsightsProps> = ({
  candidate,
  isLoading,
  isCollapsed = false,
  onToggleCollapse,
  jobId,
}) => {
  const [jdTags, setJdTags] = useState<EntityTag[]>([]);
  const [candidateTags, setCandidateTags] = useState<EntityTag[]>([]);
  const [loadingTags, setLoadingTags] = useState<boolean>(false);
  const [isMatchedListExpanded, setIsMatchedListExpanded] = useState<boolean>(true);

  // Load job tags
  useEffect(() => {
    if (!jobId) return;
    tagsApi.getEntityTags('job_description', jobId)
      .then((data) => {
        setJdTags(data || []);
      })
      .catch((err) => {
        console.error('Failed to load job description tags:', err);
      });
  }, [jobId]);

  // Load candidate tags
  useEffect(() => {
    if (!candidate?.candidate_id) {
      setCandidateTags([]);
      return;
    }
    setLoadingTags(true);
    tagsApi.getEntityTags('candidate', candidate.candidate_id)
      .then((data) => {
        setCandidateTags(data || []);
      })
      .catch((err) => {
        console.error('Failed to load candidate tags:', err);
      })
      .finally(() => {
        setLoadingTags(false);
      });
  }, [candidate?.candidate_id]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-l border-border flex flex-col items-center py-4 shrink-0 transition-all duration-300 gap-6 select-none">
        <button 
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-brand/10 text-brand rounded-lg transition-all duration-200"
          title="Expand Insights"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <span className="text-[10px] font-black tracking-widest text-text-muted rotate-180 whitespace-nowrap" style={{ writingMode: 'vertical-lr' }}>
          Skill Insights
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-[230px] bg-white border-l border-border flex flex-col shrink-0 items-center justify-center p-6 transition-all duration-300">
        <div className="animate-pulse flex flex-col items-center w-full space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="w-40 h-40 rounded-full bg-slate-200" />
          <div className="h-6 bg-slate-200 rounded w-1/2" />
          <div className="space-y-3 w-full pt-4">
            <div className="h-8 bg-slate-200 rounded" />
            <div className="h-8 bg-slate-200 rounded" />
            <div className="h-8 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="w-[230px] bg-white border-l border-border flex flex-col shrink-0 p-6 items-center justify-center text-center transition-all duration-300">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-dashed border-border flex items-center justify-center text-slate-400 mb-4">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-sm font-bold text-text-primary">Skill Rating</h4>
        <p className="text-xs text-text-muted mt-2 max-w-[180px]">
          Select a candidate from the left panel to load AI insights and match rating.
        </p>
      </div>
    );
  }

  // Determine fit classification based on match score
  const getFitClassification = (score: number) => {
    if (score >= 8.5) return { label: 'Excellent Match', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 7.0) return { label: 'Good Match', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
    if (score >= 5.0) return { label: 'Fair Match', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Low Match', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
  };

  const fit = getFitClassification(candidate.overall_match_score);

  // Matched Skills: Intersection of Job Tags and Candidate Tags (case insensitive)
  const matchedTagsList = candidateTags.filter((cTag) =>
    jdTags.some((jTag) => jTag.tag_name.trim().toLowerCase() === cTag.tag_name.trim().toLowerCase())
  );

  // Sort matched tags by confidence descending if available, otherwise alphabetically
  const sortedMatchedTags = [...matchedTagsList].sort((a, b) => {
    if (a.confidence !== undefined && b.confidence !== undefined) {
      return b.confidence - a.confidence;
    }
    return a.tag_name.localeCompare(b.tag_name);
  });

  const getMatchedSkillRating = (tag: EntityTag, index: number) => {
    if (tag.confidence != null) {
      const confidence = tag.confidence > 1 ? tag.confidence / 100 : tag.confidence;
      return parseFloat((confidence * 5).toFixed(1));
    }
    const score = Math.max(3.5, 5.0 - (index * 0.3));
    return parseFloat(score.toFixed(1));
  };

  return (
    <div className="w-[230px] bg-white border-l border-border flex flex-col shrink-0 transition-all duration-300">
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/30">
        <span className="font-bold text-text-primary text-sm tracking-wide">Skill Rating</span>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-100 rounded text-text-secondary transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Overall Fit Radial Gauge */}
        <div className="flex flex-col items-center justify-center p-4 border border-border rounded-2xl bg-surface/20 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1.5 text-brand opacity-20 group-hover:opacity-40 transition-opacity">
            <Sparkles className="w-5 h-5" />
          </div>

          <span className="text-xs font-bold text-text-muted tracking-widest mb-3">Overall Fit</span>
          
          <CircularProgressRing 
            score={candidate.overall_match_score}
            size={120}
            strokeWidth={9}
            gradientStart="#10b981" // emerald-500
            gradientEnd="#34d399" // emerald-400
          />

          <div className={`mt-4 px-3 py-1 rounded-full border text-xs font-bold ${fit.color} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            {fit.label}
          </div>
        </div>

        {/* Matched Skills Panel */}
        {loadingTags && candidateTags.length === 0 ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-0.5">
              <button 
                onClick={() => setIsMatchedListExpanded(!isMatchedListExpanded)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-text-muted tracking-wider hover:text-text-primary transition-colors py-0.5"
              >
                <span>Matched Skills ({sortedMatchedTags.length})</span>
                <span className="text-[10px] text-text-secondary">
                  {isMatchedListExpanded ? '▼' : '▶'}
                </span>
              </button>
              <p className="text-[10px] text-text-muted italic leading-normal">
                Show all matched tags between candidate and job.
              </p>
            </div>

            {isMatchedListExpanded && (
              sortedMatchedTags.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-border rounded-xl text-xs text-text-muted bg-subtle/5">
                  No matching tags found between candidate and job.
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedMatchedTags.map((tag, index) => {
                    const rating = getMatchedSkillRating(tag, index);
                    return (
                      <div 
                        key={tag.id} 
                        className="p-2.5 bg-white border border-emerald-100 hover:border-emerald-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-1 animate-in slide-in-from-right-4 duration-300"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-text-primary leading-tight truncate pr-2">
                            {tag.tag_name}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0 text-[10px]">
                            <span className="font-bold text-text-primary">{rating.toFixed(1)}</span>
                            <span className="text-text-muted">/ 5</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          <StarRating rating={rating} size={11} />
                          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">Match</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* Recruiter Insights Quick Stats */}
        <div className="bg-slate-50 border border-border rounded-xl p-3 space-y-2">
          <h5 className="text-[10px] font-bold text-text-muted tracking-wider mb-0.5 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-brand" />
            Recruiter Match Summary
          </h5>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Similarity Match</span>
              <span className="font-bold text-text-primary">{candidate.similarity_score}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Expected CTC</span>
              <span className="font-bold text-text-primary">
                {candidate.expected_ctc ? `₹${(candidate.expected_ctc / 100000).toFixed(1)}L` : 'Negotiable'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Notice Period</span>
              <span className="font-bold text-text-primary">
                {candidate.notice_period_days != null ? `${candidate.notice_period_days} Days` : 'Immediate'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Button */}
        <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-border text-xs font-bold text-text-primary hover:text-brand rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          View Detailed Analysis
        </button>
      </div>
    </div>
  );
};
