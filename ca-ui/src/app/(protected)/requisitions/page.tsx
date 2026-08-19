"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Plus, Edit2, Download, Archive, ArchiveRestore, RefreshCw, FilterX } from 'lucide-react';
import { FilterBar } from '@/components/primitives/FilterBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { ArchiveConfirmModal } from '@/components/ui/ArchiveConfirmModal';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { cn, formatDate, toTitleCase } from '@/lib/utils';
import { requisitionsApi } from '@/lib/api/requisitions';
import { usersApi } from '@/lib/api/users';
import { Requisition, CreateRequisitionRequest, RequisitionStatus } from '@/types/requisitions';
import { UserLookup } from '@/types/users';
import { RequisitionModal } from './components/RequisitionModal';
import { TablePagination } from '@/components/primitives/TablePagination';
import { exportToCSV } from '@/lib/utils';

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (requisitions.length > 0) {
      setAvailableDepartments(prev => {
        const newDepts = requisitions.map(r => r.department).filter(Boolean);
        const unique = new Set([...prev, ...newDepts]);
        return Array.from(unique).sort();
      });
    }
  }, [requisitions]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingReq, setEditingReq] = useState<Requisition | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [reqToArchive, setReqToArchive] = useState<Requisition | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  
  const [reqToUnarchive, setReqToUnarchive] = useState<Requisition | null>(null);
  const [isUnarchiveModalOpen, setIsUnarchiveModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, userData] = await Promise.all([
        requisitionsApi.getRequisitions({
          search: search || undefined,
          status: statusFilter || undefined,
          department: departmentFilter || undefined,
          activeOnly: activeFilter
        }),
        usersApi.getHiringManagers()
      ]);
      setRequisitions(reqData);
      setUsers(userData);
      setPage(1); // Reset page on filter changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Requisitions');
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, departmentFilter, activeFilter]);

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
    setReqToArchive(req);
    setIsArchiveModalOpen(true);
  };

  const confirmArchive = async () => {
    if (!reqToArchive) return;
    setModalSaving(true);
    setModalError(null);
    try {
      await requisitionsApi.deleteRequisition(reqToArchive.id);
      fetchData();
      setIsModalOpen(false);
      setIsArchiveModalOpen(false);
      setReqToArchive(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (isModalOpen) {
        setModalError(err.response?.data?.message || 'Failed to archive requisition');
      } else {
        setError(err.response?.data?.message || 'Failed to archive requisition');
      }
    } finally {
      setModalSaving(false);
    }
  };

  const unarchiveReq = async (req: Requisition) => {
    setReqToUnarchive(req);
    setIsUnarchiveModalOpen(true);
  };

  const confirmUnarchive = async () => {
    if (!reqToUnarchive) return;
    setModalSaving(true);
    setModalError(null);
    try {
      await requisitionsApi.restoreRequisition(reqToUnarchive.id);
      fetchData();
      setIsModalOpen(false);
      setIsUnarchiveModalOpen(false);
      setReqToUnarchive(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (isModalOpen) {
        setModalError(err.response?.data?.message || 'Failed to unarchive requisition');
      } else {
        setError(err.response?.data?.message || 'Failed to unarchive requisition');
      }
    } finally {
      setModalSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const reqData = await requisitionsApi.getRequisitions({
        status: statusFilter || undefined,
        department: departmentFilter || undefined,
        activeOnly: activeFilter
      });
      
      exportToCSV(
        reqData,
        [
          { header: 'Requisition ID', accessor: r => r.code },
          { header: 'Title', accessor: r => r.title },
          { header: 'Department', accessor: r => toTitleCase(r.department) },
          { header: 'Openings', accessor: r => r.openings_count },
          { header: 'Updated By', accessor: r => r.updated_by_name || '-' },
          { header: 'Updated On', accessor: r => formatDate(r.updated_at) },
          { header: 'Status', accessor: r => r.is_deleted ? 'Archived' : toTitleCase(r.status) }
        ],
        `requisitions-export.csv`
      );
    } catch (err) {
      console.error('Export failed', err);
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
        title="Requisition" 
        actions={
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Requisition
          </Button>
        }
      />
      
      <Card>
        <div className="border-b border-border p-2 bg-surface">
          <FilterBar searchValue={search} onSearchChange={setSearch} onRefresh={fetchData} onClearFilters={() => { setDepartmentFilter(''); setStatusFilter(''); setActiveFilter('active'); }}>
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
                Department
              </div>
              <select 
                className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All</option>
                {availableDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
                Status
              </div>
              <select 
                className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
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
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
                Visibility
              </div>
              <select 
                className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="active">Active Only</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
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
          ) : requisitions.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30">
              <p className="text-text-secondary">No requisitions found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow>
                  <TableHeader className="text-right">{""}</TableHeader>
                  <TableHeader>Requisition ID</TableHeader>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Department</TableHeader>
                  <TableHeader className="text-center">Openings</TableHeader>
                  <TableHeader>Updated By</TableHeader>
                  <TableHeader>Updated On</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {requisitions.slice((page - 1) * limit, page * limit).map(req => (
                  <TableRow key={req.id} className={req.is_deleted ? 'opacity-60 bg-subtle/20' : ''}>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-start gap-1">
                        <button 
                          onClick={() => openEditModal(req)}
                          className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                          title="Edit Requisition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>{req.is_deleted ? <Badge variant="default">Archived</Badge> : getStatusBadge(req.status)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
          )}
        </div>
        {!loading && requisitions.length > 0 && (
          <TablePagination 
            totalItems={requisitions.length} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
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
        onArchive={editingReq ? () => archiveReq(editingReq) : undefined}
        onUnarchive={editingReq ? () => unarchiveReq(editingReq) : undefined}
      />

      {/* Archive Modal */}
      <ArchiveConfirmModal
        isOpen={isArchiveModalOpen && !!reqToArchive}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={confirmArchive}
        title="Archive Requisition"
        itemName={reqToArchive?.title || ''}
        isArchiving={true}
        saving={modalSaving}
      />

      {/* Unarchive Modal */}
      <ArchiveConfirmModal
        isOpen={isUnarchiveModalOpen && !!reqToUnarchive}
        onClose={() => setIsUnarchiveModalOpen(false)}
        onConfirm={confirmUnarchive}
        title="Unarchive Requisition"
        itemName={reqToUnarchive?.title || ''}
        isArchiving={false}
        saving={modalSaving}
      />
    </div>
  );
}
