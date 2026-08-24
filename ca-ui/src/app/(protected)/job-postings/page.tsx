"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { cn, formatDate, exportToCSV } from '@/lib/utils';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { jobPostingsApi } from '@/lib/api/job-postings';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { JobPosting } from '@/types/job-postings';
import { JobDescription } from '@/types/job-descriptions';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Loader2, Plus, Edit2, Trash2, Check, Download } from 'lucide-react';
import { FilterBar } from '@/components/primitives/FilterBar';
import { RichTextEditor } from '@/components/primitives/RichTextEditor';
import { usersApi } from '@/lib/api/users';
import { MultiSelect } from '@/components/primitives/MultiSelect';
import { SingleSelect } from '@/components/primitives/SingleSelect';
import { TablePagination } from '@/components/primitives/TablePagination';

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
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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
      setPage(1); // Reset page when filters change
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



  const filteredPostings = jobPostings.filter(posting => {
    if (statusFilter === 'open') return posting.is_active;
    if (statusFilter === 'closed') return !posting.is_active;
    return true;
  });

  const handleExport = async () => {
    try {
      const postingsData = await jobPostingsApi.getJobPostings();
      
      const filtered = postingsData.filter(posting => {
        if (statusFilter === 'open') return posting.is_active;
        if (statusFilter === 'closed') return !posting.is_active;
        return true;
      });

      exportToCSV(
        filtered,
        [
          { header: 'ID', accessor: p => p.code || '' },
          { header: 'Name', accessor: p => p.name },
          { header: 'JD', accessor: p => p.jd_title || '-' },
          { header: 'Updated By', accessor: p => p.updated_by_name || '-' },
          { header: 'Updated On', accessor: p => p.updated_at ? formatDate(p.updated_at) : (p.created_at ? formatDate(p.created_at) : '-') },
          { header: 'Status', accessor: p => p.is_active ? 'Open' : 'Closed' }
        ],
        `job-postings-export.csv`
      );
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full pb-8">
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
        <div className="border-b border-border p-2 bg-surface">
          <FilterBar searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} onRefresh={fetchData} onClearFilters={() => setStatusFilter('')}>
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px]">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center rounded-l-md">
                Status
              </div>
              <SingleSelect
                options={[
                  { id: '', name: 'All' },
                  { id: 'open', name: 'Open' },
                  { id: 'closed', name: 'Closed' }
                ]}
                selectedId={statusFilter}
                onChange={(id) => {
                  setStatusFilter(id);
                  setPage(1);
                }}
                variant="minimal"
                className="pl-3 pr-2 h-full w-full text-sm bg-transparent outline-none cursor-pointer text-text-primary"
              />
            </div>
          </FilterBar>
        </div>

        {error && (
          <div className="mx-2 mt-2 mb-2 p-2 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredPostings.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30">
              <p className="text-text-secondary">No job postings found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow>
                  {canEdit && <TableHeader className="text-right w-10">{" "}</TableHeader>}
                  <TableHeader className="w-24">ID</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>JD</TableHeader>
                  <TableHeader>Updated By</TableHeader>
                  <TableHeader>Updated On</TableHeader>
                  <TableHeader className="text-center">Status</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {filteredPostings.slice((page - 1) * limit, page * limit).map((posting) => (
                  <TableRow key={posting.id}>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-start gap-1">
                          <button 
                            onClick={() => openEditModal(posting)}
                            className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                            title="Edit Job Posting"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
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
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary text-xs">
                          {posting.jd_title || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {posting.updated_by_name || '-'}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {formatDate(posting.updated_at)}
                    </TableCell>
                    <TableCell className="text-center">
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
        {!loading && filteredPostings.length > 0 && (
          <TablePagination 
            totalItems={filteredPostings.length} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

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


          </form>
        </DrawerShell80>
      )}
    </div>
  );
}
