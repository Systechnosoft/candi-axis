'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { CandidateForm } from '../../intake/components/CandidateForm';
import { CandidatesService } from '@/lib/api/candidates';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { ApplicationsService } from '@/lib/api/applications';
import { CandidateFormValues } from '@/types/candidates';
import { JobDescription } from '@/types/job-descriptions';
import { Loader2, Link2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { AiRatingCard } from '@/components/ats/AiRatingCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function EditCandidateForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const candidateId = params.id as string;
  const redirectUrl = searchParams.get('redirect') || '/candidates';
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<CandidateFormValues>>({});

  // Link to JD state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [selectedJdId, setSelectedJdId] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [errorRating, setErrorRating] = useState<string | null>(null);
  const [existingApps, setExistingApps] = useState<any[]>([]);

  const [hasApplications, setHasApplications] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setIsLoading(true);
        const [data, appsRes] = await Promise.all([
          CandidatesService.getCandidate(candidateId),
          ApplicationsService.getApplications({ candidate_id: candidateId })
        ]);
        
        const activeApps = (appsRes.data || []).filter((app: any) => !app.is_deleted);
        setHasApplications(activeApps.length > 0);
        
        setInitialValues({
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
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load candidate details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const handleOpenLinkModal = async () => {
    setIsLinkModalOpen(true);
    setErrorRating(null);
    setLinkSuccess(null);
    setSelectedJdId('');
    try {
      const data = await jobDescriptionsApi.getJobDescriptions();
      setJds(data || []);
      
      const apps = await ApplicationsService.getApplications({ candidate_id: candidateId });
      setExistingApps(apps.data || []);
    } catch (err) {
      console.error("Failed to load Job Descriptions:", err);
    }
  };

  useEffect(() => {
    if (!selectedJdId) {
      setLinkSuccess(null);
      return;
    }
    const alreadyLinked = existingApps.some(app => app.jd_id === selectedJdId);
    if (alreadyLinked) {
      setLinkSuccess("Application already exists for this candidate and JD");
    } else {
      setLinkSuccess(null);
    }
  }, [selectedJdId, existingApps]);

  const handleLinkToJd = async () => {
    if (!selectedJdId) return;
    setLinking(true);
    setErrorRating(null);
    setLinkSuccess(null);

    try {
      const app = await ApplicationsService.createApplication({
        candidate_id: candidateId,
        jd_id: selectedJdId,
        source: 'manual',
      });
      setLinkSuccess("Candidate linked successfully!");
      setExistingApps(prev => [...prev, app]);
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes('already exists') || err.response?.status === 409) {
        setLinkSuccess("Application already exists for this candidate and JD");
      } else {
        setErrorRating(err.message || "Failed to link candidate to Job Description.");
      }
    } finally {
      setLinking(false);
    }
  };

  const handleSubmit = async (data: CandidateFormValues) => {
    setIsSubmitting(true);
    setError(null);

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
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col bg-surface w-full items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <span className="mt-4 text-text-muted">Loading candidate data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface">
      <div className="p-6 border-b border-border bg-surface sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Edit Candidate</h1>
          <p className="text-sm text-text-secondary mt-1">Update candidate details manually.</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={handleOpenLinkModal}
          className="gap-2 border-brand text-brand hover:bg-brand/10 transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Link to JD
        </Button>
      </div>

      <div className="p-6 flex-1 w-full max-w-5xl mx-auto pt-8">
        {error && !initialValues.full_name && (
          <div className="bg-error-50 border border-error p-4 rounded-lg mb-6">
             <h4 className="text-sm font-medium text-error-dark">{error}</h4>
          </div>
        )}
        <CandidateForm 
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitError={error && initialValues.full_name ? error : null}
          hasApplications={hasApplications}
        />
      </div>

      {/* Link to JD Dialog */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <Link2 className="w-5 h-5 text-brand" />
              Link Candidate to Job Description
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-6 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Select Job Description
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedJdId}
                  onChange={(e) => setSelectedJdId(e.target.value)}
                  disabled={linking}
                  className="flex-1 h-10 px-3 rounded-md border border-strong-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                >
                  <option value="">-- Choose a JD --</option>
                  {jds.map((jd) => (
                    <option key={jd.id} value={jd.id}>
                      {jd.title}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleLinkToJd}
                  disabled={!selectedJdId || linking}
                  className="shrink-0 gap-2"
                >
                  {linking && <Loader2 className="w-4 h-4 animate-spin" />}
                  Link
                </Button>
              </div>
            </div>

            {errorRating && (
              <div className="flex items-start gap-2 bg-error-50 border border-error/30 p-3 rounded-lg text-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorRating}</span>
              </div>
            )}

            {linkSuccess && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-500/20 p-3 rounded-lg text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{linkSuccess}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EditCandidatePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col bg-surface w-full items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <span className="mt-4 text-text-muted">Loading candidate edit form...</span>
      </div>
    }>
      <EditCandidateForm />
    </Suspense>
  );
}
