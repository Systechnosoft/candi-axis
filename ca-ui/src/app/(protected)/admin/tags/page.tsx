"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { tagsApi } from '@/lib/api/tags';
import { Tag, TagType, CreateTagRequest } from '@/types/tags';
import { Plus, Edit2, Archive, Loader2, Search } from 'lucide-react';
import { ModalShell } from '@/components/primitives/ModalShell';

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
    setFormData({ name: tag.name, type: tag.type, description: tag.description || '' });
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

  const disableTag = async (tag: Tag) => {
    if (!window.confirm(`Are you sure you want to disable the tag "${tag.name}"?`)) return;
    try {
      await tagsApi.deleteTag(tag.id);
      fetchTags();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable tag');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
      <PageHeader 
        title="Tags Dictionary" 
        actions={
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Tag
          </Button>
        }
      />
      <p className="text-text-secondary -mt-2 mb-4">Manage the normalized tags available for Jobs and Candidates.</p>

      <Card>
        <div className="flex items-center gap-4 mb-4 p-4 border-b border-border bg-subtle/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search tags..." 
              className="pl-9 pr-3 py-1.5 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-3 py-1.5 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select 
            className="px-3 py-1.5 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-40"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="true">Active Only</option>
            <option value="false">Disabled Only</option>
            <option value="all">Show All</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
        ) : error ? (
          <div className="text-red-500 py-4 text-center text-sm">{error}</div>
        ) : (
          <DataTableShell>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {tags.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell><Badge variant="default" className="uppercase text-[10px] tracking-wider">{tag.type}</Badge></TableCell>
                  <TableCell className="text-sm text-text-secondary truncate max-w-xs">{tag.description || '-'}</TableCell>
                  <TableCell><Badge variant={tag.active ? 'success' : 'error'}>{tag.active ? 'Active' : 'Disabled'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(tag)}><Edit2 className="w-4 h-4" /></Button>
                      {tag.active && <Button variant="ghost" size="sm" className="text-status-error hover:bg-status-error/10 hover:text-status-error" onClick={() => disableTag(tag)}><Archive className="w-4 h-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-text-muted">No tags found.</TableCell>
                </TableRow>
              )}
            </tbody>
          </DataTableShell>
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
