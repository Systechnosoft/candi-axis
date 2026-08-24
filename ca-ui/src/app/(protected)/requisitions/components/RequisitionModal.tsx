import React, { useState, useEffect } from 'react';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { Button } from '@/components/primitives/Button';
import { SingleSelect } from '@/components/primitives/SingleSelect';
import { Requisition, CreateRequisitionRequest, RequisitionPriority, RequisitionStatus } from '@/types/requisitions';
import { UserLookup } from '@/types/users';
import { Loader2, Archive, ArchiveRestore } from 'lucide-react';

interface RequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateRequisitionRequest) => Promise<void>;
  requisition: Requisition | null;
  users: UserLookup[];
  saving: boolean;
  error: string | null;
  mode?: 'create' | 'edit' | 'view';
  onArchive?: () => Promise<void>;
  onUnarchive?: () => Promise<void>;
}

export function RequisitionModal({ isOpen, onClose, onSave, onArchive, onUnarchive, requisition, users, saving, error, mode = 'create' }: RequisitionModalProps) {
  const [formData, setFormData] = useState<CreateRequisitionRequest>({
    code: '',
    title: '',
    department: '',
    openings_count: 1,
    priority: 'medium',
    hiring_manager_id: '',
    status: 'draft',
    status_reason: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (requisition) {
        setFormData({
          code: requisition.code,
          title: requisition.title,
          department: requisition.department,
          openings_count: requisition.openings_count,
          priority: requisition.priority,
          hiring_manager_id: requisition.hiring_manager_id,
          status: requisition.status,
          status_reason: requisition.status_reason || '',
        });
      } else {
        setFormData({
          code: '',
          title: '',
          department: '',
          openings_count: 1,
          priority: 'medium',
          hiring_manager_id: '',
          status: 'draft',
          status_reason: '',
        });
      }
    }
  }, [isOpen, requisition]);

  const normalizeText = (text: string) => text.trim().replace(/\s+/g, ' ');

  const handleBlur = (field: keyof CreateRequisitionRequest) => {
    const val = formData[field];
    if (typeof val === 'string') {
      setFormData(prev => ({ ...prev, [field]: normalizeText(val) }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      code: requisition ? normalizeText(formData.code) : '',
      title: normalizeText(formData.title),
      department: normalizeText(formData.department),
      status_reason: formData.status_reason ? normalizeText(formData.status_reason) : undefined,
    });
  };

  if (!isOpen) return null;

  const renderViewField = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-subtle/30 border border-border">
      <span className="text-xs font-semibold text-text-muted tracking-wider">{label}</span>
      <span className="text-sm font-medium text-text-primary break-words">{value || <span className="text-text-muted italic">Not provided</span>}</span>
    </div>
  );

  if (mode === 'view') {
    const manager = users.find(u => u.id === requisition?.hiring_manager_id);
    const managerName = manager ? `${manager.first_name} ${manager.last_name}` : 'Unknown Manager';

    return (
      <DrawerShell80 title="Requisition Summary" onClose={onClose}>
        <div className="flex flex-col gap-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            {renderViewField('Requisition Code', requisition?.code)}
            {renderViewField('Department', requisition?.department)}
          </div>
          
          {renderViewField('Job Requisition', requisition?.title)}

          <div className="grid grid-cols-2 gap-4">
            {renderViewField('Hiring Manager', managerName)}
            {renderViewField('Openings Count', requisition?.openings_count)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {renderViewField('Priority', <span className="capitalize">{requisition?.priority}</span>)}
            {renderViewField('Status', <span className="capitalize">{requisition?.status.replace('_', ' ')}</span>)}
          </div>

          {renderViewField('Status Reason', requisition?.status_reason)}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DrawerShell80>
    );
  }

  return (
    <DrawerShell80 title={requisition ? 'Edit Requisition' : 'Create Requisition'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {requisition ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Requisition Code</label>
              <input
                type="text"
                maxLength={50}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm bg-subtle disabled:opacity-60 disabled:cursor-not-allowed text-text-secondary"
                value={formData.code}
                placeholder="Auto-generated"
                disabled
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Department <span className="text-danger">*</span></label>
              <input
                type="text"
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                onBlur={() => handleBlur('department')}
                placeholder="e.g. Engineering"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Department <span className="text-danger">*</span></label>
            <input
              type="text"
              required
              maxLength={100}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.department}
              onChange={e => setFormData({ ...formData, department: e.target.value })}
              onBlur={() => handleBlur('department')}
              placeholder="e.g. Engineering"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Job Requisition <span className="text-danger">*</span></label>
          <input
            type="text"
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            onBlur={() => handleBlur('title')}
            placeholder="e.g. Senior Backend Engineer"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Hiring Manager <span className="text-danger">*</span></label>
            <SingleSelect
              options={[
                { id: '', name: '--Please Select--' },
                ...users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))
              ]}
              selectedId={formData.hiring_manager_id}
              onChange={id => setFormData({ ...formData, hiring_manager_id: id })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Openings Count <span className="text-danger">*</span></label>
            <input
              type="number"
              min={1}
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
              value={formData.openings_count}
              onChange={e => setFormData({ ...formData, openings_count: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Priority <span className="text-danger">*</span></label>
            <SingleSelect
              options={[
                { id: 'low', name: 'Low' },
                { id: 'medium', name: 'Medium' },
                { id: 'high', name: 'High' },
                { id: 'critical', name: 'Critical' }
              ]}
              selectedId={formData.priority}
              onChange={id => setFormData({ ...formData, priority: id as RequisitionPriority })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Status <span className="text-danger">*</span></label>
            <SingleSelect
              options={[
                { id: 'draft', name: 'Draft' },
                { id: 'open', name: 'Open' },
                { id: 'on_hold', name: 'On Hold' },
                { id: 'closed', name: 'Closed' }
              ]}
              selectedId={formData.status}
              onChange={id => setFormData({ ...formData, status: id as RequisitionStatus })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Status Reason</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
            value={formData.status_reason || ''}
            onChange={e => setFormData({ ...formData, status_reason: e.target.value })}
            onBlur={() => handleBlur('status_reason')}
            placeholder="Optional contextual note..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          {mode === 'edit' && requisition && !requisition.is_deleted && onArchive && (
            <Button type="button" variant="secondary" onClick={onArchive} disabled={saving} className="mr-auto text-danger border-danger/30 hover:bg-danger/10">
              <Archive className="w-4 h-4 mr-2 inline" /> Archive
            </Button>
          )}
          {mode === 'edit' && requisition && requisition.is_deleted && onUnarchive && (
            <Button type="button" variant="secondary" onClick={onUnarchive} disabled={saving} className="mr-auto text-brand border-brand/30 hover:bg-brand/10">
              <ArchiveRestore className="w-4 h-4 mr-2 inline" /> Unarchive
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !formData.title.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Requisition'}
          </Button>
        </div>
      </form>
    </DrawerShell80>
  );
}
