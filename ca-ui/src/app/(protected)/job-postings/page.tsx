"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { jobPostingsApi } from '@/lib/api/job-postings';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { JobPosting } from '@/types/job-postings';
import { JobDescription } from '@/types/job-descriptions';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Loader2, Search } from 'lucide-react';
import { RichTextEditor } from '@/components/primitives/RichTextEditor';
import { usersApi } from '@/lib/api/users';
import { MultiSelect } from '@/components/primitives/MultiSelect';
import { SingleSelect } from '@/components/primitives/SingleSelect';

const stripHtml = (html: string | null) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

export default function JobPostingsPage() {
  const router = useRouter();
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('job_descriptions', 'editor');
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiringManagers, setHiringManagers] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPosting, setSelectedPosting] = useState<JobPosting | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formJdId, setFormJdId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formHrIds, setFormHrIds] = useState<string[]>([]);
  const [formInterviewerIds, setFormInterviewerIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postingsData, jdsData, managersData, interviewersData] = await Promise.all([
        jobPostingsApi.getJobPostings({ search: search || undefined }),
        jobDescriptionsApi.getJobDescriptions(),
        usersApi.getHiringManagers().catch(() => []),
        usersApi.getInterviewers().catch(() => [])
      ]);
      setJobPostings(postingsData);
      setJobDescriptions(jdsData);
      setHiringManagers(managersData);
      setInterviewers(interviewersData);
    } catch (err) {
      console.error(err);
      setError('Failed to load Job Postings data');
      setJobPostings([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && jobDescriptions.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const triggerCreate = params.get('create');
      const jdId = params.get('jd_id');
      if (triggerCreate === 'true' && jdId) {
        // Pre-fill form state
        setModalMode('create');
        setSelectedPosting(null);
        // Find the JD to get a default name
        const matchedJd = jobDescriptions.find(j => j.id === jdId);
        setFormName(matchedJd ? `${matchedJd.title} Posting` : '');
        setFormCode('');
        setFormDescription('');
        setFormJdId(jdId);
        setFormIsActive(true);
        setFormError(null);
        setIsModalOpen(true);

        // Remove parameters from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [jobDescriptions]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedPosting(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormJdId('');
    setFormIsActive(true);
    setFormHrIds([]);
    setFormInterviewerIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (posting: JobPosting) => {
    setModalMode('edit');
    setSelectedPosting(posting);
    setFormName(posting.name);
    setFormCode(posting.code || '');
    setFormDescription(posting.description || '');
    setFormJdId(posting.jd_id);
    setFormIsActive(posting.is_active);
    setFormHrIds(posting.hr_ids || []);
    setFormInterviewerIds(posting.interviewer_ids || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!formJdId) {
      setFormError('Please select a Job Description.');
      return;
    }
    if (formHrIds.length === 0) {
      setFormError('Please select at least one HR manager.');
      return;
    }
    if (formInterviewerIds.length === 0) {
      setFormError('Please select at least one interviewer.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await jobPostingsApi.createJobPosting({
          name: formName,
          code: formCode || undefined,
          description: formDescription || undefined,
          jd_id: formJdId,
          is_active: formIsActive,
          hr_ids: formHrIds,
          interviewer_ids: formInterviewerIds,
        });
      } else if (modalMode === 'edit' && selectedPosting) {
        await jobPostingsApi.updateJobPosting(selectedPosting.id, {
          name: formName,
          code: formCode || undefined,
          description: formDescription,
          jd_id: formJdId,
          is_active: formIsActive,
          hr_ids: formHrIds,
          interviewer_ids: formInterviewerIds,
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || 'An error occurred while saving.';
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 w-full">
      <PageHeader 
        title="Job Postings" 
        actions={
          canEdit && (
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Posting
            </Button>
          )
        }
      />
      
      <Card>
        <div className="flex flex-wrap items-center gap-4 mb-4 p-4 border-b border-border bg-subtle/50 rounded-t-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search " 
              className="pl-9 pr-3 py-1.5 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-80 bg-surface"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <div className="px-4 pb-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : jobPostings.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30">
              <p className="text-text-secondary">No job postings found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow>
                  {canEdit && <TableHeader className="w-10">{""}</TableHeader>}
                  <TableHeader className="w-24">ID</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>JD</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {jobPostings.map((posting) => (
                  <TableRow key={posting.id}>
                    {canEdit && (
                      <TableCell>
                        <button 
                          onClick={() => openEditModal(posting)}
                          className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                          title="Edit Job Posting"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="text-text-secondary">
                      {posting.code || ''}
                    </TableCell>
                    <TableCell className="font-semibold text-brand">
                      <span
                        onClick={() => router.push(`/job-postings/${posting.id}`)}
                        className="hover:underline cursor-pointer transition-colors"
                      >
                        {posting.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-secondary max-w-sm truncate">
                      {posting.description ? (
                        stripHtml(posting.description)
                      ) : (
                        <span className="text-text-muted italic">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary text-xs">
                          {posting.jd_title || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {posting.is_active ? (
                        <Badge variant="success">Open</Badge>
                      ) : (
                        <Badge variant="default">Closed</Badge>
                      )}
                    </TableCell>

                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
          )}
        </div>
      </Card>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <DrawerShell80
          title={modalMode === 'create' ? 'Create Job Posting' : 'Edit Job Posting'}
          onClose={() => setIsModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleFormSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
            {formError && (
              <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="posting-name" className="font-semibold text-text-primary">
                Posting Name <span className="text-danger">*</span>
              </label>
              <input
                id="posting-name"
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-brand outline-none bg-surface"
                placeholder="e.g. Senior Frontend Developer Public Posting"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            {modalMode === 'edit' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="posting-id" className="font-semibold text-text-primary">
                  Job Posting ID
                </label>
                <input
                  id="posting-id"
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-brand outline-none bg-surface disabled:opacity-60 disabled:cursor-not-allowed text-text-secondary"
                  placeholder="Auto-generated"
                  value={formCode}
                  disabled
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                Description
              </label>
              <RichTextEditor
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Describe this posting......"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                Job Description <span className="text-danger">*</span>
              </label>
              <SingleSelect
                options={jobDescriptions.map(jd => ({ id: jd.id, name: jd.title }))}
                selectedId={formJdId}
                onChange={setFormJdId}
                placeholder="Select a Job Description..."
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                HR Manager <span className="text-danger">*</span>
              </label>
              <MultiSelect
                options={hiringManagers.map(u => ({ id: u.id, name: u.full_name }))}
                selectedIds={formHrIds}
                onChange={setFormHrIds}
                placeholder="Assign HR managers..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                Interviewers <span className="text-danger">*</span>
              </label>
              <MultiSelect
                options={interviewers.map(u => ({ id: u.id, name: u.full_name }))}
                selectedIds={formInterviewerIds}
                onChange={setFormInterviewerIds}
                placeholder="Assign interviewers..."
              />
            </div>


          </form>
        </DrawerShell80>
      )}
    </div>
  );
}
