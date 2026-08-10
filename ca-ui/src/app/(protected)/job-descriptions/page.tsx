"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { usersApi } from '@/lib/api/users';
import { tagsApi } from '@/lib/api/tags';
import { JobDescription, RequisitionOption, CreateJobDescriptionRequest } from '@/types/job-descriptions';
import { UserLookup } from '@/types/users';
import { Tag } from '@/types/tags';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit2, Archive, Loader2, Search, Eye } from 'lucide-react';
import { JobDescriptionDetailModal } from './components/JobDescriptionDetailModal';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { JobDescriptionForm } from './components/JobDescriptionForm';

export default function JobDescriptionsPage() {
  const router = useRouter();
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('job_descriptions', 'editor');
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionOption[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reqFilter, setReqFilter] = useState('');

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedJd, setSelectedJd] = useState<JobDescription | null>(null);

  // Drawers
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSelectedTags, setDrawerSelectedTags] = useState<Tag[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jdData, reqOptions, userData] = await Promise.all([
        jobDescriptionsApi.getJobDescriptions({
          search: search || undefined,
          status: statusFilter || undefined,
          requisition_id: reqFilter || undefined,
        }),
        jobDescriptionsApi.getRequisitionOptions(),
        usersApi.getLookups()
      ]);
      setJobDescriptions(jdData);
      setRequisitions(reqOptions);
      setUsers(userData);
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setError(errorStr.response?.data?.message || 'Failed to load Job Descriptions');
      setJobDescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, reqFilter]);

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

  const openDetailModal = (jd: JobDescription) => {
    setSelectedJd(jd);
    setIsDetailModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await jobDescriptionsApi.updateJobDescriptionStatus(id, { status: newStatus });
      fetchData();
      setIsDetailModalOpen(false);
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setError(errorStr.response?.data?.message || 'Failed to update status');
    }
  };

  const archiveJd = async (jd: JobDescription) => {
    if (!window.confirm(`Are you sure you want to archive "${jd.title}"?`)) return;
    try {
      await jobDescriptionsApi.deleteJobDescription(jd.id);
      fetchData();
    } catch (err) {
      const errorStr = err as { response?: { data?: { message?: string } } };
      setError(errorStr.response?.data?.message || 'Failed to archive job description');
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
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
        <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-subtle/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search here..." 
              className="pl-9 pr-3 py-1 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-64 bg-surface"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="px-3 py-1 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none bg-surface max-w-48 truncate"
            value={reqFilter}
            onChange={(e) => setReqFilter(e.target.value)}
          >
            <option value="">All Requisitions</option>
            {requisitions.map(req => (
              <option key={req.id} value={req.id}>{req.title} {req.code ? `(${req.code})` : ''}</option>
            ))}
          </select>

          <select 
            className="px-3 py-1 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none bg-surface"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {error && (
          <div className="mx-2 mt-2 mb-2 p-2 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <div className="px-2 py-2 overflow-x-auto">
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
                  <TableHeader>Job Desc. Id</TableHeader>
                  <TableHeader>Job Title</TableHeader>
                  <TableHeader>Work Mode</TableHeader>
                  <TableHeader>Emp Type</TableHeader>
                  <TableHeader>Owner</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right"></TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {jobDescriptions.map(jd => (
                  <TableRow key={jd.id}>
                    <TableCell>
                       <div 
                         className="flex flex-col cursor-pointer hover:opacity-80 group"
                         onClick={() => router.push(`/job-descriptions/${jd.id}`)}
                       >
                          <span className="font-bold text-brand group-hover:underline text-xs">{jd.code || '-'}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{jd.title}</span>
                          {/* {jd.code && <span className="text-xs text-text-muted">Code: {jd.code}</span>} */}
                       </div>
                    </TableCell>
                    <TableCell>{jd.work_mode?.replace('_', ' ') || '-'}</TableCell>
                    <TableCell>{jd.employment_type?.replace('_', ' ') || '-'}</TableCell>
                    <TableCell>{getUserName(jd.owner_user_id)}</TableCell>
                    <TableCell>{getStatusBadge(jd.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openDetailModal(jd)}
                          className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => openEditModal(jd)}
                              className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                              title="Edit Job Description"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => archiveJd(jd)}
                              className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
          )}
        </div>
      </Card>

      <JobDescriptionDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        jobDescription={selectedJd}
        onUpdateStatus={handleStatusUpdate}
      />

      {/* Create Job Description Drawer */}
      {isCreateDrawerOpen && (
        <DrawerShell80
          title="Create Job Description"
          onClose={() => setIsCreateDrawerOpen(false)}
        >
          <JobDescriptionForm
            mode="create"
            requisitions={requisitions}
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
              requisitions={requisitions}
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
            />
          )}
        </DrawerShell80>
      )}
    </div>
  );
}
