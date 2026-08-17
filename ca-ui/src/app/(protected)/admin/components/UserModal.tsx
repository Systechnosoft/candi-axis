'use client';

import React, { useState, useEffect } from 'react';
import { User, CreateUserRequest, UpdateUserRequest } from '@/types/users';
import { usersApi } from '@/lib/api/users';
import { ModalShell } from '@/components/primitives/ModalShell';
import { Button } from '@/components/primitives/Button';
import { OrganisationsService, Organisation } from '@/lib/api/organisations';
import { useAuth } from '@/contexts/AuthContext';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSaved: () => void;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr_recruiter', label: 'HR Recruiter' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'interviewer', label: 'Interviewer' },
];

export function UserModal({ isOpen, onClose, user, onSaved }: UserModalProps) {
  const { session } = useAuth();
  const isSuperAdmin = session?.roles.includes('super_admin');

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    department: '',
    employee_code: '',
    role_code: '',
    org_id: '',
    status: 'active' as 'active' | 'inactive',
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          email: user.email,
          full_name: user.full_name,
          department: user.department || '',
          employee_code: user.employee_code || '',
          role_code: user.role_code || 'hiring_manager',
          org_id: user.org_id || '',
          status: user.status as 'active' | 'inactive',
        });
      } else {
        setFormData({
          email: '',
          full_name: '',
          department: '',
          employee_code: '',
          role_code: '',
          org_id: !isSuperAdmin ? (session?.user?.org_id || '') : '',
          status: 'active',
        });
      }
      setError(null);

      // Load organisations for all users (for display + super admin selection)
      OrganisationsService.getOrganisations({ limit: 200 })
        .then(res => setOrganisations(res.data))
        .catch(err => console.error('Failed to load organisations', err));
    }
  }, [isOpen, user, isSuperAdmin]);

  const normalizeText = (text: string) => {
    return text.trim().replace(/\s+/g, ' ');
  };

  const handleBlur = (field: keyof typeof formData) => {
    if (field === 'full_name' || field === 'department') {
      setFormData(prev => ({
        ...prev,
        [field]: normalizeText(prev[field])
      }));
    } else if (field === 'employee_code' || field === 'email') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].trim()
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = formData.email.trim();
    const full_name = normalizeText(formData.full_name);
    
    if (!email || !full_name) {
      setError('Name and Email are required.');
      return;
    }

    if (formData.role_code !== 'super_admin' && !formData.org_id) {
      setError('Organization is required.');
      return;
    }

    setSaving(true);
    try {
      if (user) {
        const updateData: UpdateUserRequest = {
          full_name,
          department: normalizeText(formData.department) || undefined,
          employee_code: formData.employee_code.trim() || undefined,
          role_code: formData.role_code,
          org_id: formData.role_code === 'super_admin' ? undefined : (formData.org_id || undefined),
        };
        await usersApi.updateUser(user.id, updateData);
        if (formData.status !== user.status) {
          await usersApi.updateUserStatus(user.id, { status: formData.status as 'active' | 'inactive' });
        }
      } else {
        const createData: CreateUserRequest = {
          email,
          full_name,
          department: normalizeText(formData.department) || undefined,
          employee_code: formData.employee_code.trim() || undefined,
          role_code: formData.role_code,
          org_id: formData.role_code === 'super_admin' ? undefined : (formData.org_id || undefined),
          status: formData.status,
        };
        await usersApi.createUser(createData);
      }
      onSaved();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || `Failed to ${user ? 'update' : 'create'} user.`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      onClose={onClose}
      title={user ? 'Edit User' : 'Create System User'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary mt-[-10px]">
          {user 
            ? "Update this user's details and role assignment."
            : "Silently provisions an ATS account with default password 'Password123!' through Supabase Admin."}
        </p>
        {error && (
          <div className="bg-semantic-error-light text-semantic-error border border-semantic-error-border rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-sm font-medium text-text-primary">Full Name *</label>
            <input
              type="text"
              required
              className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              onBlur={() => handleBlur('full_name')}
              disabled={saving}
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-sm font-medium text-text-primary">Email Address *</label>
            <input
              type="email"
              required
              className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              onBlur={() => handleBlur('email')}
              disabled={saving || !!user} // Email cannot be changed after creation
              placeholder="jane.doe@company.com"
            />
            {user && <span className="text-xs text-text-secondary">Email cannot be changed after creation.</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Department</label>
            <input
              type="text"
              className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              onBlur={() => handleBlur('department')}
              disabled={saving}
              placeholder="e.g. Engineering"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Employee Code</label>
            <input
              type="text"
              className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={formData.employee_code}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_code: e.target.value }))}
              onBlur={() => handleBlur('employee_code')}
              disabled={saving}
              placeholder="e.g. EMP-1042"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">System Role *</label>
            <select
              required
              className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={formData.role_code}
              onChange={(e) => setFormData(prev => ({ ...prev, role_code: e.target.value }))}
              disabled={saving}
            >
              <option value="" disabled>--Please Select--</option>
              {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Account Status</label>
            <select
              className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
              disabled={saving}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-sm font-medium text-text-primary">
              Organisation {formData.role_code === 'super_admin' ? '(Not required for Super Admin)' : '*'}
            </label>
            {isSuperAdmin ? (
              <select
                required={formData.role_code !== 'super_admin'}
                className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={formData.org_id}
                onChange={(e) => setFormData(prev => ({ ...prev, org_id: e.target.value }))}
                disabled={saving}
              >
                <option value="">-- Please Select --</option>
                {organisations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                className="px-3 py-2 border border-border rounded-lg bg-surface-secondary text-text-secondary cursor-not-allowed"
                value={organisations.find(o => o.id === formData.org_id)?.name || formData.org_id || 'Loading...'}
              />
            )}
            {formData.role_code && formData.role_code !== 'super_admin' && !formData.org_id && (
              <span className="text-xs text-status-error">Organisation is required for this role.</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !formData.full_name.trim() || !formData.email.trim()}>
            {saving ? 'Saving...' : 'Save User'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
