"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { JobDescriptionForm } from '../components/JobDescriptionForm';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { tagsApi } from '@/lib/api/tags';
import { usersApi } from '@/lib/api/users';
import { RequisitionOption, CreateJobDescriptionRequest } from '@/types/job-descriptions';
import { UserLookup } from '@/types/users';
import { Tag } from '@/types/tags';
import { Loader2 } from 'lucide-react';

export default function CreateJobDescriptionPage() {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState<RequisitionOption[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function loadResources() {
      try {
        const [reqOptions, userData] = await Promise.all([
          jobDescriptionsApi.getRequisitionOptions(),
          usersApi.getLookups()
        ]);
        setRequisitions(reqOptions);
        setUsers(userData);
      } catch {
        setError("Failed to load necessary form options.");
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  const handleSave = async (data: CreateJobDescriptionRequest) => {
    setSaving(true);
    setError(null);
    try {
      const newJd = await jobDescriptionsApi.createJobDescription(data);
      // Persist selected tags for the newly created JD
      if (selectedTags.length > 0) {
        await tagsApi.replaceTags('job_description', newJd.id, selectedTags.map(t => ({ id: t.id, is_starred: t.is_starred })));
      }
      router.push('/job-descriptions');
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setError(errorStr.response?.data?.message || 'Failed to create job description');
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12 w-full">
      <PageHeader 
        title="Create Job Description" 
        breadcrumbs={<span>Job Descriptions / Create</span>}
      />
      <JobDescriptionForm 
        mode="create"
        requisitions={requisitions}
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
