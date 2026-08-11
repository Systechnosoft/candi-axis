"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { cn, formatDate, toTitleCase } from '@/lib/utils';
import { requisitionsApi } from '@/lib/api/requisitions';
import { usersApi } from '@/lib/api/users';
import { Requisition, CreateRequisitionRequest, RequisitionStatus } from '@/types/requisitions';
import { UserLookup } from '@/types/users';
import { Plus, Edit2, Archive, ArchiveRestore, Loader2, Search, Download, FilterX, RefreshCw } from 'lucide-react';
import { RequisitionModal } from './components/RequisitionModal';

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | ''>('');
  const [activeFilter, setActiveFilter] = useState('true');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingReq, setEditingReq] = useState<Requisition | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, userData] = await Promise.all([
        requisitionsApi.getRequisitions({
          search: search || undefined,
          status: statusFilter || undefined,
          activeOnly: activeFilter === 'all' ? undefined : activeFilter
        }),
        usersApi.getHiringManagers()
      ]);
      setRequisitions(reqData);
      setUsers(userData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Requisitions');
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingReq(null);
    setModalError(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (req: Requisition) => {
    setEditingReq(req);
    setModalError(null);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (req: Requisition) => {
    setEditingReq(req);
    setModalError(null);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleSave = async (data: CreateRequisitionRequest) => {
    setModalSaving(true);
    setModalError(null);
    try {
      if (editingReq) {
        await requisitionsApi.updateRequisition(editingReq.id, data);
      } else {
        await requisitionsApi.createRequisition(data);
      }
      setIsModalOpen(false);
      fetchData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save requisition');
    } finally {
      setModalSaving(false);
    }
  };

  const archiveReq = async (req: Requisition) => {
    if (!window.confirm(`Are you sure you want to archive "${req.title}"?`)) return;
    try {
      await requisitionsApi.deleteRequisition(req.id);
      fetchData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive requisition');
    }
  };

  const unarchiveReq = async (req: Requisition) => {
    if (!window.confirm(`Are you sure you want to unarchive "${req.title}"?`)) return;
    try {
      await requisitionsApi.restoreRequisition(req.id);
      fetchData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unarchive requisition');
    }
  };

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'open': return <Badge variant="success">Open</Badge>;
      case 'draft': return <Badge variant="info">Draft</Badge>;
      case 'on_hold': return <Badge variant="warning">On Hold</Badge>;
      case 'closed': return <Badge variant="error">Closed</Badge>;
      default: return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full pb-8">
      <PageHeader 
        title="Requisitions" 
        actions={
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Requisition
          </Button>
        }
      />
      
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="search here..." 
                className="pl-9 pr-3 h-[34px] text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-48 bg-surface"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="h-[34px] px-4 text-sm font-medium rounded-md bg-[#eaf4f4] text-brand hover:bg-brand/10 transition-colors">
              Search
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-3 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[80px] justify-center">
                Status
              </div>
              <select 
                className="pl-3 pr-8 h-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequisitionStatus | '')}
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-3 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[80px] justify-center">
                Visibility
              </div>
              <select 
                className="pl-3 pr-8 h-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="active">Active Only</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Download">
              <Download className="w-4 h-4" />
            </button>
            <button className="h-[34px] w-[34px] flex items-center justify-center border border-border rounded-md text-text-secondary hover:text-brand bg-surface transition-colors" title="Clear Filters" onClick={() => { setSearch(''); setStatusFilter(''); setActiveFilter('active'); }}>
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
          ) : requisitions.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30">
              <p className="text-text-secondary">No requisitions found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Code</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Department</TableHeader>
                  <TableHeader className="text-center">Openings</TableHeader>
                  <TableHeader>Updated By</TableHeader>
                  <TableHeader>Updated On</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right"></TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {requisitions.map(req => (
                  <TableRow key={req.id} className={req.is_deleted ? 'opacity-60 bg-subtle/20' : ''}>
                    <TableCell className="font-mono font-bold text-xs text-brand">
                      {req.code}
                    </TableCell>
                    <TableCell 
                      className="font-medium text-text-primary hover:underline cursor-pointer transition-colors hover:text-brand"
                      onClick={() => openViewModal(req)}
                    >
                      {req.title}
                    </TableCell>
                    <TableCell>{toTitleCase(req.department)}</TableCell>
                    <TableCell className="text-center">{req.openings_count}</TableCell>
                    <TableCell className="text-text-secondary">{req.updated_by_name || '-'}</TableCell>
                    <TableCell className="text-text-secondary">{formatDate(req.updated_at)}</TableCell>
                    <TableCell>{req.is_deleted ? <Badge variant="secondary">Archived</Badge> : getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openEditModal(req)}
                          className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                          title="Edit Requisition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!req.is_deleted && (
                          <button 
                            onClick={() => archiveReq(req)}
                            className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                            title="Archive Requisition"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        {req.is_deleted && (
                          <button 
                            onClick={() => unarchiveReq(req)}
                            className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                            title="Unarchive Requisition"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
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

      <RequisitionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        requisition={editingReq}
        users={users}
        saving={modalSaving}
        error={modalError}
        mode={modalMode}
      />
    </div>
  );
}
