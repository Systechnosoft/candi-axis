import React, { useState, useEffect } from 'react';
import { CandidatesService } from '@/lib/api/candidates';
import { Candidate, DocumentResponse } from '@/types/candidates';
import { Card, CardContent } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import { 
  Loader2, Mail, Phone, MapPin, Briefcase, FileText, User, 
  ExternalLink, GraduationCap, Code, Folder, Award, ChevronDown, Book, Plus
} from 'lucide-react';
import { formatToHtmlBullets } from '@/lib/utils';
import { JobPosting } from '@/types/job-postings';
import { ApplicationsService } from '@/lib/api/applications';
import { toast } from 'react-hot-toast';

interface CandidateFullProfileViewProps {
  candidateId: string | null;
  overallMatchScore: number | null;
  showViewFullProfile?: boolean;
  associatedPosting?: JobPosting | null;
  onAddSuccess?: (candidateId: string) => void;
}

type MainTab = 'details' | 'resume';
type SubTab = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications';

export const CandidateFullProfileView: React.FC<CandidateFullProfileViewProps> = ({
  candidateId,
  overallMatchScore,
  showViewFullProfile = true,
  associatedPosting,
  onAddSuccess,
}) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [document, setDocument] = useState<DocumentResponse | null>(null);
  
  const [mainTab, setMainTab] = useState<MainTab>('details');
  const [subTab, setSubTab] = useState<SubTab>('summary');
  const [loading, setLoading] = useState(false);
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
    const fetchProfile = async () => {
      if (!candidateId) return;
      try {
        setLoading(true);
        setMainTab('details');
        setSubTab('summary');
        const [candidateData, docData] = await Promise.all([
          CandidatesService.getCandidate(candidateId),
          CandidatesService.getCandidatePrimaryDocument(candidateId).catch(() => null),
        ]);
        
        // Format summaries to clean HTML lists for rendering
        const formattedCandidate: Candidate = {
          ...candidateData,
          profile_summary: formatToHtmlBullets(candidateData.profile_summary),
          employments: (candidateData.employments || []).map(emp => ({
            ...emp,
            responsibilities_summary: formatToHtmlBullets(emp.responsibilities_summary)
          }))
        };
        
        setCandidate(formattedCandidate);
        setDocument(docData);
      } catch (err) {
        console.error('Failed to fetch candidate details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [candidateId]);

  if (!candidateId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-xl bg-subtle/20 h-auto min-h-[400px]">
        <User className="w-12 h-12 text-text-muted mb-3" />
        <p className="text-text-secondary font-medium">Select a candidate to view details</p>
      </div>
    );
  }

  if (loading || !candidate) {
    return (
      <div className="flex items-center justify-center h-auto min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  const pdfUrl = document 
    ? `${process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000')}/documents/${document.id}/download` 
    : null;

  return (
    <Card className="border border-border shadow-sm bg-surface overflow-visible h-auto flex flex-col">
      {/* Candidate Header */}
      <div className="p-6 border-b border-border bg-subtle/10">
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xl font-bold border border-brand/20 select-none shrink-0">
              {candidate.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-text-primary truncate">{candidate.full_name}</h2>
                {overallMatchScore !== null && (
                  <Badge variant={overallMatchScore >= 7 ? 'success' : overallMatchScore >= 4 ? 'info' : 'error'} className="shrink-0">
                    {overallMatchScore.toFixed(1)}/10 Match
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-text-secondary truncate">
                {candidate.current_designation || 'Designation not specified'} 
                {candidate.total_exp_months ? ` • ${Math.round(candidate.total_exp_months / 12 * 10) / 10} Yrs` : ''}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted pt-1">
                {candidate.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-brand" />
                    <span>{candidate.email}</span>
                  </div>
                )}
                {candidate.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{candidate.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center 2xl:flex-col 2xl:items-end gap-3 shrink-0 w-full 2xl:w-auto justify-between 2xl:justify-end">
            {/* Dual Segmented Toggle Group */}
            <div className="flex rounded-lg border border-border overflow-hidden p-0.5 bg-subtle/40 select-none">
              <button
                onClick={() => setMainTab('details')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mainTab === 'details'
                    ? 'bg-surface text-brand shadow-sm border border-border/40'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
              >
                Candidate Details
              </button>
              <button
                onClick={() => setMainTab('resume')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mainTab === 'resume'
                    ? 'bg-surface text-brand shadow-sm border border-border/40'
                    : 'text-text-muted hover:text-text-secondary border border-transparent'
                }`}
              >
                Resume (PDF)
              </button>
            </div>

            {associatedPosting && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddToPosting}
                disabled={addingToPosting}
                className="gap-1.5 text-xs py-1.5 px-3 h-auto"
              >
                {addingToPosting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Add to Posting
              </Button>
            )}

            {showViewFullProfile && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => window.open(`/candidates/${candidate.id}`, '_blank')}
                className="gap-1.5 bg-surface hover:bg-subtle text-xs py-1.5 px-3 h-auto"
              >
                View Full Profile <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {mainTab === 'details' ? (
        <>
          {/* Sub-Tabs Selector */}
          <div className="flex border-b border-border bg-subtle/5 px-4 pt-2 flex-wrap select-none">
            {(['summary', 'experience', 'education', 'skills', 'projects', 'certifications'] as SubTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all capitalize whitespace-nowrap ${
                  subTab === tab
                    ? 'border-brand text-brand font-bold'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sub-Tab Contents */}
          <div className="p-6">
            {subTab === 'summary' && (
              <div className="space-y-2 max-w-full">
                <h3 className="text-xs font-bold text-text-muted tracking-wider flex items-center gap-1.5 border-b pb-1.5 border-border">
                  <User className="w-3.5 h-3.5 text-brand" /> Professional Summary
                </h3>
                <div 
                  className="text-sm text-text-secondary leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: candidate.profile_summary || 'No summary provided.' }}
                />
              </div>
            )}

            {subTab === 'experience' && (
              <div className="space-y-4">
                {candidate.employments && candidate.employments.length > 0 ? (
                  candidate.employments.map((emp, idx) => (
                    <div key={idx} className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="absolute w-2.5 h-2.5 bg-brand rounded-full -left-[6px] top-1.5" />
                      <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
                        <h4 className="font-bold text-text-primary">{emp.job_title || 'Employment Title'}</h4>
                        <span className="text-xs text-text-muted">
                          {emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} - {emp.is_current ? 'Present' : (emp.end_date ? new Date(emp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-text-secondary">{emp.company_name} {emp.location ? `• ${emp.location}` : ''}</p>
                      {emp.responsibilities_summary && (
                        <div 
                          className="text-xs text-text-muted leading-relaxed mt-1 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: emp.responsibilities_summary }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted italic">No employment history listed.</p>
                )}
              </div>
            )}

            {subTab === 'education' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.educations && candidate.educations.length > 0 ? (
                  candidate.educations.map((edu, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-4 bg-surface flex items-start gap-3 shadow-sm hover:shadow transition-shadow">
                      <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0">
                        <Book className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-text-primary text-sm">
                          {edu.degree || edu.qualification_level} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                        </h4>
                        <p className="text-xs font-semibold text-text-secondary">{edu.institution_name}</p>
                        <p className="text-[11px] text-text-muted">
                          {edu.start_year ? `${edu.start_year} - ` : ''}{edu.end_year || 'Present'} {edu.grade_or_percentage ? `• Grade: ${edu.grade_or_percentage}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted italic">No education history listed.</p>
                )}
              </div>
            )}

            {subTab === 'skills' && (
              <div className="flex flex-wrap gap-2">
                {candidate.tags && candidate.tags.filter(t => t.type === 'skill').length > 0 ? (
                  candidate.tags.filter(t => t.type === 'skill').map(t => (
                    <Badge 
                      key={t.id} 
                      variant="default" 
                      className="bg-subtle text-text-secondary border border-border/50 px-2.5 py-1 text-xs transition-all duration-200 hover:scale-105 hover:bg-brand/10 hover:text-brand hover:border-brand/30 cursor-default"
                    >
                      {t.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-text-muted italic">No skills tagged.</p>
                )}
              </div>
            )}

            {subTab === 'projects' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.projects && candidate.projects.length > 0 ? (
                  candidate.projects.map((proj, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-4 bg-surface space-y-2 shadow-sm hover:shadow transition-shadow">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <h4 className="font-bold text-text-primary flex items-center gap-2 truncate">
                          <Folder className="w-4 h-4 text-brand shrink-0" /> {proj.title}
                        </h4>
                        {proj.duration && <span className="text-xs text-text-muted font-medium shrink-0">{proj.duration}</span>}
                      </div>
                      {proj.role && <p className="text-xs font-semibold text-text-secondary">{proj.role}</p>}
                      {proj.description && <p className="text-xs text-text-muted leading-relaxed">{proj.description}</p>}
                      {proj.technologies && (
                        <p className="text-[11px] text-brand/80 font-medium bg-brand/5 inline-block px-2 py-0.5 rounded">
                          Technologies: {proj.technologies}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted italic">No projects listed.</p>
                )}
              </div>
            )}

            {subTab === 'certifications' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.certifications && candidate.certifications.length > 0 ? (
                  candidate.certifications.map((cert, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-4 bg-surface flex items-start gap-3 shadow-sm hover:shadow transition-shadow">
                      <div className="p-2 bg-brand/10 text-brand rounded-lg shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-text-primary text-sm">{cert.certification_name}</h4>
                        <p className="text-xs font-semibold text-text-secondary">{cert.issuer}</p>
                        <p className="text-[11px] text-text-muted">
                          {cert.issued_on ? `Issued ${new Date(cert.issued_on).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                          {cert.expiry_on ? ` • Expires ${new Date(cert.expiry_on).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted italic">No certifications listed.</p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-b-xl overflow-hidden border-t border-border relative min-h-[700px] w-full">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[700px] border-none absolute inset-0"
              title="Candidate Resume"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[700px]">
              <FileText className="w-12 h-12 text-text-muted mb-3" />
              <p className="text-text-secondary font-medium">No resume document uploaded</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
export default CandidateFullProfileView;
