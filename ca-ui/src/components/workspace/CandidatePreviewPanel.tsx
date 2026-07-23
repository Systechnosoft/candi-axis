/**
 * File: ats-ui/src/components/workspace/CandidatePreviewPanel.tsx
 * Modified: May 2026
 * Changes:
 * - Removed absolute heights (h-full) and internal vertical scrollbars to support unified page scrolling.
 * - Retained PDF iframe constraints for standard document viewer usability.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Candidate } from '@/types/candidates';
import { CandidateMatch } from '@/types/job-descriptions';
import { ResumeDetailsToggle } from './ResumeDetailsToggle';
import { CandidatesService } from '@/lib/api/candidates';
import {
  Mail, Phone, MapPin, ExternalLink, Calendar, Briefcase,
  BookOpen, Award, FileText, CheckCircle2, ChevronRight, Loader2, Link2, Plus
} from 'lucide-react';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import Link from 'next/link';
import { formatToMonYear, formatToHtmlBullets } from '@/lib/utils';
import { JobPosting } from '@/types/job-postings';
import { ApplicationsService } from '@/lib/api/applications';
import { toast } from 'react-hot-toast';

interface CandidatePreviewPanelProps {
  candidateId: string | null;
  matchInfo: CandidateMatch | null;
  activeView: 'details' | 'resume';
  onViewChange: (view: 'details' | 'resume') => void;
  onFetchCandidateDetails: (id: string) => Promise<Candidate>;
  hasStoredMatches: boolean;
  associatedPosting?: JobPosting | null;
  onAddSuccess?: (candidateId: string) => void;
}

type TabType = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications';

export const CandidatePreviewPanel: React.FC<CandidatePreviewPanelProps> = ({
  candidateId,
  matchInfo,
  activeView,
  onViewChange,
  onFetchCandidateDetails,
  hasStoredMatches,
  associatedPosting,
  onAddSuccess,
}) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [addingToPosting, setAddingToPosting] = useState(false);

  const handleAddToPosting = async () => {
    if (!candidateId || !associatedPosting) return;
    setAddingToPosting(true);
    try {
      await ApplicationsService.createApplication({
        candidate_id: candidateId,
        jd_id: associatedPosting.jd_id,
        source: 'manual',
      });
      toast.success(`Candidate successfully added to posting "${associatedPosting.name}"`);
      if (onAddSuccess) {
        onAddSuccess(candidateId);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add candidate to posting');
    } finally {
      setAddingToPosting(false);
    }
  };

  useEffect(() => {
    const loadDetails = async () => {
      if (!candidateId) return;
      setLoading(true);
      setDocumentId(null);
      try {
        const data = await onFetchCandidateDetails(candidateId);
        
        // Format summaries to clean HTML lists for rendering
        const formattedCandidate: Candidate = {
          ...data,
          profile_summary: formatToHtmlBullets(data.profile_summary),
          employments: (data.employments || []).map(emp => ({
            ...emp,
            responsibilities_summary: formatToHtmlBullets(emp.responsibilities_summary)
          }))
        };
        
        setCandidate(formattedCandidate);
        const doc = await CandidatesService.getCandidatePrimaryDocument(candidateId);
        if (doc && doc.id) {
          setDocumentId(doc.id);
        }
      } catch (err) {
        console.error('Failed to load candidate details', err);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [candidateId, onFetchCandidateDetails]);

  if (!candidateId || !matchInfo) {
    return (
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-12 text-center min-w-0">
        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-6 border border-dashed border-slate-200">
          <FileText className="w-10 h-10 animate-bounce text-slate-300" />
        </div>
        {!hasStoredMatches ? (
          <>
            <h3 className="text-lg font-bold text-text-primary">No matching candidates found</h3>
            <p className="text-sm text-text-muted mt-2 max-w-sm">
              Click Rematch to generate fresh candidate matches.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-text-primary">Select a candidate</h3>
            <p className="text-sm text-text-muted mt-2 max-w-sm">
              Choose a candidate from the left panel to view their detailed profile, key match points, and parsed resume.
            </p>
          </>
        )}
      </div>
    );
  }

  if (loading || !candidate) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-12 min-w-0">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
        <p className="text-sm text-text-secondary mt-4 font-semibold">Loading Candidate Profile...</p>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'certifications', label: 'Certifications' },
  ];

  return (
    <div className="flex-1 bg-slate-50 flex flex-col min-w-0">
      {/* Candidate Header Row */}
      <div className="bg-white border-b border-border p-6 shrink-0 flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4 shadow-sm relative z-10">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-lg select-none shadow-inner shrink-0 mt-0.5">
            {getInitials(candidate.full_name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-text-primary truncate">{candidate.full_name}</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                {matchInfo.similarity_score}% Match
              </span>
            </div>

            <p className="text-sm text-text-secondary font-medium mt-1 truncate">
              {candidate.current_designation || 'Candidate'} {candidate.current_company ? `at ${candidate.current_company}` : ''}
              {candidate.total_exp_months != null && ` • ${(candidate.total_exp_months / 12).toFixed(1)} Yrs`}
            </p>

            {/* Sub Header Contacts */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-text-muted">
              {candidate.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 animate-pulse text-brand" />
                  {candidate.email}
                </span>
              )}
              {candidate.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {candidate.phone}
                </span>
              )}
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {candidate.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toggle and View Profile */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full 2xl:w-auto justify-between 2xl:justify-end">
          <ResumeDetailsToggle activeView={activeView} onViewChange={onViewChange} />

          {associatedPosting && (
            <Button
              onClick={handleAddToPosting}
              disabled={addingToPosting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white hover:bg-brand-dark text-xs font-bold rounded-lg transition-colors shadow-sm h-8"
            >
              {addingToPosting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add to Posting
            </Button>
          )}

          <a
            href={`/candidates/${candidate.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-text-primary rounded-lg border border-slate-200 transition-colors"
          >
            View Full Details
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 p-6">
        {activeView === 'details' ? (
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            {/* Inner Details Tab Header */}
            <div className="flex border-b border-border bg-slate-50/50 overflow-x-auto shrink-0 select-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-brand text-brand bg-white'
                      : 'border-transparent text-text-muted hover:text-text-primary hover:bg-slate-50/30'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Inner Details Tab Content */}
            <div className="p-6 flex-1 text-sm text-text-secondary leading-relaxed">
              {activeTab === 'summary' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="font-bold text-text-primary text-base">Professional Summary</h3>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl italic text-text-secondary relative">
                    <span className="text-4xl text-brand/20 absolute -top-1 -left-1 font-serif select-none">“</span>
                    <div 
                      className="relative z-10 pl-4 prose prose-sm max-w-none text-sm text-text-secondary leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: candidate.profile_summary || 'No summary statement provided.' }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'experience' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="font-bold text-text-primary text-base">Work Experience</h3>
                  {!candidate.employments || candidate.employments.length === 0 ? (
                    <p className="text-text-muted italic">No employment details listed.</p>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {candidate.employments.map((job, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-[20px] w-3 h-3 rounded-full bg-brand border-2 border-white ring-4 ring-brand/10 z-10" />
                          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-1">
                            <div>
                              <h4 className="font-bold text-text-primary text-sm">{job.job_title || 'Software Developer'}</h4>
                              <p className="text-xs text-brand font-semibold mt-0.5">{job.company_name}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 sm:mt-0 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{formatToMonYear(job.start_date)}</span>
                              <span>–</span>
                              <span>{job.is_current ? 'Present' : formatToMonYear(job.end_date)}</span>
                            </div>
                          </div>

                          {job.responsibilities_summary && (
                            <div 
                              className="mt-2.5 text-xs text-text-secondary bg-slate-50/50 p-3 rounded-xl border border-slate-100 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: job.responsibilities_summary }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'education' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="font-bold text-text-primary text-base">Academic Qualifications</h3>
                  {!candidate.educations || candidate.educations.length === 0 ? (
                    <p className="text-text-muted italic">No academic details listed.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidate.educations.map((edu, index) => (
                        <div key={index} className="p-4 border border-border rounded-2xl bg-white shadow-sm flex gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-text-secondary shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-text-primary text-sm truncate">
                              {edu.degree || 'Degree'} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                            </h4>
                            <p className="text-xs text-text-secondary font-medium mt-0.5">{edu.institution_name}</p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-text-muted font-bold">
                              <span>Class of {edu.end_year || 'N/A'}</span>
                              {edu.grade_or_percentage && (
                                <>
                                  <span>•</span>
                                  <span className="text-brand">Grade: {edu.grade_or_percentage}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="font-bold text-text-primary text-base">Core Competencies</h3>
                  {(!matchInfo.skills || matchInfo.skills.length === 0) ? (
                    <p className="text-text-muted italic">No parsed skill tags found.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {matchInfo.skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-brand/5 border border-brand/20 text-brand text-xs font-bold px-3 py-1 rounded-xl shadow-sm transition-all hover:bg-brand hover:text-white cursor-default"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h3 className="font-bold text-text-primary text-base">Key Projects</h3>
                  {!candidate.projects || candidate.projects.length === 0 ? (
                    <p className="text-text-muted italic">No explicit projects listed.</p>
                  ) : (
                    <div className="space-y-4">
                      {candidate.projects.map((proj, index) => (
                        <div key={index} className="p-4 border border-border bg-white rounded-2xl shadow-sm relative">
                          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-1">
                            <div>
                              <h4 className="font-bold text-text-primary text-sm">{proj.title}</h4>
                              {proj.role && (
                                <p className="text-xs text-brand font-semibold mt-0.5">{proj.role}</p>
                              )}
                            </div>
                            {proj.duration && (
                              <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 sm:mt-0 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{proj.duration}</span>
                              </div>
                            )}
                          </div>

                          {proj.technologies && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {proj.technologies.split(',').map((tech) => (
                                <span key={tech.trim()} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                                  {tech.trim()}
                                </span>
                              ))}
                            </div>
                          )}

                          {proj.description && (
                            <p className="mt-2 text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                              {proj.description}
                            </p>
                          )}

                          {proj.project_url && (
                            <div className="mt-3 flex justify-end">
                              <Link href={proj.project_url} target="_blank">
                                <button className="flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-dark transition-colors">
                                  View Project
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'certifications' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="font-bold text-text-primary text-base">Professional Certifications</h3>
                  {!candidate.certifications || candidate.certifications.length === 0 ? (
                    <p className="text-text-muted italic">No certifications listed.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidate.certifications.map((cert, index) => (
                        <div key={index} className="p-4 border border-border bg-white rounded-2xl flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-text-primary text-xs leading-snug">{cert.certification_name}</h4>
                              <p className="text-[10px] text-text-muted font-medium mt-0.5">
                                {cert.issuer || 'Professional Board'}
                                {(cert.issued_on || cert.does_not_expire || cert.expiry_on) && (
                                  <>
                                    {' • '}
                                    {cert.issued_on ? `Issued: ${formatToMonYear(cert.issued_on)}` : ''}
                                    {cert.does_not_expire ? ' • No Expiry' : (cert.expiry_on ? ` • Expires: ${formatToMonYear(cert.expiry_on)}` : '')}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {cert.credential_url && (
                            <Link href={cert.credential_url} target="_blank">
                              <button className="text-brand hover:text-brand-dark p-1 rounded hover:bg-brand/5">
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Real uploaded PDF resume view */
          <div className="w-full h-full bg-slate-100 rounded-2xl border border-border overflow-hidden flex flex-col items-center justify-center min-h-[600px]">
            {documentId ? (
              <iframe
                src={`${process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000')}/documents/${documentId}/download`}
                className="w-full h-full border-none rounded-2xl"
                style={{ minHeight: 'calc(100vh - 240px)' }}
                title={`${candidate.full_name} Resume`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-16 h-16 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-400 mb-4 border border-dashed border-slate-300">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-sm font-bold text-text-primary">No Original PDF Resume</h4>
                <p className="text-xs text-text-muted mt-2 max-w-xs leading-relaxed">
                  This candidate has no uploaded PDF document (manually added profile) or the resume document is unavailable.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
