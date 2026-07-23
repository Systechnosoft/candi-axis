'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { useAuth } from '@/contexts/AuthContext';
import { rolesApi, Role, Module, ModulePermission } from '@/lib/api/roles';
import { Plus, Loader2, Shield, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const SYSTEM_ROLE_TYPES = [
  { value: 'ADMIN', label: 'Admin (Customer level)' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'HIRING_MANAGER', label: 'Hiring Manager' },
  { value: 'HR_RECRUITER', label: 'HR / Recruiter' },
  { value: 'INTERVIEWER', label: 'Interviewer' },
];

const ROLE_LEVELS: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  OWNER: 80,
  HIRING_MANAGER: 60,
  HR_RECRUITER: 50,
  INTERVIEWER: 40,
  CUSTOM: 10,
};

const UI_MODULES = [
  { code: 'dashboard', name: 'Dashboard', dbCodes: ['dashboard'], description: 'Primary overview and metrics' },
  { code: 'feedback', name: 'Tasks', dbCodes: ['feedback'], description: 'Review screening tasks and submit feedback' },
  { code: 'organisations', name: 'Organisations', dbCodes: ['organisations'], description: 'Platform organisation management' },
  { code: 'requisitions', name: 'Requisitions', dbCodes: ['requisitions'], description: 'Manage job requisitions' },
  { code: 'job_descriptions', name: 'Job Descriptions', dbCodes: ['job_descriptions'], description: 'Create and edit job descriptions' },
  { code: 'job_postings', name: 'Job Postings', dbCodes: ['job_postings'], description: 'Manage job postings' },
  { code: 'candidates', name: 'Candidates', dbCodes: ['candidates'], description: 'Global candidate pool' },
  { code: 'interviews', name: 'Interviews', dbCodes: ['interviews'], description: 'Interview scheduling and tracking' },
  { code: 'offers', name: 'Offers', dbCodes: ['offers'], description: 'Offer lifecycle management' },
  { code: 'admin_console', name: 'Admin console', dbCodes: ['admin', 'users', 'roles'], description: 'Manage system settings, users, and roles' },
  { code: 'tags', name: 'Tag dictionary', dbCodes: ['tags'], description: 'System tag dictionary' },
];

