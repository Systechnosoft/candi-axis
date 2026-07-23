'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CandidatesService } from '@/lib/api/candidates';
import { AdminService } from '@/lib/api/admin';
import { jobPostingsApi } from '@/lib/api/job-postings';
import { LinkToPostingModal } from '@/components/ats/LinkToPostingModal';
import { Candidate, DocumentResponse } from '@/types/candidates';
import {
  ArrowLeft, Edit, Mail, Phone, MapPin, Briefcase, Calendar,
  DollarSign, Clock, GraduationCap, Award, Folder, ExternalLink,
  Linkedin, Github, Globe, User, Tag, FileText, Loader2, AlertTriangle, Plus
} from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { Card } from '@/components/primitives/Card';
import { ApplicationsService } from '@/lib/api/applications';
import { CandidateForm } from '../intake/components/CandidateForm';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { CandidateFormValues } from '@/types/candidates';

const formatMonthYear = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatExperience = (months?: number | null) => {
  if (months === null || months === undefined) return 'Not specified';
  const yrs = Math.floor(months / 12);
  const mths = months % 12;
  const yrsStr = yrs > 0 ? `${yrs} year${yrs > 1 ? 's' : ''}` : '';
  const mthsStr = mths > 0 ? `${mths} month${mths > 1 ? 's' : ''}` : '';
  return [yrsStr, mthsStr].filter(Boolean).join(' ') || '0 months';
};

const isPresent = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
};

const hasItems = (arr: any[] | null | undefined): boolean => {
  return !!(arr && arr.length > 0);
};

interface CandidateWithScores extends Candidate {
  readabilityScore?: number;
  grammarErrorsCount?: number;
  buzzwordsCount?: number;
  actionVerbCount?: number;
  skillDensity?: number;
  promotionsCount?: number;
  timelineIssues?: number;
  hasLinkedIn?: boolean;
  hasGitHub?: boolean;
  fillerWordsCount?: number;
}

