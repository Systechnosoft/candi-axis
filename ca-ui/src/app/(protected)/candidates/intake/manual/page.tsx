'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CandidateForm } from '../components/CandidateForm';
import { CandidatesService } from '@/lib/api/candidates';
import { CandidateFormValues, DuplicateMatchResponse } from '@/types/candidates';

export default function ManualIntakePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateData, setDuplicateData] = useState<DuplicateMatchResponse | null>(null);

  const handleSubmit = async (data: CandidateFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setDuplicateData(null);

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
      source: 'manual',
      educations: data.educations,
      employments: data.employments,
      certifications: data.certifications,
      social_links: data.social_links
    };

    try {
      await CandidatesService.createManual(payload);
      router.push('/candidates');
    } catch (err: unknown) {
      const errorStr = err as { response?: { status?: number, data?: { message?: string, duplicates?: DuplicateMatchResponse['duplicates'] } } };
      if (errorStr.response?.status === 409) {
        setError(errorStr.response?.data?.message || 'A duplicate candidate was detected.');
        setDuplicateData({
          message: errorStr.response?.data?.message || 'A duplicate candidate was detected.',
          duplicates: errorStr.response?.data?.duplicates || []
        });
      } else {
        setError(errorStr.response?.data?.message || 'Failed to create candidate. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="flex flex-col bg-surface">
      <div className="p-6 border-b border-border bg-surface sticky top-0 z-10">
        <h1 className="text-2xl font-semibold text-text-primary">Manual Entry</h1>
        <p className="text-sm text-text-secondary mt-1">Fill in the candidate details directly.</p>
      </div>

      <div className="p-6 flex-1 w-full max-w-5xl mx-auto pt-8">
        <CandidateForm 
          mode="manual"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitError={error}
          duplicateData={duplicateData}
        />
      </div>
    </div>
  );
}