export default function RolesPage() {
  const { session } = useAuth();
  const isSuperAdmin = session?.roles.includes('super_admin');

  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Access mapping state for currently selected role
  // maps: UIModuleCode -> 'deny' | 'viewer' | 'editor' | 'administrator'
  const [rolePermissionsState, setRolePermissionsState] = useState<Record<string, string>>({});

  // Add Role Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    description: '',
    role_type: 'CUSTOM',
    org_id: '',
    level: 10,
    permissions: {} as Record<string, string>,
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Load modules, organisations, and roles
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch modules
      const mods = await rolesApi.getModules();
      setModules(mods);

      // Fetch organisations if Super Admin
      if (isSuperAdmin) {
        const orgs = await rolesApi.getOrganisations();
        setOrganisations(orgs);
      }

      // Fetch roles
      const list = await rolesApi.getRoles();
      setRoles(list);
      if (list.length > 0) {
        handleSelectRole(list[0], mods);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load roles and permissions data');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectRole = async (role: Role, customModules?: Module[]) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const fullRole = await rolesApi.getRole(role.id);
      setSelectedRole(fullRole);
      
      const modsList = customModules || modules;
      
      // Initialize permission radio mapping
      const mapping: Record<string, string> = {};
      
      // Seed deny for all UI modules first
      UI_MODULES.forEach(u => {
        mapping[u.code] = 'deny';
      });

      // Populate from DB permissions
      fullRole.permissions?.forEach((perm: ModulePermission) => {
        let level = 'deny';
        if (perm.can_delete) {
          level = 'administrator';
        } else if (perm.can_create || perm.can_update) {
          level = 'editor';
        } else if (perm.can_read) {
          level = 'viewer';
        }
        
        const dbMod = modsList.find(m => m.id === perm.module_id);
        if (dbMod) {
          const uiMod = UI_MODULES.find(u =>
            u.dbCodes.some(code => code.toLowerCase() === dbMod.code.toLowerCase())
          );
          if (uiMod) {
            mapping[uiMod.code] = level;
          }
        }
      });

      setRolePermissionsState(mapping);
    } catch (err: any) {
      setError(err.message || 'Failed to load role details');
    }
  };

  const handlePermissionRadioChange = (uiModuleCode: string, level: string) => {
    console.log('Changed:', uiModuleCode, level);

    setRolePermissionsState(prev => {
      const next = {
        ...prev,
        [uiModuleCode]: level,
      };

      console.log(next);

      return next;
    });
  };

  const handleUpdatePermissions = async () => {
    if (!selectedRole) return;
    setSavingPermissions(true);
    setError(null);
    setSuccessMessage(null);

    // Map permissions back to can_read/can_create/can_update/can_delete
    const mappedPermissions = modules.map(m => {
      const uiMod = UI_MODULES.find(u =>
        u.dbCodes.some(code => code.toLowerCase() === m.code.toLowerCase())
      );
      let level = 'deny';
      
      if (uiMod) {
        level = rolePermissionsState[uiMod.code] || 'deny';
      } else {
        const existingPerm = selectedRole.permissions?.find((p: any) => p.module_id === m.id);
        if (existingPerm) {
          if (existingPerm.can_delete) level = 'administrator';
          else if (existingPerm.can_create || existingPerm.can_update) level = 'editor';
          else if (existingPerm.can_read) level = 'viewer';
        }
      }

      return {
        module_id: m.id,
        can_read: level !== 'deny',
        can_create: level === 'editor' || level === 'administrator',
        can_update: level === 'editor' || level === 'administrator',
        can_delete: level === 'administrator',
      };
    });

    try {
      await rolesApi.updateRole(selectedRole.id, {
        permissions: mappedPermissions,
      });
      setSuccessMessage('Permissions updated successfully!');
      handleSelectRole(selectedRole);
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetPermissions = () => {
    if (selectedRole) {
      handleSelectRole(selectedRole);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name.toUpperCase()}"?`)) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await rolesApi.deleteRole(role.id);
      setSuccessMessage('Role deleted successfully!');
      const list = await rolesApi.getRoles();
      setRoles(list);
      if (list.length > 0) {
        handleSelectRole(list[0]);
      } else {
        setSelectedRole(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  // --- Modal Forms logic ---
  const handleOpenAddModal = () => {
    const defOrg = organisations.length > 0 ? organisations[0].id : '';
    
    // Setup empty permissions mapping for radios
    const permMap: Record<string, string> = {};
    UI_MODULES.forEach(u => {
      permMap[u.code] = 'deny';
    });

    setNewRoleForm({
      name: '',
      description: '',
      role_type: 'CUSTOM',
      org_id: defOrg,
      level: 10,
      permissions: permMap,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleModalPermissionChange = (uiModuleCode: string, level: string) => {
    setNewRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [uiModuleCode]: level
      }
    }));
  };

  const handleSelectAll = (level: string) => {
    setNewRoleForm(prev => {
      const perms = { ...prev.permissions };
      UI_MODULES.forEach(u => {
        perms[u.code] = level;
      });
      return { ...prev, permissions: perms };
    });
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const name = newRoleForm.name.trim();
    if (!name) {
      setModalError('Role name is required.');
      return;
    }

    setCreating(true);
    try {
      const mappedPermissions = modules.map(m => {
        const uiMod = UI_MODULES.find(u =>
          u.dbCodes.some(code => code.toLowerCase() === m.code.toLowerCase())
        );
        const level = uiMod ? newRoleForm.permissions[uiMod.code] || 'deny' : 'deny';
        return {
          module_id: m.id,
          can_read: level !== 'deny',
          can_create: level === 'editor' || level === 'administrator',
          can_update: level === 'editor' || level === 'administrator',
          can_delete: level === 'administrator',
        };
      });

      await rolesApi.createRole({
        name,
        description: newRoleForm.description || undefined,
        role_type: newRoleForm.role_type,
        org_id: isSuperAdmin ? newRoleForm.org_id : undefined,
        level: newRoleForm.role_type === 'CUSTOM' ? Number(newRoleForm.level) : undefined,
        permissions: mappedPermissions,
      });

      setIsModalOpen(false);
      setSuccessMessage('Role created successfully!');
      
      const list = await rolesApi.getRoles();
      setRoles(list);
      if (list.length > 0) {
        const match = list.find(r => r.name.toUpperCase() === name.toUpperCase());
        handleSelectRole(match || list[0]);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const allowedRoleTypes = SYSTEM_ROLE_TYPES.filter(type => {
    if (isSuperAdmin) return true;
    return !['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(type.value);
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h2>
        <p className="text-sm text-text-secondary">You do not have the required permissions to view this page. Please contact your system administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
      <PageHeader 
        title="Roles & Permissions" 
        actions={
          <Button onClick={handleOpenAddModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Role
          </Button>
        }
      />
      <p className="text-text-secondary -mt-2 mb-4">Manage roles and module access</p>

      {error && (
        <div className="bg-semantic-error-light text-semantic-error border border-semantic-error-border rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-semantic-success-light text-semantic-success border border-semantic-success-border rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Left Panel: Role List */}
          <Card className="md:col-span-1 border border-border flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-subtle/50 font-semibold text-sm text-text-primary">
              Roles
            </div>
            
            <div className="flex flex-col divide-y divide-border max-h-[600px] overflow-y-auto">
              {roles.length === 0 ? (
                <div className="p-6 text-center text-text-secondary text-sm">
                  No roles found.
                </div>
              ) : (
                roles.map(r => {
                  const isSelected = selectedRole?.id === r.id;
                  return (
                    <div 
                      key={r.id}
                      className={`p-4 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-brand/10 border-l-4 border-brand' : 'hover:bg-subtle/40'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm text-text-primary">{r.name.toUpperCase()}</span>
                        <span className="text-xs text-text-secondary capitalize">{r.role_type.replace('_', ' ').toLowerCase()} ({r.user_count} users)</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSelectRole(r)}
                          className={isSelected ? 'text-brand font-semibold' : ''}
                        >
                          Manage
                        </Button>
                        
                        {r.is_editable && (
                          <button 
                            onClick={() => handleDeleteRole(r)}
                            className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded-md transition-all"
                            title="Delete Role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right Panel: Module Permissions */}
          <Card className="md:col-span-2 border border-border flex flex-col">
            {selectedRole ? (
              <>
                <div className="p-4 border-b border-border bg-subtle/50 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-text-secondary uppercase font-semibold tracking-wider">Managing Access For</span>
                    <span className="font-bold text-lg text-brand flex items-center gap-1.5">
                      <Shield className="w-5 h-5" />
                      {selectedRole.name.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleResetPermissions} disabled={savingPermissions}>
                      Reset
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleUpdatePermissions} disabled={savingPermissions}>
                      {savingPermissions ? 'Saving...' : 'Update'}
                    </Button>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto">
                  <p className="text-sm text-text-secondary -mt-2">
                    Configure the access level for each module in this role. Access changes are applied immediately upon saving.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    {UI_MODULES.map(u => {
                      const currentVal = rolePermissionsState[u.code] || 'deny';
                      return (
                        <div key={u.code} className="p-4 border border-border rounded-lg bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm text-text-primary">{u.name}</span>
                            <span className="text-xs text-text-secondary">{u.description}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-subtle/30 p-1.5 rounded-lg border border-border max-w-fit">
                            {['deny', 'viewer', 'editor', 'administrator'].map(level => {
                              const checked = currentVal === level;
                              return (
                                <label 
                                  key={level} 
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                    checked 
                                      ? 'bg-brand text-white shadow-sm' 
                                      : 'text-text-secondary hover:text-text-primary hover:bg-subtle/50'
                                  }`}
                                >
                                  <input 
                                    type="radio" 
                                    name={`perm-${u.code}`} 
                                    value={level} 
                                    checked={checked} 
                                    onChange={() => handlePermissionRadioChange(u.code, level)}
                                    className="hidden"
                                  />
                                  <span className="capitalize">{level}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-text-muted flex flex-col items-center justify-center gap-2">
                <Shield className="w-12 h-12 text-text-muted/40" />
                <span>Select a role from the left panel to configure access control permissions.</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Create Role Drawer */}
      {isModalOpen && (
        <DrawerShell80
          onClose={() => setIsModalOpen(false)}
          title="Create New Role"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="create-role-form" 
                variant="primary" 
                disabled={creating || !newRoleForm.name.trim()}
              >
                {creating ? 'Creating...' : 'Create Role'}
              </Button>
            </>
          }
        >
          <form id="create-role-form" onSubmit={handleCreateRoleSubmit} className="flex flex-col gap-6 p-6">
            {modalError && (
              <div className="bg-semantic-error-light text-semantic-error border border-semantic-error-border rounded-lg p-4 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Role Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. INTERVIEWER, CUSTOM_HR"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand uppercase"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={creating}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Role Type *</label>
                <select
                  required
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand bg-surface"
                  value={newRoleForm.role_type}
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, role_type: e.target.value }))}
                  disabled={creating}
                >
                  {allowedRoleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                  <option value="CUSTOM">Custom Role</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-semibold text-text-primary">Description</label>
                <textarea 
                  placeholder="Describe the purpose or scope of this role..."
                  rows={3}
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  disabled={creating}
                />
              </div>

              {newRoleForm.role_type === 'CUSTOM' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Hierarchy Level (1-99) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="99"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
                    value={newRoleForm.level}
                    onChange={(e) => setNewRoleForm(prev => ({ ...prev, level: Number(e.target.value) }))}
                    disabled={creating}
                  />
                  <span className="text-[10px] text-text-secondary">Must be below creator level ({session?.roles.includes('SUPER_ADMIN') ? 100 : 90})</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 justify-end pb-2">
                  <span className="text-xs text-text-secondary">
                    System level assigned: <span className="font-semibold">{ROLE_LEVELS[newRoleForm.role_type]}</span>
                  </span>
                </div>
              )}

              {isSuperAdmin && organisations.length > 0 && (
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Organisation *</label>
                  <select
                    required
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand bg-surface"
                    value={newRoleForm.org_id}
                    onChange={(e) => setNewRoleForm(prev => ({ ...prev, org_id: e.target.value }))}
                    disabled={creating}
                  >
                    <option value="" disabled>Select Organisation</option>
                    {organisations.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Default Module Access radio grid */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-text-primary">Default Module Access</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll('viewer')}
                    className="px-2.5 py-1 text-xs border border-border hover:bg-subtle rounded-md text-text-secondary hover:text-text-primary"
                    disabled={creating}
                  >
                    Set All to Viewer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll('deny')}
                    className="px-2.5 py-1 text-xs border border-border hover:bg-subtle rounded-md text-text-secondary hover:text-text-primary"
                    disabled={creating}
                  >
                    Deny All
                  </button>
                </div>
              </div>

              <div className="flex flex-col border border-border rounded-lg overflow-hidden divide-y divide-border">
                <div className="grid grid-cols-4 bg-subtle/50 px-4 py-2 font-semibold text-xs text-text-secondary text-left">
                  <div className="col-span-1">Module</div>
                  <div className="col-span-3 text-right">Access Level</div>
                </div>

                {UI_MODULES.map(u => {
                  const state = newRoleForm.permissions[u.code] || 'deny';
                  return (
                    <div key={u.code} className="grid grid-cols-4 px-4 py-3 text-sm items-center hover:bg-subtle/20 gap-4">
                      <div className="font-medium text-text-primary truncate" title={u.name}>{u.name}</div>
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        {['deny', 'viewer', 'editor', 'administrator'].map(level => {
                          const checked = state === level;
                          return (
                            <label 
                              key={level} 
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                                checked 
                                  ? 'bg-brand text-white shadow-sm' 
                                  : 'text-text-secondary hover:text-text-primary hover:bg-subtle/50 border border-border/50'
                              }`}
                            >
                              <input 
                                type="radio" 
                                name={`modal-perm-${u.code}`} 
                                value={level} 
                                checked={checked} 
                                onChange={() => handleModalPermissionChange(u.code, level)}
                                className="hidden"
                              />
                              <span className="capitalize">{level}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </DrawerShell80>
      )}
    </div>
  );
}