interface ProfileScoreResult {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// Helper pure functions:
const WEIGHTS = {
  contact: 5,
  summary: 5,
  experience: 20,
  skills: 15,
  progression: 10,
  achievements: 20,
  readability: 10,
  grammar: 10,
  social: 5,
};



// Dummy NLP functions (to implement with real libs as needed):
const commonActionVerbs = ['lead', 'manage', 'develop', 'design', 'build', 'conduct', 'create', 'improve', 'drive', 'increase'];
const commonFillerWords = ['very', 'really', 'actually', 'basically', 'just', 'etc'];
function countActionVerbs(text: string): number {
  const tokens = text.toLowerCase().split(/\W+/);
  return tokens.filter(tok => commonActionVerbs.includes(tok)).length;
}
function countFillerWords(text: string): number {
  const tokens = text.toLowerCase().split(/\W+/);
  return tokens.filter(tok => commonFillerWords.includes(tok)).length;
}
function computeFleschReadingEase(text: string): number {
  // Placeholder: real impl would use syllable count & sentence count.
  // Assume precomputed or call a library.
  return 60; // example value (higher is easier)
}
function countGrammarErrors(text: string): number {
  // Placeholder: in practice use a grammar checker API.
  return 0;
}

// Score calculations for each component:
function scoreContact(cand: CandidateWithScores): number {
  let score = 0;
  if (isPresent(cand.first_name) && isPresent(cand.last_name)) score += 0.4;
  if (isPresent(cand.email)) score += 0.2;
  if (isPresent(cand.phone)) score += 0.2;
  if (isPresent(cand.location)) score += 0.2;
  // Normalize to [0,1]
  return Math.min(1, score);
}

function scoreSummary(cand: CandidateWithScores): number {
  if (!cand.profile_summary) return 0;
  // Reward having a summary, and slightly by readability
  const base = 1; // summary exists
  const readabilityBonus = cand.readabilityScore ? cand.readabilityScore / 100 : 0;
  return Math.min(1, base * 0.8 + readabilityBonus * 0.2);
}

function scoreExperience(cand: CandidateWithScores): number {
  const expYears = (cand.total_exp_months || 0) / 12;
  let score = 0;
  if (expYears >= 5) score += 0.4;
  else if (expYears >= 2) score += 0.2;
  if (cand.employments) {
    const roles = cand.employments.length;
    score += Math.min(0.4, roles * 0.1); // up to 4 roles = 0.4
    // Seniority: give small bonus for any senior title
    const senior = cand.employments.some(e => {
      const t = e.job_title?.toLowerCase() || '';
      return t.includes('senior') || t.includes('manager') || t.includes('lead') || t.includes('director');
    });
    if (senior) score += 0.1;
  }
  // Account for timeline issues
  if (cand.timelineIssues && cand.timelineIssues > 0) {
    score -= 0.1 * cand.timelineIssues; // penalize gaps/overlaps
  }
  return Math.max(0, Math.min(1, score));
}

function scoreSkills(cand: CandidateWithScores): number {
  const count = cand.tags?.length || 0;
  if (count >= 10) return 1;
  if (count >= 6) return 0.8;
  if (count >= 3) return 0.6;
  if (count > 0) return 0.4;
  return 0.1;
}

function scoreProgression(cand: CandidateWithScores): number {
  if (!cand.employments) return 0;
  let score = 0;
  const roles = cand.employments.length;
  score += Math.min(0.6, roles * 0.2); // e.g., 3 roles = 0.6
  if (cand.promotionsCount && cand.promotionsCount > 0) {
    score += 0.2; // bonus for promotions
  }
  // Education fallback: if no jobs, base on multiple degrees
  if (roles === 0 && cand.educations && cand.educations.length >= 2) {
    score += 0.4;
  }
  return Math.min(1, score);
}

function scoreAchievements(cand: CandidateWithScores): number {
  let score = 0;
  // Numerics in experience
  let numMetrics = 0, totalBullets = 0;
  cand.employments?.forEach(e => {
    if (!e.responsibilities_summary) return;
    const bullets = e.responsibilities_summary.split(/[\r\n]+/).map(s => s.trim()).filter(s => s);
    bullets.forEach(b => {
      totalBullets++;
      if (/\d+%|\d+\s*percent|\$\d+/i.test(b)) numMetrics++;
    });
  });
  if (totalBullets > 0) {
    score += Math.min(0.5, (numMetrics / totalBullets) * 0.5); // up to 0.5
  }
  if ((cand.projects?.length || 0) > 0) score += 0.2;
  if ((cand.certifications?.length || 0) > 0) score += 0.1;
  return Math.min(1, score);
}

function scoreQuality(cand: CandidateWithScores): number {
  // Combine grammar, readability, buzzwords into one category [0,1].
  const grammarScore = cand.grammarErrorsCount !== undefined
    ? Math.max(0, 1 - cand.grammarErrorsCount / 10) // 0 errors -> 1, 10+ errors -> 0
    : 1;
  const readabilityBonus = cand.readabilityScore ? Math.min(1, cand.readabilityScore / 100) : 0.5;
  const fillerPenalty = cand.fillerWordsCount ? Math.max(0, 1 - cand.fillerWordsCount * 0.05) : 1;
  return grammarScore * 0.4 + readabilityBonus * 0.4 + fillerPenalty * 0.2;
}

// Score calculations for each component:
function scoreSocial(cand: CandidateWithScores): number {
  let score = 0;
  if (cand.hasLinkedIn) score += 0.5;
  if (cand.hasGitHub) score += 0.5;
  return Math.min(1, score);
}

// Main scoring function:
const calculateProfileScore = (cand: CandidateWithScores, customWeights?: Record<string, number>): ProfileScoreResult => {
  const activeWeights = customWeights || WEIGHTS;
  // Update computed features if not already done
  const fullText = [cand.profile_summary]
    .concat(cand.employments?.map(e => e.responsibilities_summary || '') || [])
    .concat(cand.projects?.map(p => p.description || '') || [])
    .join('\n');
  cand.readabilityScore = computeFleschReadingEase(fullText);
  cand.grammarErrorsCount = countGrammarErrors(fullText);
  cand.buzzwordsCount = countFillerWords(fullText); // using filler list as buzzwords proxy
  cand.actionVerbCount = countActionVerbs(fullText);
  cand.hasLinkedIn = cand.social_links?.some(link => link.url.includes('linkedin.com')) || false;
  cand.hasGitHub = cand.social_links?.some(link => link.url.includes('github.com')) || false;
  cand.promotionsCount = (() => {
    // Rough heuristic: count how many times job title contains keywords indicating promotion
    const titles = cand.employments?.map(e => e.job_title?.toLowerCase() || '') || [];
    let count = 0;
    for (let i = 1; i < titles.length; i++) {
      if (titles[i] !== titles[i-1]) count++;
    }
    return count;
  })();
  // Score each category (0–1)
  const contactScore = scoreContact(cand);
  const summaryScore = scoreSummary(cand);
  const expScore = scoreExperience(cand);
  const skillsScore = scoreSkills(cand);
  const progScore = scoreProgression(cand);
  const achScore = scoreAchievements(cand);
  const qualityScore = scoreQuality(cand);
  const socialScore = scoreSocial(cand);
  // Weighted sum (weights sum to 100, no normalization needed)
  const weightedSum = 
    contactScore * (activeWeights.contact ?? WEIGHTS.contact) +
    summaryScore * (activeWeights.summary ?? WEIGHTS.summary) +
    expScore * (activeWeights.experience ?? WEIGHTS.experience) +
    skillsScore * (activeWeights.skills ?? WEIGHTS.skills) +
    progScore * (activeWeights.progression ?? WEIGHTS.progression) +
    achScore * (activeWeights.achievements ?? WEIGHTS.achievements) +
    qualityScore * (activeWeights.readability ?? WEIGHTS.readability) +  // reuse readability weight for quality
    qualityScore * (activeWeights.grammar ?? WEIGHTS.grammar) +     // grammar weight
    socialScore * (activeWeights.social ?? WEIGHTS.social);
  let overall_score = Math.round(weightedSum) / 10;
  overall_score = Math.min(10, Math.max(1, overall_score));
  
  // Strengths, weaknesses, recommendations (simplified logic)
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (contactScore > 0.8) strengths.push('Complete contact details and clear header.');
  if (expScore > 0.8) strengths.push('Extensive work experience and senior roles.');
  if (skillsScore > 0.8) strengths.push('Robust skill set with relevant keywords.');
  if (progScore > 0.8) strengths.push('Clear career progression demonstrated.');
  if (achScore > 0.8) strengths.push('Strong quantified achievements in experience bullets.');

  if (cand.profile_summary && summaryScore < 0.5) weaknesses.push('Professional summary is brief or unfocused.');
  if (qualityScore < 0.5) weaknesses.push('Significant grammar or spelling issues detected.');
  if (skillsScore < 0.5) weaknesses.push('Few skills listed; consider adding technical or domain-specific skills.');
  if (!cand.projects?.length) weaknesses.push('No projects listed to demonstrate practical experience.');
  if (!cand.certifications?.length) weaknesses.push('No certifications mentioned.');

  if (!cand.profile_summary) recommendations.push('Add a brief professional summary highlighting key strengths.');
  if (qualityScore < 0.7) recommendations.push('Refine language: use active voice, remove buzzwords, and correct grammar.');
  if (achScore < 0.5) recommendations.push('Include more metrics in your bullet points (quantify achievements).');
  if (!cand.projects?.length) recommendations.push('Add significant projects with your role and technologies.');
  if (!cand.certifications?.length) recommendations.push('List any relevant certifications to bolster expertise.');
  if (!cand.social_links?.length) recommendations.push('Include a LinkedIn/GitHub link to enrich your profile.');

  return {
    overall_score,
    strengths: strengths.length ? strengths : ['No major strengths identified.'],
    weaknesses: weaknesses.length ? weaknesses : ['No major weaknesses found.'],
    recommendations: recommendations.length ? recommendations : ['Maintain current profile and keep it updated.']
  };
};

const getInitialValues = (data: Candidate): Partial<CandidateFormValues> => ({
  full_name: data.full_name || '',
  first_name: data.first_name || '',
  last_name: data.last_name || '',
  email: data.email || '',
  secondary_email: data.secondary_email || '',
  phone: data.phone || '',
  secondary_phone: data.secondary_phone || '',
  location: data.location || '',
  current_company: data.current_company || '',
  current_designation: data.current_designation || '',
  total_exp_months: data.total_exp_months !== null ? String(data.total_exp_months) : '',
  relevant_exp_months: data.relevant_exp_months !== null ? String(data.relevant_exp_months) : '',
  notice_period_days: data.notice_period_days !== null ? String(data.notice_period_days) : '',
  current_ctc: data.current_ctc !== null ? String(data.current_ctc) : '',
  expected_ctc: data.expected_ctc !== null ? String(data.expected_ctc) : '',
  profile_summary: data.profile_summary || '',
  educations: data.educations || [],
  employments: data.employments || [],
  certifications: data.certifications || [],
  social_links: data.social_links || [],
  tags: data.tags || []
});

export default function ViewCandidatePage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [candidateDoc, setCandidateDoc] = useState<DocumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'details' | 'resume'>('details');
  const [scoringWeights, setScoringWeights] = useState<Record<string, number> | undefined>(undefined);
  const [hasJobPostings, setHasJobPostings] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Edit Drawer States
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [hasApplications, setHasApplications] = useState(false);

