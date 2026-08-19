"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { JobDescriptionForm } from '../../components/JobDescriptionForm';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { tagsApi } from '@/lib/api/tags';
import { usersApi } from '@/lib/api/users';
import { RequisitionOption, JobDescription, CreateJobDescriptionRequest } from '@/types/job-descriptions';
import { UserLookup } from '@/types/users';
import { Tag } from '@/types/tags';
import { Loader2 } from 'lucide-react';

export default function EditJobDescriptionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [jd, userData, entityTags] = await Promise.all([
          jobDescriptionsApi.getJobDescription(id),
          usersApi.getLookups(),
          tagsApi.getEntityTags('job_description', id),
        ]);
        setJobDescription(jd);
        setUsers(userData);
        // Map entity tags to Tag shape for the selector
        setSelectedTags(
          entityTags.map((et: any) => ({
            id: et.tag_id,
            name: et.tag_name,
            type: et.tag_type,
            active: true,
            is_starred: et.is_starred,
          }))
        );
      } catch {
        setError("Failed to load job description data. It may not exist.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (data: CreateJobDescriptionRequest) => {
    setSaving(true);
    setError(null);
    try {
      await jobDescriptionsApi.updateJobDescription(id, data);
      // Replace tags with current selection (empty array clears all tags)
      await tagsApi.replaceTags('job_description', id, selectedTags.map(t => ({ id: t.id, is_starred: t.is_starred })));
      // Automatically refresh matches using new tags
      await jobDescriptionsApi.rematch(id);
      router.push('/job-descriptions');
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setError(errorStr.response?.data?.message || 'Failed to update job description');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/job-descriptions');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && !jobDescription) {
    return (
      <div className="flex flex-col items-center justify-center p-24">
        <p className="text-danger mb-4">{error}</p>
        <button className="text-brand hover:underline" onClick={handleCancel}>Back to Job Descriptions</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 w-full">
      <PageHeader
        title="Edit Job Description"
        breadcrumbs={<span>Job Descriptions / Edit</span>}
      />
      <JobDescriptionForm
        mode="edit"
        jobDescription={jobDescription}
        users={users}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        error={error}
      />
    </div>
  );
}
