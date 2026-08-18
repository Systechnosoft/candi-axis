"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { cn, formatDate, toTitleCase, exportToCSV } from '@/lib/utils';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { usersApi } from '@/lib/api/users';
import { tagsApi } from '@/lib/api/tags';
import { JobDescription, CreateJobDescriptionRequest } from '@/types/job-descriptions';
import { UserLookup } from '@/types/users';
import { Tag } from '@/types/tags';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Archive, Loader2, Search, Download, FilterX, RefreshCw, Check } from 'lucide-react';
import { DrawerShell80, ModalShell } from '@/components/primitives/ModalShell';
import { MultiSelect } from '@/components/primitives/MultiSelect';
import { ArchiveConfirmModal } from '@/components/ui/ArchiveConfirmModal';

import { JobDescriptionForm } from './components/JobDescriptionForm';
import { TablePagination } from '@/components/primitives/TablePagination';

export default function JobDescriptionsPage() {
  const router = useRouter();
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('job_descriptions', 'editor');
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals

  // Drawers
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSelectedTags, setDrawerSelectedTags] = useState<Tag[]>([]);

  const [jdToArchive, setJdToArchive] = useState<JobDescription | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jdData, userData] = await Promise.all([
        jobDescriptionsApi.getJobDescriptions({
          search: search || undefined,
          status: statusFilter || undefined,
          work_mode: workModeFilter || undefined,
        }),
        usersApi.getLookups()
      ]);
      setJobDescriptions(jdData);
      setUsers(userData);
      setPage(1); // Reset page on filter changes
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setError(errorStr.response?.data?.message || 'Failed to load Job Descriptions');
      setJobDescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, workModeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setDrawerSelectedTags([]);
    setDrawerError(null);
    setIsCreateDrawerOpen(true);
  };

  const openEditModal = async (jd: JobDescription) => {
    setDrawerError(null);
    setDrawerLoading(true);
    setIsEditDrawerOpen(true);
    try {
      const [fullJd, entityTags] = await Promise.all([
        jobDescriptionsApi.getJobDescription(jd.id),
        tagsApi.getEntityTags('job_description', jd.id)
      ]);
      setEditingJd(fullJd);
      setDrawerSelectedTags(
        entityTags.map((et: any) => ({
          id: et.tag_id,
          name: et.tag_name,
          type: et.tag_type,
          active: true,
          is_starred: et.is_starred,
        }))
      );
    } catch (err) {
      setDrawerError("Failed to load job description details.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCreateSave = async (data: CreateJobDescriptionRequest) => {
    setDrawerSaving(true);
    setDrawerError(null);
    try {
      const newJd = await jobDescriptionsApi.createJobDescription(data);
      if (drawerSelectedTags.length > 0) {
        await tagsApi.replaceTags('job_description', newJd.id, drawerSelectedTags.map(t => ({ id: t.id, is_starred: t.is_starred })));
      }
      setIsCreateDrawerOpen(false);
      fetchData();
      setSuccessMessage('Job description created successfully!');
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setDrawerError(errorStr.response?.data?.message || 'Failed to create job description');
    } finally {
      setDrawerSaving(false);
    }
  };

  const handleEditSave = async (data: CreateJobDescriptionRequest) => {
    if (!editingJd) return;
    setDrawerSaving(true);
    setDrawerError(null);
    try {
      await jobDescriptionsApi.updateJobDescription(editingJd.id, data);
      await tagsApi.replaceTags('job_description', editingJd.id, drawerSelectedTags.map(t => ({ id: t.id, is_starred: t.is_starred })));
      setIsEditDrawerOpen(false);
      setEditingJd(null);
      fetchData();
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setDrawerError(errorStr.response?.data?.message || 'Failed to update job description');
    } finally {
      setDrawerSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const jdData = await jobDescriptionsApi.getJobDescriptions({
        status: statusFilter || undefined,
      });
      exportToCSV(
        jdData,
        [
          { header: 'JD Id', accessor: (j: JobDescription) => j.code || '-' },
          { header: 'Job Title', accessor: (j: JobDescription) => j.title },
          { header: 'Work Mode', accessor: (j: JobDescription) => toTitleCase(j.work_mode) || '-' },
          { header: 'Emp Type', accessor: (j: JobDescription) => toTitleCase(j.employment_type) || '-' },
          { header: 'Owner', accessor: (j: JobDescription) => getUserName(j.owner_user_id) },
          { header: 'Updated By', accessor: (j: JobDescription) => j.updated_by_name || '-' },
          { header: 'Updated On', accessor: (j: JobDescription) => j.updated_at ? formatDate(j.updated_at) : (j.created_at ? formatDate(j.created_at) : '-') },
          { header: 'Status', accessor: (j: JobDescription) => toTitleCase(j.status) }
        ],
        `job-descriptions-export.csv`
      );
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const archiveJd = async (jd: JobDescription) => {
    setJdToArchive(jd);
    setIsArchiveModalOpen(true);
  };

  const confirmArchive = async () => {
    if (!jdToArchive) return;
    setDrawerSaving(true);
    setDrawerError(null);
    try {
      await jobDescriptionsApi.deleteJobDescription(jdToArchive.id);
      setIsEditDrawerOpen(false);
      setEditingJd(null);
      setIsArchiveModalOpen(false);
      setJdToArchive(null);
      fetchData();
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      if (isEditDrawerOpen) {
        setDrawerError(errorStr.response?.data?.message || 'Failed to archive job description');
      } else {
        setError(errorStr.response?.data?.message || 'Failed to archive job description');
      }
    } finally {
      setDrawerSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Open</Badge>;
      case 'on_hold':
        return <Badge variant="warning">On Hold</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      case 'draft':
      default:
        return <Badge variant="info">Draft</Badge>;
    }
  };

  const getUserName = (id: string | null) => {
    if (!id) return '-';
    const user = users.find(u => u.id === id);
    return user ? `${user.first_name} ${user.last_name}` : id;
  };

  return (
    <div className="flex flex-col gap-4 w-full pb-8">
      <PageHeader 
        title="Job Descriptions" 
        actions={
          canEdit && (
            <Button variant="primary" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Description
            </Button>
          )
        }
      />
      
      <Card>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 p-2 border-b border-border bg-surface items-center">
          <div className="flex items-center gap-2 col-span-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="search here..." 
                className="pl-9 pr-3 h-[34px] text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-full bg-surface"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="h-[34px] px-4 text-sm font-medium rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors">
              Search
            </button>
          </div>

          <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden col-span-1">
            <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
              Status
            </div>
            <select 
              className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden col-span-1">
            <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
              Work Mode
            </div>
            <select 
              className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <div className="flex items-center gap-1 justify-end col-span-1">
            <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Download" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </button>
            <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Clear Filters" onClick={() => { setSearch(''); setStatusFilter(''); setWorkModeFilter(''); }}>
              <FilterX className="w-4 h-4" />
            </button>
            <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Refresh" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
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
          ) : jobDescriptions.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30">
              <p className="text-text-secondary">No job descriptions found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow>
                  <TableHeader className="text-right">{""}</TableHeader>
                  <TableHeader>JD Id</TableHeader>
                  <TableHeader>Job Title</TableHeader>
                  <TableHeader>Work Mode</TableHeader>
                  <TableHeader>Emp Type</TableHeader>
                  <TableHeader>Owner</TableHeader>
                  <TableHeader>Updated By</TableHeader>
                  <TableHeader>Updated On</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {jobDescriptions.slice((page - 1) * limit, page * limit).map(jd => (
                  <TableRow key={jd.id}>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-start gap-1">
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => openEditModal(jd)}
                              className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                              title="Edit Job Description"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{jd.code || '-'}</TableCell>
                    <TableCell>
                       <div 
                         className="flex flex-col cursor-pointer hover:opacity-80 group"
                         onClick={() => router.push(`/job-descriptions/${jd.id}`)}
                       >
                          <span className="font-semibold text-brand group-hover:underline">{jd.title}</span>
                       </div>
                    </TableCell>
                    <TableCell>{toTitleCase(jd.work_mode) || '-'}</TableCell>
                    <TableCell>{toTitleCase(jd.employment_type) || '-'}</TableCell>
                    <TableCell>{getUserName(jd.owner_user_id)}</TableCell>
                    <TableCell className="text-text-secondary">{jd.updated_by_name || '-'}</TableCell>
                    <TableCell className="text-text-secondary">{formatDate(jd.updated_at)}</TableCell>
                    <TableCell>{getStatusBadge(jd.status)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
          )}
        </div>
        {!loading && jobDescriptions.length > 0 && (
          <TablePagination 
            totalItems={jobDescriptions.length} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
      </Card>

      {/* Create Job Description Drawer */}
      {isCreateDrawerOpen && (
        <DrawerShell80
          title="Create Job Description"
          onClose={() => setIsCreateDrawerOpen(false)}
        >
          <JobDescriptionForm
            mode="create"
            users={users}
            selectedTags={drawerSelectedTags}
            onTagsChange={setDrawerSelectedTags}
            onSave={handleCreateSave}
            onCancel={() => setIsCreateDrawerOpen(false)}
            saving={drawerSaving}
            error={drawerError}
          />
        </DrawerShell80>
      )}

      {/* Edit Job Description Drawer */}
      {isEditDrawerOpen && (
        <DrawerShell80
          title="Edit Job Description"
          onClose={() => {
            setIsEditDrawerOpen(false);
            setEditingJd(null);
          }}
        >
          {drawerLoading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <JobDescriptionForm
              mode="edit"
              jobDescription={editingJd}
              users={users}
              selectedTags={drawerSelectedTags}
              onTagsChange={setDrawerSelectedTags}
              onSave={handleEditSave}
              onCancel={() => {
                setIsEditDrawerOpen(false);
                setEditingJd(null);
              }}
              saving={drawerSaving}
              error={drawerError}
              onArchive={editingJd ? () => archiveJd(editingJd) : undefined}
            />
          )}
        </DrawerShell80>
      )}

      <ArchiveConfirmModal
        isOpen={isArchiveModalOpen && !!jdToArchive}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={confirmArchive}
        title="Archive Job Description"
        itemName={jdToArchive?.title || ''}
        isArchiving={true}
        saving={drawerSaving}
      />

      {/* Success Modal */}
      {successMessage && (
        <ModalShell
          title="Success"
          onClose={() => setSuccessMessage(null)}
          className="max-w-sm"
          footer={
            <Button variant="primary" onClick={() => setSuccessMessage(null)}>
              OK
            </Button>
          }
        >
          <div className="text-sm text-text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success shrink-0">
              <Check className="w-5 h-5" />
            </div>
            {successMessage}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
