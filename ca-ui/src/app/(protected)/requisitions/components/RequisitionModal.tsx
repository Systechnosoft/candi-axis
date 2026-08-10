import React, { useState, useEffect } from 'react';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { Button } from '@/components/primitives/Button';
import { Requisition, CreateRequisitionRequest, RequisitionPriority, RequisitionStatus } from '@/types/requisitions';
import { UserLookup } from '@/types/users';
import { Loader2 } from 'lucide-react';

interface RequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateRequisitionRequest) => Promise<void>;
  requisition: Requisition | null;
  users: UserLookup[];
  saving: boolean;
  error: string | null;
  mode?: 'create' | 'edit' | 'view';
}

export function RequisitionModal({ isOpen, onClose, onSave, requisition, users, saving, error, mode = 'create' }: RequisitionModalProps) {
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
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
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
          
          {renderViewField('Job Title', requisition?.title)}

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
          <label className="text-sm font-medium text-text-primary">Job Title <span className="text-danger">*</span></label>
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
            <select
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm bg-surface"
              value={formData.hiring_manager_id}
              onChange={e => setFormData({ ...formData, hiring_manager_id: e.target.value })}
            >
              <option value="" disabled>Select Manager</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
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
            <select
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm bg-surface"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as RequisitionPriority })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Status <span className="text-danger">*</span></label>
            <select
              required
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm bg-surface"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as RequisitionStatus })}
            >
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
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