  useEffect(() => {
    if (candidateId) {
      ApplicationsService.getApplications({ candidate_id: candidateId })
        .then(res => {
          const activeApps = (res.data || []).filter((app: any) => !app.is_deleted);
          setHasApplications(activeApps.length > 0);
        })
        .catch(err => console.error("Failed to check active applications", err));
    }
  }, [candidateId, isEditDrawerOpen]);

  const handleDrawerSubmit = async (data: CandidateFormValues) => {
    setIsSubmitting(true);
    setDrawerError(null);

    const payload = {
      full_name: data.full_name,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      email: data.email || undefined,
      secondary_email: data.secondary_email || undefined,
      phone: data.phone || undefined,
      secondary_phone: data.secondary_phone || undefined,
      location: data.location || undefined,
      current_company: data.current_company || undefined,
      current_designation: data.current_designation || undefined,
      total_exp_months: data.total_exp_months ? parseInt(data.total_exp_months, 10) : undefined,
      relevant_exp_months: data.relevant_exp_months ? parseInt(data.relevant_exp_months, 10) : undefined,
      notice_period_days: data.notice_period_days ? parseInt(data.notice_period_days, 10) : undefined,
      current_ctc: data.current_ctc ? parseFloat(data.current_ctc) : undefined,
      expected_ctc: data.expected_ctc ? parseFloat(data.expected_ctc) : undefined,
      profile_summary: data.profile_summary || undefined,
      educations: data.educations,
      employments: data.employments,
      certifications: data.certifications,
      social_links: data.social_links,
      tags: data.tags.map((t: any) => typeof t === 'string' ? t : t.name)
    };

    try {
      await CandidatesService.updateCandidate(candidateId, payload);
      // Inline refresh of candidate data
      const updated = await CandidatesService.getCandidate(candidateId);
      setCandidate(updated);
      setIsEditDrawerOpen(false);
    } catch (err: any) {
      setDrawerError(err?.response?.data?.message || 'Failed to update candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };


  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setIsLoading(true);
        const [candidateData, docData, weightsData] = await Promise.all([
          CandidatesService.getCandidate(candidateId),
          CandidatesService.getCandidatePrimaryDocument(candidateId).catch(() => null),
          AdminService.getScoringWeights().catch(() => null),
        ]);
        setCandidate(candidateData);
        setCandidateDoc(docData);
        if (weightsData && typeof weightsData === 'object') {
          setScoringWeights(weightsData);
        }

        try {
          const postings = await jobPostingsApi.getJobPostings();
          setHasJobPostings(postings && postings.some((p: any) => p.is_active));
        } catch (postingsErr) {
          console.error('Failed to check job postings', postingsErr);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load candidate details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidateData();
    }
  }, [candidateId]);

  const handleBack = () => {
    router.push('/candidates');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-surface overflow-y-auto w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <span className="mt-4 text-text-muted">Loading candidate details...</span>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="flex flex-col h-full bg-surface items-center justify-center p-6 text-center">
        <div className="bg-error-50 text-error p-4 rounded-full mb-4">
          <User className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Error Loading Candidate</h2>
        <p className="text-text-secondary max-w-md mb-6">{error || 'Candidate profile not found.'}</p>
        <Button variant="secondary" onClick={handleBack}>
          Back to Candidates
        </Button>
      </div>
    );
  }

