'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { jobDescriptionsApi, getJobMatches, rematchJob } from '@/lib/api/job-descriptions';
import { jobPostingsApi } from '@/lib/api/job-postings';
import { tagsApi } from '@/lib/api/tags';
import { usersApi } from '@/lib/api/users';
import { JobDescription, CandidateMatch, CreateJobDescriptionRequest } from '@/types/job-descriptions';
import { JobPosting } from '@/types/job-postings';
import { Tag } from '@/types/tags';
import { useAuth } from '@/contexts/AuthContext';
import { UserLookup } from '@/types/users';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { JobDescriptionForm } from '../components/JobDescriptionForm';
import { 
  Loader2, Briefcase, ArrowLeft, Edit, RotateCw, 
  ChevronLeft, ChevronRight, Plus, Globe
} from 'lucide-react';

import { ExpandableJdCard } from '@/components/ats/ExpandableJdCard';
import { CandidateMatchesList } from '@/components/ats/CandidateMatchesList';
import { CandidateFullProfileView } from '@/components/ats/CandidateFullProfileView';
import { SkillRatingPanel } from '@/components/ats/SkillRatingPanel';

export default function JobDescriptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('job_descriptions', 'editor');
  
  const [jd, setJd] = useState<JobDescription | null>(null);
  const [jdSkills, setJdSkills] = useState<Tag[]>([]);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  
  const [loadingJd, setLoadingJd] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [rematching, setRematching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [associatedPosting, setAssociatedPosting] = useState<JobPosting | null>(null);
  const [loadingPosting, setLoadingPosting] = useState(true);

  // Edit Drawer states
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSelectedTags, setDrawerSelectedTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);

  // Collapse states for sidebars
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  const fetchMatchesData = useCallback(async (excludeCandidateId?: string) => {
    if (excludeCandidateId) {
      // Optimistically remove from matches list to trigger immediate UI update
      setMatches(prev => {
        const nextMatches = prev.filter(m => m.candidate_id !== excludeCandidateId);
        setSelectedCandidateId(currentId => {
          if (currentId === excludeCandidateId) {
            return nextMatches.length > 0 ? nextMatches[0].candidate_id : null;
          }
          return currentId;
        });
        return nextMatches;
      });
    }

    try {
      setLoadingMatches(true);
      const data = await getJobMatches(id);
      setMatches(data);
      if (data.length > 0) {
        setSelectedCandidateId(prev => {
          if (prev && data.some(m => m.candidate_id === prev)) return prev;
          return data[0].candidate_id;
        });
      } else {
        setSelectedCandidateId(null);
      }
    } catch (err) {
      console.error('Failed to load job matches', err);
    } finally {
      setLoadingMatches(false);
    }
  }, [id]);

  useEffect(() => {
    const fetchJdDetails = async () => {
      try {
        setLoadingJd(true);
        const data = await jobDescriptionsApi.getJobDescription(id);
        setJd(data);

        try {
          const entityTags = await tagsApi.getEntityTags('job_description', id);
          setJdSkills(
            entityTags.map((et: any) => ({
              id: et.tag_id,
              name: et.tag_name,
              type: et.tag_type,
              active: true,
              is_starred: et.is_starred,
            }))
          );
        } catch (tagErr) {
          console.error('Failed to load job description tags', tagErr);
        }
      } catch (err) {
        setError('Failed to load job description details.');
      } finally {
        setLoadingJd(false);
      }
    };

    const fetchPosting = async () => {
      try {
        setLoadingPosting(true);
        const postings = await jobPostingsApi.getJobPostings({ jd_id: id });
        if (postings && postings.length > 0) {
          setAssociatedPosting(postings[0]);
        } else {
          setAssociatedPosting(null);
        }
      } catch (err) {
        console.error('Failed to load associated job posting', err);
      } finally {
        setLoadingPosting(false);
      }
    };

    if (id) {
      fetchJdDetails();
      fetchMatchesData();
      fetchPosting();
    }
  }, [id, fetchMatchesData]);

  const handleRematch = async () => {
    try {
      setRematching(true);
      setLoadingMatches(true);
      const data = await rematchJob(id);
      setMatches(data);
      if (data.length > 0) {
        setSelectedCandidateId(data[0].candidate_id);
      }
    } catch (err) {
      console.error('Failed to rematch candidates', err);
    } finally {
      setRematching(false);
      setLoadingMatches(false);
    }
  };

  const openEditDrawer = async () => {
    setDrawerError(null);
    setDrawerLoading(true);
    setIsEditDrawerOpen(true);
    try {
      const [userData, entityTags, updatedJd] = await Promise.all([
        usersApi.getLookups(),
        tagsApi.getEntityTags('job_description', id),
        jobDescriptionsApi.getJobDescription(id),
      ]);
      setUsers(userData);
      setJd(updatedJd);
      setDrawerSelectedTags(
        entityTags.map((et: any) => ({
          id: et.tag_id,
          name: et.tag_name,
          type: et.tag_type,
          active: true,
          is_starred: et.is_starred,
        }))
      );
    } catch (err) {
      setDrawerError("Failed to load job description data.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleEditSave = async (data: CreateJobDescriptionRequest) => {
    setDrawerSaving(true);
    setDrawerError(null);
    try {
      await jobDescriptionsApi.updateJobDescription(id, data);
      await tagsApi.replaceTags('job_description', id, drawerSelectedTags.map(t => ({ id: t.id, is_starred: t.is_starred })));
      // Automatically refresh match scores with updated tags
      await jobDescriptionsApi.rematch(id);
      
      setIsEditDrawerOpen(false);
      
      const updatedJd = await jobDescriptionsApi.getJobDescription(id);
      setJd(updatedJd);
      
      const entityTags = await tagsApi.getEntityTags('job_description', id);
      setJdSkills(
        entityTags.map((et: any) => ({
          id: et.tag_id,
          name: et.tag_name,
          type: et.tag_type,
          active: true,
          is_starred: et.is_starred,
        }))
      );
      
      fetchMatchesData();
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setDrawerError(errorStr.response?.data?.message || 'Failed to update job description');
    } finally {
      setDrawerSaving(false);
    }
  };

  if (loadingJd) {
    return (
      <div className="flex items-center justify-center h-screen min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !jd) {
    return (
      <div className="p-8 text-center bg-surface border border-border rounded-xl max-w-md mx-auto mt-12">
        <p className="text-error font-medium">{error || 'Job Description not found.'}</p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const selectedMatch = matches.find(m => m.candidate_id === selectedCandidateId) || null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Open</Badge>;
      case 'on_hold':
        return <Badge variant="warning">On Hold</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      case 'draft':
      default:
        return <Badge variant="info">Draft</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto px-4 pb-12 w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/job-descriptions')}
            className="-ml-1.5 md:-ml-2 p-2 hover:bg-subtle rounded-lg text-text-secondary transition-colors shrink-0"
            title="Back to Job Descriptions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="p-2.5 bg-brand/10 rounded-lg text-brand border border-brand/20">
            <Briefcase className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{jd.title}</h1>
            </div>
            <p className="text-xs text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
              <span>Code: <strong>{jd.code || 'N/A'}</strong></span>
              <span>•</span>
              <span>{jd.location || 'Remote'}</span>
              <span>•</span>
              <span>{jd.work_mode?.replace('_', ' ') || 'Work mode not specified'}</span>
              <span>•</span>
              <span>{jd.employment_type?.replace('_', ' ') || 'Full-time'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">

          
          {/* Rematch Button */}
          <Button 
            variant="secondary" 
            onClick={handleRematch} 
            disabled={rematching || loadingMatches}
            className="gap-2 bg-brand/5 hover:bg-brand/10 text-brand border-brand/20 text-sm"
          >
            {rematching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4" />
            )}
            Rematch
          </Button>

          {/* Job Posting Button */}
          {!loadingPosting && (associatedPosting || canEdit) && (
            <Button
              variant="secondary"
              onClick={() => {
                if (associatedPosting) {
                  window.open(`/job-postings/${associatedPosting.id}`, '_blank');
                } else {
                  window.open(`/job-postings?create=true&jd_id=${id}`, '_blank');
                }
              }}
              className="gap-2 bg-surface hover:bg-subtle text-sm border-border"
            >
              {associatedPosting ? (
                <>
                  <Globe className="w-4 h-4 text-brand" />
                  Open Posting
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Posting
                </>
              )}
            </Button>
          )}

          {canEdit && (
            <Button 
              variant="secondary" 
              onClick={openEditDrawer} 
              className="gap-2 bg-surface hover:bg-subtle text-sm border-border"
            >
              <Edit className="w-4 h-4" /> Edit JD
            </Button>
          )}
        </div>
      </div>

      {/* Expandable JD Details */}
      <ExpandableJdCard 
        summary={jd.job_summary}
        responsibilities={jd.responsibilities_text}
        mustHave={jd.must_have_text}
        niceToHave={jd.nice_to_have_text}
        tags={jdSkills}
      />

      {/* Three Column Main Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Column: Candidate List (Reduced width to 240px) */}
        <div className={`transition-all duration-300 flex ${isLeftCollapsed ? 'w-12' : 'w-full lg:w-[240px]'} shrink-0 relative h-auto`}>
          {isLeftCollapsed ? (
            <div className="w-full min-h-[400px] border border-border rounded-xl bg-surface flex flex-col items-center pt-4 pb-4 justify-between select-none">
              <button 
                onClick={() => setIsLeftCollapsed(false)}
                className="p-1.5 hover:bg-subtle rounded-md text-brand border border-border"
                title="Expand Candidate List"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="rotate-90 origin-left translate-x-4 whitespace-nowrap text-xs font-bold text-text-muted tracking-wider">
                Candidates List
              </div>
              <div className="w-1.5" />
            </div>
          ) : (
            <div className="w-full h-auto relative">
              <CandidateMatchesList 
                matches={matches}
                isLoading={loadingMatches}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={setSelectedCandidateId}
                jdSkills={jdSkills}
              />
              <button 
                onClick={() => setIsLeftCollapsed(true)}
                className="absolute top-4 -right-3 z-20 p-1 bg-surface border border-border rounded-full hover:bg-subtle shadow-sm text-text-muted hover:text-text-primary"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Center Column: Profile View (expands to prevent horizontal bars) */}
        <div className="flex-grow flex-1 min-w-0 h-auto">
          <CandidateFullProfileView 
            candidateId={selectedCandidateId}
            overallMatchScore={selectedMatch ? (selectedMatch.overall_match_score ?? (selectedMatch.similarity_score / 10)) : null}
            associatedPosting={associatedPosting}
            onAddSuccess={fetchMatchesData}
          />
        </div>

        {/* Right Column: AI Analysis (Reduced width to 240px) */}
        <div className={`transition-all duration-300 flex ${isRightCollapsed ? 'w-12' : 'w-full lg:w-[240px]'} shrink-0 relative h-auto`}>
          {isRightCollapsed ? (
            <div className="w-full min-h-[400px] border border-border rounded-xl bg-surface flex flex-col items-center pt-4 pb-4 justify-between select-none">
              <button 
                onClick={() => setIsRightCollapsed(false)}
                className="p-1.5 hover:bg-subtle rounded-md text-brand border border-border"
                title="Expand AI Insights"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="-rotate-90 origin-right -translate-x-3 whitespace-nowrap text-xs font-bold text-text-muted tracking-wider">
                AI Fit Breakdown
              </div>
              <div className="w-1.5" />
            </div>
          ) : (
            <div className="w-full h-auto relative">
              {selectedMatch ? (
                <SkillRatingPanel 
                  overallScore={selectedMatch.overall_match_score ?? (selectedMatch.similarity_score ? selectedMatch.similarity_score / 10 : 0)}
                  candidateSkills={selectedMatch.skills}
                  jdSkills={jdSkills}
                />
              ) : (
                <Card className="border border-border shadow-sm bg-surface p-6 text-center text-text-muted text-sm flex items-center justify-center min-h-[300px] w-full">
                  Select a candidate to view AI fit analysis breakdown.
                </Card>
              )}
              <button 
                onClick={() => setIsRightCollapsed(true)}
                className="absolute top-4 -left-3 z-20 p-1 bg-surface border border-border rounded-full hover:bg-subtle shadow-sm text-text-muted hover:text-text-primary"
                title="Collapse Insights"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Job Description Drawer */}
      {isEditDrawerOpen && (
        <DrawerShell80
          title="Edit Job Description"
          onClose={() => setIsEditDrawerOpen(false)}
        >
          {drawerLoading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <JobDescriptionForm
              mode="edit"
              jobDescription={jd}
              users={users}
              selectedTags={drawerSelectedTags}
              onTagsChange={setDrawerSelectedTags}
              onSave={handleEditSave}
              onCancel={() => setIsEditDrawerOpen(false)}
              saving={drawerSaving}
              error={drawerError}
            />
          )}
        </DrawerShell80>
      )}
    </div>
  );
}
