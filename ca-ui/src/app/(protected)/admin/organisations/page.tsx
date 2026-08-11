'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ListPage } from '@/components/templates/ListPage';
import { FilterBar } from '@/components/primitives/FilterBar';
import { Card } from '@/components/primitives/Card';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { cn, formatDate, toTitleCase } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { OrganisationsService, Organisation } from '@/lib/api/organisations';
import { Loader2, Edit2, Ban, ShieldAlert, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DEFAULT_FORM = {
  org_code: '',
  name: '',
  legal_name: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  website_url: '',
  industry: '',
  company_size: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  country: 'India',
  postal_code: '',
  allowed_email_domains_str: '',
  status: 'ACTIVE',
};

export default function OrganisationsPage() {
  const { session } = useAuth();
  const isSuperAdmin = session?.roles.includes('super_admin');

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Drawer form states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const fetchOrganisations = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await OrganisationsService.getOrganisations({ page, limit, search });
      setOrganisations(res.data);
      setTotalPages(res.meta.totalPages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load organisations');
    } finally {
      setLoading(false);
    }
  }, [page, search, isSuperAdmin]);

  useEffect(() => {
    const timer = setTimeout(fetchOrganisations, 300);
    return () => clearTimeout(timer);
  }, [fetchOrganisations]);

  const handleOpenAddDrawer = () => {
    setEditingOrg(null);
    setForm(DEFAULT_FORM);
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (org: Organisation) => {
    setEditingOrg(org);
    setForm({
      org_code: org.org_code,
      name: org.name,
      legal_name: org.legal_name || '',
      primary_contact_name: org.primary_contact_name || '',
      primary_contact_email: org.primary_contact_email || '',
      primary_contact_phone: org.primary_contact_phone || '',
      website_url: org.website_url || '',
      industry: org.industry || '',
      company_size: org.company_size || '',
      address_line1: org.address_line1 || '',
      address_line2: org.address_line2 || '',
      city: org.city || '',
      state: org.state || '',
      country: org.country || 'India',
      postal_code: org.postal_code || '',
      allowed_email_domains_str: org.allowed_email_domains?.join(', ') || '',
      status: org.status,
    });
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingOrg(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setDrawerError(null);

    if (!form.name.trim()) {
      setDrawerError('Organisation name is required.');
      setSubmitting(false);
      return;
    }

    const payload: Partial<Organisation> & { allowed_email_domains?: string[] } = {
      name: form.name.trim(),
      legal_name: form.legal_name.trim() || undefined,
      primary_contact_name: form.primary_contact_name.trim() || undefined,
      primary_contact_email: form.primary_contact_email.trim() || undefined,
      primary_contact_phone: form.primary_contact_phone.trim() || undefined,
      website_url: form.website_url.trim() || undefined,
      industry: form.industry.trim() || undefined,
      company_size: form.company_size.trim() || undefined,
      address_line1: form.address_line1.trim() || undefined,
      address_line2: form.address_line2.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || 'India',
      postal_code: form.postal_code.trim() || undefined,
      allowed_email_domains: form.allowed_email_domains_str
        ? form.allowed_email_domains_str
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : [],
      status: form.status,
    };

    try {
      if (editingOrg) {
        await OrganisationsService.updateOrganisation(editingOrg.id, payload);
        toast.success('Organisation updated successfully.');
      } else {
        await OrganisationsService.createOrganisation(payload);
        toast.success('Organisation created successfully.');
      }
      handleCloseDrawer();
      fetchOrganisations();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'An error occurred while saving organisation details.';
      setDrawerError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (org: Organisation) => {
    if (!confirm(`Are you sure you want to deactivate the organisation "${org.name}"? It will remain accessible but marked as inactive.`)) {
      return;
    }

    try {
      await OrganisationsService.updateOrganisation(org.id, { status: 'INACTIVE' });
      toast.success('Organisation deactivated successfully.');
      fetchOrganisations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate organisation.');
    }
  };

  const handleDelete = async (org: Organisation) => {
    if (!confirm(`Are you sure you want to delete the organisation "${org.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await OrganisationsService.deactivateOrganisation(org.id);
      toast.success('Organisation deleted successfully.');
      fetchOrganisations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete organisation.');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-status-error/10 border border-status-error/20 text-status-error p-6 rounded-lg flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg text-text-primary">Access Denied</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Only Platform Super Admins are authorized to view or manage Organisations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="default">Inactive</Badge>;
      case 'SUSPENDED':
        return <Badge variant="warning">Suspended</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <ListPage
      title="Organisations"
      actions={
        <Button onClick={handleOpenAddDrawer} className="flex items-center gap-2 h-[34px]">
          <Plus className="w-4 h-4" /> Add Organisation
        </Button>
      }
    >
      <div className="flex flex-col gap-4 h-full min-h-0 w-full">
        <Card className="w-full flex flex-col min-h-0">
          <div className="p-2 border-b border-border bg-surface rounded-t-md">
            <FilterBar searchValue={search} onSearchChange={(val) => { setSearch(val); setPage(1); }} onRefresh={fetchOrganisations} />
          </div>
          <div className="overflow-x-auto">
            <DataTableShell>
          <TableHead>
            <TableRow>
              <TableHeader>Org Code</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Legal Name</TableHeader>
              <TableHeader>Primary Contact</TableHeader>
              <TableHeader>Email / Phone</TableHeader>
              <TableHeader>Industry</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Created On</TableHeader>
              <TableHeader className="text-right"></TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-text-muted">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />
                    <span>Loading organisations list...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-status-error font-semibold">
                  {error}
                </TableCell>
              </TableRow>
            ) : organisations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-text-secondary">
                  No organisations found.
                </TableCell>
              </TableRow>
            ) : (
              organisations.map((org) => (
                <TableRow key={org.id} className={org.status === 'INACTIVE' ? 'opacity-60' : ''}>
                  <TableCell className="font-semibold text-text-primary">{org.org_code}</TableCell>
                  <TableCell className="font-semibold text-brand">{org.name}</TableCell>
                  <TableCell>{org.legal_name || '-'}</TableCell>
                  <TableCell>{org.primary_contact_name || '-'}</TableCell>
                  <TableCell>
                    {org.primary_contact_email && <div className="text-xs text-text-primary">{org.primary_contact_email}</div>}
                    {org.primary_contact_phone && <div className="text-xs text-text-secondary">{org.primary_contact_phone}</div>}
                    {!org.primary_contact_email && !org.primary_contact_phone && '-'}
                  </TableCell>
                  <TableCell>{toTitleCase(org.industry) || '-'}</TableCell>
                  <TableCell>{getStatusBadge(org.status)}</TableCell>
                  <TableCell>{formatDate(org.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEditDrawer(org)}
                        className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                        title="Edit Organisation"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(org)}
                        className="p-1.5 text-text-secondary hover:text-status-warning hover:bg-status-warning/10 rounded-md transition-colors"
                        title={org.status === 'INACTIVE' ? 'Already Inactive' : 'Deactivate Organisation'}
                        disabled={org.status === 'INACTIVE'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(org)}
                        className="p-1.5 text-text-secondary hover:text-status-error hover:bg-status-error/10 rounded-md transition-colors"
                        title="Delete Organisation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </DataTableShell>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-border bg-surface flex items-center justify-between text-xs rounded-b-md">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-1 rounded-md border border-border bg-surface text-text-secondary hover:bg-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="p-1 rounded-md border border-border bg-surface text-text-secondary hover:bg-subtle disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        </Card>
      </div>

      {/* Add/Edit Drawer */}
      {isDrawerOpen && (
        <DrawerShell80
          title={editingOrg ? 'Edit Organisation' : 'Add Organisation'}
          onClose={handleCloseDrawer}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={handleCloseDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" form="organisation-form" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingOrg ? 'Update Organisation' : 'Create Organisation'}
              </Button>
            </>
          }
        >
          <form id="organisation-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <p className="text-sm text-text-secondary -mt-2">
              Fill in the organisation, primary contact, and billing address details below.
            </p>

            {drawerError && (
              <div className="bg-semantic-error-light text-semantic-error border border-semantic-error-border rounded-lg p-3 text-sm font-medium">
                {drawerError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Organisation Code</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand opacity-75 cursor-not-allowed bg-subtle/50"
                  value={editingOrg ? form.org_code : '(Auto-generated as ORG-001)'}
                  disabled={true}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Organisation Name *</label>
                <input
                  type="text"
                  required
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Systechnosoft Technologies"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-semibold text-text-primary">Legal Name</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Systechnosoft Technologies Private Limited"
                  value={form.legal_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, legal_name: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Website URL</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. https://systechnosoft.com"
                  value={form.website_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, website_url: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Industry</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. Technology"
                  value={form.industry}
                  onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Company Size</label>
                <select
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand bg-surface"
                  value={form.company_size}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_size: e.target.value }))}
                  disabled={submitting}
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 Employees</option>
                  <option value="11-50">11-50 Employees</option>
                  <option value="51-200">51-200 Employees</option>
                  <option value="201-500">201-500 Employees</option>
                  <option value="501-1000">501-1000 Employees</option>
                  <option value="1000+">1000+ Employees</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-text-primary">Status</label>
                <select
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand bg-surface"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={submitting}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-semibold text-text-primary">Allowed Email Domains</label>
                <input
                  type="text"
                  className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                  placeholder="e.g. company.com, company.co.in"
                  value={form.allowed_email_domains_str}
                  onChange={(e) => setForm((prev) => ({ ...prev, allowed_email_domains_str: e.target.value }))}
                  disabled={submitting}
                />
                <span className="text-[10px] text-text-secondary">Comma-separated domains allowed for user self-registration.</span>
              </div>
            </div>

            {/* Primary Contact details */}
            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <span className="font-semibold text-sm text-text-primary">Primary Contact Information</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Contact Name</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. John Doe"
                    value={form.primary_contact_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, primary_contact_name: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Contact Email</label>
                  <input
                    type="email"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. john.doe@company.com"
                    value={form.primary_contact_email}
                    onChange={(e) => setForm((prev) => ({ ...prev, primary_contact_email: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Contact Phone</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. +91 9988776655"
                    value={form.primary_contact_phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, primary_contact_phone: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="flex flex-col gap-4 border-t border-border pt-6">
              <span className="font-semibold text-sm text-text-primary">Address Information</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Address Line 1</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Suite 402, 4th Floor"
                    value={form.address_line1}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-text-primary">Address Line 2</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Systechno Towers, Sector 62"
                    value={form.address_line2}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">City</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Noida"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">State</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. Uttar Pradesh"
                    value={form.state}
                    onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Country</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. India"
                    value={form.country}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">Postal Code</label>
                  <input
                    type="text"
                    className="px-3 py-2 border border-border rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                    placeholder="e.g. 201301"
                    value={form.postal_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          </form>
        </DrawerShell80>
      )}
    </ListPage>
  );
}
