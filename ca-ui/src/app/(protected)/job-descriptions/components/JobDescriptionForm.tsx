"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { JobDescription, CreateJobDescriptionRequest, RequisitionOption } from '@/types/job-descriptions';
import { UserLookup } from '@/types/users';
import { Tag } from '@/types/tags';
import { Loader2 } from 'lucide-react';
import { cleanText } from '@/lib/utils';
import { RichTextEditor } from '@/components/primitives/RichTextEditor';
import { TagSelector } from '@/components/ats/TagSelector';

interface JobDescriptionFormProps {
  mode: 'create' | 'edit';
  jobDescription?: JobDescription | null;
  requisitions: RequisitionOption[];
  users: UserLookup[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onSave: (data: CreateJobDescriptionRequest) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

export function JobDescriptionForm({
  mode,
  jobDescription,
  requisitions,
  users,
  selectedTags,
  onTagsChange,
  onSave,
  onCancel,
  saving,
  error,
}: JobDescriptionFormProps) {
  const [formData, setFormData] = useState<CreateJobDescriptionRequest>({
    requisition_id: '',
    title: '',
    code: '',
    location: '',
    work_mode: '',
    employment_type: '',
    exp_min_months: undefined,
    exp_max_months: undefined,
    must_have_text: '',
    nice_to_have_text: '',
    job_summary: '',
    responsibilities_text: '',
    status: 'draft',
    owner_user_id: '',
  });

  useEffect(() => {
    if (mode === 'edit' && jobDescription) {
      setFormData({
        requisition_id: jobDescription.requisition_id,
        title: jobDescription.title,
        code: jobDescription.code || '',
        location: jobDescription.location || '',
        work_mode: jobDescription.work_mode || '',
        employment_type: jobDescription.employment_type || '',
        exp_min_months: jobDescription.exp_min_months !== null ? jobDescription.exp_min_months : undefined,
        exp_max_months: jobDescription.exp_max_months !== null ? jobDescription.exp_max_months : undefined,
        must_have_text: jobDescription.must_have_text || '',
        nice_to_have_text: jobDescription.nice_to_have_text || '',
        job_summary: jobDescription.job_summary || '',
        responsibilities_text: jobDescription.responsibilities_text || '',
        status: jobDescription.status,
        owner_user_id: jobDescription.owner_user_id || '',
      });
    }
  }, [mode, jobDescription]);

  const handleBlur = (field: keyof CreateJobDescriptionRequest) => {
    const val = formData[field];
    if (typeof val === 'string') {
      setFormData(prev => ({ ...prev, [field]: cleanText(val) }));
    }
  };

  const handleEditorChange = (field: keyof CreateJobDescriptionRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedTitle = cleanText(formData.title);
    if (!cleanedTitle) {
      alert("Job Title cannot be empty or just spaces.");
      return;
    }

    onSave({
      ...formData,
      title: cleanedTitle,
      code: mode === 'edit' ? (formData.code ? cleanText(formData.code) : undefined) : undefined,
      location: formData.location ? cleanText(formData.location) : undefined,
      work_mode: formData.work_mode || undefined,
      employment_type: formData.employment_type || undefined,
      must_have_text: formData.must_have_text || '',
      nice_to_have_text: formData.nice_to_have_text || '',
      job_summary: formData.job_summary || '',
      responsibilities_text: formData.responsibilities_text || '',
      owner_user_id: formData.owner_user_id || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-12">
      {error && (
        <div className="p-4 rounded-md bg-danger/10 border border-danger/20 text-danger font-medium shadow-sm">
          {error}
        </div>
      )}

      {/* SECTION 1: Core Details */}
      <Card className="p-6 shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Core Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-text-primary">Requisition <span className="text-danger">*</span></label>
            <select
              required
              className="w-full px-3 py-2 border border-border bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm max-w-2xl"
              value={formData.requisition_id}
              onChange={e => setFormData({ ...formData, requisition_id: e.target.value })}
            >
              <option value="" disabled>Select Requisition</option>
              {requisitions.map(req => (
                <option key={req.id} value={req.id}>{req.title} {req.code ? `(${req.code})` : ''}</option>
              ))}
            </select>
          </div>

          <div className={`flex flex-col gap-1.5 md:col-span-2 ${mode === 'create' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
            <label className="text-sm font-medium text-text-primary">Job Title <span className="text-danger">*</span></label>
            <input
              type="text"
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm max-w-2xl"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              onBlur={() => handleBlur('title')}
              placeholder="e.g. Senior Software Engineer"
            />
          </div>

          {mode === 'edit' && (
            <div className="flex flex-col gap-1.5 lg:col-span-1">
              <label className="text-sm font-medium text-text-primary">Job Code</label>
              <input
                type="text"
                maxLength={50}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm bg-subtle disabled:opacity-60 disabled:cursor-not-allowed text-text-secondary"
                value={formData.code || ''}
                placeholder="Auto-generated"
                disabled
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Location</label>
            <input
              type="text"
              maxLength={150}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.location || ''}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              onBlur={() => handleBlur('location')}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Work Mode</label>
            <select
              className="w-full px-3 py-2 border border-border bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.work_mode || ''}
              onChange={e => setFormData({ ...formData, work_mode: e.target.value })}
            >
              <option value="">None specified</option>
              <option value="onsite">Onsite</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Employment Type</label>
            <select
              className="w-full px-3 py-2 border border-border bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.employment_type || ''}
              onChange={e => setFormData({ ...formData, employment_type: e.target.value })}
            >
              <option value="">None specified</option>
              <option value="full_time">Full-Time</option>
              <option value="part_time">Part-Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Min Experience (Months)</label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.exp_min_months ?? ''}
              onChange={e => setFormData({ ...formData, exp_min_months: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Max Experience (Months)</label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.exp_max_months ?? ''}
              onChange={e => setFormData({ ...formData, exp_max_months: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Status</label>
            <select
              className="w-full px-3 py-2 border border-border bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.status || 'draft'}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Owner (User)</label>
            <select
              className="w-full px-3 py-2 border border-border bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.owner_user_id || ''}
              onChange={e => setFormData({ ...formData, owner_user_id: e.target.value })}
            >
              <option value="">No owner assigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-text-primary">Skills</label>
            <p className="text-xs text-text-muted mb-1">Select relevant skill tags from the tag dictionary to categorize this role.</p>
            <TagSelector
              typeFilter="skill"
              selectedTags={selectedTags}
              onChange={onTagsChange}
              placeholder="Search and add skills..."
            />
          </div>
        </div>
      </Card>

      {/* SECTION 2: Summary */}
      <Card className="p-6 shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Summary</h3>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Job Summary</label>
          <p className="text-xs text-text-muted mb-2">A high-level overview of the role and its impact.</p>
          <RichTextEditor
            value={formData.job_summary || ''}
            onChange={(val) => handleEditorChange('job_summary', val)}
            placeholder="Describe the job summary..."
          />
        </div>
      </Card>

      {/* SECTION 3: Rich Content */}
      <Card className="p-6 shadow-sm border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Requirements Details</h3>

        <div className="space-y-8">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Responsibilities</label>
            <p className="text-xs text-text-muted mb-2">What will they do day-to-day?</p>
            <RichTextEditor
              value={formData.responsibilities_text || ''}
              onChange={(val) => handleEditorChange('responsibilities_text', val)}
              placeholder="List key responsibilities here..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Must-Have Skills / Requirements</label>
            <p className="text-xs text-text-muted mb-2">The non-negotiable hard skills and experiences required.</p>
            <RichTextEditor
              value={formData.must_have_text || ''}
              onChange={(val) => handleEditorChange('must_have_text', val)}
              placeholder="List must-have requirements..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Nice-To-Have Skills</label>
            <p className="text-xs text-text-muted mb-2">Bonus skills that make a candidate stand out, but aren&apos;t strictly required.</p>
            <RichTextEditor
              value={formData.nice_to_have_text || ''}
              onChange={(val) => handleEditorChange('nice_to_have_text', val)}
              placeholder="List nice-to-have requirements..."
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-4 pb-24">
        <Button variant="secondary" onClick={onCancel} disabled={saving} type="button" className="px-6">
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={saving} className="px-6">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Job Description
        </Button>
      </div>
    </form>
  );
}
