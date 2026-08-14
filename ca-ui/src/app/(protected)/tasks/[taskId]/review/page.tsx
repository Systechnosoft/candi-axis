'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TasksService, Task } from '@/lib/api/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { RichTextEditor } from '@/components/primitives/RichTextEditor';
import { 
  ArrowLeft, CheckCircle2, XCircle, Loader2, Mail, Phone, MapPin, 
  Briefcase, FileText, AlertCircle, ExternalLink, Calendar, User, 
  Award, Globe, ClipboardList, Linkedin, Github, GraduationCap, Folder, Tag, Star,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CandidateReviewPage() {
  const router = useRouter();
  const { taskId } = useParams() as { taskId: string };
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    task: Task & { submitted_by_name?: string };
    candidate: any;
    jobDescription: any;
    fitScore: number | null;
    resumeDoc: any;
  } | null>(null);

  const [mainTab, setMainTab] = useState<'details' | 'resume'>('details');

  // Form states
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Collapsible accordion states
  const [jdOpen, setJdOpen] = useState(false);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        const res = await TasksService.getTask(taskId);
        setData(res);
        if (res.task?.feedback_action) {
          setAction(res.task.feedback_action as any);
        }
      } catch (err: any) {
        console.error('Failed to load review task details:', err);
        setError(err.response?.data?.message || 'Failed to load task details.');
      } finally {
        setLoading(false);
      }
    };
    fetchTaskDetails();
  }, [taskId]);

  const handleSubmitFeedback = async () => {
    if (!action) {
      toast.error('Please select Approve or Reject');
      return;
    }
    if (action === 'reject' && !reason.replace(/<[^>]*>/g, '').trim()) {
      toast.error('Please provide a reason for your decision');
      return;
    }

    try {
      setSubmitting(true);
      const res = await TasksService.submitFeedback(taskId, action, reason);
      if (res.success) {
        toast.success(res.message);
        // Reload details to show completed state
        const updated = await TasksService.getTask(taskId);
        setData(updated);
      } else {
        toast.error(res.message || 'Failed to submit feedback.');
      }
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toast.error(err.response?.data?.message || 'Error submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToTasks = () => {
    router.push('/tasks');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
        <p className="text-text-secondary font-medium">Loading review workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 border border-border rounded-xl bg-surface">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h3 className="text-lg font-bold text-text-primary mb-2">Error Loading Review</h3>
        <p className="text-text-secondary text-sm mb-6">{error || 'Review task details could not be found.'}</p>
        <Button variant="secondary" onClick={handleBackToTasks}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const { task, candidate, jobDescription, fitScore, resumeDoc } = data;
  const isCompleted = task.submitted_on !== null || !task.is_active;
 
  const isInterviewer = session?.roles.includes('interviewer') &&
    !session?.roles.includes('hr_recruiter') &&
    !session?.roles.includes('hiring_manager') &&
    !session?.roles.includes('admin') &&
    !session?.roles.includes('super_admin');
 
  if (isCompleted && isInterviewer) {
    return (
      <div className="flex flex-col min-h-screen bg-surface">
        <div className="p-6 border-b border-border bg-surface flex items-center gap-3 shadow-sm shrink-0">
          <button
            onClick={handleBackToTasks}
            className="p-1.5 hover:bg-subtle rounded-md text-text-secondary transition-colors"
            title="Back to tasks"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Screening Review</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <Card className="max-w-md w-full border border-border bg-surface shadow-md rounded-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto border border-success/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-primary">Review Processed</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                This review task has already been completed. You no longer have access to evaluate this candidate&apos;s profile.
              </p>
            </div>
            
            <div className="pt-4 border-t border-border">
              <Button variant="secondary" onClick={handleBackToTasks} className="w-full font-bold">
                Back to Tasks
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Build PDF resume URL using environment or fallback
  const pdfUrl = resumeDoc
    ? `${process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000')}/documents/${resumeDoc.id}/download`
    : null;

  // Convert raw DB fit score (out of 100) to out of 10
  const overallScore = fitScore !== null ? Number(fitScore) / 10 : null;

  // Helpers
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

  const filteredSocialLinks = (() => {
    if (!candidate?.social_links) return [];
    return candidate.social_links.filter((l: any) => 
      l.link_type === 'linkedin' || 
      l.link_type === 'github' || 
      l.link_type === 'portfolio' || 
      l.link_type === 'website'
    );
  })();

  const hasSocial = hasItems(filteredSocialLinks);
  const hasContact = isPresent(candidate?.email) || isPresent(candidate?.phone) || isPresent(candidate?.location) || hasSocial;

  // Derive matching skills exactly matching the SkillRatingPanel logic
  const jdSkillNames = (jobDescription?.tags || []).map((t: any) => t.name.toLowerCase());
  const candidateSkills = (candidate?.tags || [])
    .filter((t: any) => t.type === 'skill')
    .map((t: any) => t.name);

  const uniqueMatchingSkills = (() => {
    const list = candidateSkills.filter((skill: string) =>
      jdSkillNames.some((jds: string) => skill.toLowerCase().includes(jds) || jds.includes(skill.toLowerCase()))
    );
    const seen = new Set<string>();
    const res: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const lower = list[i].toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        res.push(list[i]);
      }
    }
    return res;
  })();

  const getSkillRating = (idx: number, skillName: string) => {
    const isMatching = jdSkillNames.some((jds: string) => skillName.toLowerCase().includes(jds) || jds.includes(skillName.toLowerCase()));
    const base = isMatching ? 4.5 : 3.5;
    const rating = Math.max(3.0, Math.min(5.0, base - (idx * 0.15)));
    return rating;
  };

  const displaySkillsList = uniqueMatchingSkills.slice(0, 6);
  const hasSkills = (candidate?.tags || []).some((t: any) => t.type === 'skill');

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Header Container */}
      <div className="p-6 border-b border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToTasks}
            className="p-1.5 hover:bg-subtle rounded-md text-text-secondary transition-colors"
            title="Back to tasks"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              {task.name || 'Screening Review'}
            </h1>
            <p className="text-sm text-text-secondary">
              Reviewing for position: <strong className="text-text-primary">{jobDescription?.title} ({jobDescription?.code || 'N/A'})</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 px-3 py-1 text-xs">
              <ClipboardList className="w-3.5 h-3.5" />
              Pending Review
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Completed State Banner */}
        {isCompleted && (
          <Card className="border border-success/30 bg-success/5 shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-start gap-4">
              <CheckCircle2 className="w-8 h-8 text-success shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-bold text-success text-base">Screening Review Processed</h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  This review task was completed by <strong>{task.submitted_by_name || 'Another Reviewer'}</strong>.
                </p>
                <div className="border-t border-success/15 pt-2 mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Decision Outcome:</span>
                    <Badge variant={task.feedback_action === 'approve' ? 'success' : 'error'} className="font-bold uppercase text-[10px]">
                      {task.feedback_action}
                    </Badge>
                  </div>
                  {task.feedback_reason && (
                    <div className="text-xs text-text-secondary bg-surface border border-success/10 p-3 rounded-lg">
                      <span className="font-bold block text-text-muted mb-1">Feedback Reason:</span>
                      <div 
                        className="prose prose-xs max-w-none text-text-primary ql-editor p-0" 
                        dangerouslySetInnerHTML={{ __html: task.feedback_reason }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collapsible Job Description Details */}
        {jobDescription && (
          <Card className="border border-border bg-surface shadow-sm rounded-xl overflow-hidden">
            <button
              onClick={() => setJdOpen(!jdOpen)}
              className="w-full flex items-center justify-between p-4 bg-subtle/20 hover:bg-subtle/40 transition-colors font-bold text-text-primary text-sm"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-brand" />
                <span>Job Description Details ({jobDescription.title})</span>
              </div>
              {jdOpen ? (
                <ChevronUp className="w-4 h-4 text-text-secondary" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              )}
            </button>
            {jdOpen && (
              <CardContent className="p-6 border-t border-border/50 space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Role Title</span>
                  <p className="font-semibold text-text-primary">{jobDescription.title} ({jobDescription.code || 'N/A'})</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/25">
                  <div>
                    <span className="text-text-muted block text-[10px] font-medium">Location</span>
                    <strong className="text-text-secondary">{jobDescription.location || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[10px] font-medium">Work Mode</span>
                    <strong className="text-text-secondary capitalize">{jobDescription.work_mode || 'N/A'}</strong>
                  </div>
                </div>

                {jobDescription.job_summary && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Summary</span>
                    <div 
                      className="prose prose-xs max-w-none text-text-secondary ql-editor p-0 text-xs"
                      dangerouslySetInnerHTML={{ __html: jobDescription.job_summary }}
                    />
                  </div>
                )}

                {jobDescription.must_have_text && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Must-Have Skills</span>
                    <div 
                      className="prose prose-xs max-w-none text-text-secondary ql-editor p-0 text-xs"
                      dangerouslySetInnerHTML={{ __html: jobDescription.must_have_text }}
                    />
                  </div>
                )}

                {jobDescription.nice_to_have_text && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nice-to-Have Skills</span>
                    <div 
                      className="prose prose-xs max-w-none text-text-secondary ql-editor p-0 text-xs"
                      dangerouslySetInnerHTML={{ __html: jobDescription.nice_to_have_text }}
                    />
                  </div>
                )}

                {jobDescription.responsibilities_text && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Responsibilities</span>
                    <div 
                      className="prose prose-xs max-w-none text-text-secondary ql-editor p-0 text-xs"
                      dangerouslySetInnerHTML={{ __html: jobDescription.responsibilities_text }}
                    />
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Collapsible Candidate Details */}
        {candidate && (
          <Card className="border border-border bg-surface shadow-sm rounded-xl overflow-hidden">
            <button
              onClick={() => setCandidateOpen(!candidateOpen)}
              className="w-full flex items-center justify-between p-4 bg-subtle/20 hover:bg-subtle/40 transition-colors font-bold text-text-primary text-sm"
            >
              <div className="flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-brand" />
                <span>Candidate Profile Details ({candidate.full_name})</span>
              </div>
              {candidateOpen ? (
                <ChevronUp className="w-4 h-4 text-text-secondary" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              )}
            </button>
            {candidateOpen && (
              <CardContent className="p-6 border-t border-border/50 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left sidebar info inside collapsible */}
                  <div className="md:col-span-1 space-y-4">
                    {/* Match Score */}
                    <Card className="p-4 border border-border/60 bg-subtle/10 space-y-2">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">JD Match Score</span>
                      <div className="text-2xl font-extrabold text-brand flex items-baseline">
                        {overallScore !== null ? overallScore.toFixed(1) : 'N/A'}
                        <span className="text-sm text-text-muted font-semibold">/10</span>
                      </div>
                    </Card>

                    {/* Resume PDF Toggle */}
                    {pdfUrl && (
                      <Card className="p-4 border border-border/60 bg-subtle/10 space-y-3">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Resume document</span>
                        <Button 
                          variant="secondary" 
                          onClick={() => setShowResume(!showResume)}
                          className="w-full gap-2 font-semibold text-xs py-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {showResume ? 'Hide Resume PDF' : 'Show Resume PDF'}
                        </Button>
                      </Card>
                    )}

                    {/* Contact details */}
                    {hasContact && (
                      <Card className="p-4 border border-border/60 bg-subtle/10 space-y-2 text-xs">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Contact Info</span>
                        {candidate.email && <p className="truncate"><strong>Email:</strong> {candidate.email}</p>}
                        {candidate.phone && <p><strong>Phone:</strong> {candidate.phone}</p>}
                        {candidate.location && <p><strong>Location:</strong> {candidate.location}</p>}
                        {hasSocial && (
                          <div className="pt-2 border-t border-border/30 flex flex-wrap gap-1.5">
                            {filteredSocialLinks.map((link: any, idx: number) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border text-[9px] text-text-secondary hover:bg-subtle"
                              >
                                <span className="capitalize">{link.link_type}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </Card>
                    )}
                  </div>

                  {/* Right main info inside collapsible */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Resume PDF view */}
                    {showResume && pdfUrl && (
                      <div className="border border-border rounded-xl overflow-hidden shadow-inner">
                        <iframe
                          src={pdfUrl}
                          className="w-full h-[500px] border-none"
                          title="Candidate Resume"
                        />
                      </div>
                    )}

                    {/* Profile Summary */}
                    {isPresent(candidate.profile_summary) && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Profile Summary</h4>
                        <div
                          className="text-xs text-text-secondary leading-relaxed prose prose-xs"
                          dangerouslySetInnerHTML={{ __html: candidate.profile_summary }}
                        />
                      </div>
                    )}

                    {/* Skills */}
                    {displaySkillsList.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Matching Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {displaySkillsList.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="default" className="text-[10px]">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Sections */}
                <div className="border-t border-border/30 pt-4 space-y-4 text-xs">
                  {/* Employments */}
                  {hasItems(candidate.employments) && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-text-primary uppercase tracking-wider text-[10px]">Employment History</h4>
                      <div className="space-y-2">
                        {candidate.employments.map((emp: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-brand/50 pl-3 py-0.5">
                            <p className="font-semibold">{emp.job_title} @ {emp.company_name}</p>
                            <p className="text-[10px] text-text-muted">
                              {formatMonthYear(emp.start_date)} - {emp.is_current ? 'Present' : formatMonthYear(emp.end_date)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Educations */}
                  {hasItems(candidate.educations) && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-text-primary uppercase tracking-wider text-[10px]">Education</h4>
                      <div className="space-y-2">
                        {candidate.educations.map((ed: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-brand/35 pl-3 py-0.5">
                            <p className="font-semibold">{ed.degree || ed.qualification_level} in {ed.field_of_study}</p>
                            <p className="text-[10px] text-text-muted">{ed.institution_name} ({ed.end_year})</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Feedback Submission card in center */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="bg-brand/5 border-b border-border/80 px-6 py-4">
            <h3 className="font-bold text-brand text-base flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-brand" />
              {isCompleted ? 'Interviewer Feedback Submitted' : 'Submit Interviewer Feedback'}
            </h3>
          </div>
          <CardContent className="p-6 space-y-6">
            {isCompleted ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-text-secondary">Decision Outcome:</span>
                    <Badge variant={task.feedback_action === 'approve' ? 'success' : 'error'} className="font-bold uppercase text-[10px]">
                      {task.feedback_action}
                    </Badge>
                  </div>
                  {task.submitted_on && (
                    <span className="text-xs text-text-muted flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.submitted_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {task.submitted_by_name && (
                  <div className="text-xs text-text-secondary">
                    Submitted by: <strong className="text-text-primary">{task.submitted_by_name}</strong>
                  </div>
                )}
                {task.feedback_reason && (
                  <div className="text-xs text-text-secondary bg-subtle/30 border border-border p-4 rounded-lg">
                    <span className="font-bold block text-text-muted mb-2 uppercase tracking-wider text-[10px]">Justification / Reason</span>
                    <div 
                      className="prose prose-xs max-w-none text-text-primary ql-editor p-0" 
                      dangerouslySetInnerHTML={{ __html: task.feedback_reason }} 
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Decision Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Your Decision</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setAction('approve')}
                      className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-bold transition-all duration-200 ${
                        action === 'approve'
                          ? 'bg-success text-white border-success shadow-md shadow-success/10'
                          : 'bg-surface border-border hover:bg-brand/5 hover:border-brand hover:text-brand text-text-muted'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Approve Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction('reject')}
                      className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-bold transition-all duration-200 ${
                        action === 'reject'
                          ? 'bg-danger text-white border-danger shadow-md shadow-danger/10'
                          : 'bg-surface border-border hover:bg-brand/5 hover:border-brand hover:text-brand text-text-muted'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Profile
                    </button>
                  </div>
                </div>

                {/* Reason RichTextArea */}
                {action && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      Reason {action === 'reject' ? <span className="text-danger">*</span> : <span className="text-text-muted"></span>}
                    </label>
                    <RichTextEditor
                      value={reason}
                      onChange={setReason}
                      placeholder={action === 'reject' ? "Please provide specific details explaining why this candidate was rejected..." : "Provide any optional details about skills matching, experience fit..."}
                    />
                  </div>
                )}

                {/* Submit button */}
                <div className="border-t border-border pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSubmitFeedback}
                    disabled={submitting}
                    className="gap-2 font-bold px-6 py-2.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting Decision...
                      </>
                    ) : (
                      'Submit Recommendation'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
