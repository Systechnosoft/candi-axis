"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { cn, formatDate, exportToCSV } from '@/lib/utils';
import { tagsApi } from '@/lib/api/tags';
import { Tag, TagType, CreateTagRequest } from '@/types/tags';
import { Plus, Edit2, Loader2, FilterX, RefreshCw } from 'lucide-react';
import { ModalShell } from '@/components/primitives/ModalShell';
import { TablePagination } from '@/components/primitives/TablePagination';
import { FilterBar } from '@/components/primitives/FilterBar';

const TYPE_OPTIONS = [
  { value: 'skill', label: 'Skill' },
  { value: 'domain', label: 'Domain' },
  { value: 'level', label: 'Level' },
  { value: 'location', label: 'Location' },
  { value: 'other', label: 'Other' },
];

export default function TagsManagementPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('true');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateTagRequest & { active?: boolean }>({ name: '', type: 'skill' });

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tagsApi.getTags({
        search: search || undefined,
        type: (typeFilter as TagType) || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true'
      });
      setTags(data);
      setPage(1); // Reset page on filter changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tags');
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, activeFilter]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '', type: 'skill', description: '' });
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, type: tag.type, description: tag.description || '', active: tag.active });
    setModalError(null);
    setIsModalOpen(true);
  };

  const saveTag = async () => {
    setModalSaving(true);
    setModalError(null);
    
    const finalName = formData.name.trim().replace(/\s+/g, ' ');
    const finalDesc = (formData.description || '').trim().replace(/\s+/g, ' ');

    setFormData(prev => ({ ...prev, name: finalName, description: finalDesc }));

    if (!finalName) {
      setModalError('Name is required');
      setModalSaving(false);
      return;
    }

    try {
      const payload = { 
        name: finalName, 
        type: formData.type, 
        description: finalDesc || undefined 
      };

      if (editingTag) {
        await tagsApi.updateTag(editingTag.id, { ...payload, active: formData.active });
      } else {
        await tagsApi.createTag(payload);
      }
      setIsModalOpen(false);
      fetchTags();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save tag');
    } finally {
      setModalSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const tagsData = await tagsApi.getTags({
        type: (typeFilter as TagType) || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true'
      });
      exportToCSV(
        tagsData,
        [
          { header: 'Name', accessor: t => t.name },
          { header: 'Type', accessor: t => t.type },
          { header: 'Description', accessor: t => t.description || '-' },
          { header: 'Updated By', accessor: t => t.updated_by_name || '-' },
          { header: 'Updated On', accessor: t => t.updated_at ? formatDate(t.updated_at) : (t.created_at ? formatDate(t.created_at) : '-') },
          { header: 'Status', accessor: t => t.active ? 'Active' : 'Disabled' }
        ],
        `tags-export.csv`
      );
    } catch (err) {
      console.error('Export failed', err);
    }
  };


  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
      <PageHeader 
        title="Tags" 
        actions={
          <Button onClick={openCreateModal} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Tag
          </Button>
        }
      />

      <Card>
        <div className="border-b border-border p-2 bg-surface">
          <FilterBar searchValue={search} onSearchChange={setSearch} onRefresh={fetchTags} onClearFilters={() => { setTypeFilter(''); setActiveFilter('true'); }}>
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
                Type
              </div>
              <select 
                className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary capitalize"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
                Status
              </div>
              <select 
                className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="true">Active Only</option>
                <option value="false">Disabled Only</option>
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
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30 m-4">
              <p className="text-text-secondary">No tags found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
            <TableHead>
              <TableRow>
                <TableHeader className="w-[50px]"></TableHeader>
                <TableHeader className="w-[35%]">Name</TableHeader>
                <TableHeader className="w-[15%]">Type</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Updated By</TableHeader>
                <TableHeader>Updated On</TableHeader>
                <TableHeader className="w-[100px]">Status</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {tags.slice((page - 1) * limit, page * limit).map((tag) => (
                <TableRow key={tag.id} className={!tag.active ? 'opacity-60 bg-subtle/20' : ''}>
                  <TableCell>
                    <div className="flex items-center justify-start gap-1">
                      <button 
                        onClick={() => openEditModal(tag)}
                        className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                        title="Edit Tag"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell><Badge variant="default" className="uppercase text-[10px] tracking-wider">{tag.type}</Badge></TableCell>
                  <TableCell className="text-sm text-text-secondary truncate max-w-xs">{tag.description || '-'}</TableCell>
                  <TableCell className="text-text-secondary">{tag.updated_by_name || '-'}</TableCell>
                  <TableCell className="text-text-secondary">{formatDate(tag.updated_at)}</TableCell>
                  <TableCell><Badge variant={tag.active ? 'success' : 'error'}>{tag.active ? 'Active' : 'Disabled'}</Badge></TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTableShell>
        )}
        </div>
        {!loading && tags.length > 0 && (
          <TablePagination 
            totalItems={tags.length} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
      </Card>

      {isModalOpen && (
        <ModalShell
          onClose={() => setIsModalOpen(false)}
          title={editingTag ? "Edit Tag" : "Create New Tag"}
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={saveTag} disabled={modalSaving}>
                {modalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Tag'}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 py-4">
            {modalError && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{modalError}</div>}
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className="input-base border border-border" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                onBlur={(e) => setFormData({...formData, name: e.target.value.trim().replace(/\s+/g, ' ')})}
                placeholder="e.g. React.js"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Type <span className="text-red-500">*</span></label>
              <select 
                className="input-base border border-border"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as TagType})}
                disabled={!!editingTag}
              >
                {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Description</label>
              <textarea 
                className="input-base border border-border h-24 resize-none" 
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                onBlur={(e) => setFormData({...formData, description: (e.target.value || '').trim().replace(/\s+/g, ' ')})}
                placeholder="Optional description"
              />
            </div>
            
            {editingTag && (
               <div className="flex items-center gap-2 mt-2">
                 <input 
                   type="checkbox" 
                   id="activeToggle"
                   checked={formData.active !== undefined ? formData.active : editingTag.active} 
                   onChange={(e) => setFormData({...formData, active: e.target.checked})}
                 />
                 <label htmlFor="activeToggle" className="text-sm text-text-secondary">Tag is active</label>
               </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