  const pdfUrl = candidateDoc
    ? `${process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000')}/documents/${candidateDoc.id}/download`
    : null;

  // Keep only one linkedin and one github profile link
  const filteredSocialLinks = (() => {
    if (!candidate.social_links) return [];
    const result: typeof candidate.social_links = [];

    const linkedin = candidate.social_links.find(l => l.link_type === 'linkedin');
    if (linkedin) result.push(linkedin);

    const github = candidate.social_links.find(l => {
      if (l.link_type !== 'github') return false;
      const cleanUrl = l.url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?github\.com\/?/, '');
      return cleanUrl.split('/').filter(Boolean).length <= 1;
    }) || candidate.social_links.find(l => l.link_type === 'github');

    if (github) result.push(github);

    return result;
  })();

  const hasSocial = hasItems(filteredSocialLinks);
  const hasContact = isPresent(candidate.email) || isPresent(candidate.phone) || isPresent(candidate.location) || hasSocial;
  const hasSnapshot = isPresent(candidate.current_company) ||
    isPresent(candidate.current_designation) ||
    isPresent(candidate.total_exp_months) ||
    isPresent(candidate.relevant_exp_months) ||
    isPresent(candidate.notice_period_days);
  const hasCompensation = isPresent(candidate.current_ctc) || isPresent(candidate.expected_ctc);
  const hasAdditionalDetails = isPresent(candidate.secondary_email) || isPresent(candidate.secondary_phone);
  const hasSkills = hasItems(candidate.tags);
  const profileScore = (() => {
    if (candidate.profile_score !== null && candidate.profile_score !== undefined) {
      return {
        overall_score: Number((Number(candidate.profile_score) / 10).toFixed(1)),
        strengths: [],
        weaknesses: [],
        recommendations: [],
      };
    }
    return calculateProfileScore(candidate, scoringWeights);
  })();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Header Container */}
      <div className="p-6 border-b border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 hover:bg-subtle rounded-md text-text-secondary transition-colors"
            title="Back to candidates"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              {candidate.full_name}
              <span className="text-xs font-normal bg-brand/10 text-brand px-2.5 py-0.5 rounded-full uppercase border border-brand/20 select-none">
                {candidate.status}
              </span>
            </h1>
            <p className="text-sm text-text-secondary">
              {candidate.current_designation || 'Candidate'}
              {/* <span className="text-xs font-normal bg-brand/10 text-brand px-2.5 py-0.5 rounded-full uppercase border border-brand/20 select-none">
                {candidate.status}
              </span> */}
              {candidate.total_exp_months != null && ` • ${formatExperience(candidate.total_exp_months)}`}
            </p>
          </div>
        </div>

        {/* Tab Controls next to Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg border border-border overflow-hidden p-0.5 bg-subtle select-none">
            <button
              onClick={() => setMainTab('details')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mainTab === 'details'
                ? 'bg-surface text-brand shadow-sm border border-border/40'
                : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
            >
              Candidate Details
            </button>
            <button
              onClick={() => setMainTab('resume')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mainTab === 'resume'
                ? 'bg-surface text-brand shadow-sm border border-border/40'
                : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
            >
              Resume (PDF)
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="border-border hover:bg-subtle text-xs"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsEditDrawerOpen(true)}
              className="gap-2 text-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      {mainTab === 'resume' ? (
        <div className="p-6 bg-slate-50 flex flex-col items-center justify-center relative">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[1200px] border-none rounded-xl shadow-lg bg-surface"
              title="Candidate Resume"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="w-12 h-12 text-text-muted mb-3" />
              <p className="text-text-secondary font-medium">No resume document uploaded</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 md:p-8 space-y-6">
          {candidate.gap_details && (
            <div className="max-w-[1280px] mx-auto bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-bold text-sm">Potential Resume Gaps Identified</h5>
                <div className="text-xs leading-relaxed space-y-1">
                  {candidate.gap_details.split('; ').map((gap, i) => (
                    <p key={i}>• {gap}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-16">

            {/* Left Column (Narrower) */}
            <div className="md:col-span-1 space-y-6">

              {/* Profile Score Card */}
              <Card className="p-5 border border-border bg-surface shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                  <Award className="w-4.5 h-4.5 text-brand" />
                  <h4 className="text-sm font-bold text-text-primary">Profile Score</h4>
                </div>
                <div className="flex flex-col items-center justify-center py-2 space-y-1">
                  <div className="text-4xl font-extrabold text-brand flex items-baseline">
                    {profileScore.overall_score}
                    <span className="text-lg text-text-muted font-semibold">/10</span>
                  </div>
                  <span className="text-xs text-text-secondary font-medium">Resume & Profile Quality</span>
                </div>
              </Card>

              {/* Contact Details Card */}
              {hasContact && (
                <Card className="p-5 border border-border bg-surface shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    <Mail className="w-4 h-4 text-brand" />
                    <h4 className="text-sm font-bold text-text-primary">Contact Info</h4>
                  </div>

                  <div className="space-y-3">
                    {isPresent(candidate.email) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Email Address</span>
                        <a href={`mailto:${candidate.email}`} className="text-xs font-semibold text-brand hover:underline flex items-center gap-1.5 break-all">
                          <Mail className="w-3.5 h-3.5 shrink-0" /> {candidate.email}
                        </a>
                      </div>
                    )}
                    {isPresent(candidate.phone) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Phone Number</span>
                        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-text-secondary shrink-0" /> {candidate.phone}
                        </span>
                      </div>
                    )}
                    {isPresent(candidate.location) && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Location</span>
                        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-text-secondary shrink-0" /> {candidate.location}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Social Links Row */}
                  {hasSocial && (
                    <div className="pt-3 border-t border-border/50 flex flex-wrap gap-2">
                      {filteredSocialLinks!.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-[11px] text-text-secondary hover:bg-subtle transition-colors shadow-sm"
                        >
                          {link.link_type === 'linkedin' && <Linkedin className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          {link.link_type === 'github' && <Github className="w-3.5 h-3.5 text-text-primary shrink-0" />}
                          <span className="capitalize font-medium">{link.link_type}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Professional Snapshot & Experience Stats */}
              {hasSnapshot && (
                <Card className="p-5 border border-border bg-surface shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    <Briefcase className="w-4.5 h-4.5 text-brand" />
                    <h4 className="text-sm font-bold text-text-primary">Snapshot</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    {isPresent(candidate.current_company) && (
                      <div className="flex justify-between items-center py-1 border-b border-border/20">
                        <span className="text-text-muted font-medium">Current Company</span>
                        <span className="font-bold text-text-primary text-right pl-2">{candidate.current_company}</span>
                      </div>
                    )}
                    {isPresent(candidate.current_designation) && (
                      <div className="flex justify-between items-center py-1 border-b border-border/20">
                        <span className="text-text-muted font-medium">Current Role</span>
                        <span className="font-bold text-text-primary text-right pl-2">{candidate.current_designation}</span>
                      </div>
                    )}
                    {isPresent(candidate.total_exp_months) && (
                      <div className="flex justify-between items-center py-1 border-b border-border/20">
                        <span className="text-text-muted font-medium">Total Experience</span>
                        <span className="font-bold text-text-primary">{formatExperience(candidate.total_exp_months)}</span>
                      </div>
                    )}
                    {isPresent(candidate.relevant_exp_months) && (
                      <div className="flex justify-between items-center py-1 border-b border-border/20">
                        <span className="text-text-muted font-medium">Relevant Exp</span>
                        <span className="font-bold text-text-primary">{formatExperience(candidate.relevant_exp_months)}</span>
                      </div>
                    )}
                    {isPresent(candidate.notice_period_days) && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted font-medium">Notice Period</span>
                        <span className="font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">{candidate.notice_period_days} Days</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Skills Card */}
              {hasSkills && (
                <Card className="p-5 border border-border bg-surface shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    <Tag className="w-4.5 h-4.5 text-brand" />
                    <h4 className="text-sm font-bold text-text-primary">Skills</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {candidate.tags!.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="default"
                        className="bg-subtle text-text-secondary border border-border px-2 py-0.5 text-[11px] font-medium transition-all duration-200 hover:scale-105 hover:bg-brand/10 hover:text-brand hover:border-brand/30 cursor-default"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Compensation Details */}
              {hasCompensation && (
                <Card className="p-5 border border-border bg-surface shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    <DollarSign className="w-4.5 h-4.5 text-brand" />
                    <h4 className="text-sm font-bold text-text-primary">Compensation</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    {isPresent(candidate.current_ctc) && (
                      <div className="flex justify-between items-center py-1 border-b border-border/20">
                        <span className="text-text-muted font-medium">Current CTC</span>
                        <span className="font-bold text-text-primary">₹ {Number(candidate.current_ctc).toLocaleString()}</span>
                      </div>
                    )}
                    {isPresent(candidate.expected_ctc) && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted font-medium">Expected CTC</span>
                        <span className="font-bold text-brand">₹ {Number(candidate.expected_ctc).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Additional Details */}
              {hasAdditionalDetails && (
                <Card className="p-5 border border-border bg-surface shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    <User className="w-4.5 h-4.5 text-brand" />
                    <h4 className="text-sm font-bold text-text-primary">Additional Details</h4>
                  </div>
                  <div className="space-y-3 text-xs">
                    {isPresent(candidate.secondary_email) && (
                      <div className="flex justify-between items-center py-1 border-b border-border/20">
                        <span className="text-text-muted font-medium">Secondary Email</span>
                        <a href={`mailto:${candidate.secondary_email}`} className="font-bold text-brand hover:underline break-all max-w-[180px] truncate text-right pl-2" title={candidate.secondary_email || undefined}>
                          {candidate.secondary_email}
                        </a>
                      </div>
                    )}
                    {isPresent(candidate.secondary_phone) && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-text-muted font-medium">Secondary Phone</span>
                        <span className="font-bold text-text-primary text-right pl-2">{candidate.secondary_phone}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}


            </div>

            {/* Right Column (Wider) */}
            <div className="md:col-span-2 space-y-6">

              {/* Profile Summary Card */}
              {isPresent(candidate.profile_summary) && (
                <Card className="p-6 shadow-sm border border-border space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <FileText className="w-5 h-5 text-brand" />
                    <h3 className="text-lg font-bold text-text-primary">Profile Summary</h3>
                  </div>
                  <div
                    className="text-sm text-text-secondary leading-relaxed max-w-none prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: candidate.profile_summary! }}
                  />
                </Card>
              )}

              {/* Employment Details */}
              {hasItems(candidate.employments) && (
                <Card className="p-6 shadow-sm border border-border space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Briefcase className="w-5 h-5 text-brand" />
                    <h3 className="text-lg font-bold text-text-primary">Employment Details</h3>
                  </div>
                  <div className="space-y-6 pt-2">
                    {candidate.employments!.map((emp, index) => (
                      <div key={index} className="flex gap-4 relative">
                        {index < candidate.employments!.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-[-24px] w-0.5 bg-border" />
                        )}
                        <div className="w-5 h-5 rounded-full border-2 border-brand bg-surface shrink-0 mt-1 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                        </div>
                        <div className="space-y-2 flex-1 pb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h4 className="text-base font-bold text-text-primary">{emp.job_title || 'Employment Title'}</h4>
                            <span className="text-xs font-semibold text-text-muted flex items-center gap-1.5 bg-subtle px-2 py-1 rounded">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatMonthYear(emp.start_date)} - {emp.is_current ? 'Present' : formatMonthYear(emp.end_date)}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-text-secondary flex flex-wrap gap-x-3 gap-y-1">
                            <span>{emp.company_name}</span>
                            {emp.location && <span>• {emp.location}</span>}
                            {emp.employment_type && (
                              <span className="capitalize bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                                {emp.employment_type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          {emp.responsibilities_summary && (
                            <div
                              className="text-xs text-text-muted mt-2 leading-relaxed whitespace-pre-wrap max-w-none prose prose-sm"
                              dangerouslySetInnerHTML={{ __html: emp.responsibilities_summary }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Education Details */}
              {hasItems(candidate.educations) && (
                <Card className="p-6 shadow-sm border border-border space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <GraduationCap className="w-5 h-5 text-brand" />
                    <h3 className="text-lg font-bold text-text-primary">Educational Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {candidate.educations!.map((ed, index) => (
                      <div key={index} className="p-4 border border-border rounded-xl bg-subtle/30 space-y-3 relative shadow-sm hover:shadow transition-shadow">
                        {ed.is_highest && (
                          <span className="absolute top-4 right-4 text-[10px] font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full border border-brand/20">
                            Highest Qualification
                          </span>
                        )}
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-bold text-text-primary">
                            {ed.degree || ed.qualification_level || 'Education'}
                          </h4>
                          {ed.field_of_study && (
                            <p className="text-xs text-brand font-semibold">Specialization: {ed.field_of_study}</p>
                          )}
                          {ed.qualification_level && ed.degree && ed.degree.toLowerCase() !== ed.qualification_level.toLowerCase() && (
                            <p className="text-xs text-text-secondary">Level: <span className="capitalize">{ed.qualification_level}</span></p>
                          )}
                          <p className="text-xs font-semibold text-text-secondary">{ed.institution_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50 text-text-muted">
                          <div>
                            <span className="block font-semibold uppercase tracking-wider text-[10px]">Duration</span>
                            <span>{ed.start_year ? `${ed.start_year} - ` : ''}{ed.end_year || 'Present'}</span>
                          </div>
                          {ed.grade_or_percentage && (
                            <div>
                              <span className="block font-semibold uppercase tracking-wider text-[10px]">Grade / Percentage</span>
                              <span>{ed.grade_or_percentage}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Projects */}
              {hasItems(candidate.projects) && (
                <Card className="p-6 shadow-sm border border-border space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Folder className="w-5 h-5 text-brand" />
                    <h3 className="text-lg font-bold text-text-primary">Projects</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {candidate.projects!.map((proj, index) => (
                      <div key={index} className="p-4 border border-border rounded-xl bg-subtle/30 space-y-3 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2 truncate">
                              <Folder className="w-4.5 h-4.5 text-brand shrink-0" /> {proj.title}
                            </h4>
                            {proj.duration && <span className="text-[11px] font-semibold text-text-muted shrink-0">{proj.duration}</span>}
                          </div>
                          {proj.role && <p className="text-xs font-semibold text-text-secondary">{proj.role}</p>}
                          {proj.description && <p className="text-xs text-text-muted leading-relaxed">{proj.description}</p>}
                        </div>
                        {proj.technologies && (
                          <div className="pt-2">
                            <span className="text-[10px] font-semibold text-brand/90 bg-brand/5 border border-brand/10 inline-block px-2 py-0.5 rounded">
                              Technologies: {proj.technologies}
                            </span>
                          </div>
                        )}
                        {proj.project_url && (
                          <div className="pt-2 border-t border-border/50">
                            <a
                              href={proj.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Project Link
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Certifications */}
              {hasItems(candidate.certifications) && (
                <Card className="p-6 shadow-sm border border-border space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Award className="w-5 h-5 text-brand" />
                    <h3 className="text-lg font-bold text-text-primary">Certifications</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {candidate.certifications!.map((cert, index) => (
                      <div key={index} className="p-4 border border-border rounded-xl bg-subtle/30 flex items-start gap-3 shadow-sm hover:shadow transition-shadow">
                        <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-text-primary">{cert.certification_name}</h4>
                            {cert.credential_url && (
                              <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-brand">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-text-secondary">{cert.issuer}</p>
                          <p className="text-[11px] text-text-muted">
                            {cert.issued_on ? `Issued: ${formatMonthYear(cert.issued_on)}` : ''}
                            {cert.does_not_expire
                              ? ' • Does not expire'
                              : cert.expiry_on
                                ? ` • Expires: ${formatMonthYear(cert.expiry_on)}`
                                : ''
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            </div>

          </div>
        </div>
      )}


      {isEditDrawerOpen && candidate && (
        <DrawerShell80
          title="Edit Candidate Profile"
          onClose={() => setIsEditDrawerOpen(false)}
        >
          <div className="max-w-4xl mx-auto py-4">
            {drawerError && (
              <div className="bg-error-50 border border-error p-3 rounded-lg mb-6 text-error text-xs font-semibold">
                {drawerError}
              </div>
            )}
            <CandidateForm 
              mode="edit"
              initialValues={getInitialValues(candidate)}
              onSubmit={handleDrawerSubmit}
              onCancel={() => setIsEditDrawerOpen(false)}
              isSubmitting={isSubmitting}
              submitError={drawerError}
              hasApplications={hasApplications}
            />
          </div>
        </DrawerShell80>
      )}
    </div>
  );
}
